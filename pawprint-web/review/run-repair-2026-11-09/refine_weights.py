"""Seam-preserving, bounded four-influence skin refinement over runtime poses.
Run using Blender's bundled numpy; only patches existing WEIGHTS_0 bytes.
"""
import json, struct, pathlib, numpy as np, time
root=pathlib.Path('/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web')
out=root/'review/run-repair-2026-11-09'
source=root/'public/models/lanlao-rig-hip-refined.glb'
raw=source.read_bytes(); size=struct.unpack_from('<I',raw,12)[0]
gltf=json.loads(raw[20:20+size]); binary=20+size+8
primitive=gltf['meshes'][0]['primitives'][0]
def accessor(index):
 a=gltf['accessors'][index]; v=gltf['bufferViews'][a['bufferView']]
 dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
 components={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 start=binary+v.get('byteOffset',0)+a.get('byteOffset',0); stride=v.get('byteStride',np.dtype(dtype).itemsize*components)
 return np.ndarray((a['count'],components),dtype=dtype,buffer=raw,offset=start,strides=(stride,np.dtype(dtype).itemsize)).copy(),start,stride
pos,_,_=accessor(primitive['attributes']['POSITION'])
packed,start,stride=accessor(primitive['attributes']['WEIGHTS_0'])
ids,_,_=accessor(primitive['attributes']['JOINTS_0'])
tri,_,_=accessor(primitive['indices']);tri=tri.reshape(-1,3)
names=[gltf['nodes'][j]['name'] for j in gltf['skins'][0]['joints']]
original=packed.astype(np.float64)/packed.sum(axis=1,keepdims=True)
edges=np.sort(np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]]),axis=1)
edges=np.unique(edges,axis=0); lengths=np.linalg.norm(pos[edges[:,0]]-pos[edges[:,1]],axis=1)
use=lengths>.001;edges=edges[use];lengths=lengths[use]
def band(x,a,b,c,d):return np.minimum(1,np.maximum(0,np.minimum((x-a)/(b-a),(d-x)/(d-c))))
mask=band(pos[:,0],-.48,-.29,.35,.47)*band(pos[:,1],.10,.19,.48,.58)
groups={}
for i,p in enumerate(pos):groups.setdefault(tuple(p),[]).append(i)
seams=[np.array(v) for v in groups.values() if len(v)>1]
for group in seams:
 assert np.all(ids[group]==ids[group[0]]),'seam joint order differs'
data=json.loads((out/'poses.json').read_text())
rest=np.array([data['rest'][n] for n in names]).reshape(-1,4,4).transpose(0,2,1)
inverse=np.linalg.inv(rest); hom=np.c_[pos,np.ones(len(pos))]
motion=[];labels=[]
for i,frame in enumerate(data['frames']):
 if i%3 and frame['label'] not in ['sit','lie','stand']:continue
 pose=np.array([frame['bones'][n] for n in names]).reshape(-1,4,4).transpose(0,2,1)
 matrices=pose@inverse
 motion.append(np.einsum('nkij,nj->nki',matrices[ids],hom)[:,:,:3]);labels.append(frame['label'])
motion=np.array(motion)
a,b=edges.T
active=(mask[a]+mask[b])>0
aa,bb,ll=a[active],b[active],lengths[active]
original_lengths=[]
for transforms in motion:
 points=np.einsum('nkj,nk->nj',transforms,original)
 original_lengths.append(np.linalg.norm(points[aa]-points[bb],axis=1))
def score(weights):
 result={}
 for transforms,label in zip(motion,labels):
  points=np.einsum('nkj,nk->nj',transforms,weights)
  ratios=np.linalg.norm(points[a]-points[b],axis=1)/lengths
  region=(mask[a]+mask[b])>0
  value=result.setdefault(label,{'max':0.,'over2':0,'rmsStrain':0.})
  value['max']=max(value['max'],float(ratios[region].max()))
  value['over2']=max(value['over2'],int(np.sum(ratios[region]>2)))
  value['rmsStrain']=max(value['rmsStrain'],float(np.sqrt(np.mean((ratios[region]-1)**2))))
 return result
def project(weights):
 ordered=np.sort(weights,axis=1)[:,::-1]
 t=(np.cumsum(ordered,axis=1)-1)/np.arange(1,5)
 count=np.sum(ordered>t,axis=1)-1
 return np.maximum(0,weights-t[np.arange(len(weights)),count,None])
current=original.copy();results={'baseline':score(current)}
print('BASELINE',json.dumps(results['baseline']),flush=True)
for iteration in range(1,241):
 gradient=(current-original)*.12
 for pose_index,transforms in enumerate(motion):
  points=np.einsum('nkj,nk->nj',transforms,current)
  difference=points[aa]-points[bb]; length=np.linalg.norm(difference,axis=1)
  error=np.maximum(0,length-1.35*ll)+.3*np.minimum(0,length-.65*ll)
  # Do not buy a better run by moving a severe crease into a resting pose.
  if labels[pose_index] in ['sit','lie','stand']:
   error+=12*np.maximum(0,length-np.maximum(1.8*ll,original_lengths[pose_index]))
  direction=difference*(2*error/np.maximum(.00001,length)/np.maximum(.004,ll)/len(motion))[:,None]
  ga=np.einsum('nj,nkj->nk',direction,transforms[aa]);gb=-np.einsum('nj,nkj->nk',direction,transforms[bb])
  for k in range(4):gradient[:,k]+=np.bincount(aa,ga[:,k],minlength=len(pos))+np.bincount(bb,gb[:,k],minlength=len(pos))
 for group in seams:gradient[group]=gradient[group].mean(axis=0)
 update=project(current-.018*gradient*mask[:,None])
 # Preserve the established shape and the original four joint assignments.
 current=project(np.clip(update,original-.20*mask[:,None],original+.20*mask[:,None]))
 if iteration in [20,40,80,160,240]:
  result=bytearray(raw)
  weights=current*packed.sum(axis=1,keepdims=True)
  for i,row in enumerate(weights):struct.pack_into('<4f',result,start+i*stride,*row)
  output=pathlib.Path(f'/private/tmp/lanlao-motion-weights-{iteration}.glb');output.write_bytes(result)
  results[str(iteration)]=score(current)
  print('ITERATION',iteration,json.dumps(results[str(iteration)]),'maxChange',float(np.max(np.abs(current-original))),flush=True)
(out/'weight-comparison.json').write_text(json.dumps(results,indent=2)+'\n')
print('DONE',flush=True)
