import bpy,bmesh,math
from collections import defaultdict
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-short-mouth-cut.blend')
for n in ['ConnectedMouth']:
 ob=bpy.data.objects.get(n)
 if ob:bpy.data.objects.remove(ob,do_unlink=True)
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
print('original verts',len(o.data.vertices),'keys',[k.name for k in o.data.shape_keys.key_blocks],flush=True)
mat=bpy.data.materials.new('Welded mouth diagnostic');mat.use_nodes=True;p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.12,.035,.045,1);p.inputs['Roughness'].default_value=.85
o.data.materials.append(mat);mi=len(o.data.materials)-1
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;o.active_shape_key_index=0;bpy.ops.object.mode_set(mode='EDIT')
bm=bmesh.from_edit_mesh(o.data);bm.verts.ensure_lookup_table()
def on(v):
 x,y,z=v.co;line=.579+.008*min(1,abs(y+.035)/.09)**2+.17*max(0,min(.105,x+.462))
 return abs(z-line)<.0002 and x<-.43 and abs(y+.035)<.046
def key(v):return tuple(round(z,5) for z in v.co)
seams=defaultdict(list)
for e in bm.edges:
 if len(e.link_faces)==1 and all(on(v) for v in e.verts):seams[tuple(sorted(key(v) for v in e.verts))].append(e)
dform=bm.verts.layers.deform.verify();jawidx=o.vertex_groups['Lower_Jaw'].index
# Restrict to front lip component by geometrical adjacency, not weight cutoffs.
adj=defaultdict(set)
for edgekey, pair in seams.items():
 if len(pair)!=2: continue
 a,b=edgekey;adj[a].add(b);adj[b].add(a)
components=[];unseen=set(adj)
while unseen:
 seed=unseen.pop();part={seed};todo=[seed]
 while todo:
  k=todo.pop()
  for t in adj[k]:
   if t in unseen: unseen.remove(t);part.add(t);todo.append(t)
 components.append(part)
main=max(components,key=len)
pairs=[p for k,p in seams.items() if len(p)==2 and all(v in main for v in k)]
print('COMPONENTS', [len(c) for c in components],flush=True)
def delta_at(v):
 same=[n for e in pairs for v0 in e for n in v0.verts if key(n)==key(v)]
 ws=[u[dform].get(jawidx,0.0) for u in same]
 return max(ws)-min(ws) if ws else 0
pairs=[p for p in pairs if max(delta_at(v) for e in p for v in e.verts)>.025]
print('ACTIVE_PAIRS',len(pairs),flush=True)
print('pairs',len(pairs),'single',sum(len(v)==1 for v in seams.values()),'multiples',sum(len(v)>2 for v in seams.values()),flush=True)
cache={}
source_cache={}
def inset(v):
 weights=tuple(sorted((k,round(w,6)) for k,w in v[dform].items() if abs(w)>1e-8))
 shape_delta=tuple(tuple(round(z,6) for z in (v[layer]-v.co)) for layer in bm.verts.layers.shape.values())
 canonical=(key(v),weights,shape_delta)
 if canonical in cache:return cache[canonical]
 p=v.co.copy();p.x+=.02
 n=bm.verts.new(p)
 for shape in bm.verts.layers.shape.values(): n[shape]=v[shape]+(p-v.co)
 for group,weight in v[dform].items(): n[dform][group]=weight
 cache[canonical]=n;source_cache[v]=n;return n
made=0
for pair in pairs:
 for e in pair: e.smooth=False
 a=sorted(pair[0].verts,key=key);b=sorted(pair[1].verts,key=key)
 try:
  ai=[inset(v) for v in a];bi=[inset(v) for v in b]
  for vs in ([a[0],a[1],ai[1],ai[0]],[b[1],b[0],bi[0],bi[1]],[ai[0],ai[1],bi[1],bi[0]]):

   unique=[]
   for v in vs:
    if v not in unique:unique.append(v)
   if len(unique)<3: continue
   f=bm.faces.new(unique);f.material_index=mi;f.smooth=True;made+=1
 except ValueError as ex:print('face error',str(ex),flush=True)

for shape in bm.verts.layers.shape.values():
 delta=max(((n[shape]-n.co)-(v[shape]-v.co)).length for v,n in source_cache.items())
 print('SHAPE_OFFSET_MAX',shape.name,delta,flush=True)
print('faces added',made,'new vertices',len(cache),'shared-source',sum(len(e.link_faces)>=2 for pair in pairs for e in pair),'of',len(pairs)*2,flush=True)
bmesh.update_edit_mesh(o.data,loop_triangles=True,destructive=True);bpy.ops.object.mode_set(mode='OBJECT')
print('result verts',len(o.data.vertices),'key lengths',[(k.name,len(k.data)) for k in o.data.shape_keys.key_blocks],flush=True)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-short-mouth-triangulated.blend')
