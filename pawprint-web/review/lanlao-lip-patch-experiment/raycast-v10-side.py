import bpy
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-patch-experiment/v10-normal.blend');s=bpy.context.scene;s.frame_set(20)
for o in s.objects:
 if o.type=='MESH' and len(o.data.vertices)==42:o.hide_render=True;o.hide_viewport=True
bpy.ops.object.camera_add(location=(-.35,-3,.65));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=.55;cam.rotation_euler=(Vector((-.35,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler();s.camera=cam;bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
for y in [380,385,390,395,400,405,410,415,420,425]:
 for x in [170,175,180,185,190,195,200,205,210,215]:
  loc=Vector(((x/600-.5)*.55,(.5-y/600)*.55,0));origin=cam.matrix_world@loc;direction=cam.matrix_world.to_quaternion()@Vector((0,0,-1)); hit,loc,n,fi,obj,_=s.ray_cast(dg,origin,direction)
  if hit:
   me=obj.evaluated_get(dg).to_mesh();p=me.polygons[fi];name=me.materials[p.material_index].name;obj.evaluated_get(dg).to_mesh_clear();print(x,y,obj.name,name,fi,tuple(round(t,4) for t in loc))
