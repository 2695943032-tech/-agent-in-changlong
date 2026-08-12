"""Split an equal-width FRONT / LEFT / BACK turnaround into model inputs."""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("character")
    parser.add_argument("--version", type=int, required=True)
    parser.add_argument("--source", type=Path)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[2]
    reference_dir = root / "art" / "companions" / args.character / "references"
    source = args.source or reference_dir / f"{args.character}-turnaround-v{args.version}.png"
    output_dir = (
        root / "art" / "companions" / args.character / "wip" / "hunyuan"
        / f"multiview-v{args.version}"
    )
    output_dir.mkdir(parents=True, exist_ok=True)

    image = Image.open(source).convert("RGB")
    width, height = image.size
    boundaries = (0, round(width / 3), round(width * 2 / 3), width)
    for index, name in enumerate(("front", "left", "back")):
        view = image.crop((boundaries[index], 0, boundaries[index + 1], height))
        # Force identical dimensions even when the source width is not divisible by three.
        target_width = boundaries[1] - boundaries[0]
        if view.width != target_width:
            canvas = Image.new("RGB", (target_width, height), image.getpixel((0, 0)))
            canvas.paste(view, ((target_width - view.width) // 2, 0))
            view = canvas
        output = output_dir / f"{name}.png"
        view.save(output, optimize=True)
        print(f"{name.upper()}={output}")


if __name__ == "__main__":
    main()
