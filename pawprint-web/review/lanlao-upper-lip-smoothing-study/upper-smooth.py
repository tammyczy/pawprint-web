import bpy,collections,math
from pathlib import Path
src='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-sync-study/preview.blend'
bpy.ops.wm.open_mainfile(filepath=src);s=bpy.context.scene;s.frame_set(20);o=next(x for x in s.objects if x.type=='MESH' and len(x.data.vertices)>25000)
j=o.vertex_groups['Lower_Jaw'].index
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
seams={}
for p,ids in groups.items():
 low=[i for i in ids if w(i)<.08 and i in skin];high=[i for i in ids if w(i)>.2 and i in skin]
 if low and high:seams[p]=low
print('outer skin seams',len(seams),flush=True)
# Smooth only up/down undulations measured along each front-facing seam.
keys=sorted(seams,key=lambda q:q[1]);changes={}
for p in keys:
 x,y,z=p
 # retain geometry in three dimensions, only damp local z irregularity.
 contributions=[(q,math.exp(-.5*((q[1]-y)/.012)**2)*math.exp(-.5*((q[0]-x)/.015)**2)) for q in keys]
 total=sum(weight for q,weight in contributions)
 target=sum(q[2]*weight for q,weight in contributions)/total
 diff=max(-.003,min(.003,target-z))
 for i in seams[p]:changes[i]=diff
# include duplicate mouth interior seam points of identical position and low jaw influence
for p in keys:
 vals=changes[seams[p][0]]
 for i in groups[p]:
  if w(i)<.08:changes[i]=vals
# protect all lower seam vertices and all existing key data, smoothly blend one skin ring only.
base=dict(changes)
neighbors=collections.defaultdict(list)
for i,d in base.items():
 for n in adj.get(i,()):
  if n not in base and w(n)<.08:neighbors[n].append(d)
for n,vals in neighbors.items():changes[n]=.45*sum(vals)/len(vals)
key=o.shape_key_add(name='SculptUpperLip')
for i,d in changes.items():key.data[i].co.z+=d
for frame,val in [(1,0),(20,1),(30,1),(38,0)]:key.value=val;key.keyframe_insert(data_path='value',frame=frame)
print('points',len(changes),'largest',max(map(abs,changes.values())) if changes else 0,flush=True)
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/pawprint-mouth-sculpt/upper-smooth.blend')
