import bpy,bmesh,math
from collections import defaultdict,Counter
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-workflow-dense-cut.blend')
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table()
path=[(-0.3762, -0.11219, 0.57148), (-0.38515, -0.1141, 0.57148), (-0.3941, -0.11602, 0.57148), (-0.40177, -0.11602, 0.57402), (-0.40944, -0.11602, 0.57656), (-0.41711, -0.11602, 0.57911), (-0.42543, -0.11027, 0.58039), (-0.43374, -0.10452, 0.58167), (-0.43565, -0.10004, 0.57913), (-0.43565, -0.09428, 0.5785), (-0.43565, -0.08853, 0.57787), (-0.43565, -0.08278, 0.57721), (-0.44268, -0.07639, 0.57787), (-0.44778, -0.06999, 0.58043), (-0.45289, -0.0636, 0.58299), (-0.45353, -0.05913, 0.57978), (-0.45865, -0.05338, 0.58232), (-0.45929, -0.0489, 0.57911), (-0.45993, -0.04507, 0.57783), (-0.46057, -0.04123, 0.57654), (-0.46121, -0.0374, 0.57526), (-0.46057, -0.03228, 0.57591), (-0.45993, -0.02717, 0.57656), (-0.45929, -0.02205, 0.57721), (-0.45865, -0.01758, 0.57913), (-0.45801, -0.0131, 0.58104), (-0.45737, -0.00863, 0.58295), (-0.45162, -0.00224, 0.58039), (-0.44587, 0.00415, 0.57783), (-0.44012, 0.01055, 0.57526), (-0.44077, 0.01566, 0.57591), (-0.44141, 0.02077, 0.57656), (-0.43565, 0.02781, 0.57402), (-0.43501, 0.03292, 0.5753), (-0.42797, 0.03995, 0.57339), (-0.42093, 0.04698, 0.57148), (-0.41263, 0.04826, 0.57083), (-0.40433, 0.04954, 0.57018), (-0.39603, 0.05082, 0.56952), (-0.38772, 0.05082, 0.57018), (-0.3794, 0.05082, 0.57083), (-0.37109, 0.05082, 0.57148)]
edgekeys={tuple(sorted((a,b))) for a,b in zip(path,path[1:])}
seams=defaultdict(list)
for e in bm.edges:
 if len(e.link_faces)==1:
  key=tuple(sorted(tuple(round(float(n),5) for n in v.co) for v in e.verts))
  if key in edgekeys:seams[key].append(e)
print('EDGE COUNTS',Counter(len(v) for v in seams.values()),flush=True)
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
verts=[];faces=[];source=[]
for key in edges:
 es=seams[key]
 def mean_weight(e):return sum(weight(v.index) for v in e.verts)/2
 upper=min(es,key=mean_weight);lower=max(es,key=mean_weight)
 def sort_by_key(e): return sorted(e.verts,key=lambda v:tuple(round(float(n),5) for n in v.co))
 u=sort_by_key(upper);l=sort_by_key(lower)
 base=len(verts)
 for side in [u,l]:
  for v in side:
   verts.append(tuple(v.co));source.append(v.index)
 for side in [u,l]:
  for v in side:
   verts.append((v.co.x+.018,v.co.y,v.co.z));source.append(v.index)
 faces.extend([(base,base+1,base+5,base+4),(base+2,base+6,base+7,base+3),(base+4,base+5,base+7,base+6)])
me=bpy.data.meshes.new('ContiguousInner');me.from_pydata(verts,[],faces);me.update();lip=bpy.data.objects.new('ContiguousInner',me);bpy.context.collection.objects.link(lip);lip.matrix_world=o.matrix_world.copy()
for vg in o.vertex_groups:lip.vertex_groups.new(name=vg.name)
for i,idx in enumerate(source):
 for g in o.data.vertices[idx].groups:lip.vertex_groups[g.group].add([i],g.weight,'REPLACE')
for mod in o.modifiers:
 if mod.type=='ARMATURE':
  m=lip.modifiers.new('Armature','ARMATURE');m.object=mod.object;m.use_deform_preserve_volume=mod.use_deform_preserve_volume
for p in me.polygons:p.use_smooth=True
mat=bpy.data.materials.new('Interior');mat.diffuse_color=(.08,.021,.027,1);mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.08,.021,.027,1);mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.88;me.materials.append(mat)
bpy.context.scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-workflow-dense-inner.blend')
