import bpy,bmesh
from collections import defaultdict,Counter,deque
bpy.ops.wm.open_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-complete-lip-ring-study/preview.blend')
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000);bm=bmesh.new();bm.from_mesh(o.data);d=defaultdict(list)
def on(v):
 y=v.co.y+.035; line=.579+.003*(min(1,abs(y)/.085)**2)
 return abs(v.co.z-line)<.0002 and abs(y)<.086 and v.co.x<-.29
for e in bm.edges:
 if len(e.link_faces)==1 and all(on(v) for v in e.verts): d[tuple(sorted(tuple(round(z,5) for z in v.co) for v in e.verts))].append(e)
g=defaultdict(set)
for pts,es in d.items():
 if len(es)>=2:g[pts[0]].add(pts[1]);g[pts[1]].add(pts[0])
print('GRAPH vertices',len(g),'degrees',Counter(len(v) for v in g.values()),flush=True)
seen=set()
for p in g:
 if p in seen:continue
 q=[p];seen.add(p); comp=[]
 while q:
  cur=q.pop();comp.append(cur)
  for n in g[cur]:
   if n not in seen:seen.add(n);q.append(n)
 print('COMP',len(comp),'END',[(p,len(g[p])) for p in comp if len(g[p])!=2],flush=True)
 print('POINTS',comp,flush=True)
