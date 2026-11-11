import bpy
src='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-mouth-study-2026-11-07/jaw-prototype.blend'
bpy.ops.wm.open_mainfile(filepath=src)
ob=bpy.data.objects['Tongue']
for v in ob.data.vertices:
 v.co.x=-.448+(v.co.x+.448)*.62
 v.co.y=-.035+(v.co.y+.035)*.83
 v.co.z=.620+(v.co.z-.620)*.62
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
act=arm.animation_data.action
print('ACTION',act.name,flush=True)
for f in act.fcurves:
 if 'Lower_Jaw' in f.data_path and 'rotation_euler' in f.data_path:
  print(f.data_path,f.array_index,[(p.co.x,p.co.y) for p in f.keyframe_points],flush=True)
  for pt in f.keyframe_points:
   pt.co.y*=.72;pt.handle_left.y*=.72;pt.handle_right.y*=.72
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-reference-adjustment.blend')
