import bpy,bmesh,math
from mathutils import Vector
from collections import defaultdict
src='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-side-mouth-shell-study/base.blend'
bpy.ops.wm.open_mainfile(filepath=src);scene=bpy.context.scene;scene.frame_set(1)
o=next(x for x in scene.objects if x.type=='MESH' and len(x.data.vertices)>25000)
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;o.active_shape_key_index=0;bpy.ops.object.mode_set(mode='EDIT')
bm=bmesh.from_edit_mesh(o.data);bm.verts.ensure_lookup_table();faces=[]
for f in bm.faces:
 c=f.calc_center_median()
 if -.456<c.x<-.390 and -.125<c.y<-.084 and .557<c.z<.596 and f.material_index==0:faces.append(f)
geo=set(faces)
for f in faces:geo.update(f.edges);geo.update(f.verts)
print('FACE_REGION',len(faces),flush=True)
res=bmesh.ops.bisect_plane(bm,geom=list(geo),dist=.0000001,plane_co=(0,0,.579),plane_no=(0,0,1),clear_inner=False,clear_outer=False)
cut=[e for e in res['geom_cut'] if isinstance(e,bmesh.types.BMEdge) and -.456<((e.verts[0].co.x+e.verts[1].co.x)/2)<-.390 and -.125<((e.verts[0].co.y+e.verts[1].co.y)/2)<-.084]
print('CUT_EDGES',len(cut),flush=True)
if cut:bmesh.ops.split_edges(bm,edges=cut)
bmesh.update_edit_mesh(o.data,loop_triangles=True,destructive=True);bpy.ops.object.mode_set(mode='OBJECT')
vgj=o.vertex_groups['Lower_Jaw'];vgh=o.vertex_groups['Head'];lower=[]
# Identify true lower seam vertices from adjacency, then distribute influence below seam.
counts=[0]*len(o.data.vertices);sides=[0.]*len(o.data.vertices)
for p in o.data.polygons:
 avg=sum(o.data.vertices[i].co.z for i in p.vertices)/len(p.vertices)
 for i in p.vertices:counts[i]+=1;sides[i]+=avg
for v in o.data.vertices:
 x,y,z=v.co
 if not(-.465<x<-.385 and -.135<y<-.080 and .53<z<=.579001):continue
 side=1 if z<.578999 else int(counts[v.index]>0 and sides[v.index]/counts[v.index]<.579)
 if not side:continue
 # Recede at ends; interpolate into non-mouth cheek to avoid pulling visible fur.
 fx=max(0,min(1,(x+.465)/.01,( -.385-x)/.02));fy=max(0,min(1,(y+.135)/.012,(-.080-y)/.012))
 t=fx*fy;t=t*t*(3-2*t);desired=.72*t
 if desired<=.001:continue
 oldj=next((g.weight for g in v.groups if g.group==vgj.index),0);oldh=next((g.weight for g in v.groups if g.group==vgh.index),0)
 move=min(oldh,max(0,desired-oldj))
 if move>1e-6:vgj.add([v.index],oldj+move,'REPLACE');vgh.add([v.index],oldh-move,'REPLACE');lower.append(v.index)
print('LOWER_SMOOTH',len(lower),flush=True)
# Connect the newly opened side cut along matched geometric edge coordinates.
bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();edges=defaultdict(list)
for e in bm.edges:
 if len(e.link_faces)!=1:continue
 c=(e.verts[0].co+e.verts[1].co)/2
 if not(-.456<c.x<-.390 and -.125<c.y<-.084 and abs(c.z-.579)<.00001):continue
 k=tuple(sorted(tuple(round(float(n),5) for n in v.co) for v in e.verts));edges[k].append(e)
pairs=[v for v in edges.values() if len(v)==2];print('PAIR_COUNT',len(pairs),flush=True)
verts=[];srcs=[];fcs=[];cache={}
def find_vertex(v,inner):
 k=(v.index,inner)
 if k not in cache:
  cache[k]=len(verts);co=v.co.copy()
  if inner:co.y+=.012
  verts.append(co[:]);srcs.append(v.index)
 return cache[k]
def w(v):return next((g.weight for g in o.data.vertices[v.index].groups if g.group==vgj.index),0)
for pair in pairs:
 upper=min(pair,key=lambda e:sum(w(v) for v in e.verts)/2);lower=max(pair,key=lambda e:sum(w(v) for v in e.verts)/2)
 a=sorted(upper.verts,key=lambda v:tuple(round(float(n),5) for n in v.co));b=sorted(lower.verts,key=lambda v:tuple(round(float(n),5) for n in v.co))
 a0,a1=(find_vertex(v,False) for v in a);b0,b1=(find_vertex(v,False) for v in b)
 ai0,ai1=(find_vertex(v,True) for v in a);bi0,bi1=(find_vertex(v,True) for v in b)
 fcs += [(a0,a1,ai1,ai0),(b1,b0,bi0,bi1),(ai0,ai1,bi1,bi0)]
if verts:
 m=bpy.data.meshes.new('Side_Oral_Lining');m.from_pydata(verts,[],fcs);m.update();lip=bpy.data.objects.new('Side_Oral_Lining',m);bpy.context.collection.objects.link(lip);lip.matrix_world=o.matrix_world.copy()
 for vg in o.vertex_groups:lip.vertex_groups.new(name=vg.name)
 for i,idx in enumerate(srcs):
  for g in o.data.vertices[idx].groups:lip.vertex_groups[g.group].add([i],g.weight,'REPLACE')
 for mod in o.modifiers:
  if mod.type=='ARMATURE':a=lip.modifiers.new('Armature','ARMATURE');a.object=mod.object;a.use_deform_preserve_volume=mod.use_deform_preserve_volume
 mat=bpy.data.materials.get('Deep oral surface');m.materials.append(mat)
 for p in m.polygons:p.use_smooth=True
 # Copy all existing per-vertex shape-key deltas and their driving animation, so
 # oral edge and external skin share identical deformations throughout playback.
 lip.shape_key_add(name='Basis',from_mix=False);origin=o.data.shape_keys.key_blocks['Basis']
 for old in o.data.shape_keys.key_blocks:
  if old.name=='Basis':continue
  new=lip.shape_key_add(name=old.name,from_mix=False)
  for i,idx in enumerate(srcs):new.data[i].co=Vector(verts[i])+(old.data[idx].co-origin.data[idx].co)
 if o.data.shape_keys.animation_data and o.data.shape_keys.animation_data.action:
  lip.data.shape_keys.animation_data_create();lip.data.shape_keys.animation_data.action=o.data.shape_keys.animation_data.action
 print('LINING_VERTS',len(verts),'faces',len(fcs),'SHAPEKEYS',len(lip.data.shape_keys.key_blocks),flush=True)
bm.free();scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-side-surgery-sync.blend')
