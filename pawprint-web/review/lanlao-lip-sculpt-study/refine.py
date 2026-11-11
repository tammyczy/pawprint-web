import bpy, math, collections
from mathutils import Vector
src='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-sync-study/preview.blend'
bpy.ops.wm.open_mainfile(filepath=src)
s=bpy.context.scene;s.frame_set(20);bpy.context.view_layer.update()
o=next(x for x in s.objects if x.type=='MESH' and len(x.data.vertices)>25000)
print('obj',o.name,'verts',len(o.data.vertices),'keys',[k.name for k in o.data.shape_keys.key_blocks],flush=True)
j=o.vertex_groups['Lower_Jaw'].index
w=lambda v: next((g.weight for g in v.groups if g.group==j),0)
# Find exact paired edges produced by the split mouth. Only equal-position vertices
# having different jaw weights are paired; interior/back/UV seams remain excluded.
groups=collections.defaultdict(list)
for v in o.data.vertices:
 x,y,z=v.co
 if -.475<x<-.39 and abs(y+.035)<.08 and .568<z<.589:
  groups[tuple(round(a,5) for a in v.co)].append(v.index)
pairs=[]
for p,ids in groups.items():
 if len(ids)<2:continue
 lo=min(ids,key=lambda i:w(o.data.vertices[i]));hi=max(ids,key=lambda i:w(o.data.vertices[i]))
 if w(o.data.vertices[hi])-w(o.data.vertices[lo])>.2:
  pairs.append((p,lo,hi))
print('pairs',len(pairs),flush=True)
dg=bpy.context.evaluated_depsgraph_get();ev=o.evaluated_get(dg);me=ev.to_mesh();before=[v.co.copy() for v in me.vertices];ev.to_mesh_clear()
# Derivative in local space after the active armature and shape keys.
temp=o.shape_key_add(name='AxisProbe')
for v in o.data.vertices:temp.data[v.index].co.z+=.001
temp.value=1;dg.update();ev=o.evaluated_get(dg);me=ev.to_mesh();after=[v.co.copy() for v in me.vertices];ev.to_mesh_clear();o.shape_key_remove(temp)
anchors=[]
for (x,y,z),u,l in pairs:
 if x>-.425:continue
 r=abs(y+.035)
 if r>.05:continue
 # gently shaped upper lip; a narrower opening tapers toward both mouth corners
 width=.038
 upper=before[u].z
 lower=upper-.020*math.sqrt(max(0,1-(r/width)**2))
 for idx,target,side in [(l,lower,1)]:
  derivative=(after[idx].z-before[idx].z)/.001
  if derivative>.4:
   delta=max(-.004,min(.004,(target-before[idx].z)/derivative))
   anchors.append((Vector((x,y,z)),side,delta))
print('anchors',len(anchors),flush=True)
key=o.shape_key_add(name='HandShapedMouth');changed=0
for v in o.data.vertices:
 x,y,z=v.co
 if x>-.41 or abs(y+.035)>.065 or not (.525<z<.605):continue
 side=1 if w(v)>.40 else 0
 candidates=[(p,d) for p,k,d in anchors if k==side]
 if not candidates:continue
 # nearby boundary influences, decaying smoothly away from the seam
 ranked=sorted(((v.co-p).length,p,d) for p,d in candidates)[:3]
 distance=ranked[0][0];fall=max(0,1-distance/.012);fall=fall*fall*(3-2*fall)
 if not fall:continue
 weights=[1/(dist+.002)**2 for dist,p,d in ranked];delta=sum(q*d for q,(_,p,d) in zip(weights,ranked))/sum(weights)*fall
 key.data[v.index].co.z+=delta;changed+=1
print('changed',changed,flush=True)
for frame,val in [(1,0),(20,1),(30,1),(38,0)]:key.value=val;key.keyframe_insert(data_path='value',frame=frame)
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/pawprint-mouth-sculpt/refine.blend')
