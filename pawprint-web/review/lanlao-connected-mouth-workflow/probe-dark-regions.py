import bpy
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-workflow-ellipse-weld.blend');scene=bpy.context.scene;scene.frame_set(20)
for ob in scene.objects:
 if ob.type=='MESH' and len(ob.data.vertices)==42:ob.hide_render=True;ob.hide_set(True)
bpy.ops.object.camera_add(location=(-3,0,.65));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=.55;cam.rotation_euler=(Vector((-.35,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();dg.update()
for px,py in [(296,383),(303,383),(310,383),(370,383),(380,383),(390,383),(340,385),(300,390),(380,390),(320,380),(360,380)]:
 x=(px/600-.5)*.55;y=(.5-py/600)*.55;origin=cam.matrix_world@Vector((x,y,0));direction=cam.matrix_world.to_quaternion()@Vector((0,0,-1))
 hit,loc,normal,index,obj,matrix=scene.ray_cast(dg,origin,direction,distance=10)
 if hit:
  ev=obj.evaluated_get(dg);mesh=ev.to_mesh();material=''
  if index>=0 and index<len(mesh.polygons):
   mi=mesh.polygons[index].material_index
   material=mesh.materials[mi].name if mi<len(mesh.materials) and mesh.materials[mi] else 'NONE'
  ev.to_mesh_clear();print('PIXEL',px,py,'hit',obj.name,'material',material,'loc',tuple(round(x,4) for x in loc),flush=True)
 else:print('PIXEL',px,py,'NO HIT',flush=True)
