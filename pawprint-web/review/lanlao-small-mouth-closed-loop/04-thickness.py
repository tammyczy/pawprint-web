import bpy,bmesh
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-short-triangle-equivalent.blend');scene=bpy.context.scene;scene.frame_set(1)
o=next(o for o in scene.objects if o.type=='MESH' and len(o.data.vertices)>20000);mi=next(i for i,m in enumerate(o.data.materials) if m and m.name.startswith('Welded mouth diagnostic'))
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;o.active_shape_key_index=0;bpy.ops.object.mode_set(mode='EDIT');b=bmesh.from_edit_mesh(o.data);df=b.verts.layers.deform.verify();layers=list(b.verts.layers.shape.values());jaw=o.vertex_groups['Lower_Jaw'].index
n=0
for v in b.verts:
 if not v.link_faces or any(f.material_index!=mi for f in v.link_faces):continue
 w=v[df].get(jaw,0)
 if w<.001:continue
 delta=-.0003*min(1,w/.8);v.co.z+=delta
 for l in layers:v[l].z+=delta
 n+=1
print('MOVED_INTERIOR_ONLY',n,flush=True);bmesh.update_edit_mesh(o.data,loop_triangles=True,destructive=True);bpy.ops.object.mode_set(mode='OBJECT');bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-inner-thickness.blend')
