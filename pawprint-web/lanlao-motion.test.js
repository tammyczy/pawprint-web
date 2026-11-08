import assert from 'node:assert/strict';
import test from 'node:test';
import {Group, Vector3} from 'three';
import {createLanlaoLocomotion} from './src/lanlao-locomotion.js';
import {lanlaoJumpDuration, sampleLanlaoJump} from './src/lanlao-jump.js';

test('jump contacts hold and sampled velocity stays continuous', () => {
 const before = new Float64Array(8), current = new Float64Array(8), after = new Float64Array(8);
 const dt = .00001;
 for (let frame = 0; frame <= 950; frame++) {
  const time = frame / 1000;
  sampleLanlaoJump(time - dt, before);
  sampleLanlaoJump(time, current);
  sampleLanlaoJump(time + dt, after);
  for (let channel = 0; channel < current.length; channel++) {
   const velocityChange = (after[channel] - 2 * current[channel] + before[channel]) / dt;
   assert(Math.abs(velocityChange) < .006, `velocity break at ${time}s in channel ${channel}`);
  }
  if (time <= .10 || time >= .56) assert.equal(current[5], 0);
  if (time <= .27 || time >= .69) assert.equal(current[6], 0);
  assert(current[5] >= 0 && current[6] >= 0);
 }
 sampleLanlaoJump(1, current);
 assert(current.every(value => value === 0));
 assert(lanlaoJumpDuration < 1);
});

test('trot advances along its facing, eases out, and remains still after braking', () => {
 const dog = new Group();
 const movement = createLanlaoLocomotion(dog);
 const dt = 1 / 60;
 const before = new Vector3(), delta = new Vector3(), sideways = new Vector3();
 let firstTravel;
 for (let frame = 0; frame < 360; frame++) {
  before.copy(dog.position);
  const result = movement.move(dt, {loop:true, run:true});
  delta.subVectors(dog.position, before);
  sideways.set(0, 0, 1).applyQuaternion(dog.quaternion);
  assert(Math.abs(delta.dot(sideways)) < .0001);
  assert(Math.abs(delta.length() - result.clipRate * .865 * dt) < .0001);
  if (frame === 0) firstTravel = delta.length();
 }
 assert(firstTravel < .004);
 before.copy(dog.position);
 let stopped = false;
 for (let frame = 0; frame < 30 && !stopped; frame++) {
  stopped = movement.move(dt, {loop:true, run:true, brake:true}).arrived;
 }
 assert(stopped);
 assert(dog.position.distanceTo(before) < .15);
 const stoppedAt = dog.position.clone();
 assert.equal(movement.move(dt, {loop:true, run:true, brake:true}).clipRate, 0);
 assert(dog.position.equals(stoppedAt));
});

test('a walking approach brakes inside its destination tolerance', () => {
 const dog = new Group();
 const movement = createLanlaoLocomotion(dog);
 const destination = new Vector3(-.16, 0, .42);
 let arrived = false;
 for (let frame = 0; frame < 300 && !arrived; frame++) {
  arrived = movement.move(1 / 60, {destination, pace:1.25}).arrived;
 }
 assert(arrived);
 assert(dog.position.distanceTo(destination) < .025);
});
