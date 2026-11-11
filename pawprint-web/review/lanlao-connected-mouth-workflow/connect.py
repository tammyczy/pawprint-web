import bpy,bmesh,math
from collections import defaultdict,Counter
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-contiguous-cut.blend')
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table()
def ml(x,y):return .579+.008*min(1,abs(y+.035)/.09)**2+.17*max(0,min(.105,x+.462))
def on(v): return abs(v.co.z-ml(v.co.x,v.co.y))<.0002 and v.co.x<-.34 and abs(v.co.y+.035)<.15
seams=defaultdict(list)
for e in bm.edges:
 if len(e.link_faces)==1 and all(on(v) for v in e.verts):
  seams[tuple(sorted(tuple(round(float(n),5) for n in v.co) for v in e.verts))].append(e)
pts=defaultdict(set);edges=[]
for key, es in seams.items():
 if len(es)<2:continue
 edges.append(key)
 for e in es:
  for v in e.verts:pts[tuple(round(float(n),5) for n in v.co)].add(v.index)
graph=defaultdict(set)
for a,b in edges:graph[a].add(b);graph[b].add(a)
remaining=set(graph);groups=[]
while remaining:
 p=remaining.pop();component={p};todo=[p]
 while todo:
  for n in graph[todo.pop()]:
   if n in remaining:remaining.remove(n);component.add(n);todo.append(n)
 groups.append(component)
if not groups:raise RuntimeError('No mouth seam found')
main=max(groups,key=len); edges=[e for e in edges if e[0] in main and e[1] in main];pts={k:v for k,v in pts.items() if k in main}
print('SEAM',len(pts),len(edges),'other',[(len(g)) for g in groups if g is not main],flush=True)
jaw=o.vertex_groups['Lower_Jaw'].index
def weight(idx):return next((g.weight for g in o.data.vertices[idx].groups if g.group==jaw),0)
verts=[];faces=[];source=[];lookup={}
for key,ids in pts.items():
 ids=sorted(ids,key=weight);upper,lower=ids[0],ids[-1];lookup[key]=len(verts)
 for row in range(6):
  idx=upper if row<3 else lower;v=o.data.vertices[idx]
  delta=[0,.003,.018,.018,.003,0][row]; taper=min(1,weight(lower)/.8); dz=[0,-.001,-.002,.002,.001,0][row]*taper
  verts.append((v.co.x+delta,v.co.y,v.co.z+dz));source.append(idx)
for a,b in edges:
 for j in range(5):faces.append((lookup[a]+j,lookup[b]+j,lookup[b]+j+1,lookup[a]+j+1))
me=bpy.data.meshes.new('ContiguousInner');me.from_pydata(verts,[],faces);me.update();lip=bpy.data.objects.new('ContiguousInner',me);bpy.context.collection.objects.link(lip);lip.matrix_world=o.matrix_world.copy()
for vg in o.vertex_groups:lip.vertex_groups.new(name=vg.name)
for i,idx in enumerate(source):
 for g in o.data.vertices[idx].groups:lip.vertex_groups[g.group].add([i],g.weight,'REPLACE')
for mod in o.modifiers:
 if mod.type=='ARMATURE':
  m=lip.modifiers.new('Armature','ARMATURE');m.object=mod.object;m.use_deform_preserve_volume=mod.use_deform_preserve_volume
for p in me.polygons:p.use_smooth=True
mat=bpy.data.materials.new('Interior');mat.diffuse_color=(.08,.021,.027,1);mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.08,.021,.027,1);mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.88;me.materials.append(mat)
bpy.context.scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-contiguous-inner.blend')
