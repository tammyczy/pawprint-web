import {execFileSync} from 'node:child_process';
import {cp,mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const backend = process.argv[2] ? new URL(process.argv[2]) : null;
if (backend && (backend.protocol !== 'https:' || backend.href !== backend.origin + '/')) {
 throw new Error('Provide the HTTPS origin of the backend.');
}
const stage = await mkdtemp(path.join(tmpdir(), 'pawprint-vercel-'));
const output = path.join(stage, '.vercel', 'output');
const fn = path.join(output, 'functions', 'api', 'family-portrait.func');
await mkdir(fn, {recursive: true});
await cp(new URL('../dist/', import.meta.url), path.join(output, 'static'), {recursive: true});
for (const file of ['family-portrait-vercel.mjs', 'family-portrait.mjs']) {
  await cp(new URL(`../server/${file}`, import.meta.url), path.join(fn, file));
}
await writeFile(path.join(fn, '.vc-config.json'), JSON.stringify({
  runtime: 'nodejs24.x',
  handler: 'family-portrait-vercel.mjs',
  launcherType: 'Nodejs',
  maxDuration: 300
}));
const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
const dependencies = Object.fromEntries(['express', 'multer', 'sharp'].map(name => [
  name, lock.packages[`node_modules/${name}`].version
]));
await writeFile(path.join(fn, 'package.json'), JSON.stringify({private: true, type: 'module', dependencies}));
// Prebuilt functions run on Linux even when the website is built on macOS.
execFileSync('npm', ['install', '--os=linux', '--cpu=x64', '--libc=glibc', '--ignore-scripts',
  '--include=optional', '--no-audit', '--no-fund', '--no-package-lock'], {
  cwd: fn, stdio: ['ignore', 2, 2]
});
const config = {version: 3};
if (backend) {
  config.routes = [{handle: 'filesystem'}, {src: '/api/(.*)', dest: backend.origin + '/api/$1'}];
}
await writeFile(path.join(output, 'config.json'), JSON.stringify(config));
console.log(stage);
