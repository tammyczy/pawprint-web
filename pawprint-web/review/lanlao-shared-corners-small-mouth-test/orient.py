import bpy,bmesh
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-short-mouth-equivalent.blend');scene=bpy.context.scene;scene.frame_set(20)
o=next(o for o in scene.objects if o.type=='MESH' and len(o.data.vertices)>20000);mi=next(i for i,m in enumerate(o.data.materials) if m and m.name.startswith('Welded mouth diagnostic'))
ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();b=bmesh.new();b.from_mesh(me);b.faces.ensure_lookup_table();b.normal_update()
indices=[f.index for f in b.faces if f.material_index==mi and f.calc_area()>1e-10 and f.normal.x>.3]
print('flip faces',indices,flush=True);b.free();ev.to_mesh_clear()
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;o.active_shape_key_index=0;bpy.ops.object.mode_set(mode='EDIT');bm=bmesh.from_edit_mesh(o.data);bm.faces.ensure_lookup_table()
for index in indices:bm.faces[index].normal_flip()
bmesh.update_edit_mesh(o.data,loop_triangles=True,destructive=True);bpy.ops.object.mode_set(mode='OBJECT');scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-short-mouth-oriented.blend')
