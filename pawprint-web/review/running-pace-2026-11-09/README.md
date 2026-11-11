# Running cadence review — 2026-11-09

## Research and diagnosis

- Kano et al. studied 14 trotting dogs averaging 6.5 kg, including Shih Tzu, Poodle and Lhasa Apso, at a controlled 0.9–1.1 m/s. Their mean full gait cycle was 0.44 s for the forelimbs and 0.43 s for the hindlimbs. These are cohort measurements, not a universal puppy running speed or a measurement of Lanlao. A full cycle is successive contacts of the same paw, not the count of all four paws' footfalls. [Primary paper, Tables 1–2](https://link.springer.com/content/pdf/10.1186/s12917-015-0631-2.pdf).
- The same paper explains why smaller dogs generally require a higher stride frequency than larger dogs at the same forward speed. A separate 66-dog study allowed preferred walking/trotting speeds and reports substantial variation across dogs and size groups. This supports using a range instead of one supposedly correct speed. [Fahie et al., 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6198868/).
- The deployed `Run_Trot_Natural` clip is 0.708333 s long. Both manual and spontaneous running previously used a 0.72–0.90 playback/translation multiplier: about **0.79–0.98 s per cycle at cruise**, even before acceleration, curves and braking slowed it further.
- Run destinations could be only 0.65 model units away, so some runs consisted mostly of starting and stopping. Model units are not calibrated physical metres.

## Changes

| Setting | Before | Current |
| --- | --- | --- |
| Requested run, cruise clip rate | 0.72–0.90 | 1.60–1.80 |
| Requested run, full cycle at cruise | 0.79–0.98 s | 0.39–0.44 s |
| Spontaneous run, cruise clip rate | 0.72–0.90 | 1.40–1.65 |
| Spontaneous run, full cycle at cruise | 0.79–0.98 s | 0.43–0.51 s |
| Preferred run destination distance | At least 0.65 units | At least 1.60 units |

- Actual root travel continues to drive clip time. The authored stride calibration is unchanged, so increasing pace accelerates the whole gait, including body motion, together with translation.
- Running uses flatter, randomly varying open routes. Curvature preview expands with current speed; the existing turning-speed limit remains in effect.
- Run acceleration/deceleration are now 3.0/3.6 model units/s². Maximum-pace braking is tested to stop within 0.5 s and under 0.35 model units, followed by the existing staggered foot settling.
- If a narrow view cannot fit the preferred route length, the planner uses its furthest safe sampled destination (at least 1.05 units), or rests if none exists. It never enlarges the safe screen boundary to force a run.
- Walking, random rest selection and the 20–45 second lying duration are retained. No model geometry, skin weights or authored clip channels were changed.

## Verification

- **194 tests passed, 0 failed**, including the full server regression with permission to bind local test ports. The first sandboxed full-suite attempt could not bind those ports; the authorized rerun passed.
- Production Vite build passed. Changed-file whitespace checks passed.
- Real deployed GLB continuity tests now include 1.4× and 1.8× trot playback: contact correction still reduces measured drift without introducing joint snaps, and interruptions at multiple phases settle into standing.
- Simulated travel covers 30/60/120 Hz, short destinations, curved routes, and existing camera/viewport cases. The 800-activity normal-view sample selected a full-length route for 167 of 168 runs; the remaining safe fallback was 1.49 units.
- A reproducible 60-route diagnostic is saved in `before.json` / `after.json`, with `measure.mjs` generating the latter. Median peak clip rate rose from 0.808 to 1.700; median preferred route length rose from 1.255 to 1.950 units. The routes differ because destination rejection changes random consumption; these are distribution comparisons, not identical-path timings.
- Actual webpage observation covered movement away and back toward the camera, intermediate turns, and stopping during a moving leg. Sequential frames showed deceleration and foot settling into a stable standing pose. Browser warning/error logs were empty.

## Visual evidence and limits

- `running.jpg`: actual webpage while running.
- `stopped.jpg`: actual webpage after interrupting a run and settling into standing.
- `running-preview.webp`: 7.8-second chronological screenshot sample, preserving capture timing (approximately 9 frames/s). This sampling rate is **not** the app's render frame rate and cannot demonstrate full rendering smoothness.

This is a brisk diagonal trot on the existing rig, not a new gallop. The research guides cadence; it does not establish Lanlao's exact physical speed, nor prove that this animation is a biomechanical simulation. A true sprint would need a different footfall pattern and coordinated spine animation. Existing contact correction reduces, but does not eliminate, skating from the authored clip.
