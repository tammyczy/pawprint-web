import bpy,bmesh
from mathutils import Vector
src='/private/tmp/lanlao-side-surgery-sync.blend'
bpy.ops.wm.open_mainfile(filepath=src);scene=bpy.context.scene;scene.frame_set(1)
o=next(x for x in scene.objects if x.type=='MESH' and len(x.data.vertices)>25000)
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;o.active_shape_key_index=0;bpy.ops.object.mode_set(mode='EDIT')
bm=bmesh.from_edit_mesh(o.data);bm.verts.ensure_lookup_table();bm.faces.ensure_lookup_table();deform=bm.verts.layers.deform.verify();keys=list(bm.verts.layers.shape);uv_layers=list(bm.loops.layers.uv);jaw=o.vertex_groups['Lower_Jaw'].index;head=o.vertex_groups['Head'].index
mixed=[]
for v in list(bm.verts):
 x,y,z=v.co
 if not(-.456<x<-.390 and -.125<y<-.084 and abs(z-.579)<.00001):continue
 above=[f for f in v.link_faces if f.calc_center_median().z>.579001];below=[f for f in v.link_faces if f.calc_center_median().z<.578999]
 if above and below:mixed.append((v,below))
print('MIXED',len(mixed),'UV',len(uv_layers),flush=True)
replace={};afaces=set()
for v,below in mixed:
 n=bm.verts.new(v.co,v)
 for layer in keys:n[layer]=v[layer]
 for k,val in v[deform].items():n[deform][k]=val
 replace[v]=n;afaces.update(below)
 # The original point stays attached to upper facial surface; the duplicate
 # retains the side-jaw weights for all reconstructed lower faces.
 d=v[deform];j=d.get(jaw,0.0);d[head]=d.get(head,0.0)+j
 if jaw in d:del d[jaw]
records=[]
for f in afaces:
 loops=[]
 for l in f.loops:
  uv=[]
  for layer in uv_layers:
   z=l[layer];uv.append((z.uv.copy(),z.select,z.select_edge,z.pin_uv))
  loops.append((l.vert,uv))
 records.append((f,loops,f.material_index,f.smooth))
for f,loops,mi,smooth in records:
 bm.faces.remove(f)
 verts=[replace.get(v,v) for v,uv in loops]
 try:n=bm.faces.new(verts)
 except ValueError as exc:print('FACE_ERROR',exc,flush=True);continue
 n.material_index=mi;n.smooth=smooth
 for loop,(_,uvs) in zip(n.loops,loops):
  for layer,(co,sel,sel_edge,pin) in zip(uv_layers,uvs):
   item=loop[layer];item.uv=co;item.select=sel;item.select_edge=sel_edge;item.pin_uv=pin
print('REBUILT',len(records),'NEWVERTS',len(replace),flush=True)
bmesh.update_edit_mesh(o.data,loop_triangles=True,destructive=True);bpy.ops.object.mode_set(mode='OBJECT');scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-split-mixed.blend')
