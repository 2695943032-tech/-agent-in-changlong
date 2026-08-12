"""Render the Hunyuan panda base mesh for visual quality review."""

import math
import os

import bpy
from mathutils import Vector


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODEL = os.environ.get("PANDA_MODEL", os.path.join(ROOT, "art", "companions", "panda", "wip", "hunyuan", "panda-base-v1.glb"))
OUTPUT = os.environ.get("PANDA_RENDER", os.path.join(ROOT, "art", "companions", "panda", "references", "panda-hunyuan-preview-v1.png"))
BLEND_OUTPUT = os.environ.get("PANDA_BLEND", os.path.join(ROOT, "art", "companions", "panda", "panda-hunyuan-base-v1.blend"))


def material(name, color, roughness=0.72, color_attribute=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if color_attribute:
        vertex_color = mat.node_tree.nodes.new("ShaderNodeVertexColor")
        vertex_color.layer_name = color_attribute
        mat.node_tree.links.new(vertex_color.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=MODEL)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
for obj in meshes:
    obj.rotation_euler[0] = math.radians(90)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth_by_angle()
    color_name = obj.data.color_attributes[0].name if obj.data.color_attributes else None
    if color_name or not obj.data.materials:
        obj.data.materials.clear()
        obj.data.materials.append(material("Companion material", (0.74, 0.69, 0.60), color_attribute=color_name))

# Center the generated character on the floor after axis correction.
bpy.context.view_layer.update()
corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
min_x, max_x = min(v.x for v in corners), max(v.x for v in corners)
min_y, max_y = min(v.y for v in corners), max(v.y for v in corners)
min_z, max_z = min(v.z for v in corners), max(v.z for v in corners)
offset = Vector((-(min_x + max_x) / 2, -(min_y + max_y) / 2, -min_z))
for obj in meshes:
    obj.location += offset

# Floor and soft studio backdrop.
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -0.015))
floor = bpy.context.object
floor.data.materials.append(material("Floor", (0.12, 0.14, 0.16), 0.9))

world = bpy.context.scene.world or bpy.data.worlds.new("World")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.025, 0.035, 0.05, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35

for location, energy, size, color in [
    ((-3.5, -4.5, 6.5), 1100, 4.0, (1.0, 0.78, 0.58)),
    ((4.0, -1.0, 4.0), 900, 3.0, (0.35, 0.72, 1.0)),
    ((0.0, 4.0, 5.0), 700, 2.5, (0.55, 0.75, 1.0)),
]:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    point_at(light, (0, 0, 1.0))

bpy.ops.object.camera_add(location=(3.0, -5.8, 2.8))
camera = bpy.context.object
camera.data.lens = 62
point_at(camera, (0, 0, 1.05))
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = OUTPUT
scene.render.film_transparent = False
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.render.resolution_percentage = 100
bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUTPUT)
bpy.ops.render.render(write_still=True)
print(f"Rendered {OUTPUT}")
