import bpy,bmesh
from collections import defaultdict
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-short-mouth-weld.blend')
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
mi=next(i for i,m in enumerate(o.data.materials) if m and m.name.startswith('Welded mouth diagnostic'))
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;o.active_shape_key_index=0;bpy.ops.object.mode_set(mode='EDIT')
b=bmesh.from_edit_mesh(o.data);b.verts.ensure_lookup_table(); df=b.verts.layers.deform.verify(); layers=list(b.verts.layers.shape.values())
vs={v for f in b.faces if f.material_index==mi for v in f.verts}; buckets=defaultdict(list)
for v in vs:
 k=(tuple(round(x,6) for x in v.co), tuple(sorted((i,round(w,6)) for i,w in v[df].items() if abs(w)>1e-8)),tuple(tuple(round(x,6) for x in v[l]) for l in layers))
 buckets[k].append(v)
merge={};
for values in buckets.values():
 if len(values)<2:continue
 # Preserve earlier existing point as canonical representative.
 values.sort(key=lambda v:v.index)
 for v in values[1:]:merge[v]=values[0]
print('duplicate matches',len(merge),flush=True)
if merge:bmesh.ops.weld_verts(b,targetmap=merge)
b.verts.index_update();b.edges.index_update();b.faces.index_update()
fs={f for f in b.faces if f.material_index==mi};es={e for f in fs for e in f.edges}
print('INNER',len(fs),'boundary',sum(len(e.link_faces)==1 for e in es),'nonmanifold',sum(len(e.link_faces)>2 for e in es),'degenerate',sum(f.calc_area()<1e-10 for f in fs),flush=True)
bmesh.update_edit_mesh(o.data,loop_triangles=True,destructive=True);bpy.ops.object.mode_set(mode='OBJECT')
print('result verts',len(o.data.vertices),'key lengths',[(k.name,len(k.data)) for k in o.data.shape_keys.key_blocks],flush=True)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-short-mouth-equivalent.blend')
