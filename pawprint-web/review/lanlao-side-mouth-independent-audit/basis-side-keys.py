import bpy,collections
src='/private/tmp/lanlao-side-thickness.blend';dst='/private/tmp/lanlao-side-weld-basis.blend'
bpy.ops.wm.open_mainfile(filepath=src);lip=bpy.data.objects['Side_Oral_Lining'];keys=lip.data.shape_keys.key_blocks;signatures=[]
for v in lip.data.vertices:
 xyz=tuple(round(n,7) for k in keys for n in k.data[v.index].co);wt=tuple(sorted((lip.vertex_groups[g.group].name,round(g.weight,6)) for g in v.groups));signatures.append((v.index,xyz,wt))
bpy.ops.wm.open_mainfile(filepath=dst);body=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>25000);keys=body.data.shape_keys.key_blocks;d=collections.defaultdict(list)
for v in body.data.vertices:
 xyz=tuple(round(n,7) for k in keys for n in k.data[v.index].co);wt=tuple(sorted((body.vertex_groups[g.group].name,round(g.weight,6)) for g in v.groups));d[(xyz,wt)].append(v.index)
missing=[i for i,x,w in signatures if not d.get((x,w))]
print('LIP_VERTICES',len(signatures),'MATCHED',len(signatures)-len(missing),'MISSING',len(missing),'FIRST',missing[:25],flush=True)
