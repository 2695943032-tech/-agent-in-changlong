"""Create a high-density, multiview-textured companion GLB for AR."""

import argparse
from pathlib import Path

import trimesh
from PIL import Image

from hy3dgen.texgen import Hunyuan3DPaintPipeline


ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("character", choices=("koala", "giraffe"))
    parser.add_argument("--version", type=int, required=True)
    parser.add_argument("--faces", type=int, default=160_000)
    args = parser.parse_args()

    art = ROOT / "art" / "companions" / args.character
    source = art / "wip" / "hunyuan" / f"{args.character}-base-v{args.version}.glb"
    reference = art / "references" / f"{args.character}-model-input-v{args.version}.png"
    output = art / "wip" / "hunyuan" / f"{args.character}-ar-painted-v{args.version}.glb"

    mesh = trimesh.load(source, force="mesh", process=False)
    components = mesh.split(only_watertight=False)
    threshold = max(component.area for component in components) * 0.002
    mesh = trimesh.util.concatenate([component for component in components if component.area >= threshold])
    if len(mesh.faces) > args.faces:
        mesh = mesh.simplify_quadric_decimation(face_count=args.faces)
    mesh.remove_unreferenced_vertices()

    pipeline = Hunyuan3DPaintPipeline.from_pretrained(
        "tencent/Hunyuan3D-2",
        subfolder="hunyuan3d-paint-v2-0-turbo",
    )
    pipeline.enable_model_cpu_offload(device="cuda")
    painted = pipeline(mesh, image=Image.open(reference).convert("RGBA"))
    painted.export(output)
    print(f"Exported {output}: {len(painted.vertices):,} vertices / {len(painted.faces):,} faces")


if __name__ == "__main__":
    main()
