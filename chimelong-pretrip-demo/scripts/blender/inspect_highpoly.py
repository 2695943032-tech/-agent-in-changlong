"""Validate the editable tiger high-poly modifier workflow."""
from __future__ import annotations

import json
import os
import sys

import bpy


blend_path = os.path.abspath(sys.argv[sys.argv.index("--") + 1])
bpy.ops.wm.open_mainfile(filepath=blend_path)
depsgraph = bpy.context.evaluated_depsgraph_get()

total_triangles = 0
modifier_stacks = []
surface_counts = {"subdivision": 0, "displacement": 0, "bevel": 0}
for obj in bpy.context.scene.objects:
    if obj.type != "MESH" or obj.name == "PreviewFloor":
        continue
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    triangles = len(mesh.loop_triangles)
    total_triangles += triangles
    evaluated.to_mesh_clear()
    stack = [{"name": modifier.name, "type": modifier.type} for modifier in obj.modifiers]
    surface_counts["subdivision"] += sum(modifier.type == "SUBSURF" for modifier in obj.modifiers)
    surface_counts["displacement"] += sum(modifier.type == "DISPLACE" for modifier in obj.modifiers)
    surface_counts["bevel"] += sum(modifier.type == "BEVEL" for modifier in obj.modifiers)
    modifier_stacks.append({"object": obj.name, "triangles": triangles, "stack": stack})

image_texture_nodes = []
procedural_nodes = []
for material in bpy.data.materials:
    if not material.use_nodes or not material.node_tree:
        continue
    for node in material.node_tree.nodes:
        if node.type == "TEX_IMAGE":
            image_texture_nodes.append({"material": material.name, "node": node.name})
        if node.type in {"TEX_NOISE", "VALTORGB"} and node.name.startswith("HP_"):
            procedural_nodes.append({"material": material.name, "node": node.name, "type": node.type})

actions = sorted(action.name for action in bpy.data.actions)
order_violations = []
for item in modifier_stacks:
    types = [modifier["type"] for modifier in item["stack"]]
    bevel_indices = [index for index, value in enumerate(types) if value == "BEVEL"]
    subdivision_indices = [index for index, value in enumerate(types) if value == "SUBSURF"]
    displacement_indices = [index for index, value in enumerate(types) if value == "DISPLACE"]
    if bevel_indices and subdivision_indices and max(bevel_indices) > min(subdivision_indices):
        order_violations.append(f'{item["object"]}: bevel must precede subdivision')
    if subdivision_indices and displacement_indices and max(subdivision_indices) > min(displacement_indices):
        order_violations.append(f'{item["object"]}: subdivision must precede displacement')

image_dependencies = [
    {
        "name": image.name,
        "source": image.source,
        "filepath": image.filepath,
        "packed": bool(image.packed_file),
    }
    for image in bpy.data.images
    if image.source == "FILE" or image.packed_file
]

report = {
    "asset": blend_path,
    "bytes": os.path.getsize(blend_path),
    "evaluated_triangles": total_triangles,
    "mesh_objects": len(modifier_stacks),
    "surface_counts": surface_counts,
    "procedural_texture_datablocks": sorted(texture.name for texture in bpy.data.textures if texture.name.startswith("HP_")),
    "procedural_material_nodes": len(procedural_nodes),
    "image_texture_nodes": image_texture_nodes,
    "image_dependencies": image_dependencies,
    "actions": actions,
    "order_violations": order_violations,
    "stack_examples": modifier_stacks[:12],
}
print("HIGHPOLY_REPORT=" + json.dumps(report, ensure_ascii=False))
