import bpy, math
from mathutils import Vector,Matrix
from pathlib import Path
root=Path('/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-side-tongue-depth-experiment')
bpy.ops.wm.open_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-sync-study/preview.blend')
s=bpy.context.scene;s.frame_set(20);bpy.context.view_layer.update()
o=next(x for x in s.objects if x.type=='MESH' and len(x.data.vertices)==25523);arm=next(x for x in s.objects if x.type=='ARMATURE');keys=o.data.shape_keys.key_blocks
jaw=o.vertex_groups['Lower_Jaw'].index;chest=o.vertex_groups['Chest'].index

def deform(n):return arm.matrix_world@arm.pose.bones[n].matrix@arm.data.bones[n].matrix_local.inverted()
Mj=deform('Lower_Jaw');Mc=deform('Chest');M=Matrix([[.87*Mj[i][j]+.13*Mc[i][j] for j in range(4)] for i in range(4)]);inv=M.inverted()
orig=25319; assert len(o.data.vertices)-orig==204
inside=inv@Vector((-.435,-.035,.563))
for k in range(17):
 t=k/16; tip=max(0,(t-.48)/.52)
 width=.017*(.75+.25*math.sin(math.pi*t))*max(.001,1-tip*tip)**.20
 cx=-.447-.035*t; z=.562-.002*t-.022*max(0,(t-.36)/.64)
 # A slightly thicker arched center; thickness tapers gradually at tip.
 thick=(.006+.002*math.sin(math.pi*t))*math.sqrt(max(.08,1-tip*tip))
 for j in range(12):
  idx=orig+k*12+j;a=2*math.pi*j/12
  new=inv@Vector((cx,-.035+width*math.cos(a),z+thick*math.sin(a)))
  delta=new-keys['Basis'].data[idx].co.copy()
  for key in keys:
   if key.name=='Tongue_retract': continue
   key.data[idx].co+=delta
  keys['Tongue_retract'].data[idx].co=inside+(new-inside)*.035
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(root/'preview.blend'))
