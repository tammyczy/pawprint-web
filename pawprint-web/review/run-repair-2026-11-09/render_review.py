import bpy,json,pathlib,struct
from mathutils import Matrix,Vector
import numpy as np
root=pathlib.Path('/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web')
out=root/'review/run-repair-2026-11-09'
convert=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
def matrix(values):return Matrix([values[0:4],values[4:8],values[8:12],values[12:16]]).transposed()
for version,source,poses in [
 ('before',root/'public/models/lanlao-rig-hip-refined.glb',out/'before/poses.json'),
 ('after',pathlib.Path('/private/tmp/lanlao-motion-weights-240.glb'),out/'poses.json')]:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(source))
 arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
 arm.animation_data_clear()
 raw=source.read_bytes();jsonlen=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+jsonlen]);offset=20+jsonlen+8
 primitive=gltf['meshes'][0]['primitives'][0]
 def attr(semantic,dtype):
  a=gltf['accessors'][primitive['attributes'][semantic]];v=gltf['bufferViews'][a['bufferView']]
  return np.ndarray((a['count'],4),dtype=dtype,buffer=raw,offset=offset+v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dtype).itemsize*4),np.dtype(dtype).itemsize))
 w=attr('WEIGHTS_0','<f4');w=w/w.sum(axis=1,keepdims=True)
 ids=attr('JOINTS_0','u1');names=[gltf['nodes'][j]['name'] for j in gltf['skins'][0]['joints']]
 mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)==len(w))
 # Match the browser's normalized four influences, rather than Blender's
 # optional extra glTF weight sets.
 mesh.vertex_groups.clear();groups=[mesh.vertex_groups.new(name=n) for n in names]
 for i in range(len(w)):
  for k in range(4):
   if w[i,k]>0:groups[int(ids[i,k])].add([i],float(w[i,k]),'ADD')
 for o in bpy.context.scene.objects:
  if o.type=='MESH' and o is not mesh:o.hide_render=True
 for mod in mesh.modifiers:
  if mod.type=='ARMATURE':mod.use_deform_preserve_volume=False
 for mat in mesh.data.materials:
  for node in mat.node_tree.nodes:
   if node.type=='BSDF_PRINCIPLED':node.inputs['Roughness'].default_value=1;node.inputs['Metallic'].default_value=0
 data=json.loads(poses.read_text());rest={n:matrix(m) for n,m in data['rest'].items()}
 scene=bpy.context.scene
 world=bpy.data.worlds.new('Soft studio');world.use_nodes=True;scene.world=world
 world.node_tree.nodes['Background'].inputs['Color'].default_value=(.8,.8,.78,1)
 world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
 bpy.ops.object.camera_add(location=(.05,-3,.7));cam=bpy.context.object;cam.rotation_euler=(Vector((.05,0,.45))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.35;scene.camera=cam
 bpy.ops.object.light_add(type='AREA',location=(-1,-2,2.5));light=bpy.context.object;light.data.energy=180;light.data.size=4;light.rotation_euler=(Vector((0,0,.4))-light.location).to_track_quat('-Z','Y').to_euler()
 scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=8
 scene.render.resolution_x=900;scene.render.resolution_y=650;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG'
 for label,phase in [('gather',.35),('extend',.85)]:
  frame=min([f for f in data['frames'] if f['label']=='gallop'],key=lambda f:abs(f['phase']-phase))
  for bone in sorted(arm.pose.bones,key=lambda b:len(b.parent_recursive)):
   if bone.name not in frame['bones']:continue
   delta=convert@matrix(frame['bones'][bone.name])@rest[bone.name].inverted()@convert.inverted()
   bone.matrix=arm.matrix_world.inverted()@delta@arm.matrix_world@bone.bone.matrix_local
   bpy.context.view_layer.update()
  scene.render.filepath=str(out/f'{version}-{label}.png');bpy.ops.render.render(write_still=True)
  print('RENDERED',version,label,frame['phase'],flush=True)
 if version=='after':bpy.ops.wm.save_as_mainfile(filepath=str(out/'lanlao-motion-review.blend'))
