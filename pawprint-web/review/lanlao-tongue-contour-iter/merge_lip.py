import bpy
from mathutils import Vector
from pathlib import Path
root=Path('/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-tongue-contour-iter')
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-smooth-basis-test.blend')
src=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>25000)
b=src.data.shape_keys.key_blocks['Basis'];k=src.data.shape_keys.key_blocks['LipSmoothTest'];n=25319
original=[b.data[i].co.copy() for i in range(n)];delta=[k.data[i].co-b.data[i].co for i in range(n)]
bpy.ops.wm.open_mainfile(filepath=str(root/'preview.blend'))
dst=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>25000);basis=dst.data.shape_keys.key_blocks['Basis']
err=max((basis.data[i].co-original[i]).length for i in range(n));print('BASE ERROR',err,flush=True);assert err<1e-6
key=dst.shape_key_add(name='LipSmoothTest',from_mix=False)
for i in range(n):key.data[i].co=basis.data[i].co+delta[i]
for frame,val in [(1,0),(20,1),(30,1),(38,0)]:key.value=val;key.keyframe_insert(data_path='value',frame=frame)
bpy.context.scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(root/'combined.blend'))
