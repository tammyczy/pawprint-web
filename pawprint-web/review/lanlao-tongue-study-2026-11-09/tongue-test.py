import bpy,math
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-mesh-edge-test.blend')
o=bpy.data.objects['Tongue']
assert len(o.data.vertices)==65
for k in range(13):
 t=k/12
 width=.018*(.66+.34*math.sin(math.pi*t))*math.sqrt(max(.025,1-(max(0,(t-.72)/.28))**2))
 for j in range(5):
  q=(j-2)/2
  v=o.data.vertices[k*5+j]
  v.co.x=-.449-.028*t+.002*(1-q*q)
  v.co.y=-.035+width*q
  v.co.z=.612-.050*t+.0015*(1-q*q)
for m in o.modifiers:
 if m.type=='SOLIDIFY':m.thickness=.005
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-tongue-forward-test.blend')
