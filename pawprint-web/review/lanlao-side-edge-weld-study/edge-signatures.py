import bpy,bmesh,collections
for p in ['/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-side-edge-weld-study/weld-basis.blend','/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-side-edge-weld-study/split-wide.blend']:
 bpy.ops.wm.open_mainfile(filepath=p);o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>25000);bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();deform=bm.verts.layers.deform.verify();shapes=list(bm.verts.layers.shape)
 es=[e for e in bm.edges if len(e.link_faces)==1 and all(-.46<v.co.x<-.38 and -.13<v.co.y<-.08 and .55<v.co.z<.60 for v in e.verts)];dic=collections.defaultdict(list)
 for e in es:
  geo=tuple(sorted(tuple(round(float(n),5) for n in v.co) for v in e.verts));dic[geo].append(e)
 def signature(v):
  wg=tuple(sorted((int(k),round(float(w),6)) for k,w in v[deform].items() if abs(w)>1e-9));sh=tuple(tuple(round(float(x),6) for x in v[k]-v.co) for k in shapes);return wg,sh
 def edge_sig(e):return tuple(signature(v) for v in sorted(e.verts,key=lambda x:tuple(round(float(n),5) for n in x.co)))
 c=collections.Counter()
 for geom,edges in dic.items():
  sigs=collections.Counter(edge_sig(e) for e in edges)
  c[(len(edges),len(sigs),tuple(sorted(sigs.values())))]+=1
  if len(edges)>2 or len(sigs)>1:print('MULTI',p,'GEO',geom,'EDGES',len(edges),'SIGFREQ',sorted(sigs.values()),flush=True)
 print('MODEL',p,'TOTAL',len(es),'GROUPS',len(dic),'CATEGORIES',c,flush=True)
