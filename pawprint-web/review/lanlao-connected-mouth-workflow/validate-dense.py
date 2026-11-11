import bpy,collections
src='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-hip-posture-review.blend'
dst='/private/tmp/lanlao-workflow-dense-inner.blend'
def grab(path):
 bpy.ops.wm.open_mainfile(filepath=path)
 o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
 keys=o.data.shape_keys.key_blocks
 records=[]
 for i,v in enumerate(o.data.vertices):
  records.append(tuple(round(float(c),5) for k in keys for c in k.data[i].co))
 return collections.Counter(records),[(k.name,len(k.data)) for k in keys],len(o.data.vertices),[(u.name,len(u.data)) for u in o.data.uv_layers]
a,ak,an,au=grab(src);b,bk,bn,bu=grab(dst)
print('original',an,ak,au,'candidate',bn,bk,bu,flush=True)
print('original records unmatched',sum((a-b).values()),flush=True)
