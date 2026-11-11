import bpy
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='/private/tmp/lanlao-connected-mouth.blend');scene=bpy.context.scene
for ob in scene.objects:
 if ob.type=='MESH' and len(ob.data.vertices)==42:ob.hide_render=True
world=scene.world or bpy.data.worlds.new('Studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.8,.8,.8,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=.55;scene.camera=cam
bpy.ops.object.light_add(type='AREA',location=(-1,-2,2.5));light=bpy.context.object;light.data.energy=300;light.data.shape='DISK';light.data.size=4;light.rotation_euler=(Vector((-.3,0,.65))-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=5;scene.render.resolution_x=600;scene.render.resolution_y=600;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
for name,loc in [('side',(-.35,-3,.65)),('front',(-3,0,.65)),('angle',(-2,-2,.65))]:
 cam.location=loc;cam.rotation_euler=(Vector((-.35,0,.65))-cam.location).to_track_quat('-Z','Y').to_euler()
 for frame,state in [(1,'closed'),(20,'open')]:
  scene.frame_set(frame);scene.render.filepath=f'/private/tmp/lanlao-connected-mouth-{name}-{state}.png';bpy.ops.render.render(write_still=True);print('RENDERED',name,state,flush=True)
