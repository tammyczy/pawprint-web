import bpy,bmesh
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-split-mixed.blend');s=bpy.context.scene;s.frame_set(20);o=bpy.data.objects['Side_Oral_Lining'];bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();bm.verts.index_update();bm.faces.ensure_lookup_table();bm.faces.index_update()
for e in bm.edges:
 if len(e.link_faces)>2:
  print('EDGE',[(v.index,tuple(round(x,6) for x in v.co)) for v in e.verts],'FACECOUNT',len(e.link_faces),flush=True)
  for f in e.link_faces:print(' FACE',f.index,[v.index for v in f.verts],flush=True)
