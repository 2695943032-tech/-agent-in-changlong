"""Clean, texture and decimate a generated companion mesh for mobile AR."""

import argparse
from pathlib import Path

import numpy as np
import trimesh
import cv2
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]


def projected_uv(mesh: trimesh.Trimesh, image: Image.Image) -> np.ndarray:
    rgba = np.asarray(image.convert("RGBA"))
    alpha = rgba[:, :, 3]
    ys, xs = np.where(alpha > 32)
    left, right, top, bottom = xs.min(), xs.max(), ys.min(), ys.max()
    vertices = mesh.vertices
    x_min, y_min = vertices[:, :2].min(axis=0)
    x_max, y_max = vertices[:, :2].max(axis=0)
    u = (vertices[:, 0] - x_min) / max(x_max - x_min, 1e-6)
    v = (vertices[:, 1] - y_min) / max(y_max - y_min, 1e-6)
    px = np.clip(left + u * (right - left), 0, rgba.shape[1] - 1)
    py = np.clip(bottom - v * (bottom - top), 0, rgba.shape[0] - 1)
    return np.column_stack((px / (rgba.shape[1] - 1), 1 - py / (rgba.shape[0] - 1)))


def edge_safe_texture(image: Image.Image) -> Image.Image:
    """Fill transparent RGB with nearby foreground color to prevent black UV bleed."""
    rgba = np.asarray(image.convert("RGBA")).copy()
    alpha = rgba[:, :, 3]
    missing = (alpha < 245).astype(np.uint8) * 255
    rgb = cv2.inpaint(rgba[:, :, :3], missing, 7, cv2.INPAINT_TELEA)
    # GLB base-color textures do not need the cutout alpha: keeping it opaque
    # prevents filtered transparent pixels from darkening silhouettes.
    return Image.fromarray(np.dstack((rgb, np.full_like(alpha, 255))), "RGBA")


def soften_koala_muzzle(texture: Image.Image) -> Image.Image:
    """Keep the dark nose compact so frontal projection cannot form a mask."""
    rgba = np.asarray(texture.convert("RGBA")).copy()
    height, width = rgba.shape[:2]
    # The approved full-body reference places the face near the upper third.
    # Replace near-black pixels in a generous muzzle zone with local face grey,
    # then restore only a compact elliptical nose at the original nose centre.
    y0, y1 = int(height * .315), int(height * .425)
    x0, x1 = int(width * .425), int(width * .575)
    region = rgba[y0:y1, x0:x1, :3]
    dark = np.max(region, axis=2) < 145
    face_samples = region[(np.min(region, axis=2) > 95) & (np.max(region, axis=2) < 225)]
    face_grey = np.median(face_samples, axis=0).astype(np.uint8) if len(face_samples) else np.array([150, 155, 154], dtype=np.uint8)
    region[dark] = face_grey
    rgba[y0:y1, x0:x1, :3] = region
    # Do not repaint a black ellipse: planar UVs would repeat it over several
    # depth layers of the generated muzzle. Geometry and studio shading retain
    # the nose volume without creating a mask.
    return Image.fromarray(rgba, "RGBA")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("character", choices=("koala", "giraffe"))
    parser.add_argument("--faces", type=int, default=80_000)
    parser.add_argument("--version", type=int, default=2)
    args = parser.parse_args()
    art = ROOT / f"art/companions/{args.character}"
    source = art / f"wip/hunyuan/{args.character}-base-v{args.version}.glb"
    image_path = art / f"wip/hunyuan/{args.character}-front-input-v{args.version}.png"
    output = art / f"wip/hunyuan/{args.character}-ar-colored-v{args.version}.glb"
    mesh = trimesh.load(source, force="mesh", process=False)
    components = mesh.split(only_watertight=False)
    threshold = max(component.area for component in components) * .002
    kept = [component for component in components if component.area >= threshold]
    mesh = trimesh.util.concatenate(kept)
    if args.character == "koala" and args.version >= 3:
        # Refine the generated head as one continuous form: narrow the central
        # cranium/cheeks while preserving the wide ear tips and body silhouette.
        vertices = mesh.vertices.copy()
        y_min, y_max = vertices[:, 1].min(), vertices[:, 1].max()
        x_abs = np.abs(vertices[:, 0])
        head_start = y_min + (y_max - y_min) * .58
        head_mask = vertices[:, 1] > head_start
        central_face = head_mask & (x_abs < np.quantile(x_abs[head_mask], .78))
        height_weight = np.clip((vertices[:, 1] - head_start) / max(y_max - head_start, 1e-6), 0, 1)
        vertices[central_face, 0] *= 1 - .10 * (1 - height_weight[central_face] * .25)
        mesh.vertices = vertices
    print(f"Cleaned: {len(components)} components -> {len(kept)}")
    if len(mesh.faces) > args.faces:
        mesh = mesh.simplify_quadric_decimation(face_count=args.faces)
    source_texture = Image.open(image_path).convert("RGBA")
    texture = edge_safe_texture(source_texture)
    if args.character == "koala" and args.version in (14,):
        texture = soften_koala_muzzle(texture)
    mesh.visual = trimesh.visual.texture.TextureVisuals(uv=projected_uv(mesh, source_texture), image=texture)
    mesh.remove_unreferenced_vertices()
    mesh.export(output)
    print(f"Exported {output}: {len(mesh.vertices):,} vertices / {len(mesh.faces):,} faces")


if __name__ == "__main__":
    main()
