import bpy, math
from pathlib import Path
src='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-tongue-study-2026-11-09/preview.blend'
bpy.ops.wm.open_mainfile(filepath=src)
o=bpy.data.objects['Tongue']
for k in range(13):
 t=k/12
 # Broad, soft U-shaped tongue with a narrowing root and rounded tip.
 width=.018*(.65+.35*min(t/.30,1))* math.sqrt(max(.008,1-(max(0,(t-.72)/.28))**2))
 for j in range(5):
  q=(j-2)/2; v=o.data.vertices[k*5+j]
  v.co.x=-.440-.036*math.sin(t*math.pi*.65)-.007*t-.001*(1-q*q)
  v.co.y=-.035+width*q
  v.co.z=.611-.050*t-.002*(1-q*q)
for m in o.modifiers:
 if m.type=='SOLIDIFY':m.thickness=.007
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-tongue-curved.blend')
