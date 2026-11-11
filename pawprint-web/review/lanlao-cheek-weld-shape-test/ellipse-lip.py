from pathlib import Path
HERE=Path(__file__).resolve().parent
import bpy,math
bpy.ops.wm.open_mainfile(filepath=str(HERE / 'welded.blend'));scene=bpy.context.scene
body=next(o for o in scene.objects if o.type=='MESH' and len(o.data.vertices)>20000);lip=bpy.data.objects['LipEdgeContiguous']
counts=[0]*len(body.data.vertices);avgs=[0.0]*len(body.data.vertices)
for poly in body.data.polygons:
 z=sum(body.data.vertices[i].co.z for i in poly.vertices)/len(poly.vertices)
 for i in poly.vertices:counts[i]+=1;avgs[i]+=z

def smooth(x):x=max(0.,min(1.,x));return x*x*(3-2*x)
def correction(ob,v):
 x,y,z=v.co;r=abs(y+.035);line=.579+.003*(min(1,r/.085)**2)
 if r>=.0315 or z>line+.00002:return 0
 try:w=ob.vertex_groups['Lower_Jaw'].weight(v.index)
 except RuntimeError:w=0
 desired=.023*math.sqrt(max(0,1-(r/.0315)**2))
 current=.02625*w
 xgate=smooth((-.42-x)/.03);depth=smooth((z-(line-.07))/.05)
 return (current-desired)*xgate*depth
for ob in [body,lip]:
 if not ob.data.shape_keys:ob.shape_key_add(name='Basis')
 sk=ob.shape_key_add(name='RoundedMouthCorrective');touched=0
 for v in ob.data.vertices:
  r=abs(v.co.y+.035);line=.579+.003*(min(1,r/.085)**2)
  lower=(v.co.z<line-.00001 or counts[v.index] and avgs[v.index]/counts[v.index]<line) if ob==body else v.index%6>=3
  if not lower:continue
  delta=correction(ob,v)
  if abs(delta)>1e-6:sk.data[v.index].co.z+=delta;touched+=1
 for f,val in [(1,0),(12,.28),(20,1),(30,1),(38,0)]:sk.value=val;sk.keyframe_insert(data_path='value',frame=f)
 print('MORPH',ob.name,touched,flush=True)
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'rebuild-ellipse.blend'))
