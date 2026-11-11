import bpy,bmesh,collections
src='/private/tmp/lanlao-side-thickness.blend';dst='/private/tmp/lanlao-side-weld-basis.blend'
bpy.ops.wm.open_mainfile(filepath=src);a=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>25000);b=bpy.data.objects['Side_Oral_Lining'];ak=a.data.shape_keys.key_blocks;bk=b.data.shape_keys.key_blocks
lookup=collections.defaultdict(list)
for v in a.data.vertices:lookup[tuple(round(float(n),5) for n in ak['Basis'].data[v.index].co)].append(v.index)
def weights(o,v):return {o.vertex_groups[g.group].name:g.weight for g in v.groups}
def same(i,j):
 ga=weights(a,a.data.vertices[i]);gb=weights(b,b.data.vertices[j]);
 if max((abs(ga.get(k,0)-gb.get(k,0)) for k in set(ga)|set(gb)),default=0)>1e-5:return False
 for key in bk:
  if key.name not in ak:return False
  if ((ak[key.name].data[i].co-ak['Basis'].data[i].co)-(key.data[j].co-bk['Basis'].data[j].co)).length>1e-5:return False
 return True
cand={v.index:[i for i in lookup[tuple(round(float(n),5) for n in bk['Basis'].data[v.index].co)] if same(i,v.index)] for v in b.data.vertices}
bm=bmesh.new();bm.from_mesh(a.data);bm.verts.ensure_lookup_table();edges={tuple(sorted((e.verts[0].index,e.verts[1].index))):len(e.link_faces) for e in bm.edges};outer=[]
for e in b.data.edges:
 i,j=e.vertices
 if not cand[i] or not cand[j]:continue
 opts=[(u,v) for u in cand[i] for v in cand[j] if edges.get(tuple(sorted((u,v))))==1]
 if len(opts)==1:outer.append(opts[0])
print('SOURCE_OUTER_EDGE_COUNT',len(outer),flush=True);nb=len(a.data.vertices);baseline=[v.co.copy() for v in ak['Basis'].data];bm.free()
bpy.ops.wm.open_mainfile(filepath=dst);a=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>25000);ak=a.data.shape_keys.key_blocks
print('MAX_OLD_VERTEX_INDEX_DELTA',max((ak['Basis'].data[i].co-baseline[i]).length for i in range(nb)),flush=True)
bm=bmesh.new();bm.from_mesh(a.data);bm.verts.ensure_lookup_table();bm.edges.ensure_lookup_table();by={tuple(sorted((e.verts[0].index,e.verts[1].index))):len(e.link_faces) for e in bm.edges};h=collections.Counter(by.get(tuple(sorted(edge)),-1) for edge in outer);print('JOINED_EDGE_FACE_COUNTS',dict(h),flush=True)
