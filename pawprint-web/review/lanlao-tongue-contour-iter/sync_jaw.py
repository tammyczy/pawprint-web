import bpy
from pathlib import Path
root=Path('/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-tongue-contour-iter')
bpy.ops.wm.open_mainfile(filepath=str(root/'combined-narrow.blend'))
s=bpy.context.scene;o=next(x for x in s.objects if x.type=='MESH' and len(x.data.vertices)>25000);arm=next(x for x in s.objects if x.type=='ARMATURE');jaw=arm.pose.bones['Lower_Jaw'];k=o.data.shape_keys.key_blocks
vals=[]
for f in range(1,39):s.frame_set(f);vals.append(max(0,min(1,abs(jaw.rotation_euler.y)/.15)))
key=k['SoftRoundMouth']
if o.data.shape_keys.animation_data and o.data.shape_keys.animation_data.action:
 action=o.data.shape_keys.animation_data.action
 for curve in list(action.fcurves):
  if curve.data_path=='key_blocks["SoftRoundMouth"].value':action.fcurves.remove(curve)
for f,v in enumerate(vals,1):key.value=v;key.keyframe_insert(data_path='value',frame=f)
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(root/'combined-synced.blend'))
