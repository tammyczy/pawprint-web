import bpy
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-lip-rim-test.blend')
o=bpy.data.objects['Mouth_lip_rim'];basis=o.shape_key_add(name='Basis');key=o.shape_key_add(name='Open')
for i in range(0,len(basis.data),8):
 center=sum((key.data[i+j].co for j in range(8)),start=key.data[i].co*0)/8
 for j in range(8):basis.data[i+j].co=center
for f,x in [(1,0),(10,.25),(20,1),(30,1),(38,0)]:key.value=x;key.keyframe_insert('value',frame=f)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-lip-rim-morph.blend')
