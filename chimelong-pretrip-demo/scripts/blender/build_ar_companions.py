"""Build rigged, mobile-ready Koala and Giraffe companion GLBs and previews."""
import bpy, math, os, sys
from mathutils import Vector

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
CHARACTERS=('koala','giraffe') if len(sys.argv)<2 or '--' not in sys.argv else tuple(sys.argv[sys.argv.index('--')+1:])

def mat(name,color,rough=.58,metal=0):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 b=m.node_tree.nodes.get('Principled BSDF'); b.inputs['Base Color'].default_value=(*color,1); b.inputs['Roughness'].default_value=rough; b.inputs['Metallic'].default_value=metal
 return m
def glossy_mat(name,color,rough=.24):
 m=mat(name,color,rough)
 b=m.node_tree.nodes.get('Principled BSDF')
 if 'Coat Weight' in b.inputs:b.inputs['Coat Weight'].default_value=.45
 return m
def smooth(o,bev=.035):
 for p in o.data.polygons:p.use_smooth=True
 if bev: m=o.modifiers.new('Soft edges','BEVEL');m.width=bev;m.segments=2
 return o
def uv(name,loc,scale,ma,seg=28):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=16,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(ma);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return smooth(o,.018)
def ellipsoid(name,loc,scale,ma,rot=(0,0,0),seg=24):
 o=uv(name,loc,scale,ma,seg);o.rotation_euler=rot;return o
def cube(name,loc,scale,ma,bev=.06,rot=(0,0,0)):
 bpy.ops.mesh.primitive_cube_add(location=loc,rotation=rot);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(ma);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return smooth(o,bev)
def cyl(name,loc,r,d,ma,rot=(0,0,0),vertices=20):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d,location=loc,rotation=rot);o=bpy.context.object;o.name=name;o.data.materials.append(ma);return smooth(o,.025)
def torus(name,loc,major,minor,ma,rot=(math.pi/2,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=28,minor_segments=10,location=loc,rotation=rot);o=bpy.context.object;o.name=name;o.data.materials.append(ma);return smooth(o,0)
def smile_curve(name,loc,width,depth,ma):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=.018;curve.bevel_resolution=4;curve.resolution_u=20
 spline=curve.splines.new('BEZIER');spline.bezier_points.add(2)
 for point,co in zip(spline.bezier_points,[(-width,0,.025),(0,0,-depth),(width,0,.025)]):point.co=co;point.handle_left_type='AUTO';point.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.location=loc;o.data.materials.append(ma);return o
def parent_bone(obj,rig,bone):
 world=obj.matrix_world.copy();obj.parent=rig;obj.parent_type='BONE';obj.parent_bone=bone;obj.matrix_world=world
def look(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def add_fingers(P,rig,side,label,skin,character):
 # Hands are deliberately silhouetted as soft cartoon mitts, not a stack of beads.
 # The leading hand gets a readable fan/V gesture; the supporting hand gently grips props.
 if side>0:
  specs=(((1.025,-.10,1.49,.05,.055,.14,-.30),
          (1.105,-.10,1.43,.05,.055,.145,.06),
          (.995,-.11,1.27,.055,.06,.12,.68)) if character=='koala' else
         ((1.00,-.10,1.50,.045,.052,.135,-.38),
          (1.08,-.105,1.47,.045,.052,.145,-.14),
          (1.13,-.105,1.39,.045,.052,.14,.16),
          (1.08,-.11,1.29,.052,.058,.12,.58)))
 else:
  specs=((( -1.13,-.205,1.50,.04,.035,.105,.08),
          ( -.94,-.207,1.43,.04,.035,.105,-.08)) if character=='koala' else
         ((-1.02,-.10,1.44,.045,.052,.12,.28),
          (-1.08,-.105,1.34,.045,.052,.12,-.02),
          (-1.01,-.11,1.25,.05,.056,.105,-.35)))
 for i,(x,y,z,sx,sy,sz,angle) in enumerate(specs):
  P(ellipsoid(f'Finger.{label}.{i}',(x,y,z),(sx,sy,sz),skin,rot=(0,angle,0),seg=20),'forearm.'+label)
def add_shoe_details(P,side,label,white,accent,dark):
 x=.29*side
 P(uv('Sole.'+label,(x,-.18,.08),(.34,.44,.075),dark,24),'shin.'+label)
 P(cube('ShoeAccent.'+label,(x+.13*side,-.56,.17),(.055,.018,.07),accent,.018),'shin.'+label)
 for z in (.18,.23):P(cube('Lace.'+label+str(z),(x,-.55,z),(.13,.012,.015),white,.008),'shin.'+label)

def rig_create(height):
 bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0));rig=bpy.context.object;rig.name='Companion_Rig';a=rig.data;a.name='Companion_Armature';root=a.edit_bones[0];root.name='root';root.head=(0,0,0);root.tail=(0,0,.2)
 def bone(n,h,t,p):b=a.edit_bones.new(n);b.head=h;b.tail=t;b.parent=p;return b
 pelvis=bone('pelvis',(0,0,.55),(0,0,1.0),root);spine=bone('spine',(0,0,1.0),(0,0,1.55),pelvis);chest=bone('chest',(0,0,1.55),(0,0,1.95),spine);neck=bone('neck',(0,0,1.95),(0,0,height-.7),chest);head=bone('head',(0,0,height-.7),(0,0,height),neck)
 for s,l in [(-1,'L'),(1,'R')]:
  u=bone('upper_arm.'+l,(.42*s,0,1.78),(.75*s,0,1.5),chest);bone('forearm.'+l,(.75*s,0,1.5),(1.0*s,0,1.27),u)
  t=bone('thigh.'+l,(.28*s,0,.86),(.3*s,0,.48),pelvis);bone('shin.'+l,(.3*s,0,.48),(.3*s,-.03,.12),t)
 bpy.ops.object.mode_set(mode='OBJECT');return rig

def add_actions(rig):
 def action(name,end,keys):
  act=bpy.data.actions.new(name);rig.animation_data_create();rig.animation_data.action=act
  for bone,axis,frames in keys:
   pb=rig.pose.bones[bone];pb.rotation_mode='XYZ'
   for frame,value in frames:pb.rotation_euler[axis]=value;pb.keyframe_insert('rotation_euler',index=axis,frame=frame)
  act.frame_range=(1,end);track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,1,act);strip.action_frame_start=1;strip.action_frame_end=end
 action('idle',144,[('chest',0,[(1,0),(36,.035),(72,0),(108,-.025),(144,0)]),('head',2,[(1,0),(48,.025),(96,-.02),(144,0)])])
 action('greeting',60,[('upper_arm.R',2,[(1,0),(12,-1.05),(22,-.72),(32,-1.12),(42,-.76),(52,-1.04),(60,0)]),('forearm.R',2,[(1,0),(12,-.75),(52,-.75),(60,0)]),('head',2,[(1,0),(20,-.08),(45,.06),(60,0)])])
 action('talk',96,[('upper_arm.L',2,[(1,0),(24,.22),(48,-.15),(72,.18),(96,0)]),('upper_arm.R',2,[(1,0),(24,-.18),(48,.2),(72,-.15),(96,0)]),('head',0,[(1,0),(24,.035),(48,-.02),(72,.03),(96,0)])])
 action('listen',72,[('chest',0,[(1,0),(18,-.08),(54,-.08),(72,0)]),('head',0,[(1,0),(18,.1),(38,.04),(54,.1),(72,0)])])
 rig.animation_data.action=None
 for pb in rig.pose.bones: pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
 bpy.context.view_layer.update()

def build(character):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 gray=mat('Koala gray',(.47,.55,.58),.66);dark=mat('Charcoal',(.035,.05,.055),.6);white=mat('Warm white',(.94,.93,.87),.48);mint=mat('Mint jacket',(.16,.75,.62),.55);purple=mat('Purple bag',(.52,.3,.86),.5);blue=mat('Explorer blue',(.035,.28,.88),.5);navy=mat('Navy shorts',(.035,.1,.25),.65);yellow=mat('Giraffe gold',(1,.55,.05),.6);brown=mat('Giraffe spots',(.38,.16,.035),.64);lime=mat('Lime accent',(.5,.94,.05),.48);iris=glossy_mat('Bright iris',(.02,.42,.75));mouth=mat('Mouth',(.35,.08,.1),.48);screen=glossy_mat('Phone screen',(.88,1,.97),.16)
 height=3.5 if character=='giraffe' else 3.15;rig=rig_create(height); parts=[]
 def P(o,b):parent_bone(o,rig,b);parts.append(o);return o
 # shared clothes/body
 if character=='koala':
  P(uv('Torso',(0,.03,1.45),(.65,.43,.7),gray),'chest');P(uv('MintHoodie',(0,-.08,1.56),(.68,.46,.55),mint),'chest');P(uv('WhiteShorts',(0,.01,.92),(.6,.41,.31),white),'pelvis')
  P(uv('Head',(0,-.01,2.57),(.83,.58,.72),gray,32),'head');P(uv('Cheek.L',(-.43,-.49,2.44),(.3,.1,.24),gray),'head');P(uv('Cheek.R',(.43,-.49,2.44),(.3,.1,.24),gray),'head');P(uv('Ear.L',(-.78,.04,2.78),(.53,.2,.55),gray),'head');P(uv('Ear.R',(.78,.04,2.78),(.53,.2,.55),gray),'head');P(uv('EarInner.L',(-.8,-.17,2.78),(.32,.035,.36),white),'head');P(uv('EarInner.R',(.8,-.17,2.78),(.32,.035,.36),white),'head')
  P(uv('Nose',(0,-.61,2.46),(.18,.1,.23),dark),'head'); eye_y=2.65;gap=.3
  for s,l in [(-1,'L'),(1,'R')]:
   P(uv('EyeWhite.'+l,(gap*s,-.57,eye_y),(.19,.055,.25),white),'head');P(uv('Iris.'+l,(gap*s,-.62,eye_y),(.11,.032,.16),glossy_mat('Iris'+l,(.02,.48,.38),.18)),'head');P(uv('Pupil.'+l,(gap*s,-.65,eye_y),(.055,.02,.09),dark),'head');P(uv('EyeHighlight.'+l,(gap*s-.032,-.674,eye_y+.065),(.026,.012,.035),white,16),'head');P(cyl('Brow.'+l,(gap*s,-.61,2.91),.025,.25,dark,rot=(math.pi/2,0,.18*s),vertices=16),'head')
  P(uv('MouthBase',(0,-.61,2.27),(.24,.03,.115),dark),'head');P(uv('Mouth',(0,-.64,2.245),(.18,.02,.07),mouth),'head');P(uv('Tooth',(0,-.665,2.31),(.1,.014,.045),white),'head');P(torus('HoodRim',(0,-.44,1.93),.43,.055,mint),'chest');P(cyl('Drawstring.L',(-.11,-.53,1.78),.018,.42,white,vertices=14),'chest');P(cyl('Drawstring.R',(.11,-.53,1.78),.018,.42,white,vertices=14),'chest');P(uv('HoodiePocket',(0,-.5,1.35),(.33,.035,.17),mint),'chest');P(cube('CrossbodyStrap',(0,-.52,1.48),(.045,.025,.65),purple,.025,rot=(0,-.52,0)),'chest');P(cube('Bag',(.5,-.54,1.1),(.27,.11,.27),purple,.09),'pelvis');P(cube('BagFlap',(.5,-.67,1.18),(.25,.025,.1),purple,.035),'pelvis')
  P(cube('Phone',(-1.04,-.14,1.55),(.16,.035,.26),purple,.045,rot=(0,0,-.08)),'forearm.L');P(cube('PhoneScreen',(-1.04,-.182,1.55),(.135,.012,.215),screen,.025,rot=(0,0,-.08)),'forearm.L');P(uv('PhoneHeart',(-1.04,-.205,1.55),(.055,.01,.065),mint,16),'forearm.L')
  for s in (-1,1):
   for z in (2.38,2.48):P(cube('CheekPixel',(s*.5,-.612,z),(.025,.012,.025),white,.006),'head')
 else:
  P(uv('Torso',(0,.02,1.42),(.6,.42,.67),yellow),'chest');P(uv('BlueJacket',(0,-.06,1.52),(.64,.45,.55),blue),'chest');P(uv('WhiteTee',(0,-.46,1.48),(.36,.035,.47),white),'chest');P(uv('NavyShorts',(0,.01,.89),(.57,.39,.31),navy),'pelvis')
  P(cyl('LongNeck',(0,.02,2.28),.28,1.38,yellow,vertices=28),'neck');P(uv('Head',(0,-.03,3.15),(.59,.49,.53),yellow,32),'head');P(uv('Muzzle',(0,-.5,2.96),(.43,.19,.235),mat('Muzzle',(.95,.68,.28),.62)),'head')
  for s,l in [(-1,'L'),(1,'R')]:P(uv('Ear.'+l,(.58*s,-.01,3.34),(.36,.1,.22),yellow),'head');P(uv('EarInner.'+l,(.59*s,-.12,3.34),(.22,.022,.12),brown),'head');P(cyl('Ossicone.'+l,(.2*s,.02,3.7),.07,.45,yellow),'head');P(uv('Horn.'+l,(.2*s,.02,3.94),(.12,.1,.12),brown),'head')
  for s,l in [(-1,'L'),(1,'R')]:P(uv('EyeWhite.'+l,(.21*s,-.49,3.27),(.175,.045,.225),white),'head');P(uv('Iris.'+l,(.21*s,-.53,3.27),(.1,.025,.15),iris),'head');P(uv('Pupil.'+l,(.21*s,-.555,3.27),(.05,.015,.085),dark),'head');P(uv('EyeHighlight.'+l,(.21*s-.027,-.584,3.325),(.023,.01,.034),white,16),'head');P(cyl('Brow.'+l,(.21*s,-.52,3.51),.024,.2,brown,rot=(math.pi/2,0,.16*s),vertices=16),'head')
  for i,(x,z,sx,sz) in enumerate([(-.18,3.42,.11,.12),(.2,3.08,.12,.14),(-.22,2.72,.13,.17),(.18,2.48,.13,.18),(-.16,2.18,.12,.16),(.14,1.98,.1,.13),(-.13,1.78,.13,.16),(.3,1.38,.12,.15)]):P(uv('Spot.%02d'%i,(x,-.5 if z>2.8 else -.305,z),(sx,.026,sz),brown),'head' if z>2.8 else ('neck' if z>1.9 else 'chest'))
  P(uv('Nostril.L',(-.13,-.69,3.0),(.032,.015,.025),brown),'head');P(uv('Nostril.R',(.13,-.69,3.0),(.032,.015,.025),brown),'head');P(uv('MouthBase',(0,-.715,2.88),(.15,.018,.065),brown,22),'head');P(uv('MouthGlow',(0,-.738,2.895),(.09,.009,.026),mouth,18),'head');P(smile_curve('Smile',(0,-.744,2.91),.1,.045,white),'head');P(cube('JacketLapell.L',(-.28,-.49,1.72),(.16,.025,.28),blue,.03,rot=(0,0,-.28)),'chest');P(cube('JacketLapell.R',(.28,-.49,1.72),(.16,.025,.28),blue,.03,rot=(0,0,.28)),'chest');P(cube('JacketPocket',(.34,-.52,1.45),(.12,.018,.1),blue,.025),'chest');P(cube('LimeStrap',(0,-.52,1.46),(.04,.025,.67),lime,.025,rot=(0,-.5,0)),'chest');P(cube('CameraBag',(.49,-.54,1.08),(.25,.11,.26),lime,.08),'pelvis');P(cube('BagFlap',(.49,-.67,1.16),(.23,.02,.09),lime,.03),'pelvis');P(uv('BagBadge',(.49,-.7,1.16),(.055,.012,.055),white,16),'pelvis')
  for i,z in enumerate((2.02,2.23,2.44,2.65,2.86)):
   P(ellipsoid(f'Mane.{i}',(0,.285,z),(.17,.11,.16),brown,rot=(0,0,.12*(-1 if i%2 else 1)),seg=20),'neck')
  for s,l in [(-1,'L'),(1,'R')]:
   for i,(z,dx) in enumerate(((.62,.0),(.42,.05),(.25,-.04))):P(uv(f'LegSpot.{l}.{i}',(.29*s+dx*s,-.2,z),(.09,.03,.12),brown),'shin.'+l)
  P(cyl('Tail',(.55,.2,.83),.07,.65,yellow,rot=(0,math.pi/2,.25),vertices=20),'pelvis');P(uv('TailTuft',(.87,.15,.9),(.16,.1,.13),brown),'pelvis')
 # limbs and shoes
 skin=gray if character=='koala' else yellow
 for s,l in [(-1,'L'),(1,'R')]:
  P(cyl('UpperArm.'+l,(.66*s,-.02,1.58),.17,.6,skin,rot=(0,.08*s,.42*s),vertices=28),'upper_arm.'+l);P(uv('Hand.'+l,(.88*s,-.03,1.34),(.23,.19,.24),skin),'forearm.'+l);P(cyl('Leg.'+l,(.29*s,0,.48),.19,.6,skin,vertices=28),'shin.'+l);P(uv('Shoe.'+l,(.29*s,-.15,.16),(.32,.43,.2),white),'shin.'+l)
  add_fingers(P,rig,s,l,skin,character);add_shoe_details(P,s,l,white,mint if character=='koala' else blue,dark)
  sleeve=mint if character=='koala' else blue;P(cyl('Sleeve.'+l,(.57*s,-.01,1.68),.19,.28,sleeve,rot=(0,.08*s,.42*s),vertices=28),'upper_arm.'+l)
 add_actions(rig)
 # ground, lights, camera only for preview; excluded by export selection
 bpy.ops.mesh.primitive_plane_add(size=14,location=(0,0,-.03));floor=bpy.context.object;floor.data.materials.append(mat('Studio floor',(.09,.12,.13),.85))
 for loc,en,size,col in [((-3,-4,6),1000,4,(1,.82,.63)),((4,-2,4),750,3,(.45,.75,1)),((0,3,5),800,3,(.6,1,.85))]:bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=en;o.data.size=size;o.data.color=col;look(o,(0,0,1.7))
 bpy.ops.object.camera_add(location=(3.7,-7.5,3.1));cam=bpy.context.object;cam.data.lens=62;look(cam,(0,0,height*.48));bpy.context.scene.camera=cam
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=800;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.look='AgX - Medium High Contrast'
 art=os.path.join(ROOT,'art','companions',character);pub=os.path.join(ROOT,'public','models','companions');os.makedirs(os.path.join(art,'references'),exist_ok=True);os.makedirs(pub,exist_ok=True)
 blend=os.path.join(art,f'{character}-companion-v1.blend');glb=os.path.join(pub,f'{character}-companion-ar-v1.glb');preview=os.path.join(art,'references',f'{character}-companion-preview-v1.png');front=os.path.join(art,'references',f'{character}-companion-front-v1.png')
 bpy.ops.wm.save_as_mainfile(filepath=blend);scene.render.filepath=preview
 greeting=bpy.data.actions.get('greeting');rig.animation_data.action=greeting;scene.frame_set(28);bpy.context.view_layer.update();bpy.ops.render.render(write_still=True)
 rig.animation_data.action=None
 for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
 scene.frame_set(1);bpy.context.view_layer.update()
 cam.location=(0,-8.1,height*.54);look(cam,(0,0,height*.48));scene.render.filepath=front;bpy.ops.render.render(write_still=True)
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=glb,export_format='GLB',use_selection=True,export_animations=True,export_nla_strips=True,export_apply=True)
 print('BUILT',character,blend,glb,preview,front)

for c in CHARACTERS: build(c)
