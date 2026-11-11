import bpy,math
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-reference-adjustment.blend')
o=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)>20000)
j=o.vertex_groups['Lower_Jaw'];h=o.vertex_groups['Head'];changed=0
for v in o.data.vertices:
 try: old=j.weight(v.index)
 except RuntimeError:continue
 if old<=0:continue
 try:head=h.weight(v.index)
 except RuntimeError:head=0
 d=abs(v.co.y+.035)
 t=min(1,max(0,(d-.010)/.020));f=1-(t*t*(3-2*t))
 val=old*f
 j.add([v.index],val,'REPLACE');h.add([v.index],head+old-val,'REPLACE');changed+=1
print('reweighted',changed,flush=True)
bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-mesh-edge-test.blend')
