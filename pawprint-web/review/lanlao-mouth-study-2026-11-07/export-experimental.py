import bpy
bpy.ops.wm.open_mainfile(filepath='/tmp/lanlao-jaw-prototype-v14.blend');scene=bpy.context.scene;scene.frame_set(1);scene.render.fps=24
props={p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties};kwargs={'filepath':'/tmp/lanlao-jaw-prototype-v14.glb','export_format':'GLB','export_animations':True,'export_morph':True,'export_skins':True}
if 'export_all_influences' in props:kwargs['export_all_influences']=True
bpy.ops.export_scene.gltf(**kwargs);print('EXPORTED')
