import test from 'node:test';
import assert from 'node:assert/strict';
import {compareLanlaoSkinMotion} from './test-support/lanlao-skin-review.mjs';

test('refined skin reduces peak and aggregate stretching on held-out running, turning and braking frames',async()=>{
 const result=await compareLanlaoSkinMotion();
 for(const mode of ['gallop','turn','transition','brake']){
  const {before,after}=result[mode];
  assert(after.maximum<before.maximum*.9,`${mode}: maximum edge strain did not improve by 10%`);
  // A binary count treats 2.001x and 4x stretches alike and changes abruptly
  // when a revised gait crosses the cutoff. Keep the count guard and also
  // require a substantial reduction in continuous excess-strain severity.
  assert(after.over2<before.over2,`${mode}: severely stretched edges were not reduced`);
  assert(after.excess<before.excess*.7,`${mode}: aggregate severe strain did not improve by 30%`);
 }
 assert(result.sit.after.maximum<2.7&&result.sit.after.over2<result.sit.before.over2*.5);
 assert(result.lie.after.maximum<3.75&&result.lie.after.over2<result.lie.before.over2*.75);
});
