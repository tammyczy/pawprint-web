import bpy
source='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-workflow-joined-tongue-study/preview.blend'
bpy.ops.wm.open_mainfile(filepath=source);s=bpy.context.scene;o=next(o for o in s.objects if o.type=='MESH' and len(o.data.vertices)>25000)
key=o.data.shape_keys.key_blocks['SoftRoundMouth']
for frame in (1,12,20,30,38):
 try:key.keyframe_delete(data_path='value',frame=frame)
 except RuntimeError:pass
for frame,value in [(1,0),(20,1),(30,1),(38,0)]:key.value=value;key.keyframe_insert(data_path='value',frame=frame)
arm=next(o for o in s.objects if o.type=='ARMATURE');jaw=arm.pose.bones['Lower_Jaw']
for fr in (1,4,8,12,16,20,30,35,38):
 s.frame_set(fr);print('FRAME',fr,'jaw_normal',round(jaw.rotation_euler[1]/-.15,5),'corrective',round(key.value,5),flush=True)
s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/lanlao-sync-lips.blend')
