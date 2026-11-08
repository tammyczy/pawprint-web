# Pawprint verification — 2026-10-24

## Local service
- Found the existing Node process bound to 127.0.0.1:8788 but not responding to HTTP. Restarted that project process; the health endpoint now responds immediately.
- Fixed the Express startup handling: `listening` reports success; `error` reports port conflicts and exits with code 1. Confirmed a duplicate `npm start` now fails clearly rather than printing a false success message.
- Local-only access restrictions and origin checks remain enabled.

## Actual browser and provider verification
- Opened the production build on port 8788, not just the development preview.
- Uploaded the existing public Lanlao image plus synthetic 1-second WebM and WAV reference clips. Created task `4b21429d-bf2c-4af5-9956-8330c1386dfb` (Pawprint QA — upload test).
- Verified the task appears with both reference links and survives a full page reload. Cancelled this QA task; retained it for inspection. Existing user projects were not deleted.
- Confirmed a stale running server initially rejected the current four-field studio form. Restarted with the current source configuration; upload succeeded. Added regression coverage for all four fields plus all four photos, and rejection of extra fields.
- Actual AI English request produced a tail-wag reply/action. A subsequent Chinese message produced a Chinese response: “主人，先靠着我歇一会儿吧。今天辛苦了，我在这儿陪你。”
- Browser speech playback reached Speaking; verified Replay, Stop, voice selection, speaking style selection and Preview.
- Live speech API: Verse, Ash, Coral, Nova, Shimmer and Marin all returned HTTP 200 audio/mpeg. Also verified cheerful and comfort tones using Verse. Eight MP3 outputs were decoded with ffprobe, with durations from 2.112 to 3.960 seconds. Results and samples: `.data/ui-qa/`.
- Existing 小Q model loaded successfully in the pet viewer with its controls and AI/voice connection status.
- Studio language switching works for English and Chinese.

## Design verification
- Replaced display typography with Cormorant Garamond; DM Sans for body and controls; system serif fallbacks for Chinese.
- Added first-screen entrance transitions, image settling, subtle pointer parallax, staggered scroll reveals, button feedback and a reading progress indicator.
- Reduced-motion and print styles keep content visible and remove nonessential movement.
- Added the generated transparent forest-green paw/heart logo to navigation, pet pages and favicon.
- Moved previous styles into a legacy cascade layer so production CSS chunk order cannot override the new identity styles.
- Checked desktop, 390px phone and 720px tablet layouts; no horizontal overflow in inspected pages. Corrected the 700–760px hero transition.

## Automated checks
- `npm test`: 31 passed, 0 failed.
- `npm run build`: passed.
- `node scripts/verify-live-speech.mjs`: 8 live voice/tone combinations passed. This is an opt-in live provider check and is not part of npm test; running it generates audio using the configured provider.

## Explicit limits
- Physical microphone capture and recognition of an actual spoken utterance still need a person speaking into the device. Text and playback tests do not establish microphone recognition quality.
- No new chargeable Tripo generation was triggered. New uploads are verified through the owner-approval boundary; the existing generated model was used to test the model-viewing part of the workflow. The worker requires an explicit `--confirm-tripo-charges` authorization for a new generation.
- Logo was created with the built-in image_gen tool. Asset: `public/pawprint-mark-v3.png`; full prompt: `public/pawprint-logo-prompt.txt`.

Additional browser check: submitting a deliberately corrupted PNG correctly showed the image validation error and re-enabled submission without creating a new task. Existing pet Walk, Stop and Best view controls were also exercised successfully.
