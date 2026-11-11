import bpy
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-side-surgery-sync.blend');s=bpy.context.scene;s.frame_set(20);bpy.context.view_layer.update();camloc=Vector((-.35,-3,.65));rot=(Vector((-.35,0,.65))-camloc).to_track_quat('-Z','Y');right=rot @ Vector((1,0,0));up=rot @ Vector((0,1,0));direc=rot @ Vector((0,0,-1));dg=bpy.context.evaluated_depsgraph_get()
for px,py in [(190,387),(201,387),(210,387),(218,387),(228,387),(232,387),(240,387),(250,387),(260,387),(270,387),(280,387),(210,376),(232,376)]:
 origin=camloc+right*((px/600-.5)*.55)+up*((.5-py/600)*.55)
 hit,location,norm,idx,obj,matrix=s.ray_cast(dg,origin,direc,distance=10)
 if not hit:print('RAY',px,py,'BACKGROUND',flush=True);continue
 material=''; evalobj=obj.evaluated_get(dg);mesh=evalobj.to_mesh()
 if 0<=idx<len(mesh.polygons):
  mi=mesh.polygons[idx].material_index;material=obj.material_slots[mi].material.name if mi<len(obj.material_slots) and obj.material_slots[mi].material else ''
 evalobj.to_mesh_clear();print('RAY',px,py,'object',obj.name,'material',material,'face',idx,'loc',tuple(round(x,5) for x in location),flush=True)
