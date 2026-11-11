// Standing jump in model units. Paw heights are offsets from their planted bind points.
// The front reaches for the floor first while the rear finishes the flight.
const frames = [
 // Seconds, hips X/Y, chest X/Y, pitch, forepaw lift, hindpaw lift, tuck.
 [0,      0,      0,      0,      0,       0,     0,    0,    0],
 [.14,   .022,  -.044,  .012,  -.025,   -.035,   0,    0,    0],
 [.25,   .026,  -.055,  .012,  -.015,   -.100,  .025,  0,   .16],
 [.34,   .012,  -.009, -.010,   .042,   -.160,  .090,  0,   .62],
 [.40,   .003,   .052, -.016,   .090,   -.120,  .140, .046, .85],
 [.47,  -.008,   .103, -.020,   .110,   -.015,  .145, .110, .68],
 [.53,  -.013,   .090, -.017,   .058,    .075,  .065, .099, .30],
 [.58,  -.013,   .042, -.014,  -.010,    .120,   0,   .045, .08],
 [.64,  -.008,  -.012, -.008,  -.038,    .080,   0,    0,    0],
 [.72,   .003,  -.032,  .003,  -.027,    .025,   0,    0,    0],
 [.84,   .004,  -.019,  .002,  -.012,    .008,   0,    0,    0],
 [1.12,   0,      0,      0,      0,       0,     0,    0,    0]
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
