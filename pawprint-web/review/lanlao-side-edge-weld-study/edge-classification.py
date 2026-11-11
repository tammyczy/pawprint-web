import bpy,bmesh,collections
paths=['/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-side-edge-weld-study/weld-basis.blend','/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-side-edge-weld-study/split-wide.blend'];datasets=[]
for p in paths:
 bpy.ops.wm.open_mainfile(filepath=p);o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>25000);bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();dl=bm.verts.layers.deform.verify();shapes=list(bm.verts.layers.shape);dic=collections.defaultdict(list)
 for e in bm.edges:
  if len(e.link_faces)!=1 or not all(-.46<v.co.x<-.38 and -.13<v.co.y<-.08 and .55<v.co.z<.60 for v in e.verts):continue
  geom=tuple(sorted(tuple(round(float(n),5) for n in v.co) for v in e.verts));
  def sig(v):return (tuple(sorted((int(k),round(float(w),6)) for k,w in v[dl].items() if abs(w)>1e-9)),tuple(tuple(round(float(x),6) for x in v[k]-v.co) for k in shapes))
  dic[geom].append(tuple(sig(v) for v in sorted(e.verts,key=lambda x:tuple(round(float(n),5) for n in x.co))))
 datasets.append(dic)
a,b=datasets
for geom,sigs in b.items():
 before=len(a.get(geom,[]));after=len(sigs)
 if after>before:
  print('NEW',geom,'before',before,'after',after,'signature_counts',sorted(collections.Counter(sigs).values()),flush=True)
