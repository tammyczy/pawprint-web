import bpy
from mathutils import Vector
for path in ['/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-hip-posture-review.blend','/private/tmp/lanlao-patch-v6.blend']:
 bpy.ops.wm.open_mainfile(filepath=path);s=bpy.context.scene;s.frame_set(1);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();pos=Vector((-3,0,.65));target=Vector((-.35,0,.65));q=(target-pos).to_track_quat('-Z','Y');r=q@Vector((1,0,0));u=q@Vector((0,1,0));d=(target-pos).normalized()
 print('MODEL',path,flush=True)
 for x in [310,330,350,370]:
  for y in [374,375,376,377,378,379,380]:
   origin=pos+r*((x-300)/600*.55)+u*((300-y)/600*.55);ok,p,n,i,obj,m=s.ray_cast(deps,origin,d,distance=5)
   if ok:print(x,y,'face',i,'p',tuple(round(k,4) for k in p),'normal',tuple(round(k,3) for k in n),flush=True)
