"""Prepare Hunyuan tiger display/mobile GLBs without baked image textures."""
from __future__ import annotations

import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
WIP = ROOT / "art" / "companions" / "tiger" / "wip" / "hunyuan"
REF = ROOT / "art" / "companions" / "tiger" / "references"
PUBLIC = ROOT / "public" / "models" / "companions"
SOURCE = WIP / "tiger-base-v3.glb"
BLEND = ROOT / "art" / "companions" / "tiger" / "tiger-companion-hunyuan-v3.blend"
DISPLAY = WIP / "tiger-display-v3.glb"
MOBILE = PUBLIC / "tiger-companion-ar-v3.glb"
PREVIEW = REF / "tiger-companion-hunyuan-preview-v3.png"
for directory in (WIP, REF, PUBLIC):
    directory.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, roughness=0.65, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    shader = next((node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
    if shader is None:
        shader = mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        output = next((node for node in mat.node_tree.nodes if node.type == "OUTPUT_MATERIAL"), None)
        if output is None:
            output = mat.node_tree.nodes.new("ShaderNodeOutputMaterial")
        mat.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    return mat


WHITE = material("Tiger warm white", (0.91, 0.88, 0.79), 0.7)
BLACK = material("Tiger charcoal", (0.018, 0.025, 0.035), 0.62)
RED = material("Tiger explorer red", (0.93, 0.035, 0.025), 0.55)
CORAL = material("Tiger coral", (0.96, 0.13, 0.09), 0.5)
AMBER = material("Tiger amber", (1.0, 0.44, 0.012), 0.28)
CREAM = material("Tiger cream", (0.98, 0.96, 0.88), 0.66)
CYAN = material("Tiger cyan pixel", (0.02, 0.76, 0.82), 0.38)


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def triangle_count(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    count = len(mesh.loop_triangles)
    evaluated.to_mesh_clear()
    return count


def add_relief(name, location, scale, mat, rotation_z=0.0, bevel=0.006):
    # World axes are X=width, Y=depth and Z=height after the imported body is
    # axis-corrected. Keep relief thickness on Y; only rotate within the face plane.
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=(0, 0, rotation_z))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    select_only(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Relief bevel", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.import_scene.gltf(filepath=str(SOURCE))
body = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH")
body.name = "Tiger_Hunyuan_Body"
body.rotation_euler[0] = math.radians(90)
select_only(body)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

# Center on the origin and put the soles exactly on the ground.
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
height = maximum.z - minimum.z
width = maximum.x - minimum.x
depth = maximum.y - minimum.y
front_y = minimum.y - depth * 0.006

body.data.materials.clear()
for mat in (WHITE, BLACK, RED, CREAM):
    body.data.materials.append(mat)

# Solid material regions remain texture-free and survive GLB export. The base
# material is warm white; broad clothing regions are selected from face centers.
for polygon in body.data.polygons:
    center = body.data.vertices[polygon.vertices[0]].co.copy()
    if len(polygon.vertices) > 1:
        center = sum((body.data.vertices[index].co for index in polygon.vertices), Vector()) / len(polygon.vertices)
    nx = abs(center.x) / max(width, 1e-6)
    nz = center.z / height
    frontness = (center.y - minimum.y) / max(depth, 1e-6)
    material_index = 0
    if 0.24 < nz < 0.40 and nx < 0.34:
        material_index = 1  # shorts
    elif 0.42 < nz < 0.66 and nx < 0.34 and frontness < 0.62:
        material_index = 2  # red vest
    elif nz < 0.055:
        material_index = 1  # dark soles
    polygon.material_index = material_index

# Physical face relief, scaled from measured mesh bounds. No decal or texture.
relief = []
head_center_z = height * 0.825
for name, z, half_width in (
    ("Wang.Top", height * 0.937, width * 0.075),
    ("Wang.Middle", height * 0.907, width * 0.064),
    ("Wang.Bottom", height * 0.877, width * 0.052),
):
    relief.append(add_relief(name, (0, front_y, z), (half_width, depth * 0.010, height * 0.008), BLACK))
relief.append(add_relief("Wang.Vertical", (0, front_y - depth * 0.006, height * 0.907), (width * 0.012, depth * 0.010, height * 0.055), BLACK))

for side, label in ((-1, "L"), (1, "R")):
    x = width * 0.115 * side
    relief.append(add_relief(f"EyeWhite.{label}", (x, front_y, height * 0.825), (width * 0.050, depth * 0.012, height * 0.035), CREAM, bevel=0.012))
    relief.append(add_relief(f"Iris.{label}", (x, front_y - depth * 0.012, height * 0.825), (width * 0.026, depth * 0.010, height * 0.023), AMBER, bevel=0.008))
    relief.append(add_relief(f"Pupil.{label}", (x, front_y - depth * 0.020, height * 0.825), (width * 0.010, depth * 0.008, height * 0.014), BLACK, bevel=0.004))
    relief.append(add_relief(f"Brow.{label}", (x, front_y, height * 0.867), (width * 0.060, depth * 0.010, height * 0.009), BLACK, rotation_z=-0.25 * side))
    for index, (z, angle) in enumerate(((0.804, 0.13), (0.785, 0.0), (0.766, -0.13)), start=1):
        relief.append(add_relief(f"CheekStripe.{label}.{index}", (width * 0.235 * side, front_y, height * z), (width * 0.046, depth * 0.009, height * 0.006), BLACK, rotation_z=angle * side, bevel=0.004))

relief.append(add_relief("Nose.Coral", (0, front_y - depth * 0.025, height * 0.789), (width * 0.032, depth * 0.010, height * 0.015), CORAL, rotation_z=math.radians(45), bevel=0.007))

# Small bag pixels are real raised cubes.
relief.append(add_relief("BagPixel.Cyan", (width * 0.20, front_y, height * 0.47), (width * 0.012, depth * 0.010, height * 0.010), CYAN, bevel=0.003))
relief.append(add_relief("BagPixel.White", (width * 0.23, front_y, height * 0.445), (width * 0.010, depth * 0.010, height * 0.009), CREAM, bevel=0.003))

# Procedural geometric micro-relief after subdivision/decimation; no image maps.
surface = bpy.data.textures.new("Tiger procedural micro surface", type="CLOUDS")
surface.noise_scale = height * 0.0035
surface.noise_depth = 1
displace = body.modifiers.new("Procedural micro relief", "DISPLACE")
displace.texture = surface
displace.texture_coords = "GLOBAL"
displace.strength = height * 0.00035
displace.mid_level = 0.5

# Keep the editable master at the display budget.
source_triangles = triangle_count(body)
display_target = 240_000
decimate = body.modifiers.new("Display triangle budget", "DECIMATE")
decimate.decimate_type = "COLLAPSE"
decimate.ratio = min(1.0, display_target / source_triangles)
decimate.use_collapse_triangulate = True
select_only(body)
bpy.ops.object.modifier_apply(modifier=decimate.name)
display_triangles = triangle_count(body) + sum(triangle_count(obj) for obj in relief)

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))

def export_selected(filepath, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.export_scene.gltf(
        filepath=str(filepath), export_format="GLB", use_selection=True,
        export_animations=False, export_apply=True,
    )


export_selected(DISPLAY, [body, *relief])

# Mobile LOD is a duplicate of the display body plus shared relief geometry.
mobile_body = body.copy()
mobile_body.data = body.data.copy()
bpy.context.collection.objects.link(mobile_body)
mobile_body.name = "Tiger_Hunyuan_Body_Mobile_LOD"
mobile_decimate = mobile_body.modifiers.new("Mobile triangle budget", "DECIMATE")
mobile_decimate.decimate_type = "COLLAPSE"
mobile_decimate.ratio = min(1.0, 80_000 / max(triangle_count(mobile_body), 1))
mobile_decimate.use_collapse_triangulate = True
select_only(mobile_body)
bpy.ops.object.modifier_apply(modifier=mobile_decimate.name)
mobile_triangles = triangle_count(mobile_body) + sum(triangle_count(obj) for obj in relief)
body.hide_render = True
export_selected(MOBILE, [mobile_body, *relief])
body.hide_render = False

# Render the display asset from a three-quarter close view.
bpy.ops.mesh.primitive_plane_add(size=height * 5, location=(0, 0, -height * 0.003))
floor = bpy.context.object
floor.name = "PreviewFloor"
floor.data.materials.append(material("Preview floor", (0.07, 0.085, 0.11), 0.88))
mobile_body.hide_render = True
world = bpy.context.scene.world or bpy.data.worlds.new("Preview world")
bpy.context.scene.world = world
world.color = (0.018, 0.026, 0.04)
for location, energy, size, color in (
    ((-width * 2, -depth * 3, height * 1.3), 1100, height * 0.8, (1.0, 0.82, 0.67)),
    ((width * 2, -depth, height), 800, height * 0.65, (0.48, 0.72, 1.0)),
    ((0, depth * 2.5, height * 1.2), 850, height * 0.7, (0.62, 1.0, 0.84)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy, light.data.size, light.data.color = energy, size, color
    look_at(light, (0, 0, height * 0.52))
bpy.ops.object.camera_add(location=(width * 1.2, -depth * 3.1, height * 0.56))
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
scene.render.filepath = str(PREVIEW)
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)

print(f"SOURCE_TRIANGLES={source_triangles}")
print(f"DISPLAY_TRIANGLES={display_triangles}")
print(f"MOBILE_TRIANGLES={mobile_triangles}")
print(f"DISPLAY={DISPLAY}")
print(f"MOBILE={MOBILE}")
print(f"BLEND={BLEND}")
print(f"PREVIEW={PREVIEW}")
