// Standing jump in model units. Paw heights are offsets from their planted bind points.
// The front reaches for the floor first while the rear finishes the flight.
const frames = [
 // Seconds, hips X/Y, chest X/Y, pitch, forepaw lift, hindpaw lift, tuck.
 [0,      0,      0,      0,      0,       0,     0,    0,    0],
 [.10,   .029,  -.055,  .017,  -.032,   -.055,   0,    0,    0],
 [.19,   .036,  -.075,  .020,  -.022,   -.155,  .040,  0,   .19],
 [.27,   .019,  -.016, -.016,   .054,   -.285,  .135,  0,   .65],
 [.34,   .007,   .066, -.025,   .143,   -.22,   .223, .075, 1],
 [.43,  -.009,   .157, -.027,   .174,   -.045,  .224, .169, .78],
 [.49,  -.017,   .158, -.021,   .112,    .130,  .134, .176, .39],
 [.56,  -.018,   .115, -.017,   .014,    .255,   0,   .134, .14],
 [.62,  -.012,   .044, -.012,  -.055,    .215,   0,   .064, .05],
 [.69,   .003,  -.027,  .004,  -.071,    .112,   0,    0,    0],
 [.78,   .007,  -.044,  .004,  -.039,    .025,   0,    0,    0],
 [.95,    0,      0,      0,      0,       0,     0,    0,    0]
];

// Monotone Hermite slopes preserve authored extrema and exact zero paw
// heights during contact, with a shared velocity on both sides of each knot.
const slopes = frames.map((frame, index) => {
 const previous = frames[index - 1];
 const next = frames[index + 1];
 return frame.slice(1).map((value, channel) => {
  if (!previous || !next) return 0;
  const before = frame[0] - previous[0];
  const after = next[0] - frame[0];
  const incoming = (value - previous[channel + 1]) / before;
  const outgoing = (next[channel + 1] - value) / after;
  if (incoming * outgoing <= 0) return 0;
  const incomingWeight = 2 * after + before;
  const outgoingWeight = after + 2 * before;
  return (incomingWeight + outgoingWeight) /
   (incomingWeight / incoming + outgoingWeight / outgoing);
 });
});

export const lanlaoJumpDuration = frames.at(-1)[0];

export function sampleLanlaoJump(time, out) {
 const index = frames.findIndex(frame => frame[0] >= time);
 if (index <= 0) {
  out.fill(0);
  return;
 }
 const from = frames[index - 1], to = frames[index];
 const duration = to[0] - from[0];
 const t = (time - from[0]) / duration;
 const t2 = t * t;
 const blend = t2 * (3 - 2 * t);
 for (let i = 0; i < out.length; i++) {
  out[i] = from[i + 1] * (1 - blend) + to[i + 1] * blend
   + t * (1 - t) * (1 - t) * duration * slopes[index - 1][i]
   - t2 * (1 - t) * duration * slopes[index][i];
 }
}
