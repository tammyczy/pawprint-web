import bpy,math,collections,heapq
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-workflow-local-subdiv.blend')
body=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>25000)
def key(v): return tuple(round(float(x),5) for x in v.co)
coordinates={}; groups=collections.defaultdict(list)
for v in body.data.vertices:
 x,y,z=v.co
 if -.49<x<-.29 and -.14<y<.07 and .54<z<.64:
  p=key(v);coordinates[p]=v.co.copy();groups[p].append(v.index)
graph=collections.defaultdict(set)
for e in body.data.edges:
 v,w=(body.data.vertices[i] for i in e.vertices);a,b=key(v),key(w)
 if a in coordinates and b in coordinates and a!=b:graph[a].add(b);graph[b].add(a)
print('VERTS',len(coordinates),'GRAPH',len(graph))
def choose(t):
 return min(graph,key=lambda p:((p[0]-t[0])**2+(p[1]-t[1])**2+(p[2]-t[2])**2))
L=choose((-.375,-.1,.594)); C=choose((-.458,-.035,.579));R=choose((-.375,.03,.594))
print('chosen L C R',L,C,R)
def penalty(p):
 x,y,z=p; target=.579+.14*max(0,min(.12,x+.46))
 return 1+1000*(z-target)**2+20*max(0,x+.34)**2

def path(start,end):
 q=[(0,start)];dist={start:0};prev={}
 while q:
  d,p=heapq.heappop(q)
  if d!=dist[p]:continue
  if p==end: break
  for n in graph[p]:
   step=math.dist(p,n)*(penalty(p)+penalty(n))/2
   nd=d+step
   if nd<dist.get(n,float('inf')):dist[n]=nd;prev[n]=p;heapq.heappush(q,(nd,n))
 if end not in dist:print('DISCONNECTED');return []
 out=[end]
 while out[-1]!=start:out.append(prev[out[-1]])
 return list(reversed(out))
p=path(L,C)+path(C,R)[1:]; print('PATH N',len(p),'duplicates',len(p)-len(set(p)))
print('PATH',p)
