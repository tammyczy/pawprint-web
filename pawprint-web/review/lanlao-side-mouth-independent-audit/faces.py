import bpy
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-side-surgery-sync.blend');s=bpy.context.scene;s.frame_set(20);o=next(x for x in s.objects if x.type=='MESH' and len(x.data.vertices)>25000);names={g.index:g.name for g in o.vertex_groups};ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh()
for faceid in [20529,22578]:
 f=o.data.polygons[faceid];print('FACE',faceid,'material',f.material_index,'verts',list(f.vertices),flush=True)
 for i in f.vertices:
  v=o.data.vertices[i];print(' V',i,'basis',tuple(round(n,6) for n in v.co),'animated',tuple(round(n,6) for n in me.vertices[i].co),'groups',[(names[g.group],round(g.weight,3)) for g in v.groups if g.weight>.001],flush=True)
ev.to_mesh_clear()
