import bpy
from mathutils import Vector
from pathlib import Path
root=Path('/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-short-mouth-bridge-study')
def data(path):
 bpy.ops.wm.open_mainfile(filepath=str(path));o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>20000)
 keys={k.name:[v.co.copy() for v in k.data] for k in o.data.shape_keys.key_blocks if k.name!='Tongue_retract'}
 weights=[{o.vertex_groups[g.group].name:g.weight for g in v.groups} for v in o.data.vertices]
 return o,keys,weights
src,keys,weights=data('/private/tmp/lanlao-short-mouth-oriented.blend')
o,new,w=data(root/'preview.blend');n=len(weights)
for name,old in keys.items():
 maxerr=max((old[i]-new[name][i]).length for i in range(n));print('KEY',name,'max_coord_error',maxerr,flush=True)
maxweight=max(abs(a.get(k,0)-w[i].get(k,0)) for i,a in enumerate(weights) for k in set(a)|set(w[i]))
print('original vertices',n,'weight_error',maxweight,'new_vertices',len(w)-n,flush=True)
for idx in (23690,23701,23704):
 f=sum(1 for p in o.data.polygons if idx in p.vertices and any(v>=n for v in p.vertices))
 print('shared_anchor',idx,'new_faces',f,flush=True)
