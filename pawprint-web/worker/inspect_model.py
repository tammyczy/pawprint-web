"""Read-only QA in a clean Blender process; never opens an uploaded .blend file."""
import bpy, json, sys
args = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args[0])
armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
report = {
    'armatures': [{'name': a.name, 'bones': [b.name for b in a.data.bones]} for a in armatures],
    'meshes': [{'name': o.name, 'vertices': len(o.data.vertices), 'polygons': len(o.data.polygons)} for o in bpy.data.objects if o.type == 'MESH'],
    'materials': [m.name for m in bpy.data.materials],
    'images': [{'name': i.name, 'size': list(i.size)} for i in bpy.data.images],
    'actions': [a.name for a in bpy.data.actions],
    'requires_visual_review': True,
    'full_pet_ready': False,
}
with open(args[1], 'w', encoding='utf-8') as out:
    json.dump(report, out, ensure_ascii=False, indent=2)
