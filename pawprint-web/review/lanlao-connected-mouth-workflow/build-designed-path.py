import bpy,bmesh,math
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-hip-posture-review.blend')
scene=bpy.context.scene;scene.frame_set(1)
arm=next(o for o in scene.objects if o.type=='ARMATURE');mesh=next(o for o in scene.objects if o.type=='MESH' and len(o.data.vertices)==23504)
arm.animation_data_clear();bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);bpy.context.view_layer.objects.active=arm;bpy.ops.object.mode_set(mode='EDIT')
jaw=arm.data.edit_bones.new('Lower_Jaw');jaw.head=(-.245,0,.579);jaw.tail=(-.245,.100,.579);jaw.parent=arm.data.edit_bones['Head'];jaw.use_connect=False
bpy.ops.object.mode_set(mode='OBJECT');jawgroup=mesh.vertex_groups.new(name='Lower_Jaw');headgroup=mesh.vertex_groups['Head']
# Trace a single hand-designed mouth line over actual mesh edges. Split only those edges;
# coordinate matching is used to identify all UV-seam copies without welding them.
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);bpy.context.view_layer.objects.active=mesh;mesh.active_shape_key_index=0;bpy.ops.object.mode_set(mode='EDIT')
bm=bmesh.from_edit_mesh(mesh.data)
path=[(-0.36725, -0.11027, 0.57148), (-0.3941, -0.11602, 0.57148), (-0.41711, -0.11602, 0.57911), (-0.44205, -0.09876, 0.58295), (-0.44205, -0.0815, 0.58106), (-0.45737, -0.06232, 0.58875), (-0.45929, -0.0489, 0.57911), (-0.46121, -0.0374, 0.57526), (-0.45929, -0.02205, 0.57721), (-0.45737, -0.00863, 0.58295), (-0.44012, 0.01055, 0.57526), (-0.44205, 0.02589, 0.57721), (-0.42093, 0.04698, 0.57148), (-0.39603, 0.05082, 0.56952), (-0.37109, 0.05082, 0.57148)]
edgekeys={tuple(sorted((a,b))) for a,b in zip(path,path[1:])}
def kp(v): return tuple(round(float(n),5) for n in v.co)
cut=[e for e in bm.edges if tuple(sorted(kp(v) for v in e.verts)) in edgekeys]
print('DESIGNED PATH',len(path),'EDGE COPIES',len(cut),flush=True)
if cut:bmesh.ops.split_edges(bm,edges=cut)
bmesh.update_edit_mesh(mesh.data,loop_triangles=True,destructive=True);bpy.ops.object.mode_set(mode='OBJECT')
counts=[0]*len(mesh.data.vertices);sides=[0.0]*len(mesh.data.vertices)
for poly in mesh.data.polygons:
 avg=sum(mesh.data.vertices[i].co.z for i in poly.vertices)/len(poly.vertices)
 for i in poly.vertices:counts[i]+=1;sides[i]+=avg
ordered=sorted(path,key=lambda v:v[1])
def line(y):
 if y<=ordered[0][1]:return ordered[0][2]
 if y>=ordered[-1][1]:return ordered[-1][2]
 for a,b in zip(ordered,ordered[1:]):
  if a[1]<=y<=b[1]:
   t=(y-a[1])/(b[1]-a[1]);return a[2]*(1-t)+b[2]*t
 return .58
count=0
for v in mesh.data.vertices:
 x,y,z=v.co;boundary=line(y);r=abs(y+.035)
 if x>-.34 or z>boundary+.00001 or r>.080:continue
 # Preserve original head weights away from the mouth and return smoothly at corners.
 mx=max(0,min(1,(-x-.34)/.075));mx=mx*mx*(3-2*mx)
 my=max(0,1-(r/.080)**2)**.9
 lower=1 if z<boundary-.00001 else (1 if counts[v.index] and sides[v.index]/counts[v.index]<boundary else 0)
 old=next((g.weight for g in v.groups if g.group==headgroup.index),0)
 move=old*mx*my*lower
 if move<.001:continue
 headgroup.add([v.index],old-move,'REPLACE');jawgroup.add([v.index],move,'REPLACE');count+=1
print('JAW_VERTICES',count,'TOTAL',len(mesh.data.vertices),flush=True)
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
 t=k/12; x=-.448-.039*t; z=.620-.032*t
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
for frame,angle in [(1,0),(20,-.15),(30,-.15),(38,0)]:
 pb.rotation_euler=(0,angle,0);pb.keyframe_insert(data_path='rotation_euler',frame=frame)
scene.frame_start=1;scene.frame_end=38;scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-workflow-designed-cut.blend')
print('SAVED PROTOTYPE',flush=True)
