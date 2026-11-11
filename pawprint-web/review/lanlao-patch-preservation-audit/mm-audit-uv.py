import bpy
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-replaced-patch-v2.blend');o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>23000);m=o.data;uv=m.uv_layers.active.data
# Faces with at least one vertex beyond source's original vertex count.
patch=[p for p in m.polygons if p.material_index==0 and any(i>=23504 for i in p.vertices)]
vals=[]
for p in patch:
 loops=list(p.loop_indices)
 for li,lj in zip(loops,loops[1:]+loops[:1]):
  a,b=m.loops[li],m.loops[lj];geo=(m.vertices[a.vertex_index].co-m.vertices[b.vertex_index].co).length;uvlen=(uv[li].uv-uv[lj].uv).length
  vals.append((uvlen,geo,p.index))
print('patch faces',len(patch),'edges',len(vals),'uv_edge_gt_0.10',sum(u>.1 for u,g,_ in vals),'uv_edge_gt_0.25',sum(u>.25 for u,g,_ in vals),flush=True)
for uvlen,g,i in sorted(vals,reverse=True)[:12]:print('FACE',i,'UV',round(uvlen,4),'GEO',round(g,5),flush=True)
