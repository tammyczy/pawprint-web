import bpy,bmesh,math
from collections import defaultdict
src='/private/tmp/lanlao-connected-narrow.blend'
bpy.ops.wm.open_mainfile(filepath=src)
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table()
def on(v):
 y=v.co.y+.035;line=.579+.003*(min(1,abs(y)/.035)**2)
 return abs(v.co.z-line)<.0002 and abs(y)<.036 and v.co.x<-.29
seams=defaultdict(list)
for e in bm.edges:
 if len(e.link_faces)==1 and all(on(v) for v in e.verts):seams[tuple(sorted(tuple(round(z,5) for z in v.co) for v in e.verts))].append(e)
verts=[];faces=[];orig=[]
for pair in seams.values():
 if len(pair)!=2:continue
 for e in pair:
  start=len(verts)
  for v in e.verts:
   dist=abs(v.co.y+.035); factor=max(0,1-(max(0,dist-.024)/.011)); radius=.0014*factor
   for k in range(8):
    a=math.tau*k/8;verts.append((v.co.x+radius*math.cos(a),v.co.y,v.co.z+radius*math.sin(a)));orig.append(v.index)
  for k in range(8):faces.append((start+k,start+(k+1)%8,start+8+(k+1)%8,start+8+k))
mesh=bpy.data.meshes.new('Mouth_lip_rim');mesh.from_pydata(verts,[],faces);mesh.update()
lip=bpy.data.objects.new('Mouth_lip_rim',mesh);bpy.context.collection.objects.link(lip);lip.matrix_world=o.matrix_world.copy()
for vg in o.vertex_groups:lip.vertex_groups.new(name=vg.name)
for i,v in enumerate(orig):
 for g in o.data.vertices[v].groups:lip.vertex_groups[g.group].add([i],g.weight,'REPLACE')
for mod in o.modifiers:
 if mod.type=='ARMATURE':
  arm=lip.modifiers.new('Armature','ARMATURE');arm.object=mod.object;arm.use_deform_preserve_volume=mod.use_deform_preserve_volume
for p in mesh.polygons:p.use_smooth=True
m=bpy.data.materials.new('Muted dark lip');m.diffuse_color=(.085,.047,.041,1);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.085,.047,.041,1);p.inputs['Roughness'].default_value=.8;mesh.materials.append(m)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-narrow-rim.blend')
