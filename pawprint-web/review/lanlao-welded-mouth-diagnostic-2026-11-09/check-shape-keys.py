import bpy
from mathutils import Vector
baseline='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-complete-lip-ring-study/preview.blend'
result='/private/tmp/lanlao-welded-front.blend'
def read(path):
 bpy.ops.wm.open_mainfile(filepath=path)
 o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
 d=o.data
 return o, [[tuple(v.co) for v in k.data] for k in d.shape_keys.key_blocks], [tuple(v.co) for v in d.vertices]
o,oldkeys,oldverts=read(baseline)
print('baseline',len(oldverts),flush=True)
o,newkeys,newverts=read(result)
print('new',len(newverts),flush=True)
for idx,(a,b) in enumerate(zip(oldkeys,newkeys)):
 n=len(a);maximum=max((Vector(x)-Vector(y)).length for x,y in zip(a,b[:n]));count=sum((Vector(x)-Vector(y)).length>1e-6 for x,y in zip(a,b[:n]));print('key',idx,'max',maximum,'changed',count,flush=True)
for idx,k in enumerate(newkeys):
 ext=k[len(oldverts):];print('newkey',idx,'first',ext[0], 'zero',sum(Vector(v).length<1e-7 for v in ext),flush=True)
