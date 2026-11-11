import bpy,collections
from mathutils import Vector
p='/private/tmp/lanlao-side-thickness.blend';bpy.ops.wm.open_mainfile(filepath=p);s=bpy.context.scene;body=next(x for x in s.objects if x.type=='MESH' and len(x.data.vertices)>25000);lip=bpy.data.objects['Side_Oral_Lining'];bk=body.data.shape_keys.key_blocks;lk=lip.data.shape_keys.key_blocks;bn={i:g.name for i,g in enumerate(body.vertex_groups)};ln={i:g.name for i,g in enumerate(lip.vertex_groups)}
def weights(v,names):return tuple(sorted((names[g.group],round(g.weight,5)) for g in v.groups))
pos=collections.defaultdict(list)
for v in body.data.vertices:pos[(tuple(round(x,5) for x in v.co),weights(v,bn))].append(v.index)
correspond=[];ambig=0;bad=0
for v in lip.data.vertices:
 ident=(tuple(round(x,5) for x in v.co),weights(v,ln));ids=pos.get(ident,[])
 if not ids:continue
 distances=[]
 for k in ids:
  d=max(((lk[name].data[v.index].co-lk['Basis'].data[v.index].co)-(bk[name].data[k].co-bk['Basis'].data[k].co)).length for name in lk.keys() if name!='Basis')
  distances.append((d,k))
 distances.sort();d,k=distances[0];ambig+=len(distances)>1;bad+=d>1e-6;correspond.append((v.index,k,d))
print('OUTER_MATCHES',len(correspond),'AMBIGUOUS',ambig,'MAX_KEY_DELTA_DIFF',max((d for _,_,d in correspond),default=0),'BAD',bad,flush=True)
for frame in [1,8,12,16,20,30,35,38]:
 s.frame_set(frame);dg=bpy.context.evaluated_depsgraph_get();a=body.evaluated_get(dg);b=lip.evaluated_get(dg);am=a.to_mesh();bm=b.to_mesh();errors=[(a.matrix_world@am.vertices[k].co-b.matrix_world@bm.vertices[i].co).length for i,k,d in correspond];print('FRAME',frame,'max_world_gap',max(errors,default=0),'mean',sum(errors)/len(errors) if errors else 0,flush=True);a.to_mesh_clear();b.to_mesh_clear()
