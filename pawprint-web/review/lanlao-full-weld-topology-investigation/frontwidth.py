import bpy,math
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-peredge-inner.blend')
body=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
inner=bpy.data.objects.get('ContiguousInner')
def smooth(t):
 t=max(0.,min(1.,t));return t*t*(3-2*t)
for ob in [body,inner]:
 jaw=ob.vertex_groups.get('Lower_Jaw');head=ob.vertex_groups.get('Head');count=0
 for v in ob.data.vertices:
  x,y,z=v.co
  try:weight=jaw.weight(v.index)
  except RuntimeError:continue
  try:headweight=head.weight(v.index)
  except RuntimeError:headweight=0
  # decrease lower-jaw motion at wide, forward corners; keep side-rear motion
  radial=abs(y+.035)
  front=smooth((-.40-x)/.055)
  width=smooth((radial-.023)/.035)
  strength=front*width*.94
  if strength<.001:continue
  delta=weight*strength
  jaw.add([v.index],weight-delta,'REPLACE');head.add([v.index],headweight+delta,'REPLACE');count+=1
 print('CORRECTED',ob.name,count,flush=True)
bpy.context.scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-frontwidth-v1.blend')
