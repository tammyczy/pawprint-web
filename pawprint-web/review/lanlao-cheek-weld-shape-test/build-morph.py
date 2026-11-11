from pathlib import Path
HERE=Path(__file__).resolve().parent
import bpy
bpy.ops.wm.open_mainfile(filepath=str(HERE / 'welded.blend'))
scene=bpy.context.scene;body=next(o for o in scene.objects if o.type=='MESH' and len(o.data.vertices)>20000);lip=bpy.data.objects['LipEdgeContiguous']
counts=[0]*len(body.data.vertices);avgs=[0.0]*len(body.data.vertices)
for poly in body.data.polygons:
 z=sum(body.data.vertices[i].co.z for i in poly.vertices)/len(poly.vertices)
 for i in poly.vertices:counts[i]+=1;avgs[i]+=z

def smooth(x):
 x=max(0.,min(1.,x));return x*x*(3-2*x)
def side_offset(x,y,z):
 center=abs(y+.035);line=.579+.003*(min(1,center/.085)**2)
 if z>line+.00002:return 0
 xw=smooth((x+.47)/.02)*smooth((-.41-x)/.03)
 yw=smooth((center-.015)/.015)*smooth((.060-center)/.02)
 depth=smooth((z-(line-.085))/.055)
 return -.008*xw*yw*depth
for ob in [body,lip]:
 if not ob.data.shape_keys:ob.shape_key_add(name='Basis')
 sk=ob.shape_key_add(name='SideJawMorph')
 touched=0
 for v in ob.data.vertices:
  x,y,z=v.co; center=abs(y+.035);line=.579+.003*(min(1,center/.085)**2)
  if ob==body:
   lower=z<line-.00001 or (counts[v.index] and avgs[v.index]/counts[v.index]<line)
  else:lower=v.index%6>=3
  if not lower:continue
  d=side_offset(x,y,z)
  if abs(d)>1e-6:sk.data[v.index].co.z+=d;touched+=1
 for frame,val in [(1,0),(12,.28),(20,1),(30,1),(38,0)]:sk.value=val;sk.keyframe_insert(data_path='value',frame=frame)
 print('SHAPE',ob.name,touched,flush=True)
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'rebuild-nearmouth.blend'))
