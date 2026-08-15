"""Generate a detailed companion base mesh from front/left/back references."""

import argparse
from pathlib import Path

import torch
from PIL import Image

from hy3dgen.rembg import BackgroundRemover
from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline


ROOT = Path(__file__).resolve().parents[2]
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("character", choices=("koala", "giraffe", "tiger", "elephant", "gorilla"))
    parser.add_argument("--version", type=int, required=True)
    parser.add_argument("--seed", type=int)
    parser.add_argument("--views", nargs="+", choices=("front", "left", "back"), default=("front", "left", "back"))
    args = parser.parse_args()
    input_dir = ROOT / f"art/companions/{args.character}/wip/hunyuan/multiview-v{args.version}"
    output = ROOT / f"art/companions/{args.character}/wip/hunyuan/{args.character}-base-v{args.version}.glb"
    remover = BackgroundRemover()
    images = {}
    for view in args.views:
        image = Image.open(input_dir / f"{view}-source.png").convert("RGBA")
        # Preserve approved alpha mattes. Flattening to RGB here used to turn
        # transparent backgrounds white, which the remover occasionally rebuilt
        # as floor/wall geometry attached to the character.
        alpha = image.getchannel("A")
        images[view] = image if alpha.getextrema()[0] < 250 else remover(image.convert("RGB"))
        images[view].save(input_dir / f"{view}.png")

    pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
        "tencent/Hunyuan3D-2mv",
        subfolder="hunyuan3d-dit-v2-mv",
        variant="fp16",
        device="cuda",
        dtype=torch.float16,
    )
    mesh = pipeline(
        image=images,
        num_inference_steps=50,
        guidance_scale=5.5,
        octree_resolution=420,
        num_chunks=20000,
        generator=torch.Generator(device="cuda").manual_seed(
            args.seed if args.seed is not None else {
                "giraffe": 20260823,
                "koala": 20260824,
                "tiger": 20260825,
                "elephant": 20260826,
                "gorilla": 20260827,
            }[args.character]
        ),
        output_type="trimesh",
    )[0]
    mesh.export(output)
    print(f"Exported {output}")


if __name__ == "__main__":
    main()
