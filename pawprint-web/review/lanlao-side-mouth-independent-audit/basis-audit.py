import bpy,bmesh,collections
src='/private/tmp/lanlao-side-thickness.blend';dst='/private/tmp/lanlao-side-weld-basis.blend'
def snap(path):
 bpy.ops.wm.open_mainfile(filepath=path);o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>25000);keys=list(o.data.shape_keys.key_blocks);c=collections.Counter();weights=collections.defaultdict(list);uv=o.data.uv_layers.active.data;faces=collections.Counter()
 for v in o.data.vertices:
  sig=tuple(round(q,5) for k in keys for q in k.data[v.index].co);c[sig]+=1;weights[sig].append(tuple(sorted((o.vertex_groups[g.group].name,round(g.weight,5)) for g in v.groups)))
 for p in o.data.polygons:
  if p.material_index!=0:continue
  sig=tuple(sorted(tuple(round(x,5) for x in o.data.vertices[o.data.loops[i].vertex_index].co)+tuple(round(x,5) for x in uv[i].uv) for i in p.loop_indices));faces[sig]+=1
 print('SNAP',path,'v',len(o.data.vertices),'f',len(o.data.polygons),'skin',sum(faces.values()),'keys',[k.name for k in keys],flush=True)
 return c,weights,faces,len(o.data.polygons)
a,aw,af,nf=snap(src);b,bw,bf,ng=snap(dst);print('BASE_MISSING',sum((a-b).values()),'WEIGHTS_MISSING',sum(sum((collections.Counter(aw[k])-collections.Counter(bw[k])).values()) for k in set(a)&set(b)),'SKIN_UV_FACES_MISSING',sum((af-bf).values()),'NEW_FACES',ng-nf,flush=True)
o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>25000);s=bpy.context.scene
for frame in [1,8,12,16,20,30,35,38]:
 s.frame_set(frame);deps=bpy.context.evaluated_depsgraph_get();ev=o.evaluated_get(deps);m=ev.to_mesh();bm=bmesh.new();bm.from_mesh(m);bm.faces.ensure_lookup_table();faces=[bm.faces[i] for i in range(nf,min(len(bm.faces),nf+93))];edges={e for f in faces for e in f.edges};print('FRAME',frame,'nfaces',len(faces),'boundary',sum(len(e.link_faces)==1 for e in edges),'nonmanifold',sum(len(e.link_faces)>2 for e in edges),'degenerate',sum(f.calc_area()<1e-10 for f in faces),flush=True);bm.free();ev.to_mesh_clear()
