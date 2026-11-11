import bpy
from pathlib import Path
src='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-patch-experiment/v5.blend'
dst='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-patch-experiment/v10-normal.blend'
bpy.ops.wm.open_mainfile(filepath=dst);s=bpy.context.scene;o=next(x for x in s.objects if x.type=='MESH' and len(x.data.vertices)>20000)
with bpy.data.libraries.load(src,link=False) as (a,b):b.objects=[name for name in a.objects if name=='meshes[0].001']
ref=b.objects[0];basis=ref.data.shape_keys.key_blocks['Basis'];source=ref.data.shape_keys.key_blocks['OpenSideMouth'];ours=o.data.shape_keys.key_blocks['Basis'];n=len(basis.data)
print('reference',n,'target',len(ours.data),'maxbasisdiff',max((basis.data[i].co-ours.data[i].co).length for i in range(n)),flush=True)
assert max((basis.data[i].co-ours.data[i].co).length for i in range(n))<1e-7
key=o.shape_key_add(name='OpenSideMouth',from_mix=False)
for i in range(n):key.data[i].co=ours.data[i].co+(source.data[i].co-basis.data[i].co)
for fr,val in [(1,0),(20,1),(30,1),(38,0)]:key.value=val;key.keyframe_insert(data_path='value',frame=fr)
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-patch-experiment/rebuild-v11.blend')
