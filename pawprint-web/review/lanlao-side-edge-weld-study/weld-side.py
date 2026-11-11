import bpy,bmesh,collections
from mathutils import Vector
src='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-side-edge-weld-study/base.blend';bpy.ops.wm.open_mainfile(filepath=src);scene=bpy.context.scene;scene.frame_set(1)
a=next(x for x in scene.objects if x.type=='MESH' and len(x.data.vertices)>25000);b=bpy.data.objects['Side_Oral_Lining'];ak=a.data.shape_keys.key_blocks;bk=b.data.shape_keys.key_blocks
lookup=collections.defaultdict(list)
for v in a.data.vertices:lookup[tuple(round(float(n),5) for n in v.co)].append(v.index)
def groups(o,v):return {o.vertex_groups[g.group].name:g.weight for g in v.groups}
def same(i,j):
 av=a.data.vertices[i];bv=b.data.vertices[j];ga=groups(a,av);gb=groups(b,bv)
 if max((abs(ga.get(k,0)-gb.get(k,0)) for k in set(ga)|set(gb)),default=0)>1e-5:return False
 for key in bk:
  if key.name not in ak:return False
  da=ak[key.name].data[i].co-ak['Basis'].data[i].co;db=key.data[j].co-bk['Basis'].data[j].co
  if (da-db).length>1e-5:return False
 return True
cand={v.index:[i for i in lookup[tuple(round(float(n),5) for n in v.co)] if same(i,v.index)] for v in b.data.vertices}
bm=bmesh.new();bm.from_mesh(a.data);bm.verts.ensure_lookup_table();bm.edges.ensure_lookup_table();edges={tuple(sorted((e.verts[0].index,e.verts[1].index))):len(e.link_faces) for e in bm.edges};selection={};conflicts=[];outer=[]
for e in b.data.edges:
 i,j=e.vertices
 if not cand[i] or not cand[j]:continue
 opts=[(u,v) for u in cand[i] for v in cand[j] if edges.get(tuple(sorted((u,v))))==1]
 assert len(opts)==1,(i,j,opts)
 for k,v in zip((i,j),opts[0]):
  if k in selection and selection[k]!=v:conflicts.append((k,v,selection[k]))
  selection[k]=v
 outer.append((i,j))
assert not conflicts,conflicts
assert len(selection)==68 and len(outer)==62,(len(selection),len(outer))
shapes={layer.name:layer for layer in bm.verts.layers.shape.values()};deform=bm.verts.layers.deform.verify();vmap={};original_verts=list(bm.verts)
for v in b.data.vertices:
 if v.index in selection:vmap[v.index]=original_verts[selection[v.index]];continue
 assert not cand[v.index],v.index
 n=bm.verts.new(bk['Basis'].data[v.index].co)
 for key in bk:n[shapes[key.name]]=key.data[v.index].co
 for group,val in groups(b,v).items():n[deform][a.vertex_groups[group].index]=val
 vmap[v.index]=n
matidx=next(i for i,m in enumerate(a.data.materials) if m and m.name=='Deep oral surface');newfaces=[];errors=[]
for p in b.data.polygons:
 vv=[vmap[i] for i in p.vertices]
 try:f=bm.faces.new(vv);f.material_index=matidx;f.smooth=p.use_smooth;newfaces.append(f)
 except ValueError as e:errors.append((p.index,str(e)))
print('OUTER_BOUNDARIES_BEFORE',len(outer),'NEWFACES',len(newfaces),'ERRORS',errors,flush=True)
for i,j in outer:
 e=bm.edges.get((vmap[i],vmap[j]));assert e is not None and len(e.link_faces)==2,(i,j,e and len(e.link_faces))
sideedges={e for f in newfaces for e in f.edges};print('SIDE_EDGES',len(sideedges),'SIDEBORDER',sum(len(e.link_faces)==1 for e in sideedges),'NONMANIFOLD',sum(len(e.link_faces)>2 for e in sideedges),flush=True)
bm.to_mesh(a.data);bm.free();a.data.update();bpy.data.objects.remove(b,do_unlink=True);scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/rebuild-weld-basis.blend')
