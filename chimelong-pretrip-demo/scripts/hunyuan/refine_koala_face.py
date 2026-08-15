"""Sculpt the generated koala muzzle into a compact continuous face."""

import argparse
from pathlib import Path

import numpy as np
import trimesh


ROOT = Path(__file__).resolve().parents[2]


def smoothstep(value: np.ndarray) -> np.ndarray:
    value = np.clip(value, 0.0, 1.0)
    return value * value * (3.0 - 2.0 * value)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-version", type=int, default=14)
    parser.add_argument("--output-version", type=int, default=17)
    args = parser.parse_args()

    folder = ROOT / "art/companions/koala/wip/hunyuan"
    source = folder / f"koala-base-v{args.source_version}.glb"
    output = folder / f"koala-base-v{args.output_version}.glb"
    mesh = trimesh.load(source, force="mesh", process=False)
    vertices = mesh.vertices.copy()

    mins = vertices.min(axis=0)
    spans = np.maximum(vertices.max(axis=0) - mins, 1e-6)
    nx = vertices[:, 0] / (spans[0] * 0.5)
    ny = (vertices[:, 1] - mins[1]) / spans[1]
    nz = (vertices[:, 2] - mins[2]) / spans[2]

    # Lower central face only. Hunyuan canonical coordinates use X horizontal,
    # Y vertical and +Z toward the camera in the approved frontal input.
    vertical = smoothstep((ny - 0.615) / 0.025) * (1.0 - smoothstep((ny - 0.705) / 0.025))
    horizontal = 1.0 - smoothstep((np.abs(nx) - 0.04) / 0.24)
    front = smoothstep((nz - 0.66) / 0.16)
    region = vertical * horizontal * front

    # Preserve the compact nose tip at the centre/top while flattening the
    # surrounding muzzle shelf and removing the two round side pads.
    nose_guard = (
        (np.abs(nx) < 0.075)
        & (ny > 0.665)
        & (ny < 0.715)
        & (nz > 0.76)
    )
    region[nose_guard] = 0.0
    vertices[:, 2] -= spans[2] * 0.045 * region
    vertices[:, 0] *= 1.0 - 0.055 * region

    mesh.vertices = vertices
    mesh.update_faces(mesh.nondegenerate_faces())
    mesh.remove_unreferenced_vertices()
    mesh.export(output)
    print(f"Exported {output}: {len(mesh.vertices):,} vertices / {len(mesh.faces):,} faces")


if __name__ == "__main__":
    main()
