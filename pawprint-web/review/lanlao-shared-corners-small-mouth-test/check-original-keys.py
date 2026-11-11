import bpy
from collections import Counter
paths=['/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-hip-posture-review.blend','/private/tmp/lanlao-short-mouth-oriented.blend']
def load(path):
 bpy.ops.wm.open_mainfile(filepath=path);o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000);keys=o.data.shape_keys.key_blocks
 vals=[]
 for v in o.data.vertices:
  # Each original geometric point including corresponding shape positions. Loop UV is separate and not inspected.
  vals.append(tuple(tuple(round(q,6) for q in k.data[v.index].co) for k in keys[:3]))
 return Counter(vals),len(vals)
a,na=load(paths[0]);b,nb=load(paths[1]);miss=a-b
print('ORIGINAL',na,'CANDIDATE',nb,'original_shape_signatures_absent',sum(miss.values()),'distinct',len(miss),flush=True)
for k,count in list(miss.items())[:8]:print('MISS',k,count,flush=True)
