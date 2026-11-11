import bpy,bmesh
from collections import defaultdict
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-wide-ring-jaw.blend')
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table()
def on(v):
 y=v.co.y+.035;line=.579+.003*(min(1,abs(y)/.085)**2)
 return abs(v.co.z-line)<.0002 and abs(y)<.086 and v.co.x<-.29
seams=defaultdict(list)
for e in bm.edges:
 if len(e.link_faces)==1 and all(on(v) for v in e.verts):seams[tuple(sorted(tuple(round(z,5) for z in v.co) for v in e.verts))].append(e)
pts=defaultdict(set)
for pair in seams.values():
 if len(pair)!=2:continue
 for e in pair:
  for v in e.verts:pts[tuple(round(z,5) for z in v.co)].add(v.index)
jaw=o.vertex_groups['Lower_Jaw'].index
head=o.vertex_groups['Head'].index
def weight(idx):
 return next((g.weight for g in o.data.vertices[idx].groups if g.group==jaw),0)
ordered=sorted(pts.items(),key=lambda x:x[0][1]);print('pts',len(ordered),flush=True)
verts=[];faces=[];source=[]
for key,ids in ordered:
 ids=sorted(ids,key=weight);upper=ids[0];lower=ids[-1]
 for row in range(4):
  idx=upper if row<2 else lower
  v=o.data.vertices[idx]; inward=0 if row in (0,3) else .024
  verts.append((v.co.x+inward,v.co.y,v.co.z));source.append(idx)
for i in range(len(ordered)-1):
 for j in range(3):faces.append((i*4+j,(i+1)*4+j,(i+1)*4+j+1,i*4+j+1))
mesh=bpy.data.meshes.new('ConnectedMouth');mesh.from_pydata(verts,[],faces);mesh.update()
lip=bpy.data.objects.new('ConnectedMouth',mesh);bpy.context.collection.objects.link(lip);lip.matrix_world=o.matrix_world.copy()
for vg in o.vertex_groups:lip.vertex_groups.new(name=vg.name)
for i,idx in enumerate(source):
 for g in o.data.vertices[idx].groups:lip.vertex_groups[g.group].add([i],g.weight,'REPLACE')
for mod in o.modifiers:
 if mod.type=='ARMATURE':
  rig=lip.modifiers.new('Armature','ARMATURE');rig.object=mod.object;rig.use_deform_preserve_volume=mod.use_deform_preserve_volume
sub=lip.modifiers.new('Smooth connected mouth','SUBSURF');sub.levels=2
for p in mesh.polygons:p.use_smooth=True
m=bpy.data.materials.new('Inner mouth');m.diffuse_color=(.12,.033,.041,1);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.12,.033,.041,1);p.inputs['Roughness'].default_value=.86;mesh.materials.append(m)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-wide-ring-inset.blend')
