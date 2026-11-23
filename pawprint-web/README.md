# Pawprint — an honest AI companion for remembering a pet

Lanlao's microphone offers OpenAI and browser recognition. OpenAI mode records after the microphone button is pressed and sends audio when pressed again or after 10 seconds. It requires the server's `OPENAI_API_KEY` and incurs transcription charges. Audio is sent to OpenAI. Changing modes or hiding the page cancels a pending recording. Restart the API server after updating it and rebuild the frontend for the production server. Compare both modes with the same spoken examples; recognition accuracy has not been independently measured.

**WAICY 2026 · AI Showcase.** Pawprint turns a pet's photos and its owner's own words into a 3D companion you can talk to, pet, and say goodbye to. It always tells you the truth: this is an AI simulation, not your pet come back.

| | |
| --- | --- |
| **Problem** | Losing a pet can hurt as much as losing a person, yet the grief is often brushed aside. In a UK study of adults whose most distressing loss was a pet, 7.5% reported symptoms consistent with prolonged grief ([Hyland, PLOS ONE, 2026](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0339213); adults only). 94 million U.S. households live with a pet ([APPA, 2025](https://americanpetproducts.org/news/the-american-pet-products-association-appa-releases-2025-state-of-the-industry-report-archive)). |
| **Idea** | A photo shows what a pet looked like. Pawprint lets you revisit what it was like to be with them — on your terms, with a stop button, and without pretending. |
| **Why AI** | Image-to-3D infers a turnable model from flat photos. A language model understands "could you come sit with me?" where buttons cannot. Speech synthesis gives the reply a voice. |
| **What we built around the AI** | A server-side *action gate* (the model may only move the pet when the person really asked), a privacy answer the model is not allowed to improvise, a distress check that hands over to real people, and memory drafts that must quote the owner word for word. |
| **Honest limits** | Pawprint's effect on grief is not established. No user study yet. Researchers warn AI "griefbots" can create dependence ([Hollanek & Nowaczyk-Basińska, 2024](https://lcfi.ac.uk/news-events/news/deathbots-griefbots-and-the-digital-afterlife)) — so there are no notifications, no streaks, and no "I miss you". |

## Run it

Requires Node.js 24+.

```bash
npm install
npm run build
npm start
```

Then open http://127.0.0.1:8788/. On macOS you can double-click `启动Pawprint.command`; on Windows, `启动Pawprint.cmd`.

| Page | Address | What it shows |
| --- | --- | --- |
| Home | `/` | The story and design principles |
| Meet Lanlao | `/app.html?lang=en` | The 3D companion: talk, type, tap, pet, stop |
| Family portraits | `/family-portrait.html` | Upload separate people and pet photos and download an AI-generated JPG |
| Evidence | `/judge.html` | Architecture, experiments, every failure we kept |
| Studio | `/studio.html?lang=en` | Photos → candidate 3D model (private workspace) |

Without keys the site still works: Lanlao answers with a small set of local rules, and the page says so. To enable live AI, copy `.env.example` to `.env` and fill in `OPENAI_API_KEY` (chat, memory drafts, voice) and `TRIPO_API_KEY` (photo-to-3D). Keys stay on the server and are never sent to the browser.

## Family portraits

Portraits use GPT-Image-2.5 Sunburst at `high` quality with one to three people photos and one to four cat or dog photos. Visitors can review or retake a front-camera photo, pick a scene and orientation, and add a short note about headcount or appearance. Refinement sends the current portrait, the original reference photos and a requested correction. The latest and immediately preceding edits are available to download in the browser. Pawprint strips upload metadata and processes the photos only after the visitor agrees to generate or apply a correction.

Holiday scenes and art styles can be combined. A scene sets the surroundings and props, and the visual medium sets texture, light and linework. The same source photos and identity instructions apply to every combination. Christmas, winter holidays, Lunar New Year, Halloween and birthdays are available year-round. The finished portrait can become a JPG greeting card with exact user-entered text rendered in the browser.

| Research | Design decision |
| --- | --- |
| [Pet Plus Us](https://www.pet-plus-us.com/) uses a small visible set of looks and shows samples before upload. | Give each art medium a recognizable image sample and keep the original upload flow. |
| [AI Pet Portrait](https://ai-pet-portrait.com/) separates scene from style. [Pettenderly’s watercolor example](https://pettenderly.com/) shows how a medium can soften whiskers and fur while retaining eye and coat colors. | Let visitors combine a holiday with a medium and tell the model to keep the specific markings, faces and proportions visible. |
| [Shutterfly](https://www.shutterfly.com/a/custom-holiday-card-templates/) uses orientation-aware photo layouts and user-written greetings. | Preserve the portrait’s aspect ratio and draw the greeting directly on the card. |
| [OpenAI’s image prompting guide](https://developers.openai.com/api/docs/guides/image-prompting) separates visual style, reference roles and editing constraints. | Keep scene and medium separate in the prompt and preserve the current medium by default during refinement. |

Locally, the portrait route uses `OPENAI_PORTRAIT_API_KEY` or the existing `OPENAI_API_KEY`. For Vercel, set `OPENAI_PORTRAIT_API_KEY` as a production secret, run `npm run build`, and use `node scripts/prepare-vercel-output.mjs` to stage the prebuilt frontend and portrait function. The optional HTTPS backend argument to the staging script proxies other API routes separately.

## How it works

```
photo ──▶ server (decode, strip metadata, consent) ──▶ Tripo image-to-3D ──▶ human review ──▶ 3D pet
words ──▶ distress check ──▶ privacy check ──▶ OpenAI (caption + 1 action) ──▶ action gate ──▶ animation + voice
memory ─▶ consent ──▶ OpenAI draft ──▶ every sentence must quote the original ──▶ owner edits or discards
```

- **Home and evidence pages** — React with [React Bits](https://reactbits.dev) animation components (`src/home/`, `src/evidence/`, components copied into `src/reactbits/`). The evidence page reads the saved experiment JSON at runtime, so its numbers cannot drift from the downloadable report. The home page's sections follow the WAICY rubric: problem, how the AI works, how it was tested, ethics, design, contributions and limits.
- **3D pages** — Vite, Three.js, no framework, three languages (中文 / English / Français). `src/lanlao-*.js` holds Lanlao's movement: gait timing, planted paws, sit/lie/stand, breathing, blinking, and unprompted idle behaviour based on published dog-behaviour studies ([notes](review/LANLAO-BEHAVIOR-RESEARCH.md)).
- **Server** — Express 5 and SQLite (`server/`). Local mode listens on 127.0.0.1 only; account mode and an invite-only cloud mode exist but the public deployment is not yet verified.
- **Safety layer** — `server/action-guard.mjs`, `server/privacy-reply.mjs`, `src/care-core.js`, `server/memory-draft.mjs`.
- **Paid generation** — never automatic in local mode: an operator approves each job, a budget is reserved first, and an uncertain submission stops for a human instead of retrying.

## Model size

The website loads `public/models/lanlao-web.glb` (6.7 MB). Run `node scripts/optimize-lanlao-textures.mjs` to build it from the 12.9 MB source. The build merges duplicate influence slots for the same joint, retains each joint’s total weight and checks the result with the Khronos validator. Geometry, morph targets and motion data are carried over byte for byte.

Studio checks reference photos before a paid run. When AI suggests extra views, select the ones you want to add to the original front photo. Standard is the default, and High detail requests detailed mesh and textures. Studio checks the base mesh for extra ground contacts before paying for rigging. Suspicious meshes stay available as still models for review. For supported four-leg rigs, the worker adapts and exports Lanlao’s current body motions locally. A new Standard job with original photos is estimated at 55 Tripo credits for mesh generation and rigging. When lossless texture compression saves at least 5%, Studio uses a smaller preview and keeps the full GLB available for download. The modeling experiments describe the earlier provider walk workflow. [Modeling research and experiments](review/PHOTO-TO-3D-RESEARCH.md)

## Evidence

```bash
npm test          # 207 regression tests, isolated data, mock providers, no charges
npm run evaluate  # re-runs the 68-case offline command experiment
```

| What we measured | Before | After | What it does **not** show |
| --- | --- | --- | --- |
| Offline command parser, 68 development cases | 28 correct | 64 correct | Not the language model; not a blind test |
| Unwanted moves on 32 "should not move" cases | 29 | 0 | Not a real-world safety rate |
| Action gate replayed on 81 real model outputs | 42 match | 79 match | Same cases guided the fix, so not independent |

Four parser misses and two gate misses are still published on the evidence page. Full records: [review and scoring](review/WAICY-2026-REVIEW.md), [live model review](review/AI-LIVE-REVIEW-2026-11-09.md), [action gate review](review/ai-live-evaluation-2026-11-09/action-guard-review.md), [research → design](review/PET-LOSS-RESEARCH-TO-DESIGN.md).

## Competition materials

Everything for the submission is in [`submission/`](submission/README.md): project description, AI usage statement, three-minute speech, demo script, slide outline and Q&A practice.

## Not done yet

- A controlled paid comparison of the Studio modeling routes and detail profiles ([modeling research](review/PHOTO-TO-3D-RESEARCH.md)).
- Testing on a real phone and with a real microphone.
- Sessions with consenting adult pet owners ([kit](review/human-test-kit/README.md)).
- The public cloud deployment.

## Credits

Pretrained models: Tripo (image-to-3D, rigging, walk animation), OpenAI (language, speech). Libraries: Three.js, Express, sharp, Vite. Images marked *AI illustration* were generated from the owner's photos ([asset notes](ASSETS.md)). AI coding assistants helped write and review code; the student's own contributions are listed in the submission folder. Pawprint is an independent student project with no WAICY endorsement.

Older notes kept for history, not current instructions: [部署与配置说明](部署与配置说明.md), [网页毛发实验说明](网页毛发实验说明.md). The scripts `server/prepare-*.mjs`, `server/publish-*.mjs` and `server/update-xiaoq-reference.mjs` are one-off tools from an earlier Windows machine and are not part of the app.
