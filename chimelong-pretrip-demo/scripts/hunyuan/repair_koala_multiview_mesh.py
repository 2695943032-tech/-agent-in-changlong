"""Deterministically repair koala v10 head symmetry and cheek volume."""

from pathlib import Path

import numpy as np
import trimesh
from scipy.spatial import cKDTree


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art/companions/koala/wip/hunyuan/koala-base-v10.glb"
OUTPUT = ROOT / "art/companions/koala/wip/hunyuan/koala-base-v11.glb"


def main() -> None:
    mesh = trimesh.load(SOURCE, force="mesh", process=False)
    vertices = mesh.vertices.copy()
    y_min, y_max = vertices[:, 1].min(), vertices[:, 1].max()
    head_bottom = y_min + (y_max - y_min) * 0.66

    # The left ear is clean. Project the right upper-head vertices onto a
    # mirrored copy of the clean left side while retaining the original faces.
    left = np.where((vertices[:, 0] < -0.015) & (vertices[:, 1] > head_bottom))[0]
    right = np.where((vertices[:, 0] > 0.015) & (vertices[:, 1] > head_bottom))[0]
    mirrored_left = vertices[left].copy()
    mirrored_left[:, 0] *= -1
    tree = cKDTree(mirrored_left)
    distance, nearest = tree.query(vertices[right], k=1)
    # Replace the malformed ear and outer cranium; blend near the centerline.
    replace = distance < 0.22
    target = mirrored_left[nearest]
    x_weight = np.clip((vertices[right, 0] - 0.015) / 0.12, 0, 1)
    weight = np.where(replace, x_weight, 0)[:, None]
    vertices[right] = vertices[right] * (1 - weight) + target * weight

    # Remove the generated spherical cheek pads. Narrow and flatten only the
    # lower central face, preserving the eyes, ears, nose and compact jaw.
    face_y0 = y_min + (y_max - y_min) * 0.70
    face_y1 = y_min + (y_max - y_min) * 0.84
    central = (
        (vertices[:, 1] > face_y0)
        & (vertices[:, 1] < face_y1)
        & (np.abs(vertices[:, 0]) < 0.26)
    )
    side_weight = np.clip(np.abs(vertices[:, 0]) / 0.26, 0, 1)
    vertices[central, 0] *= 1 - 0.22 * side_weight[central]
    # Z is model depth. Pull the cheek sides back without flattening the nose.
    nose_guard = np.abs(vertices[:, 0]) < 0.075
    cheek = central & ~nose_guard
    depth_center = np.median(vertices[central, 2])
    vertices[cheek, 2] = depth_center + (vertices[cheek, 2] - depth_center) * 0.76

    mesh.vertices = vertices
    mesh.update_faces(mesh.nondegenerate_faces())
    mesh.remove_unreferenced_vertices()
    mesh.export(OUTPUT)
    print(f"Exported {OUTPUT}: {len(mesh.vertices):,} vertices / {len(mesh.faces):,} faces")


if __name__ == "__main__":
    main()
