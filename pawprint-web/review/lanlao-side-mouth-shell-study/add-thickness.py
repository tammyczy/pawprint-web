import bpy,collections
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-side-surgery-clean.blend');s=bpy.context.scene;s.frame_set(1);o=bpy.data.objects['Side_Oral_Lining'];jaw=o.vertex_groups['Lower_Jaw'].index
w=lambda v:next((g.weight for g in v.groups if g.group==jaw),0)
groups=collections.defaultdict(list)
for v in o.data.vertices:groups[tuple(round(float(n),6) for n in v.co)].append(v.index)
ids=[]
for co,inds in groups.items():
 if len(inds)<2:continue
 lo=min(w(o.data.vertices[i]) for i in inds);hi=max(w(o.data.vertices[i]) for i in inds)
 if hi-lo<.005:continue
 # Only the inner copies; outer copies must remain on the actual fur seam.
 # Our inner lining sits +.012 in Y from the corresponding external seam.
 if not any(abs(other[0]-co[0])<1e-5 and abs(other[1]-(co[1]-.012))<1e-5 and abs(other[2]-co[2])<1e-5 for other in groups):continue
 for i in inds:
  if w(o.data.vertices[i])>lo+(hi-lo)*.5:ids.append(i)
for i in set(ids):
 for key in o.data.shape_keys.key_blocks:key.data[i].co.z-=.0003
print('OFFSET_INNER_LOWER',len(set(ids)),flush=True)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-side-thickness.blend')
