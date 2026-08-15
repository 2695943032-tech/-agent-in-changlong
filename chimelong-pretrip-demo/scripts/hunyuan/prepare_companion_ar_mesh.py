"""Clean, texture and decimate a generated companion mesh for mobile AR."""

import argparse
from pathlib import Path

import numpy as np
import trimesh
import cv2
from PIL import Image
from scipy.ndimage import distance_transform_edt


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


def gorilla_vertex_colors(mesh: trimesh.Trimesh, image: Image.Image, texture: Image.Image) -> np.ndarray:
    """Bake projection to vertices, then paint the convex face in 3D space."""
    uv = projected_uv(mesh, image)
    pixels = np.asarray(texture.convert("RGBA"))
    px = np.clip((uv[:, 0] * (pixels.shape[1] - 1)).round().astype(int), 0, pixels.shape[1] - 1)
    py = np.clip(((1 - uv[:, 1]) * (pixels.shape[0] - 1)).round().astype(int), 0, pixels.shape[0] - 1)
    colors = pixels[py, px].copy()
    vertices = mesh.vertices
    y_min, y_max = vertices[:, 1].min(), vertices[:, 1].max()
    z_mid = np.median(vertices[:, 2])
    height = y_max - y_min
    head_y = (vertices[:, 1] - (y_min + height * .60)) / (height * .40)
    face = (vertices[:, 2] > z_mid + .015) & (head_y > .16) & (head_y < .82) & (np.abs(vertices[:, 0]) < .37)
    # A slightly lighter muzzle distinguishes the projected nose/jaw volume.
    muzzle = face & (head_y > .18) & (head_y < .49) & (np.abs(vertices[:, 0]) < .29)
    colors[face, :3] = np.array([164, 126, 94], dtype=np.uint8)
    colors[muzzle, :3] = np.array([181, 143, 108], dtype=np.uint8)
    colors[:, 3] = 255
    return colors


def edge_safe_texture(image: Image.Image) -> Image.Image:
    """Fill transparent RGB with nearby foreground color to prevent black UV bleed."""
    rgba = np.asarray(image.convert("RGBA")).copy()
    alpha = rgba[:, :, 3]
    missing = alpha < 245
    # Extend the nearest real foreground color into transparent texels. OpenCV
    # inpainting across a large transparent background can invent black stains
    # and smear dark fur over the face, shoes, or clothing.
    _, nearest = distance_transform_edt(missing, return_indices=True)
    rgb = rgba[:, :, :3].copy()
    rgb[missing] = rgb[nearest[0][missing], nearest[1][missing]]
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


def lift_gorilla_shadows(texture: Image.Image) -> Image.Image:
    """Keep charcoal fur readable and prevent projected near-black blotches."""
    rgba = np.asarray(texture.convert("RGBA")).copy()
    rgb = rgba[:, :, :3].astype(np.float32)
    luminance = rgb.mean(axis=2)
    # Smoothly lift only the deepest shadows. Midtones, facial tan, purple
    # clothing and teal shorts retain their authored colors.
    weight = np.clip((105 - luminance) / 105, 0, 1)[:, :, None]
    charcoal = np.array([82, 86, 92], dtype=np.float32)
    rgb = rgb * (1 - weight * .90) + charcoal * (weight * .90)
    rgba[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    # Earlier magenta despill biased the warm facial mask toward olive. Correct
    # only olive pixels in the upper character region; teal shorts stay intact.
    h, w = rgba.shape[:2]
    hsv = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2HSV)
    yy = np.arange(h)[:, None]
    olive = (yy < h * .48) & (hsv[:, :, 0] >= 20) & (hsv[:, :, 0] <= 55) & (hsv[:, :, 1] > 35)
    warm = np.array([174, 137, 105], dtype=np.uint8)
    rgba[olive, :3] = (rgba[olive, :3].astype(np.float32) * .32 + warm * .68).astype(np.uint8)
    # Stabilize the small waist-pouch palette where planar projection stacks
    # several depth layers over the same accessory.
    pouch = (yy > h * .55) & (yy < h * .70) & (np.arange(w)[None, :] > w * .35) & (np.arange(w)[None, :] < w * .65)
    yellowish = pouch & (hsv[:, :, 0] >= 18) & (hsv[:, :, 0] <= 48)
    rgba[yellowish, :3] = np.array([226, 174, 36], dtype=np.uint8)
    # Remove the projected dark band across the central muzzle. Keep the outer
    # charcoal cheek fur and eyebrows untouched; only lift near-black pixels in
    # the warm facial-mask region below the nose.
    xx = np.arange(w)[None, :]
    muzzle_zone = (yy > h * .285) & (yy < h * .435) & (xx > w * .36) & (xx < w * .64)
    current_luma = rgba[:, :, :3].mean(axis=2)
    muzzle_shadow = muzzle_zone & (current_luma < 92)
    muzzle_warm = np.array([151, 113, 84], dtype=np.uint8)
    rgba[muzzle_shadow, :3] = muzzle_warm
    return Image.fromarray(rgba, "RGBA")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("character", choices=("koala", "giraffe", "tiger", "elephant", "gorilla"))
    parser.add_argument("--faces", type=int, default=80_000)
    parser.add_argument("--version", type=int, default=2)
    args = parser.parse_args()
    art = ROOT / f"art/companions/{args.character}"
    source = art / f"wip/hunyuan/{args.character}-base-v{args.version}.glb"
    image_path = art / f"wip/hunyuan/{args.character}-front-input-v{args.version}.png"
    output = art / f"wip/hunyuan/{args.character}-ar-colored-v{args.version}.glb"
    mesh = trimesh.load(source, force="mesh", process=False)
    if args.character == "gorilla" and args.version == 4:
        # Some multiview generations attach paper-thin remnants of the chroma
        # backdrop to the silhouette. Their triangles are orders of magnitude
        # larger than the character's dense surface triangles.
        face_areas = mesh.area_faces
        typical_area = np.median(face_areas[face_areas > 0])
        mesh.update_faces(face_areas < typical_area * 80)
        mesh.remove_unreferenced_vertices()
        # Remove the two dense, axis-aligned backdrop sheets that can remain
        # connected to a hand or shoe after reconstruction. Character surfaces
        # do not occupy a broad plane at these extreme bounds.
        centers = mesh.triangles_center
        normals = np.abs(mesh.face_normals)
        x_cut = np.quantile(mesh.vertices[:, 0], .90)
        y_cut = np.quantile(mesh.vertices[:, 1], .10)
        backdrop = ((centers[:, 0] > x_cut) & (normals[:, 0] > .985)) | ((centers[:, 1] < y_cut) & (normals[:, 1] > .985))
        mesh.update_faces(~backdrop)
        mesh.remove_unreferenced_vertices()
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
    if args.character == "tiger" and args.version >= 6:
        # Compact mascot proportions: shorten the legs below the shorts while
        # preserving the head and upper-body volume from the approved sheet.
        vertices = mesh.vertices.copy()
        y_min, y_max = vertices[:, 1].min(), vertices[:, 1].max()
        leg_top = y_min + (y_max - y_min) * .39
        lower = vertices[:, 1] < leg_top
        vertices[lower, 1] = leg_top + (vertices[lower, 1] - leg_top) * .90
        mesh.vertices = vertices
    if args.character == "gorilla" and args.version == 7:
        # Strengthen the young gorilla silhouette without changing the clean,
        # friendly generated face: broaden upper torso/head and shorten legs.
        vertices = mesh.vertices.copy()
        y_min, y_max = vertices[:, 1].min(), vertices[:, 1].max()
        height = y_max - y_min
        upper = vertices[:, 1] > y_min + height * .43
        lower = ~upper
        vertices[upper, 0] *= 1.08
        vertices[lower, 1] = y_min + (vertices[lower, 1] - y_min) * .93
        mesh.vertices = vertices
    if args.character == "gorilla" and args.version >= 12:
        # Restore a convex gorilla face. The generated front surface was too
        # planar, so dark eye/muzzle textures made the whole face read as a
        # cavity. Push the brow, mid-face, muzzle and chin forward as overlapping
        # smooth volumes; affect only the front half of the head.
        vertices = mesh.vertices.copy()
        y_min, y_max = vertices[:, 1].min(), vertices[:, 1].max()
        z_mid = np.median(vertices[:, 2])
        height = y_max - y_min
        head_y = (vertices[:, 1] - (y_min + height * .60)) / (height * .40)
        front = vertices[:, 2] > z_mid
        central = np.exp(-((vertices[:, 0] / .34) ** 4))
        brow = np.exp(-((head_y - .66) / .16) ** 2) * .045
        midface = np.exp(-((head_y - .48) / .18) ** 2) * .055
        muzzle = np.exp(-((head_y - .35) / .14) ** 2) * .105
        chin = np.exp(-((head_y - .23) / .12) ** 2) * .050
        head_mask = front & (head_y > .05) & (head_y < 1.05) & (np.abs(vertices[:, 0]) < .48)
        displacement = (brow + midface + muzzle + chin) * central
        vertices[head_mask, 2] += displacement[head_mask]
        # Widen the muzzle slightly so the new depth reads as a broad gorilla
        # muzzle rather than a pointed monkey snout.
        muzzle_mask = head_mask & (head_y > .20) & (head_y < .52) & (np.abs(vertices[:, 0]) < .32)
        vertices[muzzle_mask, 0] *= 1.055
        mesh.vertices = vertices
    print(f"Cleaned: {len(components)} components -> {len(kept)}")
    if len(mesh.faces) > args.faces:
        mesh = mesh.simplify_quadric_decimation(face_count=args.faces)
    source_texture = Image.open(image_path).convert("RGBA")
    texture = edge_safe_texture(source_texture)
    if args.character == "koala" and args.version in (14,):
        texture = soften_koala_muzzle(texture)
    if args.character == "gorilla" and args.version >= 5:
        texture = lift_gorilla_shadows(texture)
    if args.character == "gorilla" and args.version >= 13:
        mesh.visual = trimesh.visual.ColorVisuals(mesh=mesh, vertex_colors=gorilla_vertex_colors(mesh, source_texture, texture))
    else:
        mesh.visual = trimesh.visual.texture.TextureVisuals(uv=projected_uv(mesh, source_texture), image=texture)
    mesh.remove_unreferenced_vertices()
    mesh.export(output)
    print(f"Exported {output}: {len(mesh.vertices):,} vertices / {len(mesh.faces):,} faces")


if __name__ == "__main__":
    main()
