import bpy,math
from collections import defaultdict
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-short-mouth-oriented.blend');scene=bpy.context.scene
body=next(o for o in scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
jaw=body.vertex_groups['Lower_Jaw'];hg=body.vertex_groups['Head']
def line(x,y): return .579+.008*min(1,abs(y+.035)/.09)**2+.17*max(0,min(.105,x+.462))
def smooth(t):
 t=max(0.,min(1.,t));return t*t*(3-2*t)
scene.frame_set(20);dg=bpy.context.evaluated_depsgraph_get();ev=body.evaluated_get(dg);em=ev.to_mesh()
points=defaultdict(list)
for v in body.data.vertices:
 x,y,z=v.co
 if x<-.43 and abs(y+.035)<.046 and abs(z-line(x,y))<.0001:
  points[tuple(round(n,5) for n in v.co)].append(v.index)
print('seam groups',len(points),flush=True)
profile=[]
for key,ids in points.items():
 if len(ids)<2:continue
 def w(i): return next((g.weight for g in body.data.vertices[i].groups if g.group==jaw.index),0)
 ids.sort(key=w);up,lo=ids[0],ids[-1]
 if w(lo)-w(up)<.05:continue
 x,y,z=key;r=abs(y+.035); upper=em.vertices[up].co.z; lower=em.vertices[lo].co.z
 targetgap=.022*math.sqrt(max(0.,1.-(r/.046)**2)); delta=(upper-targetgap)-lower
 profile.append((r,delta)); print('PAIR',round(r,5),round(upper-lower,5),round(targetgap,5),round(delta,5),flush=True)
ev.to_mesh_clear();profile.sort()
def correction(r):
 if not profile:return 0
 if r<=profile[0][0]:return profile[0][1]
 for (a,da),(b,db) in zip(profile,profile[1:]):
  if r<=b:
   t=(r-a)/max(1e-9,b-a);return da*(1-t)+db*t
 return 0
if not body.data.shape_keys:body.shape_key_add(name='Basis')
sk=body.shape_key_add(name='Round_Lower_Lip_Corrective');touch=0
for v in body.data.vertices:
 x,y,z=v.co;r=abs(y+.035);l=line(x,y)
 if x>=-.40 or r>=.046 or z>l+.0001:continue
 w=next((g.weight for g in v.groups if g.group==jaw.index),0)
 if w<.01:continue
 dx=smooth((-.40-x)/.04); dz=smooth((z-(l-.05))/.035)
 delta=correction(r)*dx*dz
 if abs(delta)>.000001:sk.data[v.index].co.z+=delta;touch+=1
for f,value in [(1,0),(8,.15),(12,.5),(20,1),(30,1),(35,.3),(38,0)]:sk.value=value;sk.keyframe_insert(data_path='value',frame=f)
print('touched',touch,flush=True)
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-round-corrective-v2.blend')
