import bpy,math
from mathutils import Vector
f='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-patch-experiment/v4.blend'
bpy.ops.wm.open_mainfile(filepath=f); scene=bpy.context.scene
o=next(o for o in scene.objects if o.type=='MESH' and len(o.data.vertices)>20000);arm=next(o for o in scene.objects if o.type=='ARMATURE')
base=o.data.shape_keys.key_blocks['Basis'];key=o.shape_key_add(name='MouthClosedSeal',from_mix=False);changed=0
# The original seam is a 0.0009-unit opening in rest pose. Compress only added local inner lip vertices.
for v in o.data.vertices:
 c=base.data[v.index].co
 if v.index>=23504 and c.x<-.42 and abs(c.y+.035)<.033 and abs(c.z-.579)<.0005:
  key.data[v.index].co.z=.579+(c.z-.579)*.05;changed+=1
for fr,val in [(1,1),(15,0),(30,0),(38,1)]:key.value=val;key.keyframe_insert(data_path='value',frame=fr)
print('seal vertices',changed,flush=True)
# Build an anatomical tongue as 3D mesh with jaw binding; positions are defined in frame 20 then transformed into rest local space.
scene.frame_set(20);bpy.context.view_layer.update();pb=arm.pose.bones['Lower_Jaw'];M=arm.matrix_world@pb.matrix@arm.data.bones['Lower_Jaw'].matrix_local.inverted();inv=M.inverted()
verts=[];faces=[]
rows,cols=19,11
for i in range(rows):
 t=i/(rows-1);x=-.432-.052*t;z=.568-.013*t-.003*t*t
 # Rounded tip smoothly converges; root width is narrower and remains inside oral cavity.
 width=.012*math.sqrt(max(0.0002,1-(max(0,(t-.7))/.3)**2))*(.70+.30*min(1,t*5))
 for k in range(cols):
  q=(k-(cols-1)/2)/((cols-1)/2);curve=.0015*(1-q*q)
  verts.append(tuple(inv@Vector((x,-.035+width*q,z+curve))))
for i in range(rows-1):
 for k in range(cols-1):a=i*cols+k;faces.append((a,a+cols,a+cols+1,a+1))
me=bpy.data.meshes.new('Maltese short tongue');me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new('Maltese short tongue',me);bpy.context.collection.objects.link(ob)
mat=bpy.data.materials.new('Tongue soft pink');mat.use_nodes=True;bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(.39,.105,.115,1);bs.inputs['Roughness'].default_value=.58;me.materials.append(mat)
for p in me.polygons:p.use_smooth=True
vg=ob.vertex_groups.new(name='Lower_Jaw');vg.add(list(range(len(verts))),1.0,'REPLACE');skin=ob.modifiers.new('Jaw rig','ARMATURE');skin.object=arm
solid=ob.modifiers.new('Tongue depth','SOLIDIFY');solid.thickness=.002
sub=ob.modifiers.new('Smooth tongue','SUBSURF');sub.levels=2;sub.render_levels=2
basis=ob.shape_key_add(name='Basis');retract=ob.shape_key_add(name='Retract')
root=inv@Vector((-.425,-.035,.568))
for v in retract.data:v.co=root+(v.co-root)*.015
for fr,val in [(1,1),(8,.85),(20,0),(30,0),(38,1)]:retract.value=val;retract.keyframe_insert(data_path='value',frame=fr)
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-patch-v6.blend')
