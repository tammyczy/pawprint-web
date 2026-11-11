import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
base='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-hip-posture-review.blend'
bpy.ops.wm.open_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-patch-experiment/v10-droop.blend');s=bpy.context.scene;s.frame_set(1);o=next(o for o in s.objects if o.type=='MESH' and len(o.data.vertices)>20000); m=o.data
with bpy.data.libraries.load(base,link=False) as (src,dst):
 dst.objects=[name for name in src.objects if name=='meshes[0].001']
ref=dst.objects[0];rm=ref.data;rm.calc_loop_triangles();co=[v.co.copy() for v in rm.vertices];tris=[tuple(t.vertices) for t in rm.loop_triangles];bvh=BVHTree.FromPolygons(co,tris,all_triangles=True)
for r in [rm,m]:r.update()
cn=list(m.corner_normals);rn=list(rm.corner_normals);norms=[c.vector[:] for c in cn];count=0;distances=[]
for p in m.polygons:
 if m.materials[p.material_index].name!='Locally projected muzzle':continue
 for li in p.loop_indices:
  v=m.vertices[m.loops[li].vertex_index];closest,normal,idx,dist=bvh.find_nearest(v.co); t=rm.loop_triangles[idx];tri=tris[idx];tri_co=[co[k] for k in tri];tri_n=[rn[k].vector.copy() for k in t.loops]
  n=barycentric_transform(closest,*tri_co,*tri_n)
  if n.length<1e-6:n=normal
  else:n.normalize()
  norms[li]=n[:];count+=1;distances.append(dist)
m.normals_split_custom_set(norms);m.update();print('PATCH LOOPS',count,'max nearest',max(distances),'avg',sum(distances)/len(distances),flush=True)
bpy.ops.wm.save_as_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-patch-experiment/rebuild-v10-normal.blend')
