import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Presentation, PresentationFile} from '@oai/artifact-tool';
const root='/Users/ziyi/Documents/ChatGPT/Joshua/pawprint-web';
const work=path.join(root,'review/presentation-build');
const output=path.join(root,'review/presentation-output');
const skill='/Users/ziyi/.codex/plugins/cache/openai-primary-runtime/presentations/26.1030.10813/skills/presentations';
const p=Presentation.create({slideSize:{width:1280,height:720}});
const ink='#263A32', muted='#5D6B61', cream='#F7F5EF', ochre='#AF8066', white='#FFFFFF';
function box(slide, text,x,y,w,h,size=32,color=ink,bold=false,font='Arial') {
 const sh=slide.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 sh.text=text; sh.text.style={fontFamily:font,fontSize:size,color,bold,verticalAlignment:'middle',wrap:true}; return sh;
}
function base(title,n){let s=p.slides.add();s.background.fill=cream;box(s,title,74,53,1100,72,42,ink,true);box(s,'PAWPRINT   /   WAICY 2026',74,671,500,20,13,muted,true);box(s,String(n).padStart(2,'0'),1160,671,50,20,13,muted);return s;}
async function pic(s,file,x,y,w,h){let b=await fs.readFile(file);s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt:'Pawprint project imagery',fit:'cover',position:{left:x,top:y,width:w,height:h}})}
let s=p.slides.add();s.background.fill=cream;
await pic(s,path.join(root,'public/pawprint-hero-v2.png'),690,0,590,720);
box(s,'PAWPRINT',74,90,500,40,21,muted,true);box(s,'Remembering\nthe little moments',74,195,610,195,61,ink,true);box(s,'An interactive digital keepsake',78,432,535,44,26,muted);box(s,'WAICY 2026  ·  AI SHOWCASE',78,626,520,30,16,ochre,true);
s.speakerNotes.text='Hello, my name is [your name]. Today I want to introduce Pawprint. Imagine coming home and seeing a photograph of your pet. You remember its face, and the little moments a photo cannot show: coming when you called, or wagging its tail at the door. Could technology offer another way to remember them?';
s=base('The moments behind a photograph',2);
box(s,'A photo preserves a face.\nWe also remember the small moments.',78,175,780,150,43,ink,true);
box(s,'Pawprint explores a way to revisit those memories through a digital keepsake.',80,382,660,100,25,muted);
await pic(s,path.join(root,'public/jingdezhen-little-pup.png'),900,170,300,360);
s.speakerNotes.text='For someone who has lost a pet, ordinary moments can mean a great deal. Pawprint explores an interactive digital keepsake using pet photos, a 3D character, and the owner’s own memories. The idea is to offer another way to revisit those memories. The illustration is project artwork, not evidence of user outcomes.';
s=base('Pawprint experience',3);
await pic(s,path.join(root,'qa/home-v3.png'),72,150,710,470);
box(s,'A demonstration companion',830,177,350,90,32,ink,true);box(s,'Interact at your own pace.\nStop whenever you choose.\nWrite a memory in your own words.',830,300,365,180,25,muted);box(s,'A digital simulation',830,530,360,35,23,ochre,true);
s.speakerNotes.text='This is Lanlao, our demonstration companion. People can interact, stop whenever they choose, and write down a memory. The character is a simulation. It cannot bring a pet back or reveal what the animal really thinks. A new candidate model needs its own review and does not automatically have all of Lanlao’s animations.';
s=base('How AI contributes',4);
box(s,'01',80,155,80,45,26,ochre,true);box(s,'Photos to 3D',180,148,360,45,32,ink,true);box(s,'Tripo creates a candidate model.\nA person reviews the result.',180,202,440,85,23,muted);
box(s,'02',710,155,80,45,26,ochre,true);box(s,'Conversation',810,148,380,45,32,ink,true);box(s,'A language model proposes a reply\nand an allowed action.',810,202,390,85,23,muted);
box(s,'03',80,370,80,45,26,ochre,true);box(s,'Owner memories',180,363,360,45,32,ink,true);box(s,'AI can organize an optional draft.\nThe owner checks it against the original.',180,417,460,90,23,muted);
box(s,'04',710,370,80,45,26,ochre,true);box(s,'Voice and movement',810,363,390,45,32,ink,true);box(s,'Synthetic speech reads a reply.\nApplication code plays existing animation.',810,417,395,90,23,muted);
box(s,'External pretrained services + application controls',80,595,1100,32,20,ochre,true);
s.speakerNotes.text='With permission, photos can be sent to Tripo, an external AI service, to create a candidate 3D model. A person must review it because AI may invent unseen details. A language model proposes a short reply and an action; our application validates it and maps allowed actions to existing animation. Three.js renders the character, and a separate service provides synthetic speech. The owner may also ask AI to organize a memory. Matching excerpts are shown, but the owner must check the draft. The project uses external pretrained models; it did not train a foundation model.';
s=base('Testing the offline command parser',5);
box(s,'28 / 68',90,190,400,90,71,ochre,true);box(s,'before revisions',95,280,370,45,24,muted);box(s,'64 / 68',590,190,400,90,71,ink,true);box(s,'after revisions',595,280,360,45,24,muted);
box(s,'Expected-action matches on development examples',90,350,1000,46,27,ink,true);
box(s,'Among 32 negative examples, unwanted actions fell from 29 to 0.\nFour expected actions remained unmatched.',90,430,1060,86,23,muted);
box(s,'Development set used for fixes; not an independent test or a language-model score.',90,583,1090,48,18,ochre,true);
s.speakerNotes.text='We tested a separate offline command parser. On 68 development examples, expected-action matches rose from 28 to 64 after revisions. Among 32 negative examples, unwanted actions fell from 29 to zero. Four expected actions were still missed. These examples helped us make fixes, so this is not an independent accuracy score and does not measure the language model. Source: review/SUBMISSION-KIT.md and the project evidence page.';
s=base('Choice, honesty and next steps',6);
box(s,'Users stay in control',78,153,500,48,33,ink,true);box(s,'Choose text or buttons. Stop an interaction.\nReview an optional AI memory draft.',78,211,550,93,24,muted);
box(s,'Privacy and limits',78,345,500,48,33,ink,true);box(s,'External services process submitted data.\nLocal deletion does not guarantee provider deletion.\nNo therapeutic effect has been established.',78,403,590,125,23,muted);
box(s,'What comes next',754,153,450,48,33,ink,true);box(s,'An independent language-model test.\nA usability comparison with a static photo,\nwith consenting adults.',754,211,450,130,24,muted);
box(s,'A thoughtful way to remember,\nwith the person in control.',754,439,450,110,31,ochre,true);
s.speakerNotes.text='Users can choose text or buttons, stop an interaction and decide whether to request a memory draft. Photos and text sent to external services have privacy implications; local deletion does not guarantee provider deletion. Pawprint is a creative keepsake, not a treatment, and we have not established an effect on grief or wellbeing. Next we plan an independent language-model test and a usability comparison with a static photo, involving consenting adults. My verified contribution was [describe your actual work]. We acknowledge external services, existing assets and AI assistance. Thank you.';
for(let i=0;i<p.slides.items.length;i++){let png=await p.export({slide:p.slides.items[i],format:'png',scale:1});await fs.writeFile(path.join(work,`slide-${i+1}.png`),new Uint8Array(await png.arrayBuffer()));}
let draft=path.join(work,'draft.pptx');await (await PresentationFile.exportPptx(p)).save(draft);
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
let result=await finalizePresentation({workspaceDir:root,candidatePath:draft,finalPath:path.join(output,'Pawprint_WAICY_Presentation.pptx'),pythonExecutable:'/Users/ziyi/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],fontPolicy:{basis:'design',families:['Aptos']},verifyArtifactToolImport:true,receiptPath:path.join(work,'validation.json')});console.log(JSON.stringify(result));
