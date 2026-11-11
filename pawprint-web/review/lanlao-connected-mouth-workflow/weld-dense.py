import bpy,bmesh
from mathutils import Vector
from collections import defaultdict,Counter
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-workflow-dense-cut.blend')
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
mat=bpy.data.materials.new('Deep oral surface');mat.use_nodes=True;p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.085,.022,.028,1);p.inputs['Roughness'].default_value=.85;o.data.materials.append(mat);mi=len(o.data.materials)-1
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;o.active_shape_key_index=0;bpy.ops.object.mode_set(mode='EDIT')
bm=bmesh.from_edit_mesh(o.data);bm.verts.ensure_lookup_table();dform=bm.verts.layers.deform.verify()
path=[(-0.3762, -0.11219, 0.57148), (-0.38515, -0.1141, 0.57148), (-0.3941, -0.11602, 0.57148), (-0.40177, -0.11602, 0.57402), (-0.40944, -0.11602, 0.57656), (-0.41711, -0.11602, 0.57911), (-0.42543, -0.11027, 0.58039), (-0.43374, -0.10452, 0.58167), (-0.43565, -0.10004, 0.57913), (-0.43565, -0.09428, 0.5785), (-0.43565, -0.08853, 0.57787), (-0.43565, -0.08278, 0.57721), (-0.44268, -0.07639, 0.57787), (-0.44778, -0.06999, 0.58043), (-0.45289, -0.0636, 0.58299), (-0.45353, -0.05913, 0.57978), (-0.45865, -0.05338, 0.58232), (-0.45929, -0.0489, 0.57911), (-0.45993, -0.04507, 0.57783), (-0.46057, -0.04123, 0.57654), (-0.46121, -0.0374, 0.57526), (-0.46057, -0.03228, 0.57591), (-0.45993, -0.02717, 0.57656), (-0.45929, -0.02205, 0.57721), (-0.45865, -0.01758, 0.57913), (-0.45801, -0.0131, 0.58104), (-0.45737, -0.00863, 0.58295), (-0.45162, -0.00224, 0.58039), (-0.44587, 0.00415, 0.57783), (-0.44012, 0.01055, 0.57526), (-0.44077, 0.01566, 0.57591), (-0.44141, 0.02077, 0.57656), (-0.43565, 0.02781, 0.57402), (-0.43501, 0.03292, 0.5753), (-0.42797, 0.03995, 0.57339), (-0.42093, 0.04698, 0.57148), (-0.41263, 0.04826, 0.57083), (-0.40433, 0.04954, 0.57018), (-0.39603, 0.05082, 0.56952), (-0.38772, 0.05082, 0.57018), (-0.3794, 0.05082, 0.57083), (-0.37109, 0.05082, 0.57148)]
edgekeys={tuple(sorted((a,b))) for a,b in zip(path,path[1:])};seams=defaultdict(list)
def kp(v):return tuple(round(float(n),5) for n in v.co)
for e in bm.edges:
 if len(e.link_faces)==1:
  key=tuple(sorted(kp(v) for v in e.verts))
  if key in edgekeys:seams[key].append(e)
pairs=[v for v in seams.values() if len(v)==2];cache={};made=0;errors=[]
def inset(v):
 if v in cache:return cache[v]
 # Copy each vertex's native UV-split identity and all original shape-key offsets.
 n=bm.verts.new(v.co+Vector((0.020,0,0)));offset=n.co-v.co
 for shape in bm.verts.layers.shape.values():n[shape]=v[shape]+offset
 for group,weight in v[dform].items():n[dform][group]=weight
 cache[v]=n;return n
for pair in pairs:
 for e in pair:e.smooth=False
 a=sorted(pair[0].verts,key=kp);b=sorted(pair[1].verts,key=kp)
 ai=[inset(v) for v in a];bi=[inset(v) for v in b]
 for vs in [(a[0],a[1],ai[1],ai[0]),(b[1],b[0],bi[0],bi[1]),(ai[0],ai[1],bi[1],bi[0])]:
  try:
   f=bm.faces.new(vs);f.material_index=mi;f.smooth=True;made+=1
  except ValueError as exc:errors.append(str(exc))
print('pairs',len(pairs),'edgecounts',Counter(len(v) for v in seams.values()),'faces',made,'errors',len(errors),'newvertices',len(cache),flush=True)
for shape in bm.verts.layers.shape.values():print('KEYOFFSET',shape.name,max(((n[shape]-n.co)-(v[shape]-v.co)).length for v,n in cache.items()),flush=True)
bmesh.update_edit_mesh(o.data,loop_triangles=True,destructive=True);bpy.ops.object.mode_set(mode='OBJECT')
print('MESH',len(o.data.vertices),'keys',[(k.name,len(k.data)) for k in o.data.shape_keys.key_blocks],flush=True)
bpy.context.scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-workflow-dense-weld.blend')
