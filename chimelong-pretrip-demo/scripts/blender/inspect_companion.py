"""Print a machine-readable budget and runtime report for a BLEND or GLB file."""
from __future__ import annotations

import json
import os
import sys

import bpy


asset_path = os.path.abspath(sys.argv[sys.argv.index("--") + 1])
bpy.ops.wm.read_factory_settings(use_empty=True)
if asset_path.lower().endswith(".blend"):
    bpy.ops.wm.open_mainfile(filepath=asset_path)
else:
    bpy.ops.import_scene.gltf(filepath=asset_path)

depsgraph = bpy.context.evaluated_depsgraph_get()
triangles = 0
meshes = []
for obj in bpy.context.scene.objects:
    if obj.type != "MESH":
        continue
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    count = len(mesh.loop_triangles)
    triangles += count
    meshes.append({"name": obj.name, "triangles": count})
    evaluated.to_mesh_clear()

rigs = [
    {"name": obj.name, "bones": [bone.name for bone in obj.data.bones]}
    for obj in bpy.context.scene.objects if obj.type == "ARMATURE"
]
actions = sorted({action.name for action in bpy.data.actions})
print("COMPANION_REPORT=" + json.dumps({
    "asset": asset_path,
    "bytes": os.path.getsize(asset_path),
    "triangles": triangles,
    "mesh_count": len(meshes),
    "meshes": meshes,
    "rigs": rigs,
    "actions": actions,
}, ensure_ascii=False))
