import bpy,bmesh,collections
base='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-side-edge-weld-study/weld-basis.blend';src='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-side-edge-weld-study/safe-new-weld.blend'
def load(path):
 bpy.ops.wm.open_mainfile(filepath=path);o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>25000);bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();dl=bm.verts.layers.deform.verify();shapes=list(bm.verts.layers.shape)
 def geom(v):return tuple(round(float(n),5) for n in v.co)
 def sig(v):return tuple(sorted((int(k),round(float(w),6)) for k,w in v[dl].items() if abs(w)>1e-9)),tuple(tuple(round(float(x),6) for x in v[k]-v.co) for k in shapes)
 dic=collections.defaultdict(list)
 for e in bm.edges:
  if len(e.link_faces)!=1 or not all(-.46<v.co.x<-.38 and -.13<v.co.y<-.08 and .55<v.co.z<.60 for v in e.verts):continue
  ordered=sorted(e.verts,key=geom);dic[tuple(geom(v) for v in ordered)].append((e,ordered,tuple(sig(v) for v in ordered)))
 return o,bm,dic
a,abm,old=load(base);oldkeys=set(old);abm.free();o,bm,dic=load(src);uvs=list(bm.loops.layers.uv);new=[];errors=[]
def loopuv(face,v):
 loop=next(l for l in face.loops if l.vert==v)
 return [loop[layer].uv.copy() for layer in uvs]
for geo,records in dic.items():
 if geo in oldkeys or len(records)!=2 or records[0][2]==records[1][2]:continue
 e1,a,_=records[0];e2,b,_=records[1];f1=e1.link_faces[0];f2=e2.link_faces[0]
 if f1.material_index!=0 or f2.material_index!=0:continue
 v=[a[0],a[1],b[1],b[0]];sample=[loopuv(f1,a[0]),loopuv(f1,a[1]),loopuv(f2,b[1]),loopuv(f2,b[0])]
 unique=[];unique_uv=[]
 for item,coords in zip(v,sample):
  if item not in unique:unique.append(item);unique_uv.append(coords)
 if len(unique)<3:continue
 try:f=bm.faces.new(unique)
 except ValueError as e:errors.append((geo,str(e)));continue
 f.material_index=0;f.smooth=True
 for l,coords in zip(f.loops,unique_uv):
  for layer,co in zip(uvs,coords):l[layer].uv=co
 new.append(f)
print('BRIDGED_SKIN',len(new),'ERRORS',errors,flush=True)
region=[e for e in bm.edges if all(-.46<v.co.x<-.38 and -.13<v.co.y<-.08 and .55<v.co.z<.60 for v in e.verts)]
print('REGION_BOUNDARY',sum(len(e.link_faces)==1 for e in region),'NONMANIFOLD',sum(len(e.link_faces)>2 for e in region),flush=True)
bm.to_mesh(o.data);bm.free();o.data.update();bpy.context.scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/rebuild-bridged-skin.blend')
