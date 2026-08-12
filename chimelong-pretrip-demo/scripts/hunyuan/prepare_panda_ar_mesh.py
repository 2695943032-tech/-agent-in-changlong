"""Create a colored, mobile-sized AR mesh from the high-detail panda base."""

from pathlib import Path

import numpy as np
import trimesh
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
SOURCE_MESH = ROOT / "art/companions/panda/wip/hunyuan/panda-base-v1.glb"
SOURCE_IMAGE = ROOT / "art/companions/panda/wip/hunyuan/panda-front-input-v1.png"
OUTPUT_MESH = ROOT / "art/companions/panda/wip/hunyuan/panda-ar-colored-v1.glb"
TARGET_FACES = 80_000


def projected_uv(mesh: trimesh.Trimesh, image: Image.Image) -> np.ndarray:
    """Project the approved front design onto the mesh as vertex colors.

    Hunyuan's canonical output uses X horizontally and Y vertically. Reusing the
    exact generation image keeps the character palette aligned with its geometry.
    """
    rgba = np.asarray(image.convert("RGBA"))
    alpha = rgba[:, :, 3]
    ys, xs = np.where(alpha > 0)
    image_left, image_right = xs.min(), xs.max()
    image_top, image_bottom = ys.min(), ys.max()

    vertices = mesh.vertices
    x_min, y_min = vertices[:, :2].min(axis=0)
    x_max, y_max = vertices[:, :2].max(axis=0)
    u = (vertices[:, 0] - x_min) / max(x_max - x_min, 1e-6)
    v = (vertices[:, 1] - y_min) / max(y_max - y_min, 1e-6)
    px = np.clip(np.rint(image_left + u * (image_right - image_left)), 0, rgba.shape[1] - 1).astype(int)
    py = np.clip(np.rint(image_bottom - v * (image_bottom - image_top)), 0, rgba.shape[0] - 1).astype(int)
    return np.column_stack((px / (rgba.shape[1] - 1), 1.0 - py / (rgba.shape[0] - 1)))


def main() -> None:
    mesh = trimesh.load(SOURCE_MESH, force="mesh", process=False)
    print(f"Source: {len(mesh.vertices):,} vertices / {len(mesh.faces):,} faces")
    if len(mesh.faces) > TARGET_FACES:
        mesh = mesh.simplify_quadric_decimation(face_count=TARGET_FACES)
    image = Image.open(SOURCE_IMAGE).convert("RGBA")
    # UV projection retains the sharp eye highlights and pixel details that would
    # become noisy when reduced to one color per decimated vertex.
    mesh.visual = trimesh.visual.texture.TextureVisuals(
        uv=projected_uv(mesh, image),
        image=image,
    )
    mesh.remove_unreferenced_vertices()
    OUTPUT_MESH.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(OUTPUT_MESH)
    print(f"AR mesh: {len(mesh.vertices):,} vertices / {len(mesh.faces):,} faces")
    print(f"Exported: {OUTPUT_MESH}")


if __name__ == "__main__":
    main()
