import bpy,collections,math
from mathutils import Vector
src='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-sync-study/preview.blend';bpy.ops.wm.open_mainfile(filepath=src);s=bpy.context.scene;s.frame_set(20);o=next(x for x in s.objects if x.type=='MESH' and len(x.data.vertices)>25000);j=o.vertex_groups['Lower_Jaw'].index
w=lambda i:next((g.weight for g in o.data.vertices[i].groups if g.group==j),0)
skin=set();adj=collections.defaultdict(set)
for f in o.data.polygons:
 if f.material_index!=0:continue
 ids=list(f.vertices);skin.update(ids)
 for i,a in enumerate(ids):
  b=ids[(i+1)%len(ids)];adj[a].add(b);adj[b].add(a)
groups=collections.defaultdict(list)
for v in o.data.vertices:
 x,y,z=v.co
 if -.47<x<-.425 and abs(y+.035)<.05 and .568<z<.589:groups[tuple(round(float(a),5) for a in v.co)].append(v.index)
seams=[]
for p,ids in groups.items():
 low=[i for i in ids if w(i)<.08 and i in skin];high=[i for i in ids if w(i)>.2 and i in skin]
 if low and high:seams.append((p,low,high))
dg=bpy.context.evaluated_depsgraph_get();dg.update();ev=o.evaluated_get(dg);me=ev.to_mesh();before=[v.co.copy() for v in me.vertices];ev.to_mesh_clear()
probe=o.shape_key_add(name='ProbeZ');eps=.001
for v in o.data.vertices:probe.data[v.index].co.z+=eps
probe.value=1;dg.update();ev=o.evaluated_get(dg);me=ev.to_mesh();after=[v.co.copy() for v in me.vertices];ev.to_mesh_clear();o.shape_key_remove(probe)
changes={}
for p,up,lo in seams:
 x,y,z=p;r=abs(y+.035);upper=before[up[0]].z
 # Smoothed local curve follows the face rather than a fixed horizontal line.
 vals=[]
 for q,u,l in seams:
  d=(q[1]-y)/.012;dx=(q[0]-x)/.014;wt=math.exp(-.5*(d*d+dx*dx));vals.append((before[u[0]].z,wt))
 upper=sum(a*b for a,b in vals)/sum(b for a,b in vals)
 width=.032;opening=.024*math.sqrt(max(0,1-(r/width)**2));lower=upper-opening
 for ids,target in [(up,upper),(lo,lower)]:
  for i in ids:
   deriv=(after[i].z-before[i].z)/eps
   if deriv>.35:changes[i]=max(-.010,min(.010,(target-before[i].z)/deriv))
 # Same rest-position and bone influence duplicates on the oral connection must follow exterior.
 for idx in groups[p]:
  match=up if w(idx)<.08 else lo if w(idx)>.2 else []
  if match and match[0] in changes:changes[idx]=changes[match[0]]
# Only immediate face-adjacent skin vertices. Do not let the deformation spread into non-mouth face.
base=dict(changes);neighbors=collections.defaultdict(list)
for i,d in base.items():
 for n in adj.get(i,()):
  if n not in base and (w(n)<.08)==(w(i)<.08):neighbors[n].append(d)
for n,ds in neighbors.items():changes[n]=sum(ds)/len(ds)*.35
key=o.shape_key_add(name='MouthContourSculpt')
for i,d in changes.items():key.data[i].co.z+=d
for f,v in [(1,0),(20,1),(30,1),(38,0)]:key.value=v;key.keyframe_insert(data_path='value',frame=f)
print('SEAMS',len(seams),'POINTS',len(changes),'MAX',max(map(abs,changes.values())),flush=True)
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/pawprint-mouth-sculpt/contour.blend')
