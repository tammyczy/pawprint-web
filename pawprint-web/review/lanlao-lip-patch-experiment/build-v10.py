import bpy,bmesh,math
from mathutils import Vector
f='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-patch-experiment/v4.blend'
bpy.ops.wm.open_mainfile(filepath=f);s=bpy.context.scene;o=next(o for o in s.objects if o.type=='MESH' and len(o.data.vertices)>20000);arm=next(o for o in s.objects if o.type=='ARMATURE');s.frame_set(20);bpy.context.view_layer.update()
# Sample actual open-frame locations and jaw transform before topology changes.
dg=bpy.context.evaluated_depsgraph_get();ev=o.evaluated_get(dg);em=ev.to_mesh();openpos=[v.co.copy() for v in em.vertices];ev.to_mesh_clear()
pb=arm.pose.bones['Lower_Jaw'];M=arm.matrix_world@pb.matrix@arm.data.bones['Lower_Jaw'].matrix_local.inverted();inv=M.inverted()
mat=bpy.data.materials.new('Connected tongue pink');mat.use_nodes=True;p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.39,.105,.115,1);p.inputs['Roughness'].default_value=.62;o.data.materials.append(mat);mi=len(o.data.materials)-1
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;o.active_shape_key_index=0;bpy.ops.object.mode_set(mode='EDIT');bm=bmesh.from_edit_mesh(o.data);bm.faces.ensure_lookup_table();bm.verts.ensure_lookup_table();deform=bm.verts.layers.deform.verify();layers=list(bm.verts.layers.shape.values());jaw=o.vertex_groups['Lower_Jaw'].index
indices=[19526,19529,19528,19543,19527];fs=[bm.faces[i] for i in indices]
assert all(f.material_index==2 and len(f.verts)==3 for f in fs)
S=set(fs);boundary=[e for f in fs for e in f.edges if sum(n in S for n in e.link_faces)==1];boundary=list(set(boundary));graph={}
for e in boundary:
 a,b=e.verts;graph.setdefault(a,[]).append(b);graph.setdefault(b,[]).append(a)
assert all(len(v)==2 for v in graph.values());start=min(graph,key=lambda v:v.index);order=[start];prev=None;cur=start
while True:
 nxt=next(v for v in graph[cur] if v!=prev)
 if nxt==start:break
 order.append(nxt);prev,cur=cur,nxt
 assert len(order)<15
print('root order',[(v.index,tuple(round(t,4) for t in openpos[v.index])) for v in order],flush=True)
# 5 oral-floor triangles are replaced with continuous tongue root and a capped set of 3D rings.
for f in fs:bm.faces.remove(f)
for v in order: assert v.is_valid
newrings=[];targets={};n=len(order)
for rid,t in enumerate((.14,.28,.42,.56,.70,.84,.94,1.0)):
 ring=[]
 for i,source in enumerate(order):
  # Cross section smoothly tapers toward a round tip, with a small real thickness.
  angle=2*math.pi*i/n;width=.013*(1-.82*max(0,(t-.65)/.35)**2);thick=.0023*(1-.8*max(0,(t-.65)/.35)**2)
  desired=Vector((-.427-.035*t-.015*math.sin(math.pi*t),-.035+width*math.cos(angle),.565-.029*t+thick*math.sin(angle)))
  rest=inv@desired
  # Basis initially near the connected root; shape key grows toward desired configuration.
  collapsed=source.co.lerp(rest,.025*t);v=bm.verts.new(collapsed)
  for layer in layers:v[layer]=collapsed+(source[layer]-source.co)
  v[deform][jaw]=1.0;ring.append(v);targets[v]=rest
 newrings.append(ring)
last=order
for ring in newrings:
 for i in range(n):
  try:
   f=bm.faces.new((last[i],last[(i+1)%n],ring[(i+1)%n],ring[i]));f.material_index=mi;f.smooth=True
  except ValueError:pass
 last=ring
try:
 f=bm.faces.new(tuple(reversed(last)));f.material_index=mi;f.smooth=True
except ValueError:pass
bm.verts.index_update();mapped={v.index:target for v,target in targets.items()};bmesh.update_edit_mesh(o.data,loop_triangles=True,destructive=True);bpy.ops.object.mode_set(mode='OBJECT')
key=o.shape_key_add(name='TongueExtend',from_mix=False)
for idx,co in mapped.items():key.data[idx].co=co
for fr,val in [(1,0),(20,1),(30,1),(38,0)]:key.value=val;key.keyframe_insert(data_path='value',frame=fr)
# Restore no-open state for saved candidate.
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-patch-experiment/rebuild-v10.blend')
