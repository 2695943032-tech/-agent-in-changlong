"""Render exact exported GLB from front, both profiles and above."""
from __future__ import annotations

import sys
from pathlib import Path

import bpy
from mathutils import Vector


repo_root = Path(__file__).resolve().parents[2]
model = Path(sys.argv[sys.argv.index("--") + 1])
output_dir = Path(sys.argv[sys.argv.index("--") + 2])
if not model.is_absolute():
    model = repo_root / model
if not output_dir.is_absolute():
    output_dir = repo_root / output_dir
character = sys.argv[sys.argv.index("--") + 3]
version = sys.argv[sys.argv.index("--") + 4].removeprefix("v")
output_dir.mkdir(parents=True, exist_ok=True)


def look_at(obj, target, up="Y"):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", up).to_euler()


def material(name, color, roughness=0.78):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    shader = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    return mat


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(model))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
dimensions = maximum - minimum
center = (minimum + maximum) * 0.5
face_target = Vector((center.x, minimum.y, minimum.z + dimensions.z * 0.79))

bpy.ops.mesh.primitive_plane_add(size=max(dimensions) * 5, location=(0, 0, minimum.z - 0.004))
bpy.context.object.data.materials.append(material("Spatial review floor", (0.055, 0.065, 0.085)))

scene = bpy.context.scene
world = scene.world or bpy.data.worlds.new("Spatial review world")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.018, 0.025, 0.038, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35
for location, energy, color in (
    ((-dimensions.x * 2, -dimensions.y * 3, maximum.z * 1.2), 650, (1.0, 0.84, 0.70)),
    ((dimensions.x * 2, -dimensions.y, maximum.z), 450, (0.50, 0.73, 1.0)),
    ((0, dimensions.y * 2.5, maximum.z * 1.2), 480, (0.64, 1.0, 0.86)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy, light.data.size, light.data.color = energy, dimensions.z * 0.7, color
    look_at(light, face_target)

bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = "ORTHO"
camera.data.ortho_scale = dimensions.z * 0.72
scene.camera = camera
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.view_settings.look = "AgX - Medium High Contrast"

distance = max(dimensions) * 2.8
views = {
    "front": (Vector((center.x, minimum.y - distance, face_target.z)), "Y"),
    "left": (Vector((minimum.x - distance, center.y, face_target.z)), "Y"),
    "right": (Vector((maximum.x + distance, center.y, face_target.z)), "Y"),
    "top": (Vector((center.x, center.y, maximum.z + distance)), "Y"),
}
for name, (location, up) in views.items():
    camera.location = location
    look_at(camera, face_target, up)
    scene.render.filepath = str(output_dir / f"{character}-face-{name}-v{version}.png")
    bpy.ops.render.render(write_still=True)

print(f"SPATIAL_REVIEW={output_dir}")
