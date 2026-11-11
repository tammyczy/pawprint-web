import bpy,collections
src='/private/tmp/lanlao-side-thickness.blend';dst='/private/tmp/lanlao-side-actual-weld.blend'
bpy.ops.wm.open_mainfile(filepath=src);lip=bpy.data.objects['Side_Oral_Lining'];ks=lip.data.shape_keys.key_blocks;expected=[]
for v in lip.data.vertices:
 xyz=tuple(round(n,7) for k in ks for n in k.data[v.index].co);w=tuple(sorted((lip.vertex_groups[g.group].name,round(g.weight,6)) for g in v.groups));expected.append((v.index,xyz,w))
bpy.ops.wm.open_mainfile(filepath=dst);body=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>25000);ks=body.data.shape_keys.key_blocks;d=collections.defaultdict(list)
for v in body.data.vertices:
 xyz=tuple(round(n,7) for k in ks for n in k.data[v.index].co);w=tuple(sorted((body.vertex_groups[g.group].name,round(g.weight,6)) for g in v.groups));d[(xyz,w)].append(v.index)
missing=[(i,x,w) for i,x,w in expected if not d.get((x,w))];counts=collections.Counter()
for i,x,w in missing:
 found=False
 for offset in [-.0003,.0003]:
  y=tuple(round(value+(offset if ix%3==2 else 0),7) for ix,value in enumerate(x))
  if d.get((y,w)):counts[offset]+=1;found=True;break
 if not found:counts['other']+=1
print('MISSING',len(missing),'Z_SHIFT_MATCHES',dict(counts),flush=True)
