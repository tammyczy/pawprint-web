import fs from 'node:fs/promises';
import sharp from 'sharp';

const timing=JSON.parse(await fs.readFile(new URL('./timing.json',import.meta.url),'utf8'));
const width=960,height=540,buffers=[];
for(let index=0;index<timing.frames.length;index++)buffers.push(await sharp(
 `/private/tmp/approach-captures/${String(index).padStart(4,'0')}.jpg`
).resize(width,height).removeAlpha().raw().toBuffer());
const delay=timing.frames.map((time,index)=>index+1<timing.frames.length
 ?Math.max(1,timing.frames[index+1]-time):700);
const output=new URL('./closer-again.webp',import.meta.url);
await sharp(Buffer.concat(buffers),{raw:{width,height:height*buffers.length,channels:3,pageHeight:height}})
 .webp({quality:84,effort:2,loop:0,delay}).toFile(output.pathname);
const metadata=await sharp(output.pathname,{animated:true}).metadata();
console.log({pages:metadata.pages,width:metadata.width,pageHeight:metadata.pageHeight,
 durationMs:metadata.delay.reduce((sum,value)=>sum+value,0)});
