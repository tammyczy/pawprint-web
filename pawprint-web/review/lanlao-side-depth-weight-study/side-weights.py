import bpy,math
bpy.ops.wm.open_mainfile(filepath='/private/tmp/pawprint-mouth-sculpt/depth-mask.blend');s=bpy.context.scene;s.frame_set(1);o=next(x for x in s.objects if x.type=='MESH' and len(x.data.vertices)>25000)
j=o.vertex_groups['Lower_Jaw'];h=o.vertex_groups['Head'];cnt=0
def smooth(t):t=max(0.,min(1.,t));return t*t*(3-2*t)
for v in o.data.vertices:
 x,y,z=v.co; r=abs(y+.035)
 if not (-.44<x<-.34 and .525<z<.58 and .025<r<.095):continue
 a=smooth((-x-.34)/.045)*smooth((.58-z)/.014)*smooth((r-.025)/.018)*smooth((.095-r)/.02)
 target=.56*a
 weights={g.group:g.weight for g in v.groups};old=weights.get(j.index,0);head=weights.get(h.index,0);move=min(head,max(0,target-old))
 if move>1e-5:
  j.add([v.index],old+move,'REPLACE');h.add([v.index],head-move,'REPLACE');cnt+=1
print('SIDE_JAW_POINTS',cnt,flush=True);bpy.ops.wm.save_as_mainfile(filepath='/private/tmp/pawprint-mouth-sculpt/side-weights.blend')
