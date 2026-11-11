import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
orig='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-hip-posture-review.blend'
cand='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-patch-experiment/v7-connected-tongue.blend'
bpy.ops.wm.open_mainfile(filepath=orig);o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)==23504);m=o.data;m.calc_loop_triangles();xyz=[v.co.copy() for v in m.vertices];tri=[tuple(t.vertices) for t in m.loop_triangles];norm=[[m.corner_normals[i].vector.copy() for i in t.loops] for t in m.loop_triangles];bv=BVHTree.FromPolygons(xyz,tri,all_triangles=True)
bpy.ops.wm.open_mainfile(filepath=cand);o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>20000);m=o.data;m.update();base=[n.vector.copy() for n in m.corner_normals];changed=0
for p in m.polygons:
 if p.material_index!=1:continue
 for li in p.loop_indices:
  v=m.vertices[m.loops[li].vertex_index].co;hit=bv.ray_cast(Vector((-1,v.y,v.z)),Vector((1,0,0)),2)
  if hit[0] is None:continue
  i=hit[2];vs=[xyz[k] for k in tri[i]];n=barycentric_transform(hit[0],*vs,*norm[i]);
  if n.length<.1:continue
  base[li]=n.normalized();changed+=1
m.normals_split_custom_set(base);print('set patch loop normals',changed,flush=True);bpy.context.scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-patch-v8-normals.blend')
