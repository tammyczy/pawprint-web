import bpy,math
from pathlib import Path
root=Path('/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web')
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-shaped-lips-inner.blend')
o=bpy.data.objects['Tongue']
# Preserve the established root and shorten its original visible span by 25%.
# Add a smooth central trough and a slight bend toward the muzzle.
for k in range(13):
 t=k/12
 width=.018*(.66+.34*math.sin(math.pi*t))*math.sqrt(max(.025,1-(max(0,(t-.72)/.28))**2))
 for j in range(5):
  q=(j-2)/2; v=o.data.vertices[k*5+j]
  v.co.x=-.435-.042*t+.002*(1-q*q)-.002*math.sin(t*math.pi)
  v.co.y=-.035+width*q
  v.co.z=.612-.0375*t+.0015*(q*q)
for m in o.modifiers:
 if m.type=='SOLIDIFY':m.thickness=.008
# Remove scaling around the world origin; close the shape into the mouth instead.
if o.animation_data and o.animation_data.action:
 for f in list(o.animation_data.action.fcurves):
  if f.data_path=='scale': o.animation_data.action.fcurves.remove(f)
o.scale=(1,1,1)
if o.data.shape_keys:
 for k in list(o.data.shape_keys.key_blocks)[::-1]:o.shape_key_remove(k)
# Place the tongue by measured open-mouth world coordinates, then transform
# into the lower-jaw object's local space so it follows the jaw.
from mathutils import Vector
bpy.context.scene.frame_set(20)
bpy.context.view_layer.update()
inv=o.matrix_world.inverted()
for k in range(13):
 t=k/12
 width=.016*(.75+.25*math.sin(math.pi*t))*math.sqrt(max(.025,1-(max(0,(t-.72)/.28))**2))
 h=max(0,min(1,(t-.60)/.40)); h=h*h*(3-2*h)
 for j in range(5):
  q=(j-2)/2
  world=Vector((-.425-.055*t,-.035+width*q,.564-.021*h+.001*q*q))
  o.data.vertices[k*5+j].co=inv@world
o.shape_key_add(name='Open')
closed=o.shape_key_add(name='Inside mouth')
for v in closed.data:
 v.co.x=-.402;v.co.y=-.035+(v.co.y+.035)*.18;v.co.z=.583
for f,value in [(1,1.0),(12,.85),(20,0.0),(30,0.0),(38,1.0)]:
 closed.value=value;closed.keyframe_insert('value',frame=f)
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-world-anchored-tongue.blend')
