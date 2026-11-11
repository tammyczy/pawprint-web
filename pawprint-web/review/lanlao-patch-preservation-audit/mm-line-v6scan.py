import bpy, collections
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-patch-v6.blend');s=bpy.context.scene;s.frame_set(1);bpy.context.view_layer.update();d=bpy.context.evaluated_depsgraph_get();o=next(o for o in s.objects if o.type=='MESH' and len(o.data.vertices)>20000);ev=o.evaluated_get(d);m=ev.to_mesh();facemat={p.index:m.materials[p.material_index].name for p in m.polygons}
pos=Vector((-3,0,.65));tar=Vector((-.35,0,.65));q=(tar-pos).to_track_quat('-Z','Y');r=q@Vector((1,0,0));u=q@Vector((0,1,0));v=(tar-pos).normalized();results=collections.Counter();examples={}
for y in range(374,381):
 for x in range(285,391):
  org=pos+r*((x-300)/600*.55)+u*((300-y)/600*.55);ok,where,n,idx,obj,mt=s.ray_cast(d,org,v,distance=5)
  label='MISS' if not ok else facemat.get(idx,'OTHER') if obj==o else obj.name
  results[label]+=1;examples.setdefault(label,(x,y,idx,tuple(round(k,5) for k in where)))
for k,v in results.items():print(k,v,examples[k],flush=True)
ev.to_mesh_clear()
