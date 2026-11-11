import bpy,bmesh,collections,math
from pathlib import Path
src='/private/tmp/lanlao-side-independent.blend';dst='/private/tmp/lanlao-side-thickness.blend'
def snapshot(path):
 bpy.ops.wm.open_mainfile(filepath=path);o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>25000);ks=list(o.data.shape_keys.key_blocks)
 names=[k.name for k in ks];print('SNAPSHOT',path,'vertices',len(o.data.vertices),'faces',len(o.data.polygons),'keys',names,flush=True)
 counts=collections.Counter(); weights=collections.defaultdict(list)
 for i,v in enumerate(o.data.vertices):
  signature=tuple(round(c,5) for k in ks for c in k.data[i].co);counts[signature]+=1
  weights[signature].append(tuple(sorted((o.vertex_groups[g.group].name,round(g.weight,5)) for g in v.groups)))
 return names,counts,weights
names,a,aw=snapshot(src);bn,b,bw=snapshot(dst)
missing=sum((a-b).values());same=set(a)&set(b);missing_weight=0
for k in same:
 old=collections.Counter(aw[k]);new=collections.Counter(bw[k]);missing_weight+=sum((old-new).values())
print('ORIGINAL_KEY_TUPLES_MISSING',missing,'BONE_WEIGHT_TUPLES_MISSING',missing_weight,flush=True)
for o in bpy.context.scene.objects:
 if o.name!='Side_Oral_Lining':continue
 print('SIDE_ORAL',len(o.data.vertices),len(o.data.polygons),'shape_keys',list(k.name for k in o.data.shape_keys.key_blocks) if o.data.shape_keys else [],flush=True)
 for frame in [1,8,12,16,20,30,35,38]:
  bpy.context.scene.frame_set(frame);deps=bpy.context.evaluated_depsgraph_get();ev=o.evaluated_get(deps);m=ev.to_mesh();bm=bmesh.new();bm.from_mesh(m);boundary=sum(len(e.link_faces)==1 for e in bm.edges);nonmanifold=sum(len(e.link_faces)>2 for e in bm.edges);degen=sum(f.calc_area()<1e-10 for f in bm.faces);ev.to_mesh_clear();bm.free();print('FRAME',frame,'boundary',boundary,'nonmanifold',nonmanifold,'degenerate',degen,flush=True)
