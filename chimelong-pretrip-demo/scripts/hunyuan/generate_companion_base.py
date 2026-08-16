"""Generate clean high-detail companion base meshes with Hunyuan3D-2mini."""

import argparse
from pathlib import Path

import torch
from PIL import Image
from hy3dgen.rembg import BackgroundRemover
from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline


ROOT = Path(__file__).resolve().parents[2]


def prepare_input(character: str, version: int) -> tuple[Image.Image, Path]:
    approved = ROOT / f"art/companions/{character}/references/{character}-model-input-v{version}.png"
    source = ROOT / f"public/companions/{character}-selection.png"
    output = ROOT / f"art/companions/{character}/wip/hunyuan/{character}-front-input-v{version}.png"
    if approved.exists():
        foreground = Image.open(approved).convert("RGBA")
        canvas = Image.new("RGBA", (896, 896), (0, 0, 0, 0))
        foreground.thumbnail((824, 824), Image.Resampling.LANCZOS)
        canvas.alpha_composite(foreground, ((896 - foreground.width) // 2, (896 - foreground.height) // 2))
        output.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(output)
        return canvas, output
    image = Image.open(source).convert("RGB")
    canvas = Image.new("RGB", (896, 896), "white")
    image.thumbnail((824, 824), Image.Resampling.LANCZOS)
    canvas.paste(image, ((896 - image.width) // 2, (896 - image.height) // 2))
    foreground = BackgroundRemover()(canvas)
    alpha = foreground.getchannel("A").point(lambda value: 255 if value >= 245 else 0)
    foreground.putalpha(alpha)
    output.parent.mkdir(parents=True, exist_ok=True)
    foreground.save(output)
    return foreground, output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("character", choices=("koala", "giraffe"))
    parser.add_argument("--version", type=int, default=2)
    parser.add_argument("--seed", type=int)
    args = parser.parse_args()
    image, input_path = prepare_input(args.character, args.version)
    output = ROOT / f"art/companions/{args.character}/wip/hunyuan/{args.character}-base-v{args.version}.glb"
    print(f"Prepared: {input_path}")
    pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
        "tencent/Hunyuan3D-2mini",
        subfolder="hunyuan3d-dit-v2-mini",
        device="cuda",
        dtype=torch.float16,
    )
    seed = args.seed if args.seed is not None else (20260821 if args.character == "koala" else 20260822)
    mesh = pipeline(
        image=image,
        num_inference_steps=30,
        guidance_scale=5.5,
        octree_resolution=320,
        generator=torch.Generator(device="cuda").manual_seed(seed),
    )[0]
    mesh.export(output)
    print(f"Exported: {output}")


if __name__ == "__main__":
    main()
