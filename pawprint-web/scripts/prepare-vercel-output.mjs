import {cp,mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const backend = new URL(process.argv[2]);
if (backend.protocol !== 'https:' || backend.href !== backend.origin + '/') {
 throw new Error('Provide the HTTPS origin of the backend.');
}
const stage = await mkdtemp(path.join(tmpdir(), 'pawprint-vercel-'));
const output = path.join(stage, '.vercel', 'output');
await mkdir(output, {recursive:true});
await cp(new URL('../dist/', import.meta.url), path.join(output, 'static'), {recursive:true});
await writeFile(path.join(output, 'config.json'), JSON.stringify({
 version:3,
 routes:[{src:'/api/(.*)',dest:backend.origin+'/api/$1'}]
}));
console.log(stage);
