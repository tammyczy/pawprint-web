import bpy,bmesh,collections
base='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-side-edge-weld-study/weld-basis.blend';src='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-side-edge-weld-study/split-wide.blend'
def load(path):
 bpy.ops.wm.open_mainfile(filepath=path);o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>25000);bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();dl=bm.verts.layers.deform.verify();shapes=list(bm.verts.layers.shape)
 def geom(v):return tuple(round(float(n),5) for n in v.co)
 def sig(v):return tuple(sorted((int(k),round(float(w),6)) for k,w in v[dl].items() if abs(w)>1e-9)),tuple(tuple(round(float(x),6) for x in v[k]-v.co) for k in shapes)
 dic=collections.defaultdict(list)
 for e in bm.edges:
  if len(e.link_faces)!=1 or not all(-.46<v.co.x<-.38 and -.13<v.co.y<-.08 and .55<v.co.z<.60 for v in e.verts):continue
  ordered=sorted(e.verts,key=geom);dic[tuple(geom(v) for v in ordered)].append((e,ordered,tuple(sig(v) for v in ordered)))
 return o,bm,dic
a,abm,old=load(base);old_keys=set(old);abm.free();o,bm,dic=load(src)
parent={};vertices=set()
def find(v):
 parent.setdefault(v,v)
 if parent[v]!=v:parent[v]=find(parent[v])
 return parent[v]
def union(a,b):
 ra,rb=find(a),find(b)
 if ra!=rb:parent[rb]=ra
eligible=0
for geo,records in dic.items():
 if geo in old_keys:continue
 bysig=collections.defaultdict(list)
 for e,v,s in records:bysig[s].append(v)
 for sig,vs in bysig.items():
  if len(vs)!=2:continue
  eligible+=1
  for v1,v2 in zip(vs[0],vs[1]):union(v1,v2);vertices.update((v1,v2))
target={v:find(v) for v in vertices if find(v)!=v};print('SAFE_EDGES',eligible,'MERGE_VERTS',len(target),flush=True)
bmesh.ops.weld_verts(bm,targetmap=target)
region=[e for e in bm.edges if all(-.46<v.co.x<-.38 and -.13<v.co.y<-.08 and .55<v.co.z<.60 for v in e.verts)]
print('REGION_BOUNDARY',sum(len(e.link_faces)==1 for e in region),'NONMANIFOLD',sum(len(e.link_faces)>2 for e in region),flush=True)
bm.to_mesh(o.data);bm.free();o.data.update();bpy.context.scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/rebuild-safe-new-weld.blend')
