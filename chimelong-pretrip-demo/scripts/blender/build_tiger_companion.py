"""Build the rigged, mobile-ready white tiger companion.

Run from the repository app root:
  D:\blender.exe --background --python scripts/blender/build_tiger_companion.py
"""
from __future__ import annotations

import math
import os

import bpy
from mathutils import Vector


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ART_DIR = os.path.join(ROOT, "art", "companions", "tiger")
BLEND_PATH = os.path.join(ART_DIR, "tiger-companion-v1.blend")
PREVIEW_PATH = os.path.join(ART_DIR, "references", "tiger-companion-preview-v1.png")
GLB_PATH = os.path.join(ROOT, "public", "models", "companions", "tiger-companion-ar-v1.glb")

for path in (BLEND_PATH, PREVIEW_PATH, GLB_PATH):
    os.makedirs(os.path.dirname(path), exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, roughness=.58, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


FUR = material("Tiger warm white fur", (.91, .89, .82), .68)
STRIPE = material("Tiger charcoal stripes", (.025, .032, .038), .61)
EAR_INNER = material("Tiger coral ear", (1.0, .25, .22), .55)
IRIS = material("Tiger amber iris", (1.0, .48, .015), .24, .02)
EYE_WHITE = material("Tiger eye white", (.98, .97, .91), .31)
NOSE = material("Tiger coral nose", (.95, .24, .22), .45)
MOUTH = material("Tiger mouth", (.48, .055, .06), .52)
TONGUE = material("Tiger tongue", (1.0, .25, .29), .48)
VEST = material("Tiger red vest", (.94, .055, .045), .54)
TEE = material("Tiger cream tee", (.94, .92, .85), .7)
SHORTS = material("Tiger charcoal shorts", (.035, .045, .06), .66)
SHOE = material("Tiger warm white shoe", (.94, .92, .86), .61)
SOLE = material("Tiger dark sole", (.03, .04, .052), .77)
BAG = material("Tiger explorer bag", (.04, .055, .075), .6)
PIXEL = material("Tiger cyan pixel", (.02, .77, .82), .38)


def smooth(obj, bevel=.025):
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    if bevel:
        modifier = obj.modifiers.new("Soft edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return obj


def sphere(name, location, scale, mat, segments=14, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return smooth(obj, .018)


def rounded_cube(name, location, scale, mat, bevel=.06, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return smooth(obj, bevel)


def cylinder(name, location, radius, depth, mat, rotation=(0, 0, 0), vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth,
        location=location, rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return smooth(obj, .018)


def cone(name, location, radius, depth, mat, rotation=(0, 0, 0), vertices=8):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices, radius1=radius, radius2=radius * .08, depth=depth,
        location=location, rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return smooth(obj, .012)


def cylinder_between(name, start, end, radius, mat, vertices=10):
    start, end = Vector(start), Vector(end)
    delta = end - start
    obj = cylinder(
        name,
        (start + end) * .5,
        radius,
        delta.length,
        mat,
        delta.to_track_quat("Z", "Y").to_euler(),
        vertices,
    )
    return obj


def parent_to_bone(obj, rig, bone):
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = bone
    obj.matrix_world = world


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def build_rig():
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    rig = bpy.context.object
    rig.name = "Tiger_Companion_Rig"
    armature = rig.data
    armature.name = "Tiger_Companion_Armature"
    root = armature.edit_bones[0]
    root.name = "root"
    root.head, root.tail = (0, 0, 0), (0, 0, .22)

    def bone(name, head, tail, parent):
        result = armature.edit_bones.new(name)
        result.head, result.tail, result.parent = head, tail, parent
        return result

    pelvis = bone("pelvis", (0, 0, .64), (0, 0, 1.0), root)
    spine = bone("spine", (0, 0, 1.0), (0, 0, 1.5), pelvis)
    chest = bone("chest", (0, 0, 1.5), (0, 0, 1.92), spine)
    neck = bone("neck", (0, 0, 1.92), (0, 0, 2.16), chest)
    bone("head", (0, 0, 2.16), (0, 0, 3.05), neck)
    for side, label in ((-1, "L"), (1, "R")):
        upper = bone(f"upper_arm.{label}", (.42 * side, 0, 1.79), (.72 * side, 0, 1.48), chest)
        forearm = bone(f"forearm.{label}", (.72 * side, 0, 1.48), (.91 * side, -.02, 1.23), upper)
        bone(f"hand.{label}", (.91 * side, -.02, 1.23), (1.03 * side, -.04, 1.09), forearm)
        thigh = bone(f"thigh.{label}", (.27 * side, 0, .85), (.29 * side, 0, .48), pelvis)
        bone(f"shin.{label}", (.29 * side, 0, .48), (.29 * side, -.04, .13), thigh)
    tail_1 = bone("tail.01", (0, .28, .82), (0, .62, .85), pelvis)
    tail_2 = bone("tail.02", (0, .62, .85), (.25, .9, .9), tail_1)
    bone("tail.03", (.25, .9, .9), (.5, 1.08, 1.0), tail_2)
    bpy.ops.object.mode_set(mode="OBJECT")
    return rig


RIG = build_rig()
PARTS = []


def part(obj, bone):
    parent_to_bone(obj, RIG, bone)
    PARTS.append(obj)
    return obj


# Body, clothing, and silhouette.
part(sphere("Body", (0, 0, 1.39), (.57, .39, .65), FUR), "chest")
part(rounded_cube("CreamTee", (0, -.025, 1.47), (.54, .39, .48), TEE, .13), "chest")
part(rounded_cube("RedVest.L", (-.4, -.35, 1.55), (.18, .095, .48), VEST, .07), "chest")
part(rounded_cube("RedVest.R", (.4, -.35, 1.55), (.18, .095, .48), VEST, .07), "chest")
part(rounded_cube("RedVest.Back", (0, .365, 1.55), (.53, .055, .48), VEST, .07), "chest")
part(rounded_cube("VestCollar.L", (-.24, -.43, 1.93), (.17, .07, .18), VEST, .05, (0, .12, -.35)), "chest")
part(rounded_cube("VestCollar.R", (.24, -.43, 1.93), (.17, .07, .18), VEST, .05, (0, -.12, .35)), "chest")
part(rounded_cube("Shorts", (0, 0, .91), (.56, .38, .29), SHORTS, .1), "pelvis")

# Large rounded-square head and ears preserve the 2D mascot identity.
part(rounded_cube("Head", (0, -.02, 2.58), (.78, .53, .65), FUR, .22), "head")
for side, label in ((-1, "L"), (1, "R")):
    part(sphere(f"Ear.{label}", (.62 * side, .02, 3.05), (.31, .17, .3), FUR), "head")
    part(sphere(f"EarInner.{label}", (.63 * side, -.15, 3.05), (.17, .025, .17), EAR_INNER, 12, 8), "head")

# Eyes, brows, muzzle, smile, teeth, and nose are separate low-poly pieces.
for side, label in ((-1, "L"), (1, "R")):
    x = .28 * side
    part(sphere(f"EyeWhite.{label}", (x, -.535, 2.72), (.2, .045, .25), EYE_WHITE, 14, 10), "head")
    part(sphere(f"Iris.{label}", (x, -.577, 2.7), (.12, .025, .17), IRIS, 12, 8), "head")
    part(sphere(f"Pupil.{label}", (x, -.597, 2.72), (.055, .016, .09), STRIPE, 10, 7), "head")
    part(sphere(f"EyeHighlight.{label}", (x - .025, -.614, 2.79), (.022, .01, .03), EYE_WHITE, 8, 6), "head")
    part(rounded_cube(f"Brow.{label}", (x, -.59, 2.96), (.23, .025, .055), STRIPE, .025, (0, 0, -.28 * side)), "head")
part(sphere("Muzzle.L", (-.16, -.54, 2.43), (.27, .12, .2), FUR, 12, 8), "head")
part(sphere("Muzzle.R", (.16, -.54, 2.43), (.27, .12, .2), FUR, 12, 8), "head")
part(sphere("Nose", (0, -.68, 2.52), (.13, .055, .09), NOSE, 12, 8), "head")
part(sphere("OpenSmile", (0, -.6, 2.3), (.25, .035, .16), MOUTH, 12, 8), "head")
part(sphere("Tongue", (0, -.641, 2.23), (.14, .018, .07), TONGUE, 10, 7), "head")
for x in (-.13, .13):
    part(cone("Fang", (x, -.644, 2.36), .045, .12, EYE_WHITE, (math.pi, 0, 0)), "head")

# Low-cost stripe plates: distinctive silhouette without high-poly spot spheres.
for index, (x, z, sx, sz, angle) in enumerate((
    (0, 3.16, .08, .16, 0), (-.14, 3.11, .07, .16, -.22), (.14, 3.11, .07, .16, .22),
    (-.55, 2.78, .14, .055, -.2), (.55, 2.78, .14, .055, .2),
    (-.58, 2.57, .13, .05, -.2), (.58, 2.57, .13, .05, .2),
    (-.54, 2.37, .12, .05, -.2), (.54, 2.37, .12, .05, .2),
)):
    part(rounded_cube(f"FaceStripe.{index:02d}", (x, -.558, z), (sx, .018, sz), STRIPE, .012, (0, 0, angle)), "head")

# Limbs, mitten hands, shoes, strap, and bag.
for side, label in ((-1, "L"), (1, "R")):
    part(cylinder(f"UpperArm.{label}", (.63 * side, -.02, 1.57), .145, .58, FUR, (0, .1 * side, .42 * side)), f"upper_arm.{label}")
    part(cylinder(f"Forearm.{label}", (.83 * side, -.03, 1.32), .14, .43, FUR, (0, .05 * side, .55 * side)), f"forearm.{label}")
    part(sphere(f"Hand.{label}", (.98 * side, -.04, 1.13), (.21, .17, .23), FUR, 12, 8), f"hand.{label}")
    part(cylinder(f"Leg.{label}", (.28 * side, 0, .47), .17, .57, FUR), f"shin.{label}")
    part(rounded_cube(f"Shoe.{label}", (.28 * side, -.15, .16), (.29, .39, .17), SHOE, .09), f"shin.{label}")
    part(rounded_cube(f"Sole.{label}", (.28 * side, -.16, .045), (.3, .4, .06), SOLE, .035), f"shin.{label}")
    part(rounded_cube(f"ShoeAccent.{label}", (.28 * side, -.555, .18), (.18, .018, .04), VEST, .01), f"shin.{label}")

part(rounded_cube("BagStrap", (0, -.45, 1.46), (.04, .025, .67), BAG, .018, (0, 0, -.48)), "chest")
part(rounded_cube("ExplorerBag", (.49, -.47, 1.05), (.26, .11, .27), BAG, .07), "pelvis")
part(rounded_cube("BagPixel.Cyan", (.43, -.59, 1.08), (.045, .012, .045), PIXEL, .006), "pelvis")
part(rounded_cube("BagPixel.White", (.54, -.59, .99), (.045, .012, .045), EYE_WHITE, .006), "pelvis")

# Continuous segmented tail follows three dedicated bones. Alternating cylinders
# communicate the stripe pattern without expensive floating patch geometry.
tail_points = (
    (0, .3, .8), (-.04, .56, .82), (.08, .78, .86),
    (.29, .96, .93), (.52, 1.03, 1.01), (.7, .93, 1.11),
)
tail_bones = ("tail.01", "tail.01", "tail.02", "tail.02", "tail.03")
tail_mats = (FUR, STRIPE, FUR, STRIPE, FUR)
for index, (start, end, bone, mat) in enumerate(zip(tail_points, tail_points[1:], tail_bones, tail_mats)):
    part(cylinder_between(f"TailSegment.{index + 1:02d}", start, end, .135, mat), bone)
for index, (point, bone) in enumerate(zip(tail_points[1:-1], tail_bones[1:])):
    part(sphere(f"TailJoint.{index + 1:02d}", point, (.145, .145, .145), tail_mats[index + 1], 10, 7), bone)
part(sphere("TailTip", tail_points[-1], (.17, .17, .17), STRIPE, 10, 7), "tail.03")


def add_actions(rig):
    def action(name, end, channels):
        act = bpy.data.actions.new(name)
        rig.animation_data_create()
        rig.animation_data.action = act
        for bone_name, axis, frames in channels:
            pose_bone = rig.pose.bones[bone_name]
            pose_bone.rotation_mode = "XYZ"
            for frame, value in frames:
                pose_bone.rotation_euler[axis] = value
                pose_bone.keyframe_insert("rotation_euler", index=axis, frame=frame)
        act.frame_range = (1, end)
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        strip = track.strips.new(name, 1, act)
        strip.action_frame_start, strip.action_frame_end = 1, end

    action("idle", 120, [
        ("chest", 0, [(1, 0), (30, .035), (60, 0), (90, -.025), (120, 0)]),
        ("head", 2, [(1, 0), (40, .035), (80, -.025), (120, 0)]),
        ("tail.02", 2, [(1, -.08), (30, .12), (60, -.04), (90, .1), (120, -.08)]),
        ("tail.03", 2, [(1, .08), (30, -.12), (60, .06), (90, -.1), (120, .08)]),
    ])
    action("greeting", 60, [
        ("upper_arm.R", 2, [(1, 0), (10, -1.18), (18, -.82), (28, -1.18), (38, -.82), (48, -1.12), (60, 0)]),
        ("forearm.R", 2, [(1, 0), (10, -.72), (50, -.72), (60, 0)]),
        ("hand.R", 2, [(1, 0), (14, -.18), (22, .18), (30, -.18), (38, .18), (50, 0), (60, 0)]),
        ("head", 2, [(1, 0), (18, -.08), (45, .05), (60, 0)]),
    ])
    action("talk", 96, [
        ("upper_arm.L", 2, [(1, 0), (20, .28), (44, -.12), (68, .24), (96, 0)]),
        ("forearm.L", 2, [(1, 0), (20, .32), (44, .08), (68, .28), (96, 0)]),
        ("upper_arm.R", 2, [(1, 0), (20, -.2), (44, .18), (68, -.16), (96, 0)]),
        ("head", 0, [(1, 0), (24, .035), (48, -.025), (72, .04), (96, 0)]),
        ("head", 2, [(1, 0), (32, -.04), (64, .04), (96, 0)]),
    ])
    action("listen", 72, [
        ("chest", 0, [(1, 0), (16, -.09), (56, -.09), (72, 0)]),
        ("head", 0, [(1, 0), (16, .11), (38, .055), (56, .11), (72, 0)]),
        ("head", 2, [(1, 0), (16, -.09), (56, -.09), (72, 0)]),
        ("upper_arm.L", 2, [(1, 0), (16, .45), (56, .45), (72, 0)]),
        ("forearm.L", 2, [(1, 0), (16, .78), (56, .78), (72, 0)]),
    ])
    rig.animation_data.action = None
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "XYZ"
        pose_bone.rotation_euler = (0, 0, 0)
        pose_bone.location = (0, 0, 0)
        pose_bone.scale = (1, 1, 1)


add_actions(RIG)

# Preview-only studio objects are excluded from the selected GLB export.
bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, -.03))
floor = bpy.context.object
floor.name = "PreviewFloor"
floor.data.materials.append(material("Preview floor", (.09, .105, .12), .84))
for location, energy, size, color in (
    ((-3.2, -4.2, 5.7), 920, 4.0, (1.0, .84, .68)),
    ((3.4, -2.1, 4.0), 660, 3.0, (.55, .78, 1.0)),
    ((0, 3.0, 4.8), 780, 3.0, (.62, 1.0, .88)),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy, light.data.size, light.data.color = energy, size, color
    look_at(light, (0, 0, 1.55))

bpy.ops.object.camera_add(location=(3.5, -7.2, 2.8))
camera = bpy.context.object
camera.data.lens = 62
look_at(camera, (0, 0, 1.55))

scene = bpy.context.scene
scene.camera = camera
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 800
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = PREVIEW_PATH
scene.view_settings.look = "AgX - Medium High Contrast"
scene.world = bpy.data.worlds.new("Tiger preview world")
scene.world.color = (.025, .032, .045)

bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
bpy.ops.render.render(write_still=True)

bpy.ops.object.select_all(action="DESELECT")
RIG.select_set(True)
for obj in PARTS:
    obj.select_set(True)
bpy.context.view_layer.objects.active = RIG
bpy.ops.export_scene.gltf(
    filepath=GLB_PATH,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_nla_strips=True,
    export_apply=True,
)

print("TIGER_BLEND", BLEND_PATH)
print("TIGER_GLB", GLB_PATH)
print("TIGER_PREVIEW", PREVIEW_PATH)
