import bpy,bmesh,math
from collections import defaultdict
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-indep-taper.blend')
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table()
def width(x):return .040+.050*max(0,min(1,(x+.462)/.115))
def on(v):
 x,y,z=v.co;line=.579+.005*min(1,abs(y+.035)/width(x))**2+.12*max(0,min(.105,x+.462))
 return abs(z-line)<.0003 and abs(y+.035)<width(x)+.002 and x<-.305
s=defaultdict(list)
for e in bm.edges:
 if len(e.link_faces)==1 and all(on(v) for v in e.verts):s[tuple(sorted(tuple(round(z,5) for z in v.co) for v in e.verts))].append(e)
vs=[];faces=[];originals=[];mat_indices=[]
for k,pair in s.items():
 if len(pair)!=2:continue
 def order(e):return sorted(e.verts,key=lambda v:tuple(round(z,5) for z in v.co))
 a,b=order(pair[0]),order(pair[1]);start=len(vs)
 for j in range(4):
  t=j/3
  for v in [a[0],a[1],b[0],b[1]]:
   x,y,z=v.co
   vs.append((x+.024*t,-.035+(y+.035)*(1-.18*t),z+.002*math.sin(math.pi*t)))
   originals.append(v.index)
  if j:
   p=start+(j-1)*4; c=start+j*4
   faces.extend([(p,p+1,c+1,c),(p+2,c+2,c+3,p+3)]);mat_indices.extend([0 if j==1 else 1,0 if j==1 else 1])
 p=start+12
 faces.append((p,p+1,p+3,p+2));mat_indices.append(2)
mesh=bpy.data.meshes.new('Anatomical_Mouth_Interior');mesh.from_pydata(vs,[],faces);mesh.update()
lip=bpy.data.objects.new('Reconstructed_Mouth',mesh);bpy.context.collection.objects.link(lip);lip.matrix_world=o.matrix_world.copy()
for vg in o.vertex_groups:lip.vertex_groups.new(name=vg.name)
for i,orig in enumerate(originals):
 for g in o.data.vertices[orig].groups:lip.vertex_groups[g.group].add([i],g.weight,'REPLACE')
for mod in o.modifiers:
 if mod.type=='ARMATURE':
  new=lip.modifiers.new('Armature','ARMATURE');new.object=mod.object;new.use_deform_preserve_volume=mod.use_deform_preserve_volume
for name,color in [('Mouth rim',(.18,.08,.07,1)),('Mouth mucosa',(.22,.075,.07,1)),('Inner cavity',(.08,.025,.023,1))]:
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color;p.inputs['Roughness'].default_value=.8;mesh.materials.append(m)
for p,ix in zip(mesh.polygons,mat_indices):p.material_index=ix;p.use_smooth=True
old=bpy.data.objects.get('Mouth_Interior');old.hide_render=True
print('PAIRED SEGMENTS',len(faces)//7,'FACES',len(faces),flush=True)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-organic-insert.blend')
