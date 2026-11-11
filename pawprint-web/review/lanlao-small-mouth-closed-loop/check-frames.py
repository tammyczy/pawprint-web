import bpy,bmesh
from collections import Counter
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-inner-thickness.blend')
o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>20000)
mi=next(i for i,m in enumerate(o.data.materials) if m and m.name.startswith('Welded mouth diagnostic'))
for frame in (1,8,12,16,20,30,35,38):
 bpy.context.scene.frame_set(frame);deps=bpy.context.evaluated_depsgraph_get();ev=o.evaluated_get(deps);mesh=ev.to_mesh();b=bmesh.new();b.from_mesh(mesh);fs={f for f in b.faces if f.material_index==mi};es={e for f in fs for e in f.edges}
 print('FRAME',frame,'mouthfaces',len(fs),'boundaries',sum(len(e.link_faces)==1 for e in es),'nonmanifold',sum(len(e.link_faces)>2 for e in es),'degenerate',sum(f.calc_area()<1e-10 for f in fs),'min_area',min(f.calc_area() for f in fs),flush=True)
 b.free();ev.to_mesh_clear()
