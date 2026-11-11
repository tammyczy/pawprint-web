import bpy,bmesh,math
from collections import defaultdict
bpy.ops.wm.open_mainfile(filepath='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-complete-lip-ring-study/preview.blend')
for n in ['ConnectedMouth']:
 ob=bpy.data.objects.get(n)
 if ob:bpy.data.objects.remove(ob,do_unlink=True)
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
print('original verts',len(o.data.vertices),'keys',[k.name for k in o.data.shape_keys.key_blocks],flush=True)
mat=bpy.data.materials.new('Welded mouth diagnostic');mat.use_nodes=True;p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.12,.035,.045,1);p.inputs['Roughness'].default_value=.85
o.data.materials.append(mat);mi=len(o.data.materials)-1
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;o.active_shape_key_index=0;bpy.ops.object.mode_set(mode='EDIT')
bm=bmesh.from_edit_mesh(o.data);bm.verts.ensure_lookup_table()
def on(v):
 y=v.co.y+.035;line=.579+.003*(min(1,abs(y)/.085)**2)
 return abs(v.co.z-line)<.0002 and abs(y)<.086 and v.co.x<-.29
def key(v):return tuple(round(z,5) for z in v.co)
seams=defaultdict(list)
for e in bm.edges:
 if len(e.link_faces)==1 and all(on(v) for v in e.verts):seams[tuple(sorted(key(v) for v in e.verts))].append(e)
dform=bm.verts.layers.deform.verify();jawidx=o.vertex_groups['Lower_Jaw'].index
pairs=[p for p in seams.values() if len(p)==2 and max(v[dform].get(jawidx,0) for e in p for v in e.verts)>.08 and all(v.co.x<-.405 for e in p for v in e.verts)]
print('pairs',len(pairs),'single',sum(len(v)==1 for v in seams.values()),'multiples',sum(len(v)>2 for v in seams.values()),flush=True)
cache={}
def inset(v):
 if v in cache:return cache[v]
 p=v.co.copy();p.x+=.02
 n=bm.verts.new(p)
 for group,weight in v[dform].items(): n[dform][group]=weight
 cache[v]=n;return n
made=0
for pair in pairs:
 a=sorted(pair[0].verts,key=key);b=sorted(pair[1].verts,key=key)
 try:
  ai=[inset(v) for v in a];bi=[inset(v) for v in b]
  for vs in ([a[0],a[1],ai[1],ai[0]],[b[1],b[0],bi[0],bi[1]],[ai[0],ai[1],bi[1],bi[0]]):

   if len(set(vs))<4: continue
   f=bm.faces.new(vs);f.material_index=mi;f.smooth=True;made+=1
 except ValueError as ex:print('face error',str(ex),flush=True)
print('faces added',made,'new vertices',len(cache),'shared-source',sum(len(e.link_faces)>=2 for pair in pairs for e in pair),'of',len(pairs)*2,flush=True)
bmesh.update_edit_mesh(o.data,loop_triangles=True,destructive=True);bpy.ops.object.mode_set(mode='OBJECT')
print('result verts',len(o.data.vertices),'key lengths',[(k.name,len(k.data)) for k in o.data.shape_keys.key_blocks],flush=True)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-welded-front.blend')
