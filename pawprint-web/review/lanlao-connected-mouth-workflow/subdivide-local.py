import bpy,bmesh
bpy.ops.wm.open_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-hip-posture-review.blend')
obj=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)==23504)
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;obj.active_shape_key_index=0;bpy.ops.object.mode_set(mode='EDIT')
bm=bmesh.from_edit_mesh(obj.data)
faces=[f for f in bm.faces if f.calc_center_median().x<-.30 and -.14<f.calc_center_median().y<.07 and .53<f.calc_center_median().z<.63]
edges=set(e for f in faces for e in f.edges)
print('SELECT',len(faces),len(edges),flush=True)
bmesh.ops.subdivide_edges(bm,edges=list(edges),cuts=2,use_grid_fill=True)
bmesh.update_edit_mesh(obj.data,loop_triangles=True,destructive=True);bpy.ops.object.mode_set(mode='OBJECT')
print('MESH',len(obj.data.vertices),'keys',[(k.name,len(k.data)) for k in obj.data.shape_keys.key_blocks],flush=True)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-workflow-local-subdiv.blend')
