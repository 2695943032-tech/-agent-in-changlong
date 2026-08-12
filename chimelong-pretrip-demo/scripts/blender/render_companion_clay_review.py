"""Import a generated GLB and render front/left/back clay validation views."""
from __future__ import annotations

import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


args = sys.argv[sys.argv.index("--") + 1:]
if len(args) != 5:
    raise SystemExit(
        "Usage: blender -b --python script.py -- MODEL OUTPUT_DIR BLEND CHARACTER VERSION"
    )
model_path, output_dir, blend_path = map(Path, args[:3])
character, version = args[3:]
output_dir.mkdir(parents=True, exist_ok=True)


def material(name, color, roughness=0.76):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    return mat


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(model_path))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
clay = material("Neutral clay", (0.66, 0.70, 0.74), 0.8)
for obj in meshes:
    obj.rotation_euler[0] = math.radians(90)
    obj.data.materials.clear()
    obj.data.materials.append(clay)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True

bpy.context.view_layer.update()
corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
offset = Vector((-(minimum.x + maximum.x) / 2, -(minimum.y + maximum.y) / 2, -minimum.z))
for obj in meshes:
    obj.location += offset
bpy.context.view_layer.update()

corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
height = max(v.z for v in corners)
width = max(v.x for v in corners) - min(v.x for v in corners)
depth = max(v.y for v in corners) - min(v.y for v in corners)
center = Vector((0.0, 0.0, height * 0.52))

bpy.ops.mesh.primitive_plane_add(size=max(width, depth, height) * 5, location=(0, 0, -0.01))
bpy.context.object.data.materials.append(material("Clay floor", (0.075, 0.085, 0.105), 0.88))

scene = bpy.context.scene
scene.world = bpy.data.worlds.new("Clay world")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.025, 0.035, 0.05, 1)
scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.32
for location, energy, size, color in (
    ((-3.8, -4.4, 6.0), 1200, 3.5, (1.0, 0.82, 0.67)),
    ((4.0, -1.5, 4.0), 850, 2.8, (0.48, 0.70, 1.0)),
    ((0.0, 4.0, 5.0), 800, 3.0, (0.62, 1.0, 0.84)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy, light.data.size, light.data.color = energy, size, color
    point_at(light, center)

bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = "ORTHO"
camera.data.ortho_scale = height * 1.16
scene.camera = camera
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"

distance = max(height, width, depth) * 2.5
views = {
    "front": (0.0, -distance, center.z),
    "left": (-distance, 0.0, center.z),
    "back": (0.0, distance, center.z),
}
for name, location in views.items():
    camera.location = location
    point_at(camera, center)
    scene.render.filepath = str(output_dir / f"{character}-clay-{name}-v{version}.png")
    bpy.ops.render.render(write_still=True)

bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
depsgraph = bpy.context.evaluated_depsgraph_get()
triangles = 0
vertices = 0
for obj in meshes:
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    triangles += len(mesh.loop_triangles)
    vertices += len(mesh.vertices)
    evaluated.to_mesh_clear()
print(f"CLAY_BLEND={blend_path}")
print(f"MESH_OBJECTS={len(meshes)}")
print(f"VERTICES={vertices}")
print(f"TRIANGLES={triangles}")
