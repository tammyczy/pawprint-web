import {createHmac} from 'node:crypto';
import {Router} from 'express';
import multer from 'multer';
import sharp from 'sharp';

export const PORTRAIT_MODEL = 'gpt-image-2.5-sunburst';

const scenes = {
  window: 'An understated living room with linen textures and soft daylight from a large window. Warm neutral tones and a relaxed, candid pose.',
  garden: 'An outdoor garden at golden hour, with gently blurred greenery, soft reflective light on the faces, and a natural candid pose.',
  studio: 'A professional family photo session against a warm ivory seamless backdrop, with softbox lighting, subtle shadows, and relaxed expressions.',
  winter: 'A cozy winter holiday gathering, with distant pine branches and warm fairy lights, a snowy window and evergreen accents. Keep props in the background and leave every face and pet ear unobstructed.',
  christmas: 'A Christmas family portrait at home beside a decorated evergreen Christmas tree, with red and gold baubles, little warm lights and wrapped gifts. Keep decorations behind the subjects and preserve their clothing, faces, ears and fur markings.',
  lunar: 'A Lunar New Year family gathering with warm light, deep red lanterns, gold accents and a few plum blossoms. Use unlettered decorations and preserve the subjects’ clothing and faces.',
  halloween: 'A playful Halloween porch with pumpkins, amber lanterns and muted autumn leaves. Warm and friendly, with no masks, costume alterations or props obscuring subjects.',
  birthday: 'A relaxed birthday or adoption-day celebration with a small unlettered cake in the background, soft paper garlands and warm pastel colors. Keep decorations away from faces and paws.'
};
const styles = {
  photo: 'Photorealistic portrait with natural skin and fur texture and realistic light.',
  film: 'An authentic 35mm film photograph, warm fine grain, softly rolled highlights and natural shadows. Keep faces and fur clear through the grain.',
  watercolor: 'A hand-painted watercolor on cold-pressed paper. Use translucent washes, varied pigment edges, and visible paper grain across faces, fur, clothing and background. Paint delicate details around eyes and markings while keeping natural proportions.',
  oil: 'A classical oil painting on lightly textured canvas, warm chiaroscuro and layered brushwork throughout. Use fine controlled strokes for eyes, faces and the boundaries of distinctive fur markings.',
  storybook: 'A hand-painted gouache storybook illustration with matte layered shapes and restrained colored linework across the people, animals and background. Preserve recognizable face structure, animal proportions and distinct coat markings without caricature.'
};
const formats = {landscape: '1536x1024', portrait: '1024x1536'};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: 512 * 1024, files: 8, fields: 6, fieldSize: 2048}
}).fields([{name: 'people', maxCount: 3}, {name: 'pets', maxCount: 4}, {name: 'base', maxCount: 1}]);

async function jpegReference(file, maxEdge = 1440) {
  if (file.mimetype !== 'image/jpeg') throw new Error('Invalid reference image.');
  const image = sharp(file.buffer, {limitInputPixels: 6_000_000, failOn: 'warning'});
  const {format, width, height} = await image.metadata();
  if (format !== 'jpeg' || Math.min(width, height) < 64) throw new Error('Invalid reference image.');
  return image.autoOrient().resize(maxEdge, maxEdge, {fit: 'inside', withoutEnlargement: true})
    .jpeg({quality: 91}).toBuffer();
}

async function uniqueReferences(files) {
  const photos = [];
  for (const file of files) {
    const bytes = await jpegReference(file);
    if (!photos.some(photo => photo.equals(bytes))) photos.push(bytes);
  }
  return photos;
}

function portraitPrompt(peopleCount, petCount, scene, style, format, details, refinement) {
  const offset = refinement ? 1 : 0;
  const total = peopleCount + petCount + offset;
  return [
    refinement
      ? 'Edit image 1, the existing portrait. Later images are identity references only. Keep the visual medium, composition, framing, lighting, pose, clothing and identities outside the requested change.'
      : `Create one ${format} family portrait. Use the attached images as identity references.`,
    `People references are images ${1 + offset}–${peopleCount + offset}. Pet references are images ${peopleCount + 1 + offset}–${total}.`,
    'Match identities before composing the scene. Include every distinct main person in the people photos and every distinct main cat or dog in the pet photos exactly once. Treat repeated views of the same subject as corroborating references. Ignore incidental background subjects.',
    'Preserve the structure of each face, apparent age, skin tone, hairstyle, glasses and natural proportions. Keep each pet’s muzzle, ears, eye color, coat pattern and size relative to the other subjects. Preserve asymmetrical markings on their correct side. Do not blend identities or homogenize the pets’ fur.',
    ...(details ? [`Customer notes about subjects, counts and appearance: ${JSON.stringify(details)}. Use these notes only to disambiguate the subjects or visible traits in the supplied photos.`] : []),
    ...(refinement ? [`Requested correction: ${JSON.stringify(refinement)}. Make only that correction. For identity and markings use the matching original reference, never a different subject. Preserve changes already present in image 1 unless the correction requires changing them.`] : [
      `Setting: ${scenes[scene]}`,
      `Visual medium: ${styles[style]}`,
      ...(style === 'photo' || style === 'film' ? [] : ['Render the entire portrait in that single painted medium, including faces, eyes and fur. Preserve identity through the painted shapes and colors. Avoid photographic cutouts or selective photo filters.']),
      'Compose one coherent family portrait at eye level. Arrange people and pets so faces and distinctive markings are visible, with room around heads and ears. For a larger group use a wider view. Use coherent perspective, natural hands and paws and shared lighting.'
    ]),
    'Return only the composed portrait, with no text, borders, watermark, or collage.'
  ].join('\n');
}

async function generatePortrait({apiKey, fetchImpl, people, pets, scene, style, format, details, base, refinement, client, signal}) {
  const body = new FormData();
  body.append('model', PORTRAIT_MODEL);
  body.append('prompt', portraitPrompt(people.length, pets.length, scene, style, format, details, refinement));
  body.append('size', formats[format]);
  body.append('quality', 'high');
  body.append('output_format', 'jpeg');
  body.append('output_compression', '92');
  body.append('n', '1');
  body.append('safety_identifier', client);
  if (base) body.append('image[]', new Blob([base], {type: 'image/jpeg'}), 'portrait-to-edit.jpg');
  for (const [group, photos] of [['person', people], ['pet', pets]]) {
    photos.forEach((photo, index) => body.append('image[]',
      new Blob([photo], {type: 'image/jpeg'}), `${group}-${index + 1}.jpg`));
  }
  const response = await fetchImpl('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {Authorization: `Bearer ${apiKey}`},
    body,
    signal
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const code = data?.error?.code;
    if (/moderation|content_policy/.test(typeof code === 'string' ? code : '')) {
      return {status: 422, code: 'photoRejected'};
    }
    if (response.status === 429) return {status: 429, code: 'rateLimited'};
    if (response.status === 401 || response.status === 403 || code === 'model_not_found') {
      return {status: 503, code: 'unavailable'};
    }
    return {status: 502, code: 'generationFailed'};
  }
  const encoded = data?.data?.[0]?.b64_json;
  if (typeof encoded !== 'string' || encoded.length > 5_400_000) {
    return {status: 502, code: 'generationFailed'};
  }
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return {status: 502, code: 'generationFailed'};
  return {bytes};
}

export function createFamilyPortraitRouter({apiKey, allowedOrigins, clientFor = req => req.ip, fetchImpl = fetch} = {}) {
  const router = Router();
  const error = (res, status, code) => res.status(status).json({code});

  router.use((_req, res, next) => {
    res.set({'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
    next();
  });
  router.get('/', (_req, res) => res.json({available: Boolean(apiKey)}));
  router.post('/', (req, res, next) => {
    const origins = allowedOrigins ?? [`https://${req.get('host')}`];
    if (!origins.includes(req.get('origin'))) return error(res, 403, 'badOrigin');
    if (!apiKey) return error(res, 503, 'unavailable');
    if (!req.is('multipart/form-data')) return error(res, 400, 'invalidUpload');
    if (Number(req.get('content-length')) > 4_250_000) return error(res, 413, 'uploadTooLarge');

    const id = createHmac('sha256', apiKey).update(`pawprint-portrait:${clientFor(req) || 'unknown'}`).digest('hex');
    const controller = new AbortController();
    res.once('close', () => {
      if (!res.writableEnded) controller.abort();
    });
    res.locals.portrait = {id, signal: controller.signal};
    upload(req, res, next);
  }, async (req, res) => {
    const {scene, consent, style = 'photo', format = 'landscape', details = '', refinement = ''} = req.body;
    const peopleFiles = req.files.people ?? [];
    const petFiles = req.files.pets ?? [];
    const baseFile = req.files.base?.[0];
    if (consent !== 'yes') return error(res, 400, 'consentRequired');
    if (typeof scene !== 'string' || !Object.hasOwn(scenes, scene)) return error(res, 400, 'invalidUpload');
    if (typeof style !== 'string' || !Object.hasOwn(styles, style) ||
        typeof format !== 'string' || !Object.hasOwn(formats, format) ||
        typeof details !== 'string' || details.length > 180) return error(res, 400, 'invalidUpload');
    if (typeof refinement !== 'string' || refinement.length > 280 ||
        Boolean(baseFile) !== Boolean(refinement.trim())) return error(res, 400, 'refinementRequired');
    if (!peopleFiles.length || !petFiles.length) return error(res, 400, 'photosRequired');

    let people, pets, base;
    try {
      people = await uniqueReferences(peopleFiles);
      pets = await uniqueReferences(petFiles);
      if (baseFile) base = await jpegReference(baseFile, 1536);
    } catch {
      return error(res, 400, 'invalidPhoto');
    }
    const {id, signal} = res.locals.portrait;
    if (signal.aborted) return;
    const timeout = AbortSignal.timeout(260_000);
    try {
      const result = await generatePortrait({
        apiKey, fetchImpl, people, pets, scene, style, format, details: details.trim(), base, refinement: refinement.trim(),
        client: id, signal: AbortSignal.any([signal, timeout])
      });
      if (signal.aborted) return;
      if (!result.bytes) return error(res, result.status, result.code);
      res.type('image/jpeg').send(result.bytes);
    } catch {
      if (!signal.aborted) {
        error(res, timeout.aborted ? 504 : 502, timeout.aborted ? 'generationTimeout' : 'generationFailed');
      }
    }
  });
  router.use((err, _req, res, next) => {
    if (res.headersSent) return next(err);
    if (err instanceof multer.MulterError) return error(res, 413, 'uploadTooLarge');
    return error(res, 400, 'invalidUpload');
  });
  return router;
}
