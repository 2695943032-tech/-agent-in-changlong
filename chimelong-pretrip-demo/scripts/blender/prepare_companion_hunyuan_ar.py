"""Prepare elephant/gorilla Hunyuan meshes as texture-free display/mobile GLBs."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


ROOT = Path(__file__).resolve().parents[2]


CONFIGS = {
    "elephant": {
        "skin": (0.37, 0.55, 0.68),
        "dark": (0.025, 0.075, 0.15),
        "accent": (0.01, 0.72, 0.78),
        "secondary": (0.98, 0.29, 0.035),
        "iris": (0.0, 0.78, 0.86),
        "micro": 0.00028,
    },
    "gorilla": {
        "skin": (0.035, 0.045, 0.065),
        "dark": (0.015, 0.018, 0.028),
        "accent": (0.34, 0.10, 0.92),
        "secondary": (0.98, 0.72, 0.015),
        "iris": (0.39, 0.10, 0.86),
        "micro": 0.00042,
    },
}


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("character", choices=sorted(CONFIGS))
    parser.add_argument("--version", type=int, default=1)
    parser.add_argument("--display-faces", type=int, default=240_000)
    parser.add_argument("--mobile-faces", type=int, default=80_000)
    return parser.parse_args(bpy.app.driver_namespace.get("argv", []))


def material(name, color, roughness=0.66, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    shader = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    return mat


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def triangle_count(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    count = len(mesh.loop_triangles)
    evaluated.to_mesh_clear()
    return count


def add_relief(name, location, scale, mat, rotation_z=0.0, bevel=0.006):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=(0, 0, rotation_z))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    select_only(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Physical edge bevel", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def add_ellipsoid(name, location, scale, mat, segments=32):
    """Add a shallow rounded facial layer; spheres are never used as head bases."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=16, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    select_only(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def polygon_center(mesh, polygon):
    return sum((mesh.vertices[index].co for index in polygon.vertices), Vector()) / len(polygon.vertices)


def main(character, version, display_target, mobile_target):
    cfg = CONFIGS[character]
    wip = ROOT / "art" / "companions" / character / "wip" / "hunyuan"
    refs = ROOT / "art" / "companions" / character / "references"
    public = ROOT / "public" / "models" / "companions"
    source = wip / f"{character}-base-v{version}.glb"
    blend = ROOT / "art" / "companions" / character / f"{character}-companion-hunyuan-v{version}.blend"
    display = wip / f"{character}-display-v{version}.glb"
    mobile = public / f"{character}-companion-ar-v{version}.glb"
    preview = refs / f"{character}-companion-hunyuan-preview-v{version}.png"
    for directory in (wip, refs, public):
        directory.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = {
        "skin": material(f"{character} skin", cfg["skin"], 0.72),
        "dark": material(f"{character} charcoal", cfg["dark"], 0.64),
        "accent": material(f"{character} clothing accent", cfg["accent"], 0.54),
        "secondary": material(f"{character} warm accent", cfg["secondary"], 0.48),
        "white": material(f"{character} warm white", (0.94, 0.93, 0.88), 0.70),
        "iris": material(f"{character} iris", cfg["iris"], 0.30),
        "face": material(f"{character} face mask", (0.56, 0.43, 0.33), 0.75),
        "shorts": material(f"{character} turquoise shorts", (0.02, 0.64, 0.62), 0.58),
    }

    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"No mesh imported from {source}")
    body = max(meshes, key=triangle_count)
    body.name = f"{character.title()}_Hunyuan_Body"
    body.rotation_euler[0] = math.radians(90)
    select_only(body)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    corners = [body.matrix_world @ Vector(corner) for corner in body.bound_box]
    minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
    maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
    body.location += Vector((-(minimum.x + maximum.x) / 2, -(minimum.y + maximum.y) / 2, -minimum.z))
    select_only(body)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.context.view_layer.update()

    corners = [body.matrix_world @ Vector(corner) for corner in body.bound_box]
    minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
    maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
    width, depth, height = maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z
    front_y = minimum.y - depth * 0.008

    body.data.materials.clear()
    material_order = ("skin", "dark", "accent", "secondary", "white", "face", "shorts")
    for key in material_order:
        body.data.materials.append(mats[key])

    # Color solid geometry regions directly. This is vertex/face material data,
    # never a projected image texture, so it remains clean at any camera range.
    for polygon in body.data.polygons:
        center = polygon_center(body.data, polygon)
        nx = abs(center.x) / max(width, 1e-6)
        nz = center.z / max(height, 1e-6)
        frontness = (center.y - minimum.y) / max(depth, 1e-6)
        index = 0
        if character == "elephant":
            if nz < 0.13 and nx < 0.34:
                index = 4
            elif 0.22 < nz < 0.39 and nx < 0.30:
                index = 1
            elif 0.40 < nz < 0.64 and nx < 0.30:
                index = 2
            elif 0.34 < nz < 0.50 and 0.12 < nx < 0.28 and frontness < 0.46:
                index = 3
        else:
            if nz < 0.14 and nx < 0.34:
                index = 4
            elif 0.21 < nz < 0.39 and nx < 0.34:
                index = 6
            elif 0.40 < nz < 0.66 and nx < 0.34:
                index = 2
        polygon.material_index = index
        polygon.use_smooth = True

    relief = []
    eye_z = height * (0.805 if character == "elephant" else 0.785)
    eye_x = width * (0.105 if character == "elephant" else 0.095)
    surface_tree = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())

    def facial_surface_y(x, z):
        hit, _normal, _index, _distance = surface_tree.ray_cast(
            Vector((x, minimum.y - depth, z)), Vector((0, 1, 0))
        )
        return (hit.y if hit else minimum.y) - depth * 0.004

    # Gorilla's tan facial mask is a real rounded layer, not a projected color patch.
    if character == "gorilla":
        mask_y = facial_surface_y(0, height * 0.79)
        relief.append(add_ellipsoid("FaceMask.Upper", (0, mask_y, height * 0.79), (width * 0.145, depth * 0.014, height * 0.082), mats["face"], 40))
        muzzle_y = facial_surface_y(0, height * 0.715)
        relief.append(add_ellipsoid("FaceMask.Muzzle", (0, muzzle_y - depth * 0.006, height * 0.715), (width * 0.115, depth * 0.019, height * 0.046), mats["face"], 36))
        relief.append(add_ellipsoid("Nose", (0, muzzle_y - depth * 0.027, height * 0.735), (width * 0.040, depth * 0.009, height * 0.016), mats["dark"], 24))

    for side, label in ((-1, "L"), (1, "R")):
        x = eye_x * side
        eye_y = facial_surface_y(x, eye_z)
        if character == "gorilla":
            eye_y -= depth * 0.024
        relief.append(add_ellipsoid(f"EyeWhite.{label}", (x, eye_y, eye_z), (width * 0.047, depth * 0.016, height * 0.034), mats["white"]))
        relief.append(add_ellipsoid(f"Iris.{label}", (x, eye_y - depth * 0.018, eye_z), (width * 0.025, depth * 0.009, height * 0.022), mats["iris"], 24))
        relief.append(add_ellipsoid(f"Pupil.{label}", (x, eye_y - depth * 0.029, eye_z), (width * 0.010, depth * 0.006, height * 0.014), mats["dark"], 20))
        brow_y = facial_surface_y(x, eye_z + height * 0.047)
        if character == "gorilla":
            brow_y -= depth * 0.021
        relief.append(add_relief(f"Brow.{label}", (x, brow_y, eye_z + height * 0.047), (width * 0.055, depth * 0.010, height * 0.008), mats["dark"], rotation_z=-0.20 * side, bevel=height * 0.002))

    if character == "elephant":
        # Crisp clothing details complement the generated vest/bag volume.
        bag_y = facial_surface_y(width * 0.20, height * 0.44)
        relief.append(add_relief("Satchel.Pixel.White", (width * 0.225, bag_y - depth * 0.016, height * 0.45), (width * 0.012, depth * 0.008, height * 0.011), mats["white"], bevel=height * 0.0015))
        shorts_y = facial_surface_y(width * 0.115, height * 0.305)
        relief.append(add_relief("Shorts.Pixel.Cyan", (width * 0.115, shorts_y, height * 0.305), (width * 0.011, depth * 0.010, height * 0.010), mats["accent"], bevel=height * 0.0015))
    else:
        pouch_y = facial_surface_y(0, height * 0.405)
        relief.append(add_relief("WaistPouch", (0, pouch_y, height * 0.405), (width * 0.105, depth * 0.020, height * 0.035), mats["secondary"], bevel=height * 0.008))
        relief.append(add_relief("WaistPouch.Pixel", (width * 0.035, pouch_y - depth * 0.024, height * 0.414), (width * 0.010, depth * 0.009, height * 0.009), mats["white"], bevel=height * 0.0015))

    # Real micro geometry: procedural clouds displace the high-density mesh.
    surface = bpy.data.textures.new(f"{character} procedural micro surface", type="CLOUDS")
    surface.noise_scale = height * (0.0032 if character == "elephant" else 0.0026)
    surface.noise_depth = 1
    displace = body.modifiers.new("Procedural geometric micro relief", "DISPLACE")
    displace.texture = surface
    displace.texture_coords = "GLOBAL"
    displace.strength = height * cfg["micro"]
    displace.mid_level = 0.5
    select_only(body)
    bpy.ops.object.modifier_apply(modifier=displace.name)

    source_triangles = triangle_count(body)
    decimate = body.modifiers.new("Display triangle budget", "DECIMATE")
    decimate.decimate_type = "COLLAPSE"
    decimate.ratio = min(1.0, display_target / max(source_triangles, 1))
    decimate.use_collapse_triangulate = True
    select_only(body)
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    display_triangles = triangle_count(body) + sum(triangle_count(obj) for obj in relief)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))

    def export_selected(filepath, objects):
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.export_scene.gltf(
            filepath=str(filepath), export_format="GLB", use_selection=True,
            export_animations=False, export_apply=True,
        )

    export_selected(display, [body, *relief])
    mobile_body = body.copy()
    mobile_body.data = body.data.copy()
    bpy.context.collection.objects.link(mobile_body)
    mobile_body.name = f"{character.title()}_Mobile_LOD"
    mobile_decimate = mobile_body.modifiers.new("Mobile triangle budget", "DECIMATE")
    mobile_decimate.decimate_type = "COLLAPSE"
    mobile_decimate.ratio = min(1.0, mobile_target / max(triangle_count(mobile_body), 1))
    mobile_decimate.use_collapse_triangulate = True
    select_only(mobile_body)
    bpy.ops.object.modifier_apply(modifier=mobile_decimate.name)
    mobile_triangles = triangle_count(mobile_body) + sum(triangle_count(obj) for obj in relief)
    export_selected(mobile, [mobile_body, *relief])

    body.hide_render = False
    mobile_body.hide_render = True
    bpy.ops.mesh.primitive_plane_add(size=height * 5, location=(0, 0, -height * 0.003))
    floor = bpy.context.object
    floor.data.materials.append(material("Preview floor", (0.07, 0.085, 0.11), 0.88))
    world = bpy.context.scene.world or bpy.data.worlds.new("Preview world")
    bpy.context.scene.world = world
    world.color = (0.018, 0.026, 0.04)
    for location, energy, size, color in (
        ((-width * 2, -depth * 3, height * 1.3), 620, height * 0.8, (1.0, 0.82, 0.67)),
        ((width * 2, -depth, height), 430, height * 0.65, (0.48, 0.72, 1.0)),
        ((0, depth * 2.5, height * 1.2), 460, height * 0.7, (0.62, 1.0, 0.84)),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy, light.data.size, light.data.color = energy, size, color
        look_at(light, (0, 0, height * 0.52))
    bpy.ops.object.camera_add(location=(width * 1.15, -depth * 3.1, height * 0.56))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = height * 1.16
    look_at(camera, (0, 0, height * 0.52))
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 1100
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(preview)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)

    report = {
        "character": character,
        "source_triangles": source_triangles,
        "display_triangles": display_triangles,
        "mobile_triangles": mobile_triangles,
        "display": str(display),
        "mobile": str(mobile),
        "blend": str(blend),
        "preview": str(preview),
    }
    print("COMPANION_REPORT=" + json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    # Blender owns sys.argv; keep script args after the final `--`.
    import sys
    raw = sys.argv[sys.argv.index("--") + 1:]
    bpy.app.driver_namespace["argv"] = raw
    args = parse_args()
    main(args.character, args.version, args.display_faces, args.mobile_faces)
