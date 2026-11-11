import bpy,math
from mathutils import Vector
root='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/'
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-peredge-inner.blend')
scene=bpy.context.scene; scene.frame_set(20); bpy.context.view_layer.update()
o=bpy.data.objects['Tongue']; inv=o.matrix_world.inverted()
if o.animation_data and o.animation_data.action:
 for fc in list(o.animation_data.action.fcurves):
  if fc.data_path=='scale':o.animation_data.action.fcurves.remove(fc)
o.scale=(1,1,1);bpy.context.view_layer.update(); inv=o.matrix_world.inverted()
verts=[];faces=[]
# Closed cross-section makes a soft tongue volume with a tapering, rounded tip.
for k in range(17):
 t=k/16; w=.018*(.75+.25*math.sin(math.pi*min(1,t)))
 tip=max(0,(t-.48)/.52); w*=math.sqrt(max(.001,1-tip*tip))
 x=-.410-.072*t; z=.571-.003*t-.030*(max(0,(t-.36)/.64))
 thick=(.005+.003*math.sin(math.pi*t))*math.sqrt(max(.02,1-tip*tip))
 for j in range(12):
  a=2*math.pi*j/12
  # slight groove, broad upper surface and rounded underside
  y=-.035+w*math.cos(a)
  zz=z+thick*math.sin(a)-.0008*math.exp(-((math.cos(a))/.22)**2)*max(0,math.sin(a))
  verts.append(inv@Vector((x,y,zz)))
for k in range(16):
 for j in range(12):
  a=k*12+j;b=k*12+(j+1)%12;faces.append((a,b,b+12,a+12))
faces.append(tuple(range(11,-1,-1))); faces.append(tuple(16*12+j for j in range(12)))
mesh=bpy.data.meshes.new('TongueVolume');mesh.from_pydata(verts,[],faces);mesh.update()
old=o.data;o.data=mesh
for poly in mesh.polygons:poly.use_smooth=True
mat=bpy.data.materials.new('Tongue soft pink');mat.diffuse_color=(.36,.085,.095,1);mat.use_nodes=True
p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.36,.085,.095,1);p.inputs['Roughness'].default_value=.56
if p.inputs.get('Subsurface Weight'):p.inputs['Subsurface Weight'].default_value=.15
mesh.materials.append(mat)
for m in list(o.modifiers):o.modifiers.remove(m)
sub=o.modifiers.new('Rounded surface','SUBSURF');sub.levels=2;sub.render_levels=2
o.shape_key_add(name='Open');close=o.shape_key_add(name='Retracted')
inside=inv@Vector((-.398,-.035,.571))
for v in close.data:v.co=inside+(v.co-inside)*.055
for frame,value in [(1,1),(11,.9),(20,0),(30,0),(38,1)]:close.value=value;close.keyframe_insert('value',frame=frame)
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=root+'review/lanlao-tongue-roundtip-study/preview.blend')
