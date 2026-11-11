import bpy,math
bpy.ops.wm.open_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-tongue-study-2026-11-09/preview.blend')
o=bpy.data.objects['Tongue']
for k in range(13):
 t=k/12
 width=.020*(.82+.18*math.sin(math.pi*t))*math.sqrt(max(.015,1-(max(0,(t-.76)/.24))**2))
 for j in range(5):
  q=(j-2)/2;v=o.data.vertices[k*5+j]
  v.co.x=-.438-.019*math.sin(math.pi*t*.7)-.007*t-.003*(1-q*q)
  v.co.y=-.035+width*q
  v.co.z=.612-.051*t-.003*math.sin(math.pi*t)+.002*(1-q*q)
for m in o.modifiers:
 if m.type=='SOLIDIFY':m.thickness=.008
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-natural-tongue.blend')
