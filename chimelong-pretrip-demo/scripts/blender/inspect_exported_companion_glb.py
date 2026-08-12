"""Re-import a final GLB, validate it, and render the actual exported asset."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


model_path = Path(sys.argv[sys.argv.index("--") + 1])
render_path = Path(sys.argv[sys.argv.index("--") + 2])


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(model_path))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
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

corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
height = maximum.z - minimum.z
width = maximum.x - minimum.x
depth = maximum.y - minimum.y
center = (minimum + maximum) * 0.5

image_nodes = []
for material in bpy.data.materials:
    if material.node_tree:
        for node in material.node_tree.nodes:
            if node.type == "TEX_IMAGE":
                image_nodes.append({"material": material.name, "node": node.name})

# Render the exact imported GLB with its exported materials.
bpy.ops.mesh.primitive_plane_add(size=max(height, width, depth) * 5, location=(0, 0, minimum.z - 0.005))
floor = bpy.context.object
floor_mat = bpy.data.materials.new("Validation floor")
floor_mat.diffuse_color = (0.075, 0.09, 0.12, 1)
floor.data.materials.append(floor_mat)
for location, energy, size, color in (
    ((-width * 2, -depth * 3, maximum.z * 1.2), 1100, height * 0.8, (1.0, 0.82, 0.67)),
    ((width * 2, -depth, maximum.z), 800, height * 0.65, (0.48, 0.72, 1.0)),
    ((0, depth * 2.5, maximum.z * 1.1), 850, height * 0.7, (0.62, 1.0, 0.84)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy, light.data.size, light.data.color = energy, size, color
    look_at(light, center)
bpy.ops.object.camera_add(location=(width * 1.2, -depth * 3.2, center.z))
camera = bpy.context.object
camera.data.type = "ORTHO"
camera.data.ortho_scale = height * 1.16
look_at(camera, center)
scene = bpy.context.scene
scene.camera = camera
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(render_path)
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)

report = {
    "model": str(model_path),
    "bytes": model_path.stat().st_size,
    "mesh_objects": len(meshes),
    "vertices": vertices,
    "triangles": triangles,
    "materials": sorted(material.name for material in bpy.data.materials if material != floor_mat),
    "image_texture_nodes": image_nodes,
    "bounds": {
        "minimum": list(minimum),
        "maximum": list(maximum),
        "dimensions": [width, depth, height],
    },
    "floor_offset": minimum.z,
    "render": str(render_path),
}
print("GLB_REPORT=" + json.dumps(report, ensure_ascii=False))
