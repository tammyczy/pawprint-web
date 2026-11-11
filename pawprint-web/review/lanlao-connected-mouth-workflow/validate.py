import bpy,sys,collections,math
s='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-hip-posture-review.blend'
c='/private/tmp/lanlao-peredge-inner.blend'
def capture(path):
 bpy.ops.wm.open_mainfile(filepath=path);o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
 keys=o.data.shape_keys.key_blocks
 v=[tuple(round(float(x),5) for x in vert.co) for vert in o.data.vertices]
 k={key.name:len(key.data) for key in keys};uv=[(u.name,len(u.data)) for u in o.data.uv_layers]
 return v,k,uv
orig,k0,uv0=capture(s);after,k1,uv1=capture(c)
a=collections.Counter(orig);b=collections.Counter(after);missing=a-b
print('original_vertices',len(orig),'candidate_vertices',len(after),'unmatched_original_coordinates',sum(missing.values()))
print('original_keys',k0,'candidate_keys',k1,'original_uv',uv0,'candidate_uv',uv1)
