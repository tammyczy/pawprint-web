import bpy
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-workflow-ellipse-weld.blend');scene=bpy.context.scene;scene.frame_set(20)
o=next(o for o in scene.objects if o.type=='MESH' and len(o.data.vertices)>25000);dg=bpy.context.evaluated_depsgraph_get();dg.update();ev=o.evaluated_get(dg);me=ev.to_mesh()
for p in me.polygons:
 mi=p.material_index
 if mi>=len(me.materials) or not me.materials[mi] or me.materials[mi].name!='Deep oral surface':continue
 center=sum((me.vertices[i].co for i in p.vertices),start=me.vertices[p.vertices[0]].co*0)/len(p.vertices)
 if -.48<center.x<-.41 and -.065<center.y<.0 and .545<center.z<.565:
  print('FACE',p.index,'verts',list(p.vertices),'center',tuple(round(float(x),5) for x in center),flush=True)
ev.to_mesh_clear()
