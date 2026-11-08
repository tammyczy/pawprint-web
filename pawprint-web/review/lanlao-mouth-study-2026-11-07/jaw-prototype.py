import bpy,bmesh,math
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-hip-posture-review.blend')
scene=bpy.context.scene;scene.frame_set(1)
arm=next(o for o in scene.objects if o.type=='ARMATURE');mesh=next(o for o in scene.objects if o.type=='MESH' and len(o.data.vertices)==23504)
arm.animation_data_clear();bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);bpy.context.view_layer.objects.active=arm;bpy.ops.object.mode_set(mode='EDIT')
jaw=arm.data.edit_bones.new('Lower_Jaw');jaw.head=(-.295,0,.579);jaw.tail=(-.295,.100,.579);jaw.parent=arm.data.edit_bones['Head'];jaw.use_connect=False
bpy.ops.object.mode_set(mode='OBJECT');jawgroup=mesh.vertex_groups.new(name='Lower_Jaw');headgroup=mesh.vertex_groups['Head']
# Bisect the frontal muzzle with a horizontal cut, then split the cut edges.
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);bpy.context.view_layer.objects.active=mesh;mesh.active_shape_key_index=0;bpy.ops.object.mode_set(mode='EDIT')
bm=bmesh.from_edit_mesh(mesh.data);faces=[f for f in bm.faces if f.calc_center_median().x<-.33 and abs(f.calc_center_median().y+.035)<.040 and .545<f.calc_center_median().z<.610]
geo=set(faces)
for f in faces:geo.update(f.edges);geo.update(f.verts)
# Warp the cutting space so the mouth seam rises gradually at the corners.
def mouth_line(y): return .579 + .009 * (min(1,abs(y+.035)/.040)**2)
for v in bm.verts: v.co.z -= mouth_line(v.co.y)-.579
res=bmesh.ops.bisect_plane(bm,geom=list(geo),dist=.000001,plane_co=(0,0,.579),plane_no=(0,0,1),clear_inner=False,clear_outer=False)
for v in bm.verts: v.co.z += mouth_line(v.co.y)-.579
cut=[e for e in res['geom_cut'] if isinstance(e,bmesh.types.BMEdge)]
print('CUT',len(faces),len(cut),flush=True)
if cut:bmesh.ops.split_edges(bm,edges=cut)
bmesh.update_edit_mesh(mesh.data,loop_triangles=True,destructive=True);bpy.ops.object.mode_set(mode='OBJECT')
print('VERTS_AFTER',len(mesh.data.vertices),'SHAPES',list(mesh.data.shape_keys.key_blocks.keys()),flush=True)
counts=[0]*len(mesh.data.vertices); sides=[0.0]*len(mesh.data.vertices)
for poly in mesh.data.polygons:
 avg=sum(mesh.data.vertices[i].co.z for i in poly.vertices)/len(poly.vertices)
 for i in poly.vertices:counts[i]+=1;sides[i]+=avg
count=0
for v in mesh.data.vertices:
 x,y,z=v.co
 if x>-.30 or z>mouth_line(y)+.00001 or abs(y+.035)>.070:continue
 mx=max(0,min(1,(-x-.30)/.025))
 mz=1 if z<mouth_line(y)-.00001 else (1 if counts[v.index] and sides[v.index]/counts[v.index]<mouth_line(y) else 0)
 my=max(0,min(1,(.040-abs(y+.035))/.030));strength=mx*mz*my
 if strength<.001:continue
 old=next((g.weight for g in v.groups if g.group==headgroup.index),0)
 if old<.00001:continue
 move=old*strength;headgroup.add([v.index],old-move,'REPLACE');jawgroup.add([v.index],move,'REPLACE');count+=1
print('JAW_VERTICES',count,flush=True)
# Temporarily add tongue and inner mouth as physically modeled geometry, preview only.
def material(name,color,roughness):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=roughness;return m
def sphere(name,loc,scale,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return o
cavity=sphere('Mouth_Interior',(-.420,-.035,.570),(.035,.030,.017),material('Mouth_Interior_Material',(.035,.008,.012),.9))
tongueMat=material('Tongue_Material',(.42,.095,.12),.78)
verts=[];faces=[]
for k in range(13):
 t=k/12; x=-.448-.052*t; z=.620-.042*t
 width=.024*(max(.002,math.sin(math.pi*(.2+.8*t)))**.35)
 for j in range(5):
  q=(j-2)/2; verts.append((x,-.035+width*q,z+.003*(1-q*q)))
for k in range(12):
 for j in range(4):
  a=k*5+j;faces.append((a,a+1,a+6,a+5))
tongueMesh=bpy.data.meshes.new('Sculpted_Tongue');tongueMesh.from_pydata(verts,[],faces);tongueMesh.update();tongue=bpy.data.objects.new('Tongue',tongueMesh);bpy.context.collection.objects.link(tongue);tongue.data.materials.append(tongueMat)
for p in tongue.data.polygons:p.use_smooth=True
tongue.scale=(1,1,1)
solid=tongue.modifiers.new('Tongue thickness','SOLIDIFY');solid.thickness=.020
sub=tongue.modifiers.new('Tongue smooth','SUBSURF');sub.levels=2;sub.render_levels=2

# Parent oral structures to the rig while preserving their neutral world transforms.
bpy.context.view_layer.update()
for ob,bone_name in [(cavity,'Head'),(tongue,'Lower_Jaw')]:
 before=ob.matrix_world.copy();ob.parent=arm;ob.parent_type='BONE';ob.parent_bone=bone_name;bpy.context.view_layer.update();ob.matrix_world=before
# Fade in new interior only after jaw opens; keep rest visually identical.
for ob in [cavity,tongue]:
 full=ob.scale.copy()
 for frame,f in [(1,0),(12,.1),(20,1),(30,1),(38,0)]:
  ob.scale=full*f;ob.keyframe_insert(data_path='scale',frame=frame)
# animate true jaw pivot; apply rotation about bone-local Y, aligned to world lateral axis
pb=arm.pose.bones['Lower_Jaw'];pb.rotation_mode='XYZ'
for frame,angle in [(1,0),(20,-.25),(30,-.25),(38,0)]:
 pb.rotation_euler=(0,angle,0);pb.keyframe_insert(data_path='rotation_euler',frame=frame)
scene.frame_start=1;scene.frame_end=38;scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath='/tmp/lanlao-jaw-prototype-v14.blend')
print('SAVED PROTOTYPE',flush=True)
