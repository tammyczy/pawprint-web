import bpy
from collections import Counter
paths=['/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-hip-posture-review.blend','/private/tmp/lanlao-short-mouth-oriented.blend']
def load(path):
 bpy.ops.wm.open_mainfile(filepath=path);o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000);d=o.data;uv=d.uv_layers.active.data
 def sig(f):
  return tuple(sorted((tuple(round(n,5) for n in d.vertices[d.loops[i].vertex_index].co),tuple(round(n,5) for n in uv[i].uv)) for i in f.loop_indices))
 # Outside the bisected anatomical band; test exact polygon/UV correspondences only there.
 fs=[f for f in d.polygons if f.center.x>-.15 or f.center.z<.50 or f.center.z>.70 or abs(f.center.y+.035)>.16]
 return Counter(sig(f) for f in fs),len(fs)
a,na=load(paths[0]);b,nb=load(paths[1]);miss=a-b
print('BASE_UNAFFECTED_FACES',na,'CANDIDATE',nb,'MISSING_UV_SIGNATURES',sum(miss.values()),flush=True)
