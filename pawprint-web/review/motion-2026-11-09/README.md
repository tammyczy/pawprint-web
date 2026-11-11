# Lanlao motion review — 2026-11-09

## Evidence and interpretation

- Tokuriki, *Cinematographic and electromyographic analysis of vertical standing jump in the dog*: https://pubmed.ncbi.nlm.nih.gov/536702/ . The standing jump includes preparation, takeoff, a floating phase and landing, with axial/body motion moving the centre of gravity toward supporting paws. Four paws off the ground during flight is valid. This is not a motion-capture reconstruction of Lanlao.
- Söhnel et al., *Limb dynamics in agility jumps of beginner and advanced dogs*: https://pubmed.ncbi.nlm.nih.gov/32098886/ . Individual limbs differ in takeoff/landing roles; avoid treating the four limbs as a rigid platform. Agility results are not a prescription for a small companion dog's jump height.
- RSPCA NSW, *Meeting the needs of dogs*: https://www.rspcansw.org.au/information-and-advice/living-with-pets/meeting-your-pets-needs/meeting-the-needs-of-dogs/ . Exploration/sniffing and uninterrupted rest are both normal needs. The animation probabilities and durations below are design choices, not measured behavioural frequencies.

## Changes

- Preserve the enlarged near/far running route. Reduce speed on tighter curves while keeping clip advancement tied to actual travel. Let turning ease out through braking.
- Add restrained torso/chest/hip turning offsets alongside paw-contact correction. A larger lean introduced knee discontinuities and was reduced after testing the actual deployed rig.
- Replace the deeper, high-pitch jump with a low hop: preparation; forepaw lift while rear paws support; brief flight; forepaw contact before rear contact; slower recovery. The hop lasts 1.12 seconds, including recovery, with full flight roughly 0.34–0.58 seconds.
- Replace the unattended greeting/bow/dash/lie cycle with randomized exploration, standing pauses, sitting and lying. Greeting remains interaction-driven.
- Exploration now samples near, middle and far zones independently, with randomized lateral positions across a wider area. It mixes walking and occasional short trots with randomized pace. Standing, sitting and lying may follow either kind of travel at the arrival point. Sitting lasts 12–24 seconds; lying lasts **20–45 seconds**, per the user's final preference. The rest timer starts after the posture settles.
- Buttons and recognized commands take precedence. A moving dog brakes before resting; a resting dog stands before walking. Petting pauses spontaneous selection; listening/answering, an off-screen stage and reduced-motion preference suppress new spontaneous activity.

## Verification

- Motion tests check run depth/range, facing vs travel, braking, fixed stopped transform, head continuity and jump support/flight/landing order.
- Real deployed GLB tests check leg continuity, contact drift, stop-to-stand at four interruption phases for both walk/run, grounded jump support paws, mesh-ground clearance, and sit/lie/stand restoration.
- Seeded autonomous-plan tests check variation, near/far coverage and rest-duration bounds.
- Browser checks cover running/turning, stop, low hop, spontaneous sitting, lying and command takeover. Screenshots are samples, not continuous motion-capture evidence.

- Final full regression after expanded random roaming: **188 passed, 0 failed**. Production Vite build passed. Browser console had no captured errors or warnings during the motion check.

## Expanded roaming follow-up

- Replaced the old depth interval (-1.5 to +0.55) / narrow lateral strip (±0.48) with camera-aware selection over a candidate depth interval (-2.9 to +0.85) and lateral interval (±1.8). Actual accepted near/side positions depend on viewport and projection safety; these are candidate bounds, not guaranteed traversable bounds.
- New selection checks the full standing/lying footprint and head height against the viewport and leaves extra lateral room for departing turns. Camera changes affect subsequent choices, without teleporting the dog. A view with no safe new target falls back to a standing pause.
- The near/far order is no longer fixed. A seed-based 800-decision test confirms walking, running, and every resting pose across all three depth bands and both sides.
- 480 simulated routes cover multiple seeds, desktop/narrow aspects, and a rotated view. The actual locomotion reaches each destination and keeps the modeled footprint in frame throughout those routes. Existing gait/stop/pose tests also pass.
- Browser review observed spontaneous changes of location/rest posture with no command clicks; no captured console errors or warnings. `random-roaming.jpg` is a browser sample of a resting pose, not a visualization of the whole route.

## Remaining limits

Procedural animation on an existing rig, not a veterinary biomechanics simulation. Paw correction reduces but does not eliminate skating. Existing fur/skin and rig limits remain; no new model was generated or rig geometry replaced in this change.
