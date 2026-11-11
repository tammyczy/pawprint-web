import bpy,bmesh,math
from mathutils import Vector,Matrix
from pathlib import Path
root=Path('/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web')
bpy.ops.wm.open_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-tongue-contour-iter/base.blend')
s=bpy.context.scene;s.frame_set(20);bpy.context.view_layer.update()
o=next(x for x in s.objects if x.type=='MESH' and len(x.data.vertices)>20000);arm=next(x for x in s.objects if x.type=='ARMATURE')
old=bpy.data.objects['Tongue'];old.hide_render=True;old.hide_viewport=True
jaw=o.vertex_groups['Lower_Jaw'].index;chest=o.vertex_groups['Chest'].index

def deform(n):return arm.matrix_world@arm.pose.bones[n].matrix@arm.data.bones[n].matrix_local.inverted()
Mj=deform('Lower_Jaw');Mc=deform('Chest');M=Matrix([[.87*Mj[i][j]+.13*Mc[i][j] for j in range(4)] for i in range(4)]);inv=M.inverted()
bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();bm.faces.ensure_lookup_table(); orig=len(bm.verts)
wanted=[{23980,25195,25240,25241},{25195,25194,25254,25240},{23980,23981,25230,25241}]
sel=[f for f in bm.faces if set(v.index for v in f.verts) in wanted]
assert len(sel)==3, len(sel)
edge_counts={}
for f in sel:
 for e in f.edges:edge_counts[e]=edge_counts.get(e,0)+1
edges=[e for e,n in edge_counts.items() if n==1]
adj={}
for e in edges:
 a,b=e.verts;adj.setdefault(a,[]).append(b);adj.setdefault(b,[]).append(a)
assert all(len(v)==2 for v in adj.values()),[len(x) for x in adj.values()]
first=next(iter(adj));loop=[first];prev=None;cur=first
while True:
 nxt=next(v for v in adj[cur] if v!=prev)
 if nxt==first:break
 assert nxt not in loop
 loop.append(nxt);prev,cur=cur,nxt
assert len(loop)==len(adj)
bmesh.ops.delete(bm,geom=sel,context='FACES_ONLY')
keys=list(bm.verts.layers.shape);dl=bm.verts.layers.deform.verify();vs=[];world=[]
for k in range(17):
 t=k/16;tip=max(0,(t-.48)/.52);w=.017*(.75+.25*math.sin(math.pi*t))*max(.001,1-tip*tip)**.20
 cx=-.440-.03485*(1-math.exp(-4*t))/(1-math.exp(-4));z=.568-.02223*(max(0,(t-.25)/.75)**1.3);thick=(.004+.002*math.sin(math.pi*t))*math.sqrt(max(.45,1-tip*tip))
 for j in range(12):
  a=2*math.pi*j/12;vworld=Vector((cx,-.035+w*math.cos(a),z+thick*math.sin(a)));pos=inv@vworld
  v=bm.verts.new(pos);v[dl][jaw]=.87;v[dl][chest]=.13
  for layer in keys:v[layer]=pos
  vs.append(v);world.append(vworld)
mat=bpy.data.materials.new('Tongue and mouth floor');mat.diffuse_color=(.36,.085,.095,1);mat.use_nodes=True
p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.36,.085,.095,1);p.inputs['Roughness'].default_value=.58
if p.inputs.get('Subsurface Weight'):p.inputs['Subsurface Weight'].default_value=.1
o.data.materials.append(mat);mi=len(o.data.materials)-1
for k in range(16):
 for j in range(12):
  a=k*12+j;b=k*12+(j+1)%12;f=bm.faces.new((vs[a],vs[b],vs[b+12],vs[a+12]));f.material_index=mi;f.smooth=True
f=bm.faces.new(tuple(vs[16*12+j] for j in range(12)));f.material_index=mi;f.smooth=True
# Find alignment of actual perimeter to tongue root based on posed positions.
def evalpos(v):
 d=v[dl];wj=d.get(jaw,0);wc=d.get(chest,0);wh=d.get(o.vertex_groups['Head'].index,0)
 mats={'j':Mj,'c':Mc,'h':deform('Head')}; return (mats['j']@v.co)*wj+(mats['c']@v.co)*wc+(mats['h']@v.co)*wh
best=None;n=len(loop);m=12
for reverse in (False,True):
 for off in range(m):
  seq=[vs[((-j if reverse else j)+off)%m] for j in range(m)]
  coords=[world[((-j if reverse else j)+off)%m] for j in range(m)]
  score=sum((evalpos(loop[i])-coords[round(i*m/n)%m]).length for i in range(n))
  if best is None or score<best[0]:best=(score,seq)
ring=best[1];i=j=0
while i<n or j<m:
 a=loop[i%n];b=ring[j%m]
 if i<n and (j==m or (i+1)/n <= (j+1)/m):
  f=bm.faces.new((a,loop[(i+1)%n],b));i+=1
 else:
  f=bm.faces.new((a,ring[(j+1)%m],b));j+=1
 f.material_index=mi;f.smooth=True
bm.to_mesh(o.data);bm.free();o.data.update()
key=o.shape_key_add(name='Tongue_retract',from_mix=False);inside=inv@Vector((-.435,-.035,.563))
for idx in range(orig,len(o.data.vertices)):key.data[idx].co=inside+(key.data[idx].co-inside)*.035
for frame,val in [(1,1),(11,.9),(20,0),(30,0),(38,1)]:key.value=val;key.keyframe_insert('value',frame=frame)
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(root/'review/lanlao-tongue-contour-iter/preview.blend'))
print('SOURCE',orig,'TONGUE',len(vs),'FLOORBOUNDARY',n,'MATCH',best[0],flush=True)
