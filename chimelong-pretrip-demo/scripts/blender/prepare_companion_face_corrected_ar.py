"""Build face-corrected companion GLBs using the native generated head surface.

Facial colors are assigned to polygons already belonging to the Hunyuan mesh.
No camera-facing eye, brow, mask or muzzle objects are added, so every facial
feature inherits the original forehead, eye-socket and muzzle depth.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
CONFIGS = {
    "tiger": {
        "source": 3, "output": 4,
        "skin": (0.91, 0.88, 0.79), "dark": (0.018, 0.025, 0.035),
        "accent": (0.93, 0.035, 0.025), "secondary": (0.96, 0.13, 0.09),
        "iris": (1.0, 0.44, 0.012), "face": (0.98, 0.96, 0.88),
        "shorts": (0.025, 0.035, 0.055), "micro": 0.00035,
    },
    "elephant": {
        "source": 1, "output": 2,
        "skin": (0.37, 0.55, 0.68), "dark": (0.025, 0.075, 0.15),
        "accent": (0.01, 0.72, 0.78), "secondary": (0.98, 0.29, 0.035),
        "iris": (0.0, 0.78, 0.86), "face": (0.94, 0.93, 0.88),
        "shorts": (0.035, 0.12, 0.28), "micro": 0.00028,
    },
    "gorilla": {
        "source": 1, "output": 2,
        "skin": (0.035, 0.045, 0.065), "dark": (0.015, 0.018, 0.028),
        "accent": (0.34, 0.10, 0.92), "secondary": (0.98, 0.72, 0.015),
        "iris": (0.39, 0.10, 0.86), "face": (0.56, 0.43, 0.33),
        "shorts": (0.02, 0.64, 0.62), "micro": 0.00042,
    },
}


def args():
    parser = argparse.ArgumentParser()
    parser.add_argument("character", choices=sorted(CONFIGS))
    parser.add_argument("--source-version", type=int)
    parser.add_argument("--output-version", type=int)
    parser.add_argument("--display-faces", type=int, default=240_000)
    parser.add_argument("--mobile-faces", type=int, default=80_000)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:])


def material(name, color, roughness=0.68):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    shader = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    return mat


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def triangles(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    count = len(mesh.loop_triangles)
    evaluated.to_mesh_clear()
    return count


def ellipse(x, z, cx, cz, rx, rz):
    return ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1.0


def rotated_ellipse(x, z, cx, cz, rx, rz, angle):
    cosine, sine = math.cos(angle), math.sin(angle)
    dx, dz = x - cx, z - cz
    u = dx * cosine + dz * sine
    v = -dx * sine + dz * cosine
    return (u / rx) ** 2 + (v / rz) ** 2 <= 1.0


def facial_material(character, x, z, normal_y):
    """Return material key for a point on the native head surface."""
    # Face toward negative Y after the source-axis correction. Using the local
    # surface normal avoids elephant-trunk and muzzle depth corrupting a global
    # front-plane calculation.
    if normal_y > -0.52:
        return None

    if character == "tiger":
        # Native eye sockets first, then nested iris and pupil regions.
        for side in (-1, 1):
            ex = 0.115 * side
            if ellipse(x, z, ex, 0.825, 0.052, 0.038):
                if ellipse(x, z, ex, 0.825, 0.012, 0.017):
                    return "dark"
                if ellipse(x, z, ex, 0.825, 0.027, 0.025):
                    return "iris"
                return "white"
            if rotated_ellipse(x, z, ex, 0.871, 0.062, 0.010, -0.22 * side):
                return "dark"
            for stripe_z, angle in ((0.801, 0.13), (0.782, 0.0), (0.763, -0.13)):
                if rotated_ellipse(x, z, 0.235 * side, stripe_z, 0.050, 0.008, angle * side):
                    return "dark"
        if ellipse(x, z, 0.0, 0.790, 0.034, 0.018):
            return "secondary"
        if abs(x) < 0.014 and 0.862 < z < 0.958:
            return "dark"
        for stripe_z, half_width in ((0.937, 0.077), (0.908, 0.066), (0.879, 0.054)):
            if abs(z - stripe_z) < 0.009 and abs(x) < half_width:
                return "dark"

    elif character == "elephant":
        for side in (-1, 1):
            # Elephant's total width includes both large ears. Its actual eye
            # spacing is therefore much narrower than a whole-body ratio.
            ex = 0.074 * side
            if ellipse(x, z, ex, 0.755, 0.038, 0.035):
                if ellipse(x, z, ex, 0.755, 0.009, 0.015):
                    return "dark"
                if ellipse(x, z, ex, 0.755, 0.020, 0.022):
                    return "iris"
                return "white"
            if rotated_ellipse(x, z, ex, 0.800, 0.042, 0.008, -0.14 * side):
                return "dark"

    else:
        # Compact mask follows the native forehead/muzzle rather than floating
        # in front of it. Eyes override the mask and keep their socket depth.
        result = "face" if ellipse(x, z, 0.0, 0.765, 0.205, 0.122) else None
        for side in (-1, 1):
            ex = 0.095 * side
            if ellipse(x, z, ex, 0.785, 0.047, 0.035):
                if ellipse(x, z, ex, 0.785, 0.011, 0.016):
                    return "dark"
                if ellipse(x, z, ex, 0.785, 0.024, 0.023):
                    return "iris"
                return "white"
            if rotated_ellipse(x, z, ex, 0.831, 0.057, 0.010, -0.15 * side):
                return "dark"
        if ellipse(x, z, 0.0, 0.725, 0.043, 0.018):
            return "dark"
        return result
    return None


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def main(character, source_version, output_version, display_target, mobile_target):
    cfg = CONFIGS[character]
    wip = ROOT / "art" / "companions" / character / "wip" / "hunyuan"
    refs = ROOT / "art" / "companions" / character / "references"
    public = ROOT / "public" / "models" / "companions"
    source = wip / f"{character}-base-v{source_version}.glb"
    blend = ROOT / "art" / "companions" / character / f"{character}-companion-face-corrected-v{output_version}.blend"
    display = wip / f"{character}-display-v{output_version}.glb"
    mobile = public / f"{character}-companion-ar-v{output_version}.glb"
    preview = refs / f"{character}-face-corrected-preview-v{output_version}.png"

    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = {key: material(f"{character} {key}", cfg[key]) for key in (
        "skin", "dark", "accent", "secondary", "iris", "face", "shorts"
    )}
    mats["white"] = material(f"{character} eye white", (0.96, 0.95, 0.90))

    bpy.ops.import_scene.gltf(filepath=str(source))
    body = max((obj for obj in bpy.context.scene.objects if obj.type == "MESH"), key=triangles)
    body.name = f"{character.title()}_NativeFace_Body"
    body.rotation_euler[0] = math.radians(90)
    select_only(body)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    corners = [body.matrix_world @ Vector(corner) for corner in body.bound_box]
    minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
    maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
    body.location += Vector((-(minimum.x + maximum.x) / 2, -(minimum.y + maximum.y) / 2, -minimum.z))
    select_only(body)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    corners = [body.matrix_world @ Vector(corner) for corner in body.bound_box]
    minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
    maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
    width, depth, height = maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z

    order = ("skin", "dark", "accent", "secondary", "white", "iris", "face", "shorts")
    indices = {key: index for index, key in enumerate(order)}

    def paint_native_surface(obj):
        """Assign materials on the native curved surface, never on added face planes."""
        obj.data.materials.clear()
        for key in order:
            obj.data.materials.append(mats[key])
        for polygon in obj.data.polygons:
            center = sum((obj.data.vertices[i].co for i in polygon.vertices), Vector()) / len(polygon.vertices)
            normal = sum((obj.data.vertices[i].normal for i in polygon.vertices), Vector()).normalized()
            x, y, z = center.x / width, center.y / depth, center.z / height
            nx = abs(x)
            # The trunk, muzzle and tail can share the same height as the
            # jacket.  Keep garment bands behind the foremost 22% of the
            # model so those projecting facial/body features stay unpainted.
            on_torso = y > -0.28
            key = "skin"
            if character == "tiger":
                if z < 0.055:
                    key = "dark"
                elif on_torso and 0.24 < z < 0.40 and nx < 0.34:
                    key = "shorts"
                elif on_torso and 0.42 < z < 0.66 and nx < 0.34:
                    key = "accent"
            elif character == "elephant":
                if z < 0.13 and nx < 0.34:
                    key = "white"
                elif on_torso and 0.22 < z < 0.39 and nx < 0.30:
                    key = "shorts"
                elif on_torso and 0.40 < z < 0.64 and nx < 0.30:
                    key = "accent"
            else:
                if z < 0.14 and nx < 0.34:
                    key = "white"
                elif on_torso and 0.21 < z < 0.39 and nx < 0.34:
                    key = "shorts"
                elif on_torso and 0.40 < z < 0.61 and nx < 0.34:
                    key = "accent"
            face_key = facial_material(character, x, z, normal.y)
            if face_key:
                key = face_key
            polygon.material_index = indices[key]
            polygon.use_smooth = True

    surface = bpy.data.textures.new(f"{character} micro geometry", type="CLOUDS")
    surface.noise_scale = height * 0.003
    surface.noise_depth = 1
    displace = body.modifiers.new("Procedural micro relief", "DISPLACE")
    displace.texture = surface
    displace.texture_coords = "GLOBAL"
    displace.strength = height * cfg["micro"]
    displace.mid_level = 0.5
    select_only(body)
    bpy.ops.object.modifier_apply(modifier=displace.name)

    source_triangles = triangles(body)
    display_decimate = body.modifiers.new("Display triangle budget", "DECIMATE")
    display_decimate.ratio = min(1.0, display_target / source_triangles)
    display_decimate.use_collapse_triangulate = True
    select_only(body)
    bpy.ops.object.modifier_apply(modifier=display_decimate.name)
    mobile_body = body.copy()
    mobile_body.data = body.data.copy()
    bpy.context.collection.objects.link(mobile_body)
    mobile_decimate = mobile_body.modifiers.new("Mobile triangle budget", "DECIMATE")
    mobile_decimate.ratio = min(1.0, mobile_target / triangles(mobile_body))
    mobile_decimate.use_collapse_triangulate = True
    select_only(mobile_body)
    bpy.ops.object.modifier_apply(modifier=mobile_decimate.name)

    # Generated/decimated input can retain degenerate loops. Validate before
    # material partitioning and GLB export for strict browser compatibility.
    body.data.validate(clean_customdata=False)
    mobile_body.data.validate(clean_customdata=False)

    paint_native_surface(body)
    paint_native_surface(mobile_body)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))

    def export(path, obj):
        select_only(obj)
        bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True,
                                  export_animations=False, export_apply=True)

    export(display, body)
    export(mobile, mobile_body)

    mobile_body.hide_render = True
    bpy.ops.mesh.primitive_plane_add(size=height * 5, location=(0, 0, -height * 0.003))
    bpy.context.object.data.materials.append(material("Preview floor", (0.07, 0.085, 0.11), 0.88))
    for location, energy, color in (
        ((-width * 2, -depth * 3, height * 1.3), 620, (1.0, 0.82, 0.67)),
        ((width * 2, -depth, height), 430, (0.48, 0.72, 1.0)),
        ((0, depth * 2.5, height * 1.2), 460, (0.62, 1.0, 0.84)),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy, light.data.size, light.data.color = energy, height * 0.75, color
        look_at(light, (0, 0, height * 0.55))
    bpy.ops.object.camera_add(location=(width * 1.10, -depth * 3.2, height * 0.60))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = height * 1.16
    look_at(camera, (0, 0, height * 0.52))
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 1000, 1100
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(preview)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)

    print("FACE_CORRECTED_REPORT=" + json.dumps({
        "character": character, "source_triangles": source_triangles,
        "display_triangles": triangles(body), "mobile_triangles": triangles(mobile_body),
        "blend": str(blend), "display": str(display), "mobile": str(mobile),
        "preview": str(preview),
    }, ensure_ascii=False))


if __name__ == "__main__":
    parsed = args()
    config = CONFIGS[parsed.character]
    main(parsed.character, parsed.source_version or config["source"],
         parsed.output_version or config["output"], parsed.display_faces, parsed.mobile_faces)
