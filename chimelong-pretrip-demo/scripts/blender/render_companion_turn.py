"""Render a three-quarter rear check image from an existing companion BLEND."""
from __future__ import annotations

import math
import os
import sys

import bpy
from mathutils import Vector


blend_path = os.path.abspath(sys.argv[sys.argv.index("--") + 1])
output_path = os.path.abspath(sys.argv[sys.argv.index("--") + 2])
bpy.ops.wm.open_mainfile(filepath=blend_path)
camera = bpy.context.scene.camera
camera.location = (-4.4, 5.9, 2.55)
camera.rotation_euler = (Vector((0, .25, 1.48)) - camera.location).to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.render.filepath = output_path
bpy.context.scene.render.resolution_x = 800
bpy.context.scene.render.resolution_y = 900
bpy.ops.render.render(write_still=True)
print("TURN_PREVIEW", output_path)
