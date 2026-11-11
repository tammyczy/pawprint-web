import bpy,bmesh
from collections import defaultdict
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-rounded-jaw-test.blend')
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table()
def on(v):
 y=v.co.y+.035;line=.579+.009*(min(1,abs(y)/.052)**2)
 return abs(v.co.z-line)<.0002 and abs(y)<.053 and v.co.x<-.29
seams=defaultdict(list)
for e in bm.edges:
 if len(e.link_faces)==1 and all(on(v) for v in e.verts):
  key=tuple(sorted(tuple(round(z,5) for z in v.co) for v in e.verts));seams[key].append(e)
verts=[];faces=[];originals=[]
for key, pair in seams.items():
 if len(pair)!=2:continue
 def ordered(e):return sorted(e.verts,key=lambda v:tuple(round(z,5) for z in v.co))
 a,b=ordered(pair[0]),ordered(pair[1]);start=len(verts)
 for v in [a[0],a[1],b[0],b[1]]:
  verts.append(v.co[:]);originals.append(v.index)
 for v in [a[0],a[1],b[0],b[1]]:
  verts.append((v.co.x+.018,v.co.y,v.co.z));originals.append(v.index)
 faces.extend([(start,start+1,start+5,start+4),(start+2,start+6,start+7,start+3),(start+4,start+5,start+7,start+6)])
mesh=bpy.data.meshes.new('Lip_connective_inner_mesh');mesh.from_pydata(verts,[],faces);mesh.update()
lip=bpy.data.objects.new('Lip_connective_inner',mesh);bpy.context.collection.objects.link(lip);lip.matrix_world=o.matrix_world.copy()
for vg in o.vertex_groups:lip.vertex_groups.new(name=vg.name)
for i,orig in enumerate(originals):
 for g in o.data.vertices[orig].groups:
  lip.vertex_groups[g.group].add([i],g.weight,'REPLACE')
for mod in o.modifiers:
 if mod.type=='ARMATURE':
  new=lip.modifiers.new('Armature','ARMATURE');new.object=mod.object;new.use_deform_preserve_volume=mod.use_deform_preserve_volume
mat=bpy.data.materials.new('Lip inner muted');mat.diffuse_color=(.19,.075,.075,1);mat.use_nodes=True
mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.19,.075,.075,1)
mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.78
mesh.materials.append(mat)
print('CREATED',len(faces),'seam bridge faces',flush=True)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-rounded-inner-test.blend')
