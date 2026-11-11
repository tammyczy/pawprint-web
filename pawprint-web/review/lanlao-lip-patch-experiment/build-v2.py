import bpy,bmesh,math,collections
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
src='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-hip-posture-review.blend'
bpy.ops.wm.open_mainfile(filepath=src);scene=bpy.context.scene;scene.frame_set(1)
o=next(o for o in scene.objects if o.type=='MESH' and len(o.data.vertices)==23504); arm=next(o for o in scene.objects if o.type=='ARMATURE');mesh=o.data
mesh.calc_loop_triangles(); coords=[v.co.copy() for v in mesh.vertices]; tris=[tuple(t.vertices) for t in mesh.loop_triangles]; bv=BVHTree.FromPolygons(coords,tris,all_triangles=True)
uv=mesh.uv_layers.active.data
triuv=[[uv[i].uv.copy() for i in t.loops] for t in mesh.loop_triangles]
def sample(p):
 pos,normal,idx,dist=bv.find_nearest(p); tri=tris[idx]; vs=[coords[i] for i in tri]
 uvcoords=triuv[idx]; U=[Vector((q.x,q.y,0)) for q in uvcoords]
 val=barycentric_transform(pos,*vs,*U)
 return pos,normal,tri,(val.x,val.y)
selected=[]
for poly in mesh.polygons:
 c=sum((mesh.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
 if c.x<-.38 and abs(c.y+.035)<.055 and .54<c.z<.62:selected.append(poly.index)
print('PATCH',len(selected),flush=True)
# polygon indices -> boundary edges clustered by position
K=lambda co:tuple(round(float(x),5) for x in co)
counts=collections.Counter(); refs=collections.defaultdict(list)
for pi in selected:
 for a,b in mesh.polygons[pi].edge_keys:
  k=tuple(sorted((K(coords[a]),K(coords[b]))));counts[k]+=1;refs[k].append((a,b))
boundary={k for k,v in counts.items() if v==1};print('BOUNDARY',len(boundary),flush=True)
# Create jaw without touching original data beyond isolated copy
arm.animation_data_clear();bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);bpy.context.view_layer.objects.active=arm;bpy.ops.object.mode_set(mode='EDIT')
j=arm.data.edit_bones.new('Lower_Jaw');j.head=(-.295,0,.579);j.tail=(-.295,.1,.579);j.parent=arm.data.edit_bones['Head'];j.use_connect=False
bpy.ops.object.mode_set(mode='OBJECT');jaw=o.vertex_groups.new(name='Lower_Jaw');head=o.vertex_groups['Head'].index; chest=o.vertex_groups['Chest'].index
oldweights=[{g.group:g.weight for g in v.groups} for v in mesh.vertices]
# enter edit / capture original faces to delete
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;o.active_shape_key_index=0;bpy.ops.object.mode_set(mode='EDIT')
bm=bmesh.from_edit_mesh(mesh);bm.faces.ensure_lookup_table();bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table();dform=bm.verts.layers.deform.verify(); uv_layer=bm.loops.layers.uv.verify(); shapes=list(bm.verts.layers.shape.values())
faces_to_delete=[bm.faces[fi] for fi in selected]
for f in faces_to_delete:bm.faces.remove(f)
# capture matching physical boundary edges remaining
segs=[]
for e in bm.edges:
 k=tuple(sorted((K(e.verts[0].co),K(e.verts[1].co))))
 if k in boundary and len(e.link_faces)==1:segs.append(e)
print('SEGMENTS',len(segs),flush=True)
# Ordered contour mapping avoids folds caused by an irregular original boundary.
graph=collections.defaultdict(set)
for e in segs:
 a,b=[K(v.co) for v in e.verts];graph[a].add(b);graph[b].add(a)
start=min(graph,key=lambda p:((p[1]+.100)**2+(p[2]-.579)**2))
loop=[start];prev=None;curr=start
while True:
 possible=[q for q in graph[curr] if q!=prev]
 if len(loop)==1:possible.sort(key=lambda q:q[2])
 nxt=possible[0]
 if nxt==start:break
 loop.append(nxt);prev,curr=curr,nxt
 if len(loop)>len(graph)+1:raise ValueError('invalid boundary')
lens=[math.dist(a,b) for a,b in zip(loop,loop[1:]+loop[:1])];total=sum(lens);phase={};acc=0
for p,d in zip(loop,lens):phase[p]=-math.pi+2*math.pi*acc/total;acc+=d

# define mapping upper/lower aperture based on outer boundary direction. cache independently by UV identity
cache={}; ring_middle={}; ring_inner={}; floor={};uvmap={}
def make(v,t):
 key=(v,t)
 if key in cache:return cache[key]
 p=v.co;dy=p.y+.035;dz=p.z-.579; angle=phase[K(v.co)]
 # inner seam maps to y extent and near-zero vertical thickness when closed
 yy=-.035+.032*math.cos(angle);zz=.579+.00045*math.sin(angle)
 test=Vector((p.x,p.y*(1-t)+yy*t,p.z*(1-t)+zz*t));hit=bv.ray_cast(Vector((-1.0,test.y,test.z)),Vector((1,0,0)),2.0)
 if hit[0] is not None:
  tri=tris[hit[2]];vs=[coords[i] for i in tri];U=[Vector((q.x,q.y,0)) for q in triuv[hit[2]]];pos=hit[0];n=hit[1];val=barycentric_transform(pos,*vs,*U);uvval=(val.x,val.y)
 else:pos,n,tri,uvval=sample(test)
 # toward face x extracted at the target coordinates, in small steps from nearest point
 pnew=Vector((pos.x,test.y,test.z));q=bm.verts.new(pnew); interp=min(tri,key=lambda i:(coords[i]-pos).length_squared)
 for layer in shapes:q[layer]=pnew+(mesh.shape_keys.key_blocks[layer.name].data[interp].co-coords[interp])
 weights=dict(oldweights[interp]); move=max(0,min(1,(-math.sin(angle)-.05)/.5))*t*t
 amount=weights.get(head,0)*move;weights[head]=weights.get(head,0)-amount;weights[jaw.index]=amount
 for i,w in weights.items():
  if w>1e-8:q[dform][i]=w
 uvmap[q]=uvval;cache[key]=q
 return q
# only boundary vertices have UV loop, derive from adjacent survivor
for edge in segs:
 for v in edge.verts:
  if v not in uvmap:
   found=next((l[uv_layer].uv.copy() for f in edge.link_faces for l in f.loops if l.vert==v),None)
   uvmap[v]=tuple(found) if found else sample(v.co)[3]
inneredges=[]
for e in segs:
 loopside=next(l for l in e.link_faces[0].loops if l.edge==e)
 a,b=loopside.link_loop_next.vert,loopside.vert
 a1=make(a,.5);b1=make(b,.5);a2=make(a,1.0);b2=make(b,1.0);inneredges.append((a2,b2))
 for vs in [(a,b,b1,a1),(a1,b1,b2,a2)]:
  try:
   f=bm.faces.new(vs);f.smooth=True
   for l in f.loops:l[uv_layer].uv=uvmap[l.vert]
  except ValueError:pass
mat=bpy.data.materials.new('Mouth inner graft');mat.use_nodes=True;p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.09,.028,.035,1);p.inputs['Roughness'].default_value=.75;o.data.materials.append(mat);mi=len(o.data.materials)-1
for a,b in inneredges:
 # inward lip border matches vertex deformation for real upper/lower rim
 aa=bm.verts.new(a.co+Vector((.025,0,0)));bb=bm.verts.new(b.co+Vector((.025,0,0)))
 for new,old in [(aa,a),(bb,b)]:
  for layer in shapes:new[layer]=old[layer]+Vector((.025,0,0))
  for i,w in old[dform].items():new[dform][i]=w
 try:
  f=bm.faces.new((a,b,bb,aa));f.material_index=mi;f.smooth=True
 except ValueError:pass
bmesh.update_edit_mesh(mesh,loop_triangles=True,destructive=True);bpy.ops.object.mode_set(mode='OBJECT')
# keyframe jaw
pb=arm.pose.bones['Lower_Jaw'];pb.rotation_mode='XYZ'
for fr,v in [(1,0),(20,-.18),(30,-.18),(38,0)]:pb.rotation_euler=(0,v,0);pb.keyframe_insert(data_path='rotation_euler',frame=fr)
scene.frame_start=1;scene.frame_end=38;scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-replaced-patch-v2.blend')
