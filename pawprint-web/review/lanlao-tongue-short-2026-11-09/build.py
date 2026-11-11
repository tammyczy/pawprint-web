import bpy,math
from pathlib import Path
root=Path('/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web')
bpy.ops.wm.open_mainfile(filepath=str(root/'review/lanlao-tongue-study-2026-11-09/preview.blend'))
o=bpy.data.objects['Tongue']
# Preserve the established root and shorten its original visible span by 25%.
# Add a smooth central trough and a slight bend toward the muzzle.
for k in range(13):
 t=k/12
 width=.018*(.66+.34*math.sin(math.pi*t))*math.sqrt(max(.025,1-(max(0,(t-.72)/.28))**2))
 for j in range(5):
  q=(j-2)/2; v=o.data.vertices[k*5+j]
  v.co.x=-.449-.030*t+.002*(1-q*q)-.002*math.sin(t*math.pi)
  v.co.y=-.035+width*q
  v.co.z=.612-.0375*t+.0015*(q*q)
for m in o.modifiers:
 if m.type=='SOLIDIFY':m.thickness=.006
# Remove scaling around the world origin; close the shape into the mouth instead.
if o.animation_data and o.animation_data.action:
 for f in list(o.animation_data.action.fcurves):
  if f.data_path=='scale': o.animation_data.action.fcurves.remove(f)
o.scale=(1,1,1)
if o.data.shape_keys:
 for k in list(o.data.shape_keys.key_blocks)[::-1]:o.shape_key_remove(k)
o.shape_key_add(name='Open')
closed=o.shape_key_add(name='Inside mouth')
for v in closed.data:
 v.co.x=-.402;v.co.y=-.035+(v.co.y+.035)*.18;v.co.z=.583
for f,value in [(1,1.0),(12,.85),(20,0.0),(30,0.0),(38,1.0)]:
 closed.value=value;closed.keyframe_insert('value',frame=f)
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'review/lanlao-tongue-short-2026-11-09/preview.blend'))
