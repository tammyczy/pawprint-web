import bpy,collections,math,bisect
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-workflow-dense-weld.blend')
scene=bpy.context.scene;scene.frame_set(20)
o=next(o for o in scene.objects if o.type=='MESH' and len(o.data.vertices)>25000);jaw=o.vertex_groups['Lower_Jaw'].index
path=[(-0.3762, -0.11219, 0.57148), (-0.38515, -0.1141, 0.57148), (-0.3941, -0.11602, 0.57148), (-0.40177, -0.11602, 0.57402), (-0.40944, -0.11602, 0.57656), (-0.41711, -0.11602, 0.57911), (-0.42543, -0.11027, 0.58039), (-0.43374, -0.10452, 0.58167), (-0.43565, -0.10004, 0.57913), (-0.43565, -0.09428, 0.5785), (-0.43565, -0.08853, 0.57787), (-0.43565, -0.08278, 0.57721), (-0.44268, -0.07639, 0.57787), (-0.44778, -0.06999, 0.58043), (-0.45289, -0.0636, 0.58299), (-0.45353, -0.05913, 0.57978), (-0.45865, -0.05338, 0.58232), (-0.45929, -0.0489, 0.57911), (-0.45993, -0.04507, 0.57783), (-0.46057, -0.04123, 0.57654), (-0.46121, -0.0374, 0.57526), (-0.46057, -0.03228, 0.57591), (-0.45993, -0.02717, 0.57656), (-0.45929, -0.02205, 0.57721), (-0.45865, -0.01758, 0.57913), (-0.45801, -0.0131, 0.58104), (-0.45737, -0.00863, 0.58295), (-0.45162, -0.00224, 0.58039), (-0.44587, 0.00415, 0.57783), (-0.44012, 0.01055, 0.57526), (-0.44077, 0.01566, 0.57591), (-0.44141, 0.02077, 0.57656), (-0.43565, 0.02781, 0.57402), (-0.43501, 0.03292, 0.5753), (-0.42797, 0.03995, 0.57339), (-0.42093, 0.04698, 0.57148), (-0.41263, 0.04826, 0.57083), (-0.40433, 0.04954, 0.57018), (-0.39603, 0.05082, 0.56952), (-0.38772, 0.05082, 0.57018), (-0.3794, 0.05082, 0.57083), (-0.37109, 0.05082, 0.57148)]
def w(v):return next((g.weight for g in v.groups if g.group==jaw),0)
bykey=collections.defaultdict(list)
for v in o.data.vertices:bykey[tuple(round(float(n),5) for n in v.co)].append(v.index)
dg=bpy.context.evaluated_depsgraph_get();dg.update();ev=o.evaluated_get(dg);me=ev.to_mesh();before=[v.co.copy() for v in me.vertices];ev.to_mesh_clear()
bins=collections.defaultdict(list)
for p in path:
 ids=bykey[p];u=min(ids,key=lambda i:w(o.data.vertices[i]));l=max(ids,key=lambda i:w(o.data.vertices[i]))
 if w(o.data.vertices[l])-w(o.data.vertices[u])>.01:
  gap=max(0,before[u].z-before[l].z);r=abs(p[1]+.035);desired=.023*math.sqrt(max(0,1-(r/.045)**2))
  bins[p[1]].append((max(0,gap-desired),p[2]))
ys=sorted(bins);samples=[(sum(d for d,_ in bins[y])/len(bins[y]),sum(z for _,z in bins[y])/len(bins[y])) for y in ys]
def interpolate(y):
 if y<=ys[0]:return samples[0]
 if y>=ys[-1]:return samples[-1]
 j=bisect.bisect_right(ys,y);a,b=ys[j-1],ys[j];t=(y-a)/(b-a);return tuple(samples[j-1][k]*(1-t)+samples[j][k]*t for k in range(2))
temp=o.shape_key_add(name='Probe');eps=.001
for v in o.data.vertices:temp.data[v.index].co.z+=eps
temp.value=1;dg.update();ev=o.evaluated_get(dg);me=ev.to_mesh();after=[v.co.copy() for v in me.vertices];ev.to_mesh_clear();o.shape_key_remove(temp)
key=o.shape_key_add(name='SoftRoundMouth');count=0;maximum=0
for v in o.data.vertices:
 x,y,z=v.co
 if x>-.39 or abs(y+.035)>.082 or w(v)<.001:continue
 gap,line=interpolate(y)
 if z>line+.002 or z<line-.055:continue
 t=max(0,min(1,(z-(line-.055))/.035));t=t*t*(3-2*t)
 derivative=(after[v.index].z-before[v.index].z)/eps
 if derivative<.4:continue
 delta=min(.025,gap*t/derivative)
 if delta>.00001:key.data[v.index].co.z+=delta;count+=1;maximum=max(maximum,delta)
for frame,val in [(1,0),(12,.28),(20,1),(30,1),(38,0)]:key.value=val;key.keyframe_insert(data_path='value',frame=frame)
print('CORRECTED',count,'max',maximum,'sourcepairs',len(ys),flush=True)
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-workflow-ellipse-weld.blend')
