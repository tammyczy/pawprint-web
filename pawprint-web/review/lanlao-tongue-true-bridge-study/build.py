import bpy,bmesh,math
from mathutils import Vector,Matrix
from pathlib import Path
root=Path('/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web')
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-oriented-mouth.blend')
s=bpy.context.scene;s.frame_set(20);bpy.context.view_layer.update()
o=next(x for x in s.objects if x.type=='MESH' and len(x.data.vertices)>20000)
arm=next(x for x in s.objects if x.type=='ARMATURE')
old_tongue=bpy.data.objects['Tongue'];old_tongue.hide_render=True;old_tongue.hide_viewport=True
jaw=o.vertex_groups['Lower_Jaw'].index;chest=o.vertex_groups['Chest'].index
# At this pose, invert the same weighted linear skin transform assigned to
# the added vertices. Existing mesh geometry and shape-key coordinates stay untouched.
def deform(bone):return arm.matrix_world @ arm.pose.bones[bone].matrix @ arm.data.bones[bone].matrix_local.inverted()
Mj=deform('Lower_Jaw');Mc=deform('Chest')
M=Matrix([[.87*Mj[i][j]+.13*Mc[i][j] for j in range(4)] for i in range(4)]); inv=M.inverted()
bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();bm.faces.ensure_lookup_table()
orig=len(bm.verts);keys=list(bm.verts.layers.shape);deform_layer=bm.verts.layers.deform.verify()
verts=[]
for k in range(17):
 t=k/16;tip=max(0,(t-.48)/.52)
 width=.017*(.75+.25*math.sin(math.pi*t))*max(.001,1-tip*tip)**.20
 cx=-.435-.047*t; z=.566-.002*t-.024*max(0,(t-.36)/.64)
 thick=(.004+.002*math.sin(math.pi*t))*math.sqrt(max(.02,1-tip*tip))
 for j in range(12):
  a=2*math.pi*j/12
  pos=inv@Vector((cx,-.035+width*math.cos(a),z+thick*math.sin(a)))
  v=bm.verts.new(pos);v[deform_layer][jaw]=.87;v[deform_layer][chest]=.13
  for layer in keys:v[layer]=pos
  verts.append(v)
bm.verts.index_update()
mat=bpy.data.materials.new('Natural tongue bridge');mat.diffuse_color=(.36,.085,.095,1);mat.use_nodes=True
p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.36,.085,.095,1);p.inputs['Roughness'].default_value=.56
if p.inputs.get('Subsurface Weight'):p.inputs['Subsurface Weight'].default_value=.15
o.data.materials.append(mat);mi=len(o.data.materials)-1
for k in range(16):
 for j in range(12):
  a=k*12+j;b=k*12+(j+1)%12
  f=bm.faces.new((verts[a],verts[b],verts[b+12],verts[a+12]));f.material_index=mi;f.smooth=True
f=bm.faces.new(tuple(verts[16*12+j] for j in range(12)));f.material_index=mi;f.smooth=True
# Share three existing lower inner-wall vertices with tongue root via a small
# strip, no hidden separate object. This is an experiment, not full retopology.
bm.verts.ensure_lookup_table()
anchors=[bm.verts[i] for i in (23744,23773,23776)]
# connect inner lip anchor sequence to the underside of the first tube ring.
for ids in [(anchors[0],anchors[1],verts[9],verts[10],verts[11]),(anchors[1],anchors[2],verts[7],verts[8],verts[9])]:
 try:f=bm.faces.new(ids);f.material_index=mi;f.smooth=True
 except ValueError:pass
bm.to_mesh(o.data);bm.free();o.data.update()
print('ORIGINAL',orig,'TOTAL',len(o.data.vertices),'KEYS',[(x.name,len(x.data)) for x in o.data.shape_keys.key_blocks],flush=True)
# Only the new tongue retracts; all preexisting geometry is identical in this key.
key=o.shape_key_add(name='Tongue_retract',from_mix=False)
inside=inv@Vector((-.425,-.035,.568))
for i in range(orig,len(o.data.vertices)):
 key.data[i].co=inside+(key.data[i].co-inside)*.035
for f,v in [(1,1),(11,.9),(20,0),(30,0),(38,1)]:key.value=v;key.keyframe_insert('value',frame=f)
s.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'review/lanlao-tongue-true-bridge-study/preview.blend'))
