import bpy,bmesh
from collections import defaultdict
SRC='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-tongue-study-2026-11-09/preview.blend'
OUT='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-mouth-depth-study/preview.blend'
bpy.ops.wm.open_mainfile(filepath=SRC)
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table()
def on(v):
 y=v.co.y+.035;line=.579+.009*(min(1,abs(y)/.04)**2)
 return abs(v.co.z-line)<.0002 and abs(y)<.041 and v.co.x<-.33
seams=defaultdict(list)
for e in bm.edges:
 if len(e.link_faces)==1 and all(on(v) for v in e.verts):
  key=tuple(sorted(tuple(round(z,5) for z in v.co) for v in e.verts));seams[key].append(e)
verts=[];faces=[];originals=[];matidx=[]
def add(v,dx=0,dz=0):
 verts.append((v.co.x+dx,v.co.y,v.co.z+dz));originals.append(v.index);return len(verts)-1
jaw=o.vertex_groups['Lower_Jaw']
def jaw_weight(e):
 s=0
 for v in e.verts:
  try:s+=jaw.weight(v.index)
  except RuntimeError:pass
 return s
for key,pair in seams.items():
 if len(pair)!=2:continue
 upper,lower=sorted(pair,key=jaw_weight)
 def ordered(e):return sorted(e.verts,key=lambda v:tuple(round(z,5) for z in v.co))
 u=ordered(upper);l=ordered(lower)
 a=[add(v) for v in u];b=[add(v,.024,.002) for v in u]
 c=[add(v) for v in l];d=[add(v,.024,-.002) for v in l]
 faces += [(a[0],a[1],b[1],b[0]),(c[1],c[0],d[0],d[1]),(b[0],b[1],d[1],d[0])]
 matidx += [0,0,1]
mesh=bpy.data.meshes.new('Lip_inner_with_depth');mesh.from_pydata(verts,[],faces);mesh.update()
lip=bpy.data.objects.new('Lip_inner_with_depth',mesh);bpy.context.collection.objects.link(lip);lip.matrix_world=o.matrix_world.copy()
for vg in o.vertex_groups:lip.vertex_groups.new(name=vg.name)
for i,orig in enumerate(originals):
 for g in o.data.vertices[orig].groups:lip.vertex_groups[g.group].add([i],g.weight,'REPLACE')
for mod in o.modifiers:
 if mod.type=='ARMATURE':
  new=lip.modifiers.new('Armature','ARMATURE');new.object=mod.object;new.use_deform_preserve_volume=mod.use_deform_preserve_volume
for name,color in [('inner lip',(.095,.035,.030,1)),('throat',(.028,.009,.012,1))]:
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color;p.inputs['Roughness'].default_value=.75;mesh.materials.append(m)
for poly,idx in zip(mesh.polygons,matidx):poly.material_index=idx
print('BUILT',len(faces),'faces',flush=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
