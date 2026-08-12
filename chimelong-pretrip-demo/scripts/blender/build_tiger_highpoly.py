"""Reconstruct the tiger companion as a non-baked high-poly master.

The script opens the approved low-poly source and adds an editable modifier stack:
base mesh -> bevel -> subdivision surface -> procedural geometric displacement.
No normal-map, displacement-map, or texture baking is used.

Run from any directory:
  D:\blender.exe --background --python <absolute path to this script>
"""
from __future__ import annotations

import math
import os

import bpy
from mathutils import Vector


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SOURCE = os.path.join(ROOT, "art", "companions", "tiger", "tiger-companion-v1.blend")
OUTPUT = os.path.join(ROOT, "art", "companions", "tiger", "tiger-companion-highpoly-v1.blend")
PREVIEW = os.path.join(ROOT, "art", "companions", "tiger", "references", "tiger-companion-highpoly-preview-v1.png")
CLOSEUP = os.path.join(ROOT, "art", "companions", "tiger", "references", "tiger-companion-highpoly-closeup-v1.png")

if not os.path.exists(SOURCE):
    raise FileNotFoundError(SOURCE)

bpy.ops.wm.open_mainfile(filepath=SOURCE)


def texture(name: str, noise_scale: float, noise_depth: int, contrast: float):
    tex = bpy.data.textures.get(name) or bpy.data.textures.new(name, type="CLOUDS")
    tex.noise_scale = noise_scale
    tex.noise_depth = noise_depth
    tex.noise_type = "SOFT_NOISE"
    tex.noise_basis = "IMPROVED_PERLIN"
    tex.contrast = contrast
    return tex


FUR_NOISE = texture("HP_Fur_Geometry_Noise", .055, 2, 1.35)
FABRIC_NOISE = texture("HP_Fabric_Geometry_Noise", .085, 2, 1.2)
LEATHER_NOISE = texture("HP_Leather_Geometry_Noise", .115, 2, 1.1)
RUBBER_NOISE = texture("HP_Rubber_Geometry_Noise", .16, 1, 1.08)

NO_DISPLACE = (
    "Eye", "Iris", "Pupil", "Highlight", "Nose", "OpenSmile", "Tongue",
    "Fang", "Pixel", "Stripe", "ShoeAccent", "Brow",
)
FUR_PARTS = (
    "Body", "Head", "Ear.", "Muzzle", "UpperArm", "Forearm", "Hand.",
    "Leg.", "TailSegment", "TailJoint", "TailTip",
)
FABRIC_PARTS = ("CreamTee", "RedVest", "VestCollar", "Shorts")
LEATHER_PARTS = ("BagStrap", "ExplorerBag", "Shoe.")
RUBBER_PARTS = ("Sole.",)


def matches(name: str, prefixes):
    return any(name.startswith(prefix) for prefix in prefixes)


def add_highpoly_stack(obj: bpy.types.Object):
    if obj.type != "MESH" or obj.name == "PreviewFloor":
        return None

    # Existing source bevels remain first in the stack. Increase their render
    # quality while preserving the authored width on each individual part.
    bevels = [modifier for modifier in obj.modifiers if modifier.type == "BEVEL"]
    for bevel in bevels:
        bevel.segments = max(bevel.segments, 3)

    # Major silhouette pieces receive two subdivision levels. Tiny face plates
    # and accents receive one, enough to remove faceting without waste.
    major = matches(obj.name, FUR_PARTS + FABRIC_PARTS + LEATHER_PARTS + RUBBER_PARTS)
    subdivision = obj.modifiers.new("HP_Subdivision", "SUBSURF")
    subdivision.subdivision_type = "CATMULL_CLARK"
    subdivision.levels = 2 if major else 1
    subdivision.render_levels = 2 if major else 1
    subdivision.show_only_control_edges = True
    subdivision.use_creases = True

    if any(token in obj.name for token in NO_DISPLACE):
        return {"object": obj.name, "subdivision": subdivision.render_levels, "surface": "clean"}

    tex = None
    strength = 0.0
    surface = "clean"
    if matches(obj.name, FUR_PARTS):
        tex, strength, surface = FUR_NOISE, .008, "fur"
    elif matches(obj.name, FABRIC_PARTS):
        tex, strength, surface = FABRIC_NOISE, .0055, "fabric"
    elif matches(obj.name, LEATHER_PARTS):
        tex, strength, surface = LEATHER_NOISE, .0035, "leather"
    elif matches(obj.name, RUBBER_PARTS):
        tex, strength, surface = RUBBER_NOISE, .0025, "rubber"

    if tex is not None:
        displacement = obj.modifiers.new("HP_Procedural_Surface", "DISPLACE")
        displacement.texture = tex
        displacement.texture_coords = "GLOBAL"
        displacement.strength = strength
        displacement.mid_level = .5
        displacement.direction = "NORMAL"

    return {"object": obj.name, "subdivision": subdivision.render_levels, "surface": surface}


stacks = []
for scene_object in bpy.context.scene.objects:
    report = add_highpoly_stack(scene_object)
    if report:
        stacks.append(report)

# Add procedural micro-variation to material roughness. This remains fully
# generated inside Blender and does not rely on image textures or baking.
for material in bpy.data.materials:
    if not material.use_nodes or not material.node_tree:
        continue
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if not bsdf or "Roughness" not in bsdf.inputs:
        continue
    if any(token in material.name for token in ("eye", "iris", "pixel", "nose", "mouth", "tongue")):
        continue
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    noise = nodes.new("ShaderNodeTexNoise")
    noise.name = "HP_Procedural_Roughness"
    noise.label = "Non-baked micro wear"
    noise.inputs["Scale"].default_value = 38.0 if "fur" in material.name.lower() else 22.0
    noise.inputs["Detail"].default_value = 3.0
    noise.inputs["Roughness"].default_value = .72
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.name = "HP_Roughness_Range"
    ramp.color_ramp.elements[0].position = .28
    ramp.color_ramp.elements[0].color = (.42, .42, .42, 1)
    ramp.color_ramp.elements[1].position = .74
    ramp.color_ramp.elements[1].color = (.76, .76, .76, 1)
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Roughness"])


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.look = "AgX - Medium High Contrast"

# Tight, near-distance lighting makes actual geometric relief legible.
for obj in list(scene.objects):
    if obj.type == "LIGHT":
        bpy.data.objects.remove(obj, do_unlink=True)
for location, energy, size, color in (
    ((-2.2, -3.4, 4.3), 1150, 2.2, (1.0, .83, .67)),
    ((2.5, -1.4, 3.4), 820, 1.8, (.48, .72, 1.0)),
    ((.8, 2.5, 3.7), 1050, 1.5, (.64, 1.0, .84)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.size = size
    light.data.color = color
    look_at(light, (0, 0, 1.75))

camera = scene.camera
camera.data.lens = 68
camera.location = (3.0, -6.15, 2.72)
look_at(camera, (0, 0, 1.62))

bpy.ops.wm.save_as_mainfile(filepath=OUTPUT)

scene.render.resolution_x = 1000
scene.render.resolution_y = 1125
scene.render.filepath = PREVIEW
bpy.ops.render.render(write_still=True)

camera.data.lens = 82
camera.location = (1.65, -4.2, 2.9)
look_at(camera, (0, -.12, 2.35))
scene.render.resolution_x = 1200
scene.render.resolution_y = 1000
scene.render.filepath = CLOSEUP
bpy.ops.render.render(write_still=True)

print("TIGER_HIGHPOLY", OUTPUT)
print("TIGER_HIGHPOLY_PREVIEW", PREVIEW)
print("TIGER_HIGHPOLY_CLOSEUP", CLOSEUP)
print("TIGER_HIGHPOLY_STACKS", len(stacks))
