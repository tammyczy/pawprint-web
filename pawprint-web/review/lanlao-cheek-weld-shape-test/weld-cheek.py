from pathlib import Path
HERE=Path(__file__).resolve().parent
import bpy,bmesh,math
from collections import defaultdict
bpy.ops.wm.open_mainfile(filepath=str(HERE / 'mainlip.blend'))
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();jaw=o.vertex_groups['Lower_Jaw'].index
shape_layers=[bm.verts.layers.shape.get(k.name) for k in o.data.shape_keys.key_blocks]

def on(v):
 y=v.co.y+.035;line=.579+.003*(min(1,abs(y)/.085)**2)
 return abs(v.co.z-line)<.0002 and abs(y)<.086 and v.co.x<-.29
seams=defaultdict(list)
for e in bm.edges:
 if len(e.link_faces)==1 and all(on(v) for v in e.verts):seams[tuple(sorted(tuple(round(z,5) for z in v.co) for v in e.verts))].append(e)
adj=defaultdict(set);pointverts=defaultdict(set)
for key,es in seams.items():
 if len(es)<2:continue
 adj[key[0]].add(key[1]);adj[key[1]].add(key[0])
 for e in es:
  for v in e.verts:pointverts[tuple(round(z,5) for z in v.co)].add(v)
components=[];unseen=set(adj)
while unseen:
 seed=unseen.pop();part={seed};todo=[seed]
 while todo:
  k=todo.pop()
  for t in adj[k]:
   if t in unseen:unseen.remove(t);part.add(t);todo.append(t)
 components.append(part)
main=max(components,key=len);rear=set().union(*(c for c in components if c is not main));d=bm.verts.layers.deform.verify()
print('COMPONENTS',len(main),len(rear),flush=True)
target={}; maxshape=0;maxweight=0
for key in rear:
 vs=sorted(pointverts[key],key=lambda v:v.index)
 if len(vs)<2:continue
 master=vs[0]
 for other in vs[1:]:
  maxshape=max(maxshape,*((master[layer]-other[layer]).length for layer in shape_layers))
  keys=set(master[d].keys())|set(other[d].keys());maxweight=max(maxweight,*([abs(master[d].get(k,0)-other[d].get(k,0)) for k in keys] or [0]))
  if (master.co-other.co).length>1e-5:raise RuntimeError('not coincident')
  target[other]=master
print('WELD_CHECK',len(target),'max_shape_delta',maxshape,'max_weight_delta',maxweight,flush=True)
if maxshape>1e-5 or maxweight>1e-4:raise RuntimeError('welding could alter skin or existing morphs')
bmesh.ops.weld_verts(bm,targetmap=target);bm.to_mesh(o.data);o.data.update();bm.free()
print('AFTER',len(o.data.vertices),[(k.name,len(k.data)) for k in o.data.shape_keys.key_blocks],flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'welded.blend'))
