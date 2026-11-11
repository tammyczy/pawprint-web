# Irregular routes and motion transitions — 2026-11-09

## Findings

1. Autonomous destination selection was random, but the manual Walk/Run commands still used a fixed circle/ellipse. Those two steering fields have now been removed from the shared locomotion module.
2. Previously, a target behind the dog caused it to move forward while yaw caught up, creating an unnecessary U-shaped departure. A new excursion now begins with bounded, foot-stepped reorientation when required.
3. Passive browser observation exposed a redundant stand-up followed immediately by another lie-down choice. The planner now prevents an immediate repeat of the same long rest; the scheduler chooses the next activity before standing, and directly transitions sit ↔ lie when appropriate.
4. Leaving idle immediately zeroed head/ear/breathing offsets. They now decay across the first steps or posture transition, while the normal render-time restore still prevents accumulation.

## Resulting behavior

- Each excursion is an open cubic path: straight, gently bent, or shallow S-shaped. Its progress along the start-to-end direction is monotonic; it cannot loop around its own target. Control points are checked against the pet's screen-safe envelope and bends flatten near an edge.
- Walking/running speed reduces before curvature increases. Animation playback follows actual traveled distance, including acceleration and braking.
- Changes of heading are split into small grounded steps, using the existing four-paw contact pose. An interruption finishes only the current step before honoring the new command.
- On arrival, the existing stop-to-stand foot settling completes before a resting pose or the next route. Manual Walk/Run continue by choosing a new route after a short pause, until another command interrupts them.
- Random sitting/lying locations and the 20–45 second lying dwell are retained. These timings are animation design choices, not measured dog behavior frequencies.

## Evidence

- Final full regression after the rest-transition follow-up: **192 passed, 0 failed**. Route speed/heading assertions and the production build also pass.
- Random-route simulation uses 4 seeds × 3 viewing configurations × 40 planning attempts. Valid routes stay in frame, settle at their destinations, and keep moving turns below 1.15 radians/second. A narrow view may safely choose a standing pause if no target is found.
- Route geometry tests check forward progress, bounded detours, both bend directions and exact endpoints.
- Real deployed GLB tests cover grounded turn paws (under 3 mm movement per sampled grounded frame), lifted-paw continuity, different stopping phases, sit/lie/stand, and jump support contacts.
- Head-transition test interrupts a visibly lowered idle head and checks the fading overlay frame by frame.
- Browser checks included rising from lying, reorienting, running across the scene, settling, and passive spontaneous resting at a different location. Sequential screenshot sampling exposed the redundant wake/re-lie behavior, which was then corrected. `unattended-rest.jpg` shows an actual spontaneous far-side resting pose. Final-version browser sampling also observed spontaneous walking away, sitting at a different point, resting elsewhere, then changing direction and walking again. Manual sit-to-lie was checked separately (`final-rest.jpg`). No browser errors were captured.

## Limits

This is procedural animation on the existing rig. Contact correction reduces skating but is not a full physical quadruped controller. The checks do not establish that every possible camera view and random sequence is perfect. No model geometry, skin weights or source clips were replaced in this change.
