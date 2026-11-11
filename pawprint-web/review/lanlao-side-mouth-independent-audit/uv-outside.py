import bpy,collections
src='/private/tmp/lanlao-side-independent.blend';dst='/private/tmp/lanlao-side-surgery-clean.blend'
def inspect(path):
 bpy.ops.wm.open_mainfile(filepath=path);o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>25000);uv=o.data.uv_layers.active.data
 total=collections.Counter()
 for p in o.data.polygons:
  if p.material_index!=0:continue
  # protect only faces whose vertices all lie beyond expanded cut bounding box.
  vs=[o.data.vertices[i].co for i in p.vertices]
  overlap=any(-.475<v.x<-.375 and -.145<v.y<-.070 and .52<v.z<.61 for v in vs)
  if overlap:continue
  sig=tuple(sorted(tuple(round(x,5) for x in o.data.vertices[o.data.loops[i].vertex_index].co)+tuple(round(x,5) for x in uv[i].uv) for i in p.loop_indices));total[sig]+=1
 return total
old=inspect(src);new=inspect(dst);print('OUTSIDE_FACES',sum(old.values()),'MISSING_UV_GEOMETRY_FACES',sum((old-new).values()),flush=True)
