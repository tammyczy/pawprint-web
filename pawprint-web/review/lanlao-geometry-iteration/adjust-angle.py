import bpy
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-connected-round-weights.blend')
a=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for f in a.animation_data.action.fcurves:
 if f.data_path=='pose.bones["Lower_Jaw"].rotation_euler' and f.array_index==1:
  for p in f.keyframe_points:
   p.co.y*=1.25;p.handle_left.y*=1.25;p.handle_right.y*=1.25
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-round-open-angle.blend')
