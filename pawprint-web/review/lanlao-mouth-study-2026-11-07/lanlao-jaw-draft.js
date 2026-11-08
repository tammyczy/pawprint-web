import {MathUtils, PropertyBinding} from 'three';

// The clip is an authored closed-to-open pose, not an independently looping animation.
// Applying it after the other pose layers lets the head, posture and gait keep moving.
// Restoring the values after render prevents the expression accumulating between frames.
export function createLanlaoJaw(model, clip, {random = Math.random} = {}) {
 const acceptedNodes = new Set(['Lower_Jaw', 'Mouth_Interior', 'Tongue']);
 const acceptedProperties = new Set(['position', 'quaternion', 'scale']);
 const channels = [];
 if (clip && clip.duration > 0) {
  for (const track of clip.tracks) {
   let parsed;
   try { parsed = PropertyBinding.parseTrackName(track.name); } catch { continue; }
   if (!acceptedNodes.has(parsed.nodeName) || !acceptedProperties.has(parsed.propertyName)) continue;
   const node = model.getObjectByName(parsed.nodeName);
   if (!node || parsed.objectName || parsed.propertyIndex != null) continue;
   const size = track.getValueSize();
   if (size !== (parsed.propertyName === 'quaternion' ? 4 : 3)) continue;
   const binding = PropertyBinding.create(model, track.name);
   binding.bind();
   channels.push({binding, sample:track.createInterpolant(new Float32Array(size)), previous:new Float32Array(size), size, name:track.name});
  }
 }
 const enabled = channels.some(channel=>channel.name === 'Lower_Jaw.quaternion');
 let elapsed = 0, duration = 0, cooldown = 0, applied = false;
 function restore() {
  if (!applied) return;
  for (const {binding,previous} of channels) binding.setValue(previous,0);
  applied = false;
 }
 return {
  get enabled() {return enabled;},
  trigger() {
   if (!enabled || elapsed < duration || cooldown > 0 || random() >= .4) return false;
   elapsed = 0;
   duration = 2.4 + random() * .6;
   cooldown = 8;
   return true;
  },
  apply(dt, {visible = true, reduced = false} = {}) {
   restore();
   const delta = Math.max(0, Math.min(dt, .1));
   cooldown = Math.max(0, cooldown - Math.max(0, dt));
   if (!visible || reduced) {elapsed = duration; return;}
   if (!enabled || elapsed >= duration) return;
   elapsed = Math.min(duration, elapsed + delta);
   const opening = MathUtils.smoothstep(elapsed, 0, .38);
   const closing = 1 - MathUtils.smoothstep(elapsed, duration - .55, duration);
   const sampleTime = clip.duration * opening * closing;
   for (const {binding,sample,previous} of channels) {
    binding.getValue(previous,0);
    binding.setValue(sample.evaluate(sampleTime),0);
   }
   applied = true;
  },
  restore
 };
}
