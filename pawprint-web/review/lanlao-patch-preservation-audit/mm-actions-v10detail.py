import bpy
p='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web/review/lanlao-lip-patch-experiment/v10-normal.blend';bpy.ops.wm.open_mainfile(filepath=p)
for a in bpy.data.actions:
 print('ACTION',a.name,'users',a.users,'fcurves',len(a.fcurves),'paths',[(x.data_path,x.array_index,len(x.keyframe_points)) for x in list(a.fcurves)[:4]],flush=True)
for o in bpy.data.objects:
 if o.type=='ARMATURE':print('RIG',o.name,'scene',o.name in bpy.context.scene.objects,'action',o.animation_data.action.name if o.animation_data and o.animation_data.action else None,flush=True)
