import bpy
import math
import os
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BLEND_PATH = os.path.join(ROOT, 'art', 'companions', 'panda', 'panda-tuantuan-v1.blend')
GLB_PATH = os.path.join(ROOT, 'art', 'companions', 'panda', 'wip', 'panda-tuantuan-v1.glb')
PREVIEW_PATH = os.path.join(ROOT, 'art', 'companions', 'panda', 'references', 'panda-model-preview-v1.png')

for path in (BLEND_PATH, GLB_PATH, PREVIEW_PATH):
    os.makedirs(os.path.dirname(path), exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, rough=.58, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metallic
    return m

CREAM = mat('Warm cream fur', (0.91, 0.87, 0.75), .7)
BLACK = mat('Charcoal fur', (0.025, 0.032, 0.03), .63)
SHIRT = mat('Safari cotton', (0.78, 0.72, 0.59), .72)
ORANGE = mat('Neckerchief orange', (0.95, 0.27, 0.025), .52)
BLUE = mat('Iris blue', (0.0, 0.42, 0.9), .24, .05)
WHITE = mat('Eye white', (0.97, 0.96, 0.91), .28)
EYE = mat('Eye black glass', (0.005, 0.008, 0.008), .12)
SOLE = mat('Rubber sole', (0.035, 0.04, 0.038), .78)
CYAN = mat('Pixel cyan', (0.0, 0.66, 1.0), .35)

def smooth(obj, bevel=.05):
    for p in obj.data.polygons: p.use_smooth = True
    if bevel:
        mod = obj.modifiers.new('Edge softness', 'BEVEL'); mod.width = bevel; mod.segments = 3
    return obj

def uv(name, loc, scale, material, segments=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=32, location=loc)
    o = bpy.context.object; o.name = name; o.scale = scale; o.data.materials.append(material)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return smooth(o, .025)

def cube(name, loc, scale, material, bevel=.1, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o=bpy.context.object; o.name=name; o.scale=scale; o.data.materials.append(material)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return smooth(o, bevel)

def cyl(name, loc, radius, depth, material, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=depth, location=loc, rotation=rot)
    o=bpy.context.object; o.name=name; o.data.materials.append(material); return smooth(o, .035)

collection = bpy.data.collections.new('TUANTUAN_MODEL')
bpy.context.scene.collection.children.link(collection)

# Head and facial volumes
head = cube('Head', (0, 0, 2.72), (0.98, .66, .79), CREAM, .28)
ear_l = uv('Ear.L', (-.76, .02, 3.35), (.32,.22,.36), BLACK)
ear_r = uv('Ear.R', (.76, .02, 3.35), (.32,.22,.36), BLACK)
for x in (-.39, .39):
    patch = uv('EyePatch', (x, -.625, 2.84), (.31,.075,.41), BLACK)
    eye_white = uv('EyeWhite', (x, -.694, 2.86), (.19,.055,.255), WHITE)
    iris = uv('Iris', (x, -.744, 2.83), (.12,.035,.17), BLUE)
    pupil = uv('Pupil', (x, -.77, 2.86), (.07,.025,.11), EYE)
    uv('EyeHighlight', (x-.03, -.794, 2.94), (.025,.012,.035), WHITE, 24)
nose = uv('Nose', (0, -.755, 2.53), (.15,.09,.10), BLACK)
mouth = uv('Mouth', (0, -.72, 2.38), (.24,.035,.07), BLACK)

# Hair tufts as soft cones
for x, z, tilt in [(-.13,3.51,-.18),(.12,3.55,.12)]:
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=.16, radius2=0, depth=.42, location=(x,-.04,z), rotation=(0,tilt,0))
    tuft=bpy.context.object; tuft.name='HairTuft'; tuft.data.materials.append(CREAM); smooth(tuft,.025)

# Body and layered clothing
uv('Torso', (0,0,1.48), (.69,.48,.72), BLACK)
shirt = cube('SafariShirt', (0,-.02,1.58), (.67,.5,.56), SHIRT, .16)
shorts = cube('Shorts', (0,.0,.93), (.64,.46,.3), BLACK, .11)
for x in (-.34,.34):
    cyl('Leg', (x,0,.48), .22,.65,BLACK)
    shoe = cube('Shoe', (x,-.12,.18), (.31,.48,.2), SHIRT,.11)
    cube('Sole', (x,-.14,.04), (.33,.5,.08), SOLE,.055)
    cube('ShoePixel', (x + (-.08 if x < 0 else .08),-.61,.19), (.045,.018,.045), CYAN,.005)

# Arms and mitten hands in neutral A pose
for side in (-1,1):
    x=.73*side
    arm=cyl('Arm.L' if side<0 else 'Arm.R',(x,-.01,1.55),.19,.82,BLACK,(0,.12*side,.25*side))
    hand=uv('Hand.L' if side<0 else 'Hand.R',(1.01*side,-.02,1.25),(.27,.21,.3),BLACK)

# Neckerchief and knot
neck = uv('NeckerchiefCollar',(0,-.03,2.05),(.66,.5,.19),ORANGE)
cube('NeckerchiefKnot',(0,-.54,1.96),(.14,.09,.14),ORANGE,.06)
for side in (-1,1): cube('NeckerchiefTail',(side*.12,-.55,1.77),(.11,.055,.25),ORANGE,.055,rot=(0,side*.18,side*.12))

# Cross-body strap and pouch
strap=cube('BagStrap',(0,-.53,1.55),(.055,.035,.72),BLACK,.025,rot=(0,-.0,-.48))
pouch=cube('ExplorerPouch',(.55,-.55,1.12),(.28,.12,.32),SHIRT,.08)
cube('PouchPixelBlue',(.50,-.685,1.16),(.045,.018,.045),CYAN,.004)
cube('PouchPixelOrange',(.59,-.685,1.08),(.045,.018,.045),ORANGE,.004)
uv('Tail',(0,.49,.82),(.22,.16,.22),BLACK)

# Simple production armature with named deformation bones
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
rig=bpy.context.object; rig.name='Tuantuan_Rig'; arm=rig.data; arm.name='Tuantuan_Armature'
root=arm.edit_bones[0]; root.name='root'; root.head=(0,0,0); root.tail=(0,0,.25)
def bone(name, head, tail, parent):
    b=arm.edit_bones.new(name); b.head=head; b.tail=tail; b.parent=parent; return b
pelvis=bone('pelvis',(0,0,.75),(0,0,1.1),root); spine=bone('spine',(0,0,1.1),(0,0,1.7),pelvis); chest=bone('chest',(0,0,1.7),(0,0,2.05),spine); head_b=bone('head',(0,0,2.05),(0,0,3.25),chest)
for side,label in [(-1,'L'),(1,'R')]:
    upper=bone(f'upper_arm.{label}',(.42*side,0,1.88),(.8*side,0,1.55),chest); bone(f'forearm.{label}',(.8*side,0,1.55),(1.02*side,0,1.26),upper)
    thigh=bone(f'thigh.{label}',(.28*side,0,.95),(.32*side,0,.53),pelvis); bone(f'shin.{label}',(.32*side,0,.53),(.34*side,-.03,.16),thigh)
bpy.ops.object.mode_set(mode='OBJECT')

# Parent pieces to rig root while preserving editability for the first sculpt pass.
for obj in [o for o in bpy.context.scene.objects if o.type=='MESH']:
    obj.parent=rig

# Studio floor and lighting
bpy.ops.mesh.primitive_plane_add(size=20, location=(0,0,-.05)); floor=bpy.context.object; floor.name='StudioFloor'; floor.data.materials.append(mat('Studio',(0.14,.16,.15),.82))
bpy.ops.object.light_add(type='AREA', location=(3,-4,6)); bpy.context.object.data.energy=1100; bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=5
bpy.ops.object.light_add(type='AREA', location=(-4,-1,3)); bpy.context.object.data.energy=700; bpy.context.object.data.size=4
bpy.ops.object.light_add(type='AREA', location=(0,3,4)); bpy.context.object.data.energy=900; bpy.context.object.data.size=3

bpy.ops.object.camera_add(location=(0,-9,2.1), rotation=(math.radians(82),0,0))
cam=bpy.context.object; bpy.context.scene.camera=cam
def look_at(obj, target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
look_at(cam,(0,0,1.75)); cam.data.lens=58

scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=900; scene.render.resolution_y=1100; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False; scene.render.filepath=PREVIEW_PATH
scene.world = bpy.data.worlds.new('StudioWorld')
scene.world.color=(.035,.05,.045)

bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
bpy.ops.export_scene.gltf(filepath=GLB_PATH, export_format='GLB', export_apply=True, export_animations=True)
bpy.ops.render.render(write_still=True)
print('BLEND', BLEND_PATH)
print('GLB', GLB_PATH)
print('PREVIEW', PREVIEW_PATH)
