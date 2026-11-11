import fs from 'node:fs/promises';
import sharp from 'sharp';

// Assemble actual browser screenshots at their recorded intervals. No interpolation.
const directory = '/private/tmp/run-repair-captures';
const timing = JSON.parse(await fs.readFile(`${directory}/timing.json`, 'utf8'));
const width = 960;
const height = 540;
const buffers = [];
for (let index = 0; index < timing.frames.length; index += 1) {
  buffers.push(await sharp(`${directory}/${String(index).padStart(4, '0')}.jpg`)
    .resize(width, height).removeAlpha().raw().toBuffer());
}
const delay = timing.frames.map((time, index) => index + 1 < timing.frames.length
  ? Math.max(1, timing.frames[index + 1] - time)
  : 600);
const output = new URL('./come-run-stop.webp', import.meta.url);
await sharp(Buffer.concat(buffers), {
  raw: { width, height: height * buffers.length, channels: 3, pageHeight: height },
}).webp({ quality: 84, effort: 2, loop: 0, delay }).toFile(output.pathname);
const metadata = await sharp(output.pathname, { animated: true }).metadata();
console.log(JSON.stringify({
  output: output.pathname,
  pages: metadata.pages,
  width: metadata.width,
  pageHeight: metadata.pageHeight,
  durationMs: metadata.delay.reduce((sum, value) => sum + value, 0),
  captureDurationMs: timing.frames.at(-1) - timing.frames[0],
  captureAverageFps: (timing.frames.length - 1) * 1000 / (timing.frames.at(-1) - timing.frames[0]),
}, null, 2));
