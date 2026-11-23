import assert from 'node:assert/strict';
import {once} from 'node:events';
import test from 'node:test';
import express from 'express';
import sharp from 'sharp';
import {createFamilyPortraitRouter, PORTRAIT_MODEL} from './server/family-portrait.mjs';

const sample = await sharp({
  create: {width: 192, height: 192, channels: 3, background: '#687e64'}
}).withExif({IFD0: {Artist: 'Private metadata'}}).jpeg().toBuffer();
const photo = new Blob([sample], {type: 'image/jpeg'});
const origin = 'https://pawprint.example';

async function fixture(t, fetchImpl) {
  const app = express();
  app.use('/api/family-portrait', createFamilyPortraitRouter({apiKey: 'test-key', allowedOrigins: [origin], fetchImpl}));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/family-portrait`;
  return {url, submit: (body, site = origin) => fetch(url, {method: 'POST', headers: {origin: site}, body})};
}

function references() {
  const body = new FormData();
  body.append('people', photo, 'private-person-name.jpg');
  body.append('pets', photo, 'private-pet-name.jpg');
  body.append('scene', 'garden');
  body.append('consent', 'yes');
  return body;
}

test('portrait sends ordered, metadata-free references and returns a private JPG', async t => {
  let calls = 0;
  const {url, submit} = await fixture(t, async (address, {body, headers}) => {
    calls++;
    assert.equal(address, 'https://api.openai.com/v1/images/edits');
    assert.equal(headers.Authorization, 'Bearer test-key');
    assert.equal(body.get('model'), PORTRAIT_MODEL);
    assert.equal(body.get('quality'), 'high');
    assert.equal(body.get('size'), '1024x1536');
    assert.equal(body.get('n'), '1');
    assert.match(body.get('safety_identifier'), /^[a-f\d]{64}$/);
    assert.match(body.get('prompt'), /People references are images 1–1\. Pet references are images 2–2\./);
    assert.match(body.get('prompt'), /garden at golden hour/);
    assert.match(body.get('prompt'), /white front paws/);
    const images = body.getAll('image[]');
    assert.deepEqual(images.map(image => image.name), ['person-1.jpg', 'pet-1.jpg']);
    for (const image of images) {
      const meta = await sharp(Buffer.from(await image.arrayBuffer())).metadata();
      assert.equal(meta.exif, undefined);
    }
    return Response.json({data: [{b64_json: sample.toString('base64')}]});
  });
  assert.deepEqual(await (await fetch(url)).json(), {available: true});
  const request = references();
  request.append('format', 'portrait');
  request.append('details', 'One person and one cat with white front paws.');
  const response = await submit(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), sample);
  assert.equal(calls, 1);
});

test('refinement orders the base first, deduplicates originals and preserves other subjects', async t => {
  let calls = 0;
  const {submit} = await fixture(t, async (_address, {body}) => {
    calls++;
    assert.deepEqual(body.getAll('image[]').map(file => file.name), ['portrait-to-edit.jpg', 'person-1.jpg', 'pet-1.jpg']);
    assert.match(body.get('prompt'), /Edit image 1/);
    assert.match(body.get('prompt'), /People references are images 2–2\. Pet references are images 3–3\./);
    assert.match(body.get('prompt'), /Match the white whiskers/);
    assert.match(body.get('prompt'), /Make only that correction/);
    return Response.json({data: [{b64_json: sample.toString('base64')}]});
  });
  for (const [hasBase, instruction] of [[false, 'Match the white whiskers'], [true, '   '], [true, 'x'.repeat(281)]]) {
    const invalid = references();
    if (hasBase) invalid.append('base', photo, 'previous.jpg');
    invalid.append('refinement', instruction);
    const response = await submit(invalid);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {code: 'refinementRequired'});
  }
  const request = references();
  request.append('pets', photo, 'same-pet-different-name.jpg');
  request.append('base', photo, 'previous.jpg');
  request.append('refinement', 'Match the white whiskers');
  const response = await submit(request);
  assert.equal(response.status, 200);
  await response.arrayBuffer();
  assert.equal(calls, 1);
});

test('celebration and art style combine without overriding identity instructions', async t => {
  let calls = 0;
  const {submit} = await fixture(t, async (_address, {body}) => {
    calls++;
    const prompt = body.get('prompt');
    assert.match(prompt, /Lunar New Year family gathering/);
    assert.match(prompt, /hand-painted watercolor/);
    assert.match(prompt, /Preserve asymmetrical markings on their correct side/);
    assert.doesNotMatch(prompt, /photorealistic/i);
    return Response.json({data: [{b64_json: sample.toString('base64')}]});
  });
  const request = references();
  request.set('scene', 'lunar');
  request.append('style', 'watercolor');
  const response = await submit(request);
  assert.equal(response.status, 200);
  await response.arrayBuffer();
  const invalid = references();
  invalid.append('style', '__proto__');
  assert.equal((await submit(invalid)).status, 400);
  assert.equal(calls, 1);
});

test('invalid, unconsented and cross-origin uploads do not call OpenAI', async t => {
  let calls = 0;
  const {submit} = await fixture(t, async () => {calls++;});
  const missingPet = references();
  missingPet.delete('pets');
  const noConsent = references();
  noConsent.delete('consent');
  const badPhoto = references();
  badPhoto.set('pets', new Blob(['not a JPEG'], {type: 'image/jpeg'}), 'pets.jpg');
  const tooMany = references();
  for (let count = 0; count < 3; count++) tooMany.append('people', photo, 'extra.jpg');
  for (const [body, expectedStatus, code] of [
    [missingPet, 400, 'photosRequired'],
    [noConsent, 400, 'consentRequired'],
    [badPhoto, 400, 'invalidPhoto'],
    [tooMany, 413, 'uploadTooLarge']
  ]) {
    const response = await submit(body);
    assert.equal(response.status, expectedStatus);
    assert.deepEqual(await response.json(), {code});
  }
  const blocked = await submit(references(), 'https://other.example');
  assert.equal(blocked.status, 403);
  assert.equal(calls, 0);
});

test('portraits allow repeated and overlapping requests and hide upstream errors', async t => {
  const started = Promise.withResolvers();
  const complete = Promise.withResolvers();
  let calls = 0;
  const {submit} = await fixture(t, async () => {
    if (++calls === 1) {
      started.resolve();
      return complete.promise;
    }
    return Response.json({data: [{b64_json: sample.toString('base64')}]});
  });
  const first = submit(references());
  await started.promise;
  try {
    for (let count = 0; count < 4; count++) {
      const response = await submit(references());
      assert.equal(response.status, 200);
      await response.arrayBuffer();
    }
  } finally {
    complete.resolve(Response.json({error: {code: 'moderation_blocked', message: 'private upstream details'}}, {status: 400}));
  }
  const failed = await first;
  assert.equal(failed.status, 422);
  assert.deepEqual(await failed.json(), {code: 'photoRejected'});
  assert.equal(calls, 5);
});
