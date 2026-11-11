import bpy,json
S='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-hip-posture-review.blend'; C='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-patch-experiment/v10-normal.blend'
def read(path):
 bpy.ops.wm.open_mainfile(filepath=path)
 acts={a.name:{'fcurves':len(a.fcurves),'signature':sorted((f.data_path, f.array_index, len(f.keyframe_points)) for f in a.fcurves)} for a in bpy.data.actions}
 o=next(x for x in bpy.context.scene.objects if x.type=='MESH' and len(x.data.vertices)>20000)
 arm=next(x for x in bpy.context.scene.objects if x.type=='ARMATURE')
 return acts,{'attached_action':arm.animation_data.action.name if arm.animation_data and arm.animation_data.action else None,'bones':len(arm.data.bones),'mesh_modifiers':[(m.name,m.type) for m in o.modifiers], 'uv_layers':[a.name for a in o.data.uv_layers]}
a,ad=read(S);b,bd=read(C)
print(json.dumps({'source_actions':list(a),'candidate_actions':list(b),'missing_actions':sorted(set(a)-set(b)),'altered_actions':sorted(k for k in set(a)&set(b) if a[k]!=b[k]),'source':ad,'candidate':bd}),flush=True)
