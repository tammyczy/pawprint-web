import fs from 'node:fs/promises';
import sharp from 'sharp';

// Assemble actual browser screenshots, preserving their half-speed capture timing.
const directory=new URL('./',import.meta.url);
const timing=JSON.parse(await fs.readFile(new URL('capture-timing.json',directory),'utf8'));
const frames=[];
for(let i=0;i<timing.length;i++){
 frames.push(await sharp(`/private/tmp/hind-comparison/${String(i).padStart(4,'0')}.jpg`)
  .resize(960,540).removeAlpha().raw().toBuffer());
}
const delay=timing.map((time,i)=>i===timing.length-1?700:Math.max(10,timing[i+1]-time));
await sharp(Buffer.concat(frames),{raw:{width:960,height:540*frames.length,channels:3,pageHeight:540}})
 .webp({quality:84,effort:2,loop:0,delay})
 .toFile(new URL('hind-step-comparison.webp',directory).pathname);
const metadata=await sharp(new URL('hind-step-comparison.webp',directory).pathname,{animated:true}).metadata();
console.log(JSON.stringify({pages:metadata.pages,width:metadata.width,pageHeight:metadata.pageHeight,duration:metadata.delay.reduce((a,b)=>a+b,0)},null,2));
