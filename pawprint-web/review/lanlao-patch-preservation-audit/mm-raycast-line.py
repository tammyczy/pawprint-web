import bpy
from mathutils import Vector
p='/private/tmp/lanlao-replaced-patch-v4.blend';bpy.ops.wm.open_mainfile(filepath=p);s=bpy.context.scene;s.frame_set(1);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
pos=Vector((-3,0,.65)); target=Vector((-.35,0,.65));quat=(target-pos).to_track_quat('-Z','Y');right=quat@Vector((1,0,0));up=quat@Vector((0,1,0));direction=(target-pos).normalized();scale=.55
for y in [370,374,377,380,383,387]:
 for x in [275,300,325,350,375,400]:
  origin=pos+right*((x-300)/600*scale)+up*((300-y)/600*scale)
  ok,where,normal,index,obj,m=s.ray_cast(deps,origin,direction,distance=5)
  if not ok:print('PIXEL',x,y,'MISS');continue
  ev=obj.evaluated_get(deps);me=ev.to_mesh();face=me.polygons[index] if index<len(me.polygons) else None
  mat=me.materials[face.material_index].name if face and face.material_index<len(me.materials) and me.materials[face.material_index] else '?';ev.to_mesh_clear()
  print('PIXEL',x,y,'OBJECT',obj.name,'FACE',index,'MAT',mat,'POS',tuple(round(v,4) for v in where),flush=True)
