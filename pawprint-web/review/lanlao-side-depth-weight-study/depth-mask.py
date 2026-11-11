import bpy,math
bpy.ops.wm.open_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-sync-study/preview.blend');s=bpy.context.scene;o=next(x for x in s.objects if x.type=='MESH' and len(x.data.vertices)>25000)
keys=o.data.shape_keys.key_blocks; basis=keys['Basis'];shape=keys['SoftRoundMouth'];changes=0
for i,p in enumerate(basis.data):
 x=p.co.x
 t=max(0.,min(1.,(-x-.405)/.035));t=t*t*(3-2*t)
 if t<1:
  delta=shape.data[i].co-p.co
  if delta.length>1e-8:shape.data[i].co=p.co+delta*t;changes+=1
print('DEPTH_MASK_POINTS',changes,flush=True)
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/pawprint-mouth-sculpt/depth-mask.blend')
