import bpy,bmesh
from collections import defaultdict
bpy.ops.wm.open_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-complete-lip-ring-study/preview.blend')
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
old=bpy.data.objects.get('ConnectedMouth')
if old:bpy.data.objects.remove(old,do_unlink=True)
bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table()
def on(v):
 y=v.co.y+.035;line=.579+.003*(min(1,abs(y)/.085)**2)
 return abs(v.co.z-line)<.0002 and abs(y)<.086 and v.co.x<-.29
seams=defaultdict(list)
for e in bm.edges:
 if len(e.link_faces)==1 and all(on(v) for v in e.verts):
  seams[tuple(sorted(tuple(round(z,5) for z in v.co) for v in e.verts))].append(e)
# create geometry only between coordinates that share an actual edge; disconnected mouth contours remain separate
jaw=o.vertex_groups['Lower_Jaw'].index
def weight(idx): return next((g.weight for g in o.data.vertices[idx].groups if g.group==jaw),0)
pts=defaultdict(set);edges=[]
for key,pair in seams.items():
 if len(pair)<2:continue
 edges.append(key)
 for e in pair:
  for v in e.verts:pts[tuple(round(z,5) for z in v.co)].add(v.index)
# Keep only the connected front lip chain; the disconnected rear cheek cut is not part of the mouth.
adj=defaultdict(set)
for a,b in edges:adj[a].add(b);adj[b].add(a)
components=[];unseen=set(adj)
while unseen:
 seed=unseen.pop();part={seed};todo=[seed]
 while todo:
  k=todo.pop()
  for t in adj[k]:
   if t in unseen:unseen.remove(t);part.add(t);todo.append(t)
 components.append(part)
main=max(components,key=len);edges=[e for e in edges if e[0] in main and e[1] in main];pts={k:v for k,v in pts.items() if k in main}
print('MOUTH_COMPONENT',len(main),'other components',[(len(c)) for c in components if c is not main],flush=True)
verts=[];faces=[];source=[];lookup={}
for key,ids in pts.items():
 ids=sorted(ids,key=weight);upper,lower=ids[0],ids[-1]; start=len(verts);lookup[key]=start
 for row in range(6):
  idx=upper if row<3 else lower;v=o.data.vertices[idx]
  inward=[0,.003,.025,.025,.003,0][row]
  zoff=[0,-.0015,-.003,.003,.0015,0][row]*min(1,weight(lower)/.87)
  verts.append((v.co.x+inward,v.co.y,v.co.z+zoff));source.append(idx)
for a,b in edges:
 for j in range(5):faces.append((lookup[a]+j,lookup[b]+j,lookup[b]+j+1,lookup[a]+j+1))
mesh=bpy.data.meshes.new('LipEdgeContiguous');mesh.from_pydata(verts,[],faces);mesh.update()
lip=bpy.data.objects.new('LipEdgeContiguous',mesh);bpy.context.collection.objects.link(lip);lip.matrix_world=o.matrix_world.copy()
for vg in o.vertex_groups:lip.vertex_groups.new(name=vg.name)
for i,idx in enumerate(source):
 for g in o.data.vertices[idx].groups:lip.vertex_groups[g.group].add([i],g.weight,'REPLACE')
for mod in o.modifiers:
 if mod.type=='ARMATURE':
  rig=lip.modifiers.new('Armature','ARMATURE');rig.object=mod.object;rig.use_deform_preserve_volume=mod.use_deform_preserve_volume
sub=lip.modifiers.new('Smooth mouth','SUBSURF');sub.levels=2
for p in mesh.polygons:p.use_smooth=True
m=bpy.data.materials.new('Lip edge interior');m.diffuse_color=(.12,.033,.041,1);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.12,.033,.041,1);p.inputs['Roughness'].default_value=.86;mesh.materials.append(m)
print('EDGE_BUILD',len(pts),'vertices',len(edges),'seam edges',len(faces),'faces',flush=True)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-mainlip-only.blend')
