import assert from 'node:assert/strict';
import test from 'node:test';
import {createLanlaoAttention, createLanlaoGreeting} from './src/lanlao-attention.js';

test('an unacknowledged greeting does not authorize a response pop', () => {
 const attention = createLanlaoAttention();
 attention.advance(2);
 assert.equal(attention.fresh, false);
 assert.equal(attention.consume(), false);
});

test('a recent deliberate response authorizes one pop', () => {
 const attention = createLanlaoAttention();
 assert.equal(attention.engage(), true);
 attention.advance(3);
 assert.equal(attention.fresh, true);
 assert.equal(attention.consume(), true);
 assert.equal(attention.fresh, false);
 assert.equal(attention.recent, true);
 assert.equal(attention.consume(), false);
});

test('old responses expire and a new response renews the window', () => {
 const attention = createLanlaoAttention();
 attention.engage();
 attention.advance(4);
 attention.engage();
 attention.advance(4);
 assert.equal(attention.fresh, true);
 attention.advance(1);
 assert.equal(attention.consume(), false);
});

test('disengagement and loss of availability clear pending responses', () => {
 const attention = createLanlaoAttention();
 attention.engage();
 attention.disengage();
 assert.equal(attention.fresh, false);

 attention.engage();
 attention.advance(0, {available: false});
 assert.equal(attention.engage(), false);
 assert.equal(attention.fresh, false);
 attention.advance(0, {available: true});
 assert.equal(attention.consume(), false);
 assert.equal(attention.engage(), true);
});


test('a second pop needs a separate response after the input debounce', () => {
 const attention = createLanlaoAttention();
 attention.engage();
 assert.equal(attention.consume(), true);
 attention.advance(.05);
 assert.equal(attention.engage(), false);
 assert.equal(attention.consume(), false);
 attention.advance(.3);
 assert.equal(attention.engage(), true);
 assert.equal(attention.consume(), true);
});


test('without a deliberate response, the greeting looks and settles without popping', () => {
 const greeting = createLanlaoGreeting(createLanlaoAttention());
 for (const time of [0, .55, 1.2, 2.34]) {
  const {depth, look, phase, done, playful} = greeting.sample(time);
  assert.equal(depth, 0);
  assert.equal(phase, 'look');
  assert.equal(done, false);
  assert.equal(playful, false);
  if (time === 1.2) assert.equal(look, 1);
 }
 const {depth, look, done} = greeting.sample(2.35);
 assert.equal(depth, 0);
 assert.equal(look, 0);
 assert.equal(done, true);
});

test('a response during eye contact starts one pop and leaves time to respond again', () => {
 const attention = createLanlaoAttention();
 const greeting = createLanlaoGreeting(attention);
 greeting.sample(.6);
 attention.engage();
 assert.equal(greeting.sample(1.2).phase, 'pop');
 assert.equal(greeting.sample(1.45).depth, 1);
 assert.equal(greeting.sample(1.8).phase, 'look');
 assert.equal(greeting.sample(2.3).depth, 0);
 assert.equal(greeting.sample(3.01).done, true);
});

test('a distinct second response gives a smaller pop with a late turn cue', () => {
 const attention = createLanlaoAttention();
 const greeting = createLanlaoGreeting(attention);
 attention.engage();
 greeting.sample(.55);
 greeting.sample(1.11);
 attention.advance(1.2);
 attention.engage();
 assert.equal(greeting.sample(1.75).phase, 'pop');
 assert.equal(greeting.sample(1.95).depth, .82);
 assert.equal(greeting.sample(1.95).landingAge, undefined);
 assert.equal(greeting.sample(2.17).turnIntent, 1);
 assert(greeting.sample(2.3).landingAge > 0);
 assert.equal(greeting.sample(2.46).done, true);
 greeting.reset();
 assert.equal(greeting.sample(.8).playful, false);
});


test('a tap during the first pop is dropped when the paws return to the floor', () => {
 const attention = createLanlaoAttention();
 const greeting = createLanlaoGreeting(attention);
 attention.engage();
 assert.equal(greeting.sample(.55).phase, 'pop');
 attention.advance(.3);
 attention.engage();
 assert.equal(greeting.sample(.85).landingAge, undefined);
 assert(greeting.sample(1.11).landingAge > 0);
 assert.equal(attention.fresh, false);
 assert.equal(attention.recent, true);
 assert.equal(greeting.sample(1.65).phase, 'look');
 assert.equal(greeting.sample(2.36).done, true);
});
