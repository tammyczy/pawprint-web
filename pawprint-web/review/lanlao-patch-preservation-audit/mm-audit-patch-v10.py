import bpy,collections,json
S='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-hip-posture-review.blend'; C='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-patch-experiment/v10-normal.blend'
def R(v):return round(float(v),5)
def capture(path):
 bpy.ops.wm.open_mainfile(filepath=path)
 o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>20000); m=o.data; K=m.shape_keys.key_blocks
 def sig(v):return (tuple(R(c) for c in v.co),tuple((k.name,tuple(R(c) for c in k.data[v.index].co)) for k in K if k.name in ['Basis','Original_Coat_Sway','Original_Coat_Rebound']),tuple(sorted((o.vertex_groups[g.group].name,R(g.weight)) for g in v.groups)))
 sigs=collections.Counter(sig(v) for v in m.vertices)
 uv=m.uv_layers.active.data
 def face_sig(p):return (p.material_index,tuple(sorted((tuple(R(x) for x in m.vertices[m.loops[li].vertex_index].co),tuple(R(x) for x in uv[li].uv)) for li in p.loop_indices)))
 faces=collections.Counter()
 for p in m.polygons:
  c=sum((m.vertices[i].co for i in p.vertices),__import__('mathutils').Vector())/len(p.vertices)
  if not(c.x<-.38 and abs(c.y+.035)<.055 and .54<c.z<.62): faces[face_sig(p)]+=1
 return dict(v=len(m.vertices), f=len(m.polygons), keys=[k.name for k in K],sigs=sigs,faces=faces)
a=capture(S);b=capture(C)
print('STATS',json.dumps({'source_vertices':a['v'],'candidate_vertices':b['v'],'source_faces':a['f'],'candidate_faces':b['f'],'source_keys':a['keys'],'candidate_keys':b['keys'],'unmatched_original_vertex_signatures':sum((a['sigs']-b['sigs']).values()),'unmatched_faces_outside_patch':sum((a['faces']-b['faces']).values())}),flush=True)
