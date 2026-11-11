import bpy,ast,collections,math,bisect
import numpy as np
root='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web'
bpy.ops.wm.open_mainfile(filepath=root+'/review/lanlao-lip-sync-study/preview.blend')
s=bpy.context.scene;s.frame_set(12);o=next(x for x in s.objects if x.type=='MESH' and len(x.data.vertices)>25000)
jaw=o.vertex_groups['Lower_Jaw'].index
w=lambda v:next((g.weight for g in v.groups if g.group==jaw),0)
module=ast.parse(open(root+'/review/lanlao-connected-mouth-workflow/ellipse-corrective.py').read())
path=next(ast.literal_eval(n.value) for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='path' for t in n.targets))
bykey=collections.defaultdict(list)
for v in o.data.vertices:bykey[tuple(round(float(n),5) for n in v.co)].append(v.index)
dg=bpy.context.evaluated_depsgraph_get();dg.update();ev=o.evaluated_get(dg);mesh=ev.to_mesh();before=[v.co.copy() for v in mesh.vertices];ev.to_mesh_clear()
rows=[]
for p in path:
 if p[0]>-.418: continue
 ids=bykey.get(p,[])
 if len(ids)<2: continue
 up=min(ids,key=lambda i:w(o.data.vertices[i]));lo=max(ids,key=lambda i:w(o.data.vertices[i]))
 if w(o.data.vertices[lo])-w(o.data.vertices[up])<.05:continue
 rows.append((p,up,lo))
print('EVALUATED LIP PAIRS',flush=True)
for p,u,l in sorted(rows,key=lambda item:item[0][1]):
 print('LIP',round(p[1],5),'X',round(p[0],5),'UP',round(before[u].z,5),'LOW',round(before[l].z,5),'W',round(w(o.data.vertices[l]),4),flush=True)
raise SystemExit(0)
# Least-squares average of the unsmoothed upper lip profile.
ys=np.array([p[1]+.035 for p,_,_ in rows]);zs=np.array([before[u].z for p,u,l in rows]);coeff=np.polyfit(ys,zs,2);print('UPPER',coeff,flush=True)
values=[]
for p,u,l in rows:
 y=p[1]+.035;upper=float(np.polyval(coeff,y));width=.052;desired=.019*math.sqrt(max(0,1-(y/width)**2));lower=upper-desired
 values.append((p[1],upper-before[u].z,lower-before[l].z))
values.sort();print('CHANGES',values,flush=True)
def interp(y):
 if y<=values[0][0]:return values[0][1:]
 if y>=values[-1][0]:return values[-1][1:]
 j=bisect.bisect_right([p[0] for p in values],y);a=values[j-1];b=values[j];t=(y-a[0])/(b[0]-a[0]);return tuple(a[k]*(1-t)+b[k]*t for k in (1,2))
# Estimate the vertex-local z response under the existing skinning.
temp=o.shape_key_add(name='SmoothProbe');eps=.001
for v in o.data.vertices:temp.data[v.index].co.z+=eps
temp.value=1;dg.update();ev=o.evaluated_get(dg);me=ev.to_mesh();after=[v.co.copy() for v in me.vertices];ev.to_mesh_clear();o.shape_key_remove(temp)
key=o.shape_key_add(name='LipSmoothTest'); changed=0
for v in o.data.vertices:
 x,y,z=v.co
 if x>-.41 or abs(y+.035)>.052 or z<.53 or z>.61:continue
 ud,ld=interp(y);weight=max(0,min(1,w(v)/.87));delta=(1-weight)*ud+weight*ld
 # avoid any edit away from the original mouth plane
 fall=max(0,1-abs(z-.579)/.037);fall=fall*fall*(3-2*fall)
 # reduce impact as surface recedes to each side
 fall*=max(0,min(1,(-x-.41)/.025))
 derivative=(after[v.index].z-before[v.index].z)/eps
 if derivative>.5:
  change=max(-.012,min(.012,delta*fall/derivative));key.data[v.index].co.z+=change
  if abs(change)>1e-5:changed+=1
for frame,val in [(1,0),(20,1),(30,1),(38,0)]:key.value=val;key.keyframe_insert(data_path='value',frame=frame)
print('CHANGED',changed,flush=True);s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-smooth-seam-test.blend')
