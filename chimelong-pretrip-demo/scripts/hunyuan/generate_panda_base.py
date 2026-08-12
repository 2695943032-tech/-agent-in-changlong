"""Generate a higher-detail panda companion base mesh with Hunyuan3D-2mini."""

from pathlib import Path

import torch
from PIL import Image
from hy3dgen.rembg import BackgroundRemover
from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline


ROOT = Path(__file__).resolve().parents[2]
TURNAROUND = ROOT / "art/companions/panda/references/panda-turnaround-v1.png"
INPUT = ROOT / "art/companions/panda/wip/hunyuan/panda-front-input-v1.png"
OUTPUT = ROOT / "art/companions/panda/wip/hunyuan/panda-base-v1.glb"


def prepare_front_view() -> Image.Image:
    """Crop the clean front pose and remove the sheet caption/border."""
    sheet = Image.open(TURNAROUND).convert("RGB")
    front = sheet.crop((48, 80, 566, 884))
    canvas = Image.new("RGB", (896, 896), (255, 255, 255))
    front.thumbnail((780, 780), Image.Resampling.LANCZOS)
    canvas.paste(front, ((896 - front.width) // 2, (896 - front.height) // 2))
    INPUT.parent.mkdir(parents=True, exist_ok=True)
    # Hunyuan interprets opaque backgrounds as geometry, so an alpha mask is mandatory.
    foreground = BackgroundRemover()(canvas)
    # The studio backdrop leaves a faint high-frequency halo in U2Net's soft mask.
    # A hard confidence cutoff keeps the silhouette while removing phantom planes.
    alpha = foreground.getchannel("A").point(lambda value: 255 if value >= 250 else 0)
    foreground.putalpha(alpha)
    foreground.save(INPUT)
    return foreground


def main() -> None:
    torch.set_grad_enabled(False)
    image = prepare_front_view()
    print(f"Prepared input: {INPUT}")
    print("Loading Tencent Hunyuan3D-2mini geometry model...")
    pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
        "tencent/Hunyuan3D-2mini",
        subfolder="hunyuan3d-dit-v2-mini",
        device="cuda",
        dtype=torch.float16,
    )
    print("Generating 3D base mesh...")
    mesh = pipeline(
        image=image,
        num_inference_steps=30,
        guidance_scale=5.5,
        octree_resolution=320,
        generator=torch.Generator(device="cuda").manual_seed(20260812),
    )[0]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(OUTPUT)
    print(f"Exported: {OUTPUT}")


if __name__ == "__main__":
    main()
