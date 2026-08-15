"""Split an approved companion turnaround into clean model inputs."""

import argparse
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("character", choices=("koala", "giraffe", "tiger", "elephant", "gorilla"))
    parser.add_argument("--version", type=int, required=True)
    args = parser.parse_args()
    source = ROOT / f"art/companions/{args.character}/references/{args.character}-turnaround-v{args.version}.png"
    output = ROOT / f"art/companions/{args.character}/wip/hunyuan/multiview-v{args.version}"
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    # Generated sheets use three equal orthographic panels. Small outer gutters
    # are excluded so chroma-key background cannot become edge-colored geometry.
    gutter = max(2, width // 600)
    panels = {
        "front": (gutter, 0, width // 3 - gutter, height),
        "left": (width // 3 + gutter, 0, 2 * width // 3 - gutter, height),
        "back": (2 * width // 3 + gutter, 0, width - gutter, height),
    }
    output.mkdir(parents=True, exist_ok=True)
    for name, box in panels.items():
        panel = image.crop(box)
        panel.save(output / f"{name}-source.png")
        print(output / f"{name}-source.png")


if __name__ == "__main__":
    main()
