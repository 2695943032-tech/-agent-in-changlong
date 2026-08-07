"""Convert the provided uncompressed 16-bit RGB TIFF to a WebP tile pyramid.

This file intentionally reads the TIFF's tile table directly.  The original
map is too large for common browser/image-library decoders, but it is a
standard, uncompressed tiled TIFF whose samples are stored as 0-255 uint16s.
"""

from __future__ import annotations

import json
import math
import shutil
import struct
from pathlib import Path

import numpy as np
from PIL import Image


SOURCE = Path(
    r"D:\weixinbeifen\xwechat_files\wxid_3sorr9h5d36922_5973\msg\file\2026-08\地图\地图\广州长隆野生动物世界-02041.tif"
)
OUTPUT = Path(r"C:\Users\Zyanya\Documents\ai大赛\output\map-tiles")
TILE_SIZE = 256
MAX_ZOOM = 7
WEBP_QUALITY = 82


TYPE_BYTES = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 12: 8}


def read_tiff_layout(source: Path) -> dict[str, object]:
    """Read only TIFF metadata necessary for this known tiled raster."""
    with source.open("rb") as file:
        if file.read(4) != b"II*\x00":
            raise ValueError("Expected a little-endian classic TIFF.")
        ifd_offset = struct.unpack("<I", file.read(4))[0]
        file.seek(ifd_offset)
        entry_count = struct.unpack("<H", file.read(2))[0]
        tags: dict[int, tuple[int, int, int]] = {}
        for _ in range(entry_count):
            tag, type_id, count, value = struct.unpack("<HHII", file.read(12))
            tags[tag] = (type_id, count, value)

        def value(tag: int) -> tuple[int, int, int]:
            if tag not in tags:
                raise ValueError(f"Missing TIFF tag {tag}.")
            return tags[tag]

        def scalar(tag: int) -> int:
            type_id, count, raw_value = value(tag)
            if count != 1 or type_id != 3:
                raise ValueError(f"Unexpected scalar TIFF tag {tag}.")
            return raw_value & 0xFFFF

        def offsets(tag: int) -> tuple[int, ...]:
            type_id, count, offset = value(tag)
            if type_id != 4:
                raise ValueError(f"Expected LONG TIFF tag {tag}.")
            file.seek(offset)
            return struct.unpack(f"<{count}I", file.read(count * 4))

        width = scalar(256)
        height = scalar(257)
        samples_per_pixel = scalar(277)
        bits_type, bits_count, bits_offset = value(258)
        file.seek(bits_offset)
        bits_per_sample = struct.unpack(f"<{bits_count}H", file.read(bits_count * 2))
        sample_type, sample_count, sample_offset = value(339)
        file.seek(sample_offset)
        sample_format = struct.unpack(f"<{sample_count}H", file.read(sample_count * 2))
        tile_width = scalar(322)
        tile_height = scalar(323)
        tile_offsets = offsets(324)
        tile_byte_counts = offsets(325)

    if (samples_per_pixel, bits_per_sample, sample_format) != (3, (16, 16, 16), (1, 1, 1)):
        raise ValueError("Expected 16-bit unsigned RGB samples.")

    return {
        "width": width,
        "height": height,
        "tile_width": tile_width,
        "tile_height": tile_height,
        "offsets": tile_offsets,
        "byte_counts": tile_byte_counts,
    }


def source_tile(
    file, layout: dict[str, object], column: int, row: int
) -> np.ndarray:
    """Read one 128px source tile and take its 0-255 uint16 values as RGB."""
    tile_width = int(layout["tile_width"])
    tile_height = int(layout["tile_height"])
    tile_columns = math.ceil(int(layout["width"]) / tile_width)
    index = row * tile_columns + column
    offsets = layout["offsets"]
    byte_counts = layout["byte_counts"]
    offset = offsets[index]
    byte_count = byte_counts[index]
    file.seek(offset)
    raw = file.read(byte_count)
    pixels = np.frombuffer(raw, dtype="<u2").reshape(tile_height, tile_width, 3)
    return pixels.astype(np.uint8)


def write_webp(array: np.ndarray, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(array, "RGB").save(destination, "WEBP", quality=WEBP_QUALITY, method=4)


def build_native_tiles(layout: dict[str, object]) -> None:
    """Build z=7, where a 256px tile contains a 2x2 block of source tiles."""
    image_width = int(layout["width"])
    image_height = int(layout["height"])
    native_columns = math.ceil(image_width / TILE_SIZE)
    native_rows = math.ceil(image_height / TILE_SIZE)
    source_columns = math.ceil(image_width / int(layout["tile_width"]))
    source_rows = math.ceil(image_height / int(layout["tile_height"]))

    with SOURCE.open("rb") as file:
        for row in range(native_rows):
            for column in range(native_columns):
                tile = np.zeros((TILE_SIZE, TILE_SIZE, 3), dtype=np.uint8)
                for y_part in range(2):
                    source_row = row * 2 + y_part
                    if source_row >= source_rows:
                        continue
                    for x_part in range(2):
                        source_column = column * 2 + x_part
                        if source_column >= source_columns:
                            continue
                        data = source_tile(file, layout, source_column, source_row)
                        tile[y_part * 128 : (y_part + 1) * 128, x_part * 128 : (x_part + 1) * 128] = data
                write_webp(tile, OUTPUT / str(MAX_ZOOM) / str(column) / f"{row}.webp")
            print(f"z={MAX_ZOOM}: {row + 1}/{native_rows} rows complete", flush=True)


def build_parent_levels() -> None:
    """Generate z=0..6 from four children at the next zoom level."""
    for zoom in range(MAX_ZOOM - 1, -1, -1):
        children_zoom = zoom + 1
        child_columns = max(int(path.parent.name) for path in (OUTPUT / str(children_zoom)).glob("*/*.webp")) + 1
        child_rows = max(int(path.stem) for path in (OUTPUT / str(children_zoom)).glob("*/*.webp")) + 1
        columns = math.ceil(child_columns / 2)
        rows = math.ceil(child_rows / 2)
        for row in range(rows):
            for column in range(columns):
                canvas = Image.new("RGB", (TILE_SIZE * 2, TILE_SIZE * 2))
                for y_part in range(2):
                    for x_part in range(2):
                        child = OUTPUT / str(children_zoom) / str(column * 2 + x_part) / f"{row * 2 + y_part}.webp"
                        if child.exists():
                            with Image.open(child) as image:
                                canvas.paste(image.convert("RGB"), (x_part * TILE_SIZE, y_part * TILE_SIZE))
                destination = OUTPUT / str(zoom) / str(column) / f"{row}.webp"
                destination.parent.mkdir(parents=True, exist_ok=True)
                canvas.resize((TILE_SIZE, TILE_SIZE), Image.Resampling.LANCZOS).save(
                    destination, "WEBP", quality=WEBP_QUALITY, method=4
                )
        print(f"z={zoom}: {columns} × {rows} tiles complete", flush=True)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    layout = read_tiff_layout(SOURCE)
    build_native_tiles(layout)
    build_parent_levels()

    width = int(layout["width"])
    height = int(layout["height"])
    metadata = {
        "name": "广州长隆野生动物世界",
        "format": "webp",
        "tileSize": TILE_SIZE,
        "minZoom": 0,
        "maxZoom": MAX_ZOOM,
        "maxNativeZoom": MAX_ZOOM,
        "imageSize": {"width": width, "height": height},
        "tileUrlTemplate": "{z}/{x}/{y}.webp",
        "coordinateSystem": "pixel-top-left",
        "sourceGeoReference": {
            "pixelScale": {"x": 0.000001, "y": 0.000001},
            "topLeft": {"longitude": 113.30305172543962, "latitude": 23.01306960279202},
            "crs": "unspecified in source TIFF",
        },
    }
    (OUTPUT / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Finished: {OUTPUT}")


if __name__ == "__main__":
    main()
