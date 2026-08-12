"""Generate a geometry-only companion mesh with official Hunyuan3D-2mv."""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import torch
from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("character")
    parser.add_argument("--version", type=int, required=True)
    parser.add_argument("--octree-resolution", type=int, default=380)
    parser.add_argument("--steps", type=int, default=50)
    parser.add_argument("--seed", type=int, default=12345)
    parser.add_argument("--model-root", type=Path, default=Path(os.environ.get("HUNYUAN_ROOT", "")))
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[2]
    multiview_dir = (
        root / "art" / "companions" / args.character / "wip" / "hunyuan"
        / f"multiview-v{args.version}"
    )
    output_dir = multiview_dir.parent
    output = output_dir / f"{args.character}-base-v{args.version}.glb"

    if args.model_root:
        sys.path.insert(0, str(args.model_root))
    from hy3dgen.rembg import BackgroundRemover
    from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline

    images = {}
    remover = BackgroundRemover()
    for view in ("front", "left", "back"):
        path = multiview_dir / f"{view}.png"
        image = Image.open(path).convert("RGBA")
        images[view] = remover(image)

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA PyTorch is required for Hunyuan3D-2mv")
    print(f"CUDA_DEVICE={torch.cuda.get_device_name(0)}")
    print(f"CUDA_VRAM_GB={torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f}")

    pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
        "tencent/Hunyuan3D-2mv",
        subfolder="hunyuan3d-dit-v2-mv",
        variant="fp16",
    )
    # Keep the texture pipeline entirely out of memory. The official 2.0.2
    # custom pipeline already loads shape components in fp16. Do not call its
    # inherited-looking enable_model_cpu_offload(): this release does not
    # define Diffusers' `components` property and that method raises before
    # inference. Memory is instead bounded by the chunked octree decoder.

    started = time.time()
    mesh = pipeline(
        image=images,
        num_inference_steps=args.steps,
        octree_resolution=args.octree_resolution,
        num_chunks=8000,
        generator=torch.Generator(device="cpu").manual_seed(args.seed),
        output_type="trimesh",
    )[0]
    mesh.export(output)
    print(f"OUTPUT={output}")
    print(f"SECONDS={time.time() - started:.1f}")


if __name__ == "__main__":
    main()
