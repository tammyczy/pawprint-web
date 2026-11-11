import bpy,bmesh
from pathlib import Path
root=Path('/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-joined-tongue-study')
def get(path):
 bpy.ops.wm.open_mainfile(filepath=str(path));o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>20000)
 keys={k.name:[v.co.copy() for v in k.data] for k in o.data.shape_keys.key_blocks if k.name!='Tongue_retract'}
 weights=[{o.vertex_groups[g.group].name:g.weight for g in v.groups} for v in o.data.vertices]
 return o,keys,weights
src,old,w0=get('/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-joined-tongue-study/base.blend');o,new,w=get(root/'preview.blend');n=len(w0)
for name,data in old.items():print('KEY',name,'maxdelta',max((data[i]-new[name][i]).length for i in range(n)),flush=True)
print('OLDWEIGHT maxdelta',max(abs(a.get(k,0)-w[i].get(k,0)) for i,a in enumerate(w0) for k in set(a)|set(w[i])),flush=True)
s=bpy.context.scene
for frame in (1,8,12,16,20,30,35,38):
 s.frame_set(frame);bpy.context.view_layer.update();ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ev.to_mesh();bm=bmesh.new();bm.from_mesh(m)
 faces=[f for f in bm.faces if f.material_index==2];edges=set(e for f in faces for e in f.edges)
 boundary=sum(len(e.link_faces)==1 for e in edges);nonmanifold=sum(len(e.link_faces)>2 for e in edges);degen=sum(f.calc_area()<1e-12 for f in faces)
 print('FRAME',frame,'faces',len(faces),'boundary',boundary,'nonmanifold',nonmanifold,'degenerate',degen,flush=True)
 bm.free();ev.to_mesh_clear()
