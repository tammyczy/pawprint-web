import './editorial.css';
import './motion.css';
import './interaction-surfaces.css';
import {bindPointerEffects} from './ui/pointer-effects.js';

const markURL=new URL('../public/pawprint-mark-v3.png',import.meta.url).href;
for(const host of document.querySelectorAll('.wordmark-icon,.brand-icon,.demo-mark')){
 const image=new Image();image.src=markURL;image.alt='';image.className='brand-mark';image.width=44;image.height=44;host.replaceChildren(image);
}
for(const brand of document.querySelectorAll('.shell header .brand')){
 const image=new Image();image.src=markURL;image.alt='';image.className='brand-mark';image.width=44;image.height=44;
 const copy=document.createElement('span');copy.className='brand-copy';copy.append(...brand.childNodes);brand.replaceChildren(image,copy);
}
let icon=document.querySelector('link[rel="icon"]');if(!icon){icon=document.createElement('link');icon.rel='icon';document.head.append(icon);}icon.href=markURL;icon.type='image/png';

for (const frame of document.querySelectorAll('#app .stage, .pet-page .stage, .shell .hero .note')) {
 const beam = document.createElement('span');
 beam.className = 'border-beam';
 beam.setAttribute('aria-hidden', 'true');
 frame.append(beam);
}
for (const button of document.querySelectorAll('#app .commands button')) {
 const glow = document.createElement('span');
 glow.className = 'pointer-glow';
 glow.setAttribute('aria-hidden', 'true');
 button.dataset.pointerFx = '';
 button.append(glow);
}
bindPointerEffects();

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const candidates=document.querySelectorAll('.idea-grid,.feature-head,.feature-card,.keepsake-heading,.keepsake-card,.keepsake-note,.demo-section,.journey-strip,.workspace-head,.shell .grid,.job,.controls-heading,.commands,#command-form');
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}},{threshold:.08,rootMargin:'0px 0px -24px 0px'});
 for(const [index,element]of [...candidates].entries()){
  element.classList.add('reveal');element.style.setProperty('--reveal-delay',`${element.matches('.feature-card')?index%3*80:0}ms`);observer.observe(element);
 }
 // Observe newly rendered task cards without disturbing form values or focus.
 const jobs=document.querySelector('#jobs');if(jobs)new MutationObserver(()=>{for(const card of jobs.querySelectorAll('.job:not(.reveal)')){card.classList.add('reveal');observer.observe(card);}}).observe(jobs,{childList:true});
 document.documentElement.classList.add('motion-ready');
}
const progress=document.createElement('div');progress.className='reading-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);
let scrollFrame=0;
function updateProgress(){scrollFrame=0;const range=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${range>0?Math.min(1,scrollY/range):0})`;}
addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateProgress);},{passive:true});addEventListener('resize',updateProgress);updateProgress();
const hero=document.querySelector('.landing .hero');
if(hero&&matchMedia('(hover: hover) and (pointer: fine)').matches){
 let frame=0,x=0,y=0;
 hero.addEventListener('pointermove',event=>{
  if(reduced.matches)return;const box=hero.getBoundingClientRect();x=(event.clientX-box.left)/box.width-.5;y=(event.clientY-box.top)/box.height-.5;
  if(!frame)frame=requestAnimationFrame(()=>{hero.style.setProperty('--pointer-x',`${x*9}px`);hero.style.setProperty('--pointer-y',`${y*7}px`);frame=0;});
 });
 hero.addEventListener('pointerleave',()=>{if(frame)cancelAnimationFrame(frame);frame=0;hero.style.setProperty('--pointer-x','0px');hero.style.setProperty('--pointer-y','0px');});
}
