import {useEffect} from 'react';
import {AudioLines, BellOff, Boxes, Camera, HeartHandshake, LockKeyhole, MessagesSquare, PawPrint, ScanLine, ShieldCheck} from 'lucide';
import SplitText from '../reactbits/SplitText.jsx';
import BlurText from '../reactbits/BlurText.jsx';
import CountUp from '../reactbits/CountUp.jsx';
import SpotlightCard from '../reactbits/SpotlightCard.jsx';
import Aurora from '../reactbits/Aurora.jsx';
import ShinyText from '../reactbits/ShinyText.jsx';
import AnimatedContent from '../reactbits/AnimatedContent.jsx';
import Magnet from '../reactbits/Magnet.jsx';
import ClickSpark from '../reactbits/ClickSpark.jsx';
import Icon from '../ui/Icon.jsx';
import SiteNav from '../ui/SiteNav.jsx';
import {bindPointerEffects} from '../ui/pointer-effects.js';
import ExplorePawprint from './ExplorePawprint.jsx';

const links = [
 ['/family-portrait.html', 'Family portraits'],
 ['#problem', 'Problem'],
 ['#ai', 'How the AI works'],
 ['#tested', 'Tested'],
 ['#ethics', 'Ethics'],
 ['#limits', 'Limits']
];

// Each section answers one line of the WAICY AI Showcase rubric. The order
// follows the talk: problem, idea, how the AI works, how it was tested,
// ethics, design, and what is original or still unproven.
const stats=[
 {value:<CountUp to={94} suffix=" million" />,label:'U.S. households live with a pet. Nearly every one will one day say goodbye.',source:'APPA, 2025',href:'https://americanpetproducts.org/news/the-american-pet-products-association-appa-releases-2025-state-of-the-industry-report-archive'},
 {value:<CountUp to={7.5} decimals={1} suffix="%" />,label:'of UK adults whose hardest loss was a pet reported signs of prolonged grief. The study did not include young people.',source:'Hyland, PLOS ONE, 2026',href:'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0339213'},
 {value:'“Just a pet.”',label:'Current guidelines do not allow prolonged grief disorder to be diagnosed after a pet dies, and mourners often hear exactly this.',source:'Maynooth University',href:'https://www.maynoothuniversity.ie/node/562044'}
];
const models=[
 {icon:ScanLine,tag:'SEEING',title:'Photos become a shape',text:'An image-to-3D model infers a whole body from flat photos, including sides the camera never saw. Because it guesses, a person must approve the result.',ai:'Tripo image-to-3D',app:'Consent, private storage, budget, human review'},
 {icon:MessagesSquare,tag:'UNDERSTANDING',title:'Words become one action',text:'“It’s lonely here, could you come sit with me?” No button understands that. A language model does, and returns a short reply plus one action from a fixed list.',ai:'OpenAI language model',app:'Reply checks, action gate, fixed privacy answer'},
 {icon:AudioLines,tag:'SPEAKING',title:'A reply becomes a voice',text:'A speech model reads the reply aloud in a voice that is always labeled synthetic. It is not a clone of any pet.',ai:'OpenAI text-to-speech',app:'Play, replay, stop, text-only alternative'}
];
const ideas=[
 ['Perception','The 3D model “sees” a dog’s shape in a photo; speech recognition hears a sentence.'],
 ['Representation & reasoning','A sentence becomes a small form: reply, action, sound. Rules then ask: did the person request this?'],
 ['Learning','All three models learned from large datasets before we used them. We trained none of them.'],
 ['Natural interaction','Type or speak in Chinese, English or French, and hear an answer.'],
 ['Societal impact','Grieving people are vulnerable, so honesty and control come before realism.']
];
const proof=[
 {value:<CountUp to={207} />,label:'automatic tests run offline with mock providers, so they cost nothing.'},
 {value:<><span className="was">29</span><span className="arrow" aria-hidden="true">→</span><span>0</span></>,label:'unwanted moves on 32 “should not move” sentences, after rewriting the offline rules.'},
 {value:<><CountUp to={79} /><span className="of"> / 81</span></>,label:'real model answers where the action gate now agrees with the expected action.'}
];
const promises=[
 [ShieldCheck,'No pretending','Your companion always says it is an AI simulation. It is told never to claim the real pet’s thoughts or memories.'],
 [BellOff,'No pull to come back','No notifications, no streaks, and no “I miss you.” You choose when to visit, and you can say goodbye.'],
 [LockKeyhole,'Your photos, your choice','Location data is removed on upload. Nothing is sent for 3D generation without your consent.'],
 [HeartHandshake,'Real people first','A message about self-harm is never answered by the AI. The page shows ways to reach people who can help.']
];

function Heading({kicker,text}){
 return <header className="section-head">
  <span className="kicker">{kicker}</span>
  <SplitText tag="h2" text={text} splitType="words" delay={55} duration={.9} textAlign="left" className="h2" rootMargin="-60px" />
 </header>;
}

export default function Home(){
 useEffect(bindPointerEffects, []);
 return <ClickSpark sparkColor={['#f4ddaa','#b4d9c2']} sparkSize={8} sparkRadius={25} sparkCount={8} duration={500} glow={0.35}>
  <a className="skip-link" href="#main">Skip to content</a>
  <SiteNav links={links} />

  <main id="main" tabIndex={-1}>
   <section className="hero" aria-labelledby="hero-title" data-pointer-fx="">
    <img className="hero-art" src="/art/hero-pomeranian-1774.webp" srcSet="/art/hero-pomeranian-960.webp 960w, /art/hero-pomeranian-1774.webp 1774w" sizes="(max-width: 800px) 100vw, 91vw" width="1774" height="1183" fetchPriority="high" alt="A fluffy white Pomeranian walks toward the camera beside a printed photo of the same dog, joined by a faint trail of golden light." />
    <div className="hero-shade" aria-hidden="true" />
    <div className="hero-dust" aria-hidden="true" />
    <span className="pointer-glow" aria-hidden="true" />
    <div className="hero-inner"><div className="hero-copy">
     <ShinyText className="eyebrow" text="AN AI SIMULATION · NEVER A RESURRECTION" color="#cfdccf" shineColor="#f6dfa4" speed={4} />
     <h1 className="h1" id="hero-title"><span>A little closer,</span>{' '}<em>always.</em></h1>
     <p className="lede">Pawprint is an honest AI companion for remembering a pet. Photos become a 3D friend you can talk to, pet, and say goodbye to, on your own terms.</p>
     <div className="actions">
      <Magnet padding={28} magnetStrength={7}><a className="button primary" href="/app.html?lang=en"><Icon icon={PawPrint} />Meet Lanlao</a></Magnet>
      <a className="button ghost" href="/family-portrait.html"><Icon icon={Camera} />Make a family portrait</a>
     </div>
    </div></div>
    <p className="art-note"><Icon icon={ScanLine} size={15} />AI illustration · based on a real pet’s photos</p>
   </section>

   <ExplorePawprint />

   <section id="problem" className="band paper" aria-label="The problem">
    <Heading kicker="THE PROBLEM" text="A real grief, rarely recognized." />
    <BlurText className="statement" text="When a pet dies, people are often told it was just a dog. But the sadness is real, and a photo cannot show what being with them felt like." delay={45} stepDuration={.3} />
    <div className="grid three">
     {stats.map((item,index)=><AnimatedContent key={item.source} distance={50} delay={index*.1}>
      <SpotlightCard theme="light" className="card stat" spotlightColor="#d9b56a" style={{'--spotlight-card-surface':'#fffdf8'}}>
       <div className="figure">{item.value}</div><p>{item.label}</p><a className="source" href={item.href} target="_blank" rel="noopener noreferrer">{item.source}</a>
      </SpotlightCard>
     </AnimatedContent>)}
    </div>
   </section>

   <section id="ai" className="band forest" aria-label="How the AI works">
    <Heading kicker="HOW THE AI WORKS" text="Three models. One rule." />
    <p className="rule"><ShinyText text="The AI suggests. The program decides." color="#f5f1e6" shineColor="#e7c676" speed={3.5} /></p>
    <div className="grid three">
     {models.map((item,index)=><AnimatedContent key={item.tag} distance={50} delay={index*.1}>
      <SpotlightCard className="card model" spotlightColor="#d9b56a" style={{'--spotlight-card-surface':'#17382f','--spotlight-card-border':'rgba(245,241,230,.14)'}}>
       <span className="card-label"><Icon icon={item.icon} size={22} /><span className="tag">{item.tag}</span></span>
       <h3>{item.title}</h3><p>{item.text}</p>
       <dl><div><dt>AI</dt><dd>{item.ai}</dd></div><div><dt>Our code</dt><dd>{item.app}</dd></div></dl>
      </SpotlightCard>
     </AnimatedContent>)}
    </div>
    <div className="ideas" aria-label="The Five Big Ideas in AI, as used in Pawprint">
     <h3>The Five Big Ideas, in this project</h3>
     <AnimatedContent distance={18}><ol>{ideas.map(([name,text])=><li key={name}><strong>{name}</strong><span>{text}</span></li>)}</ol></AnimatedContent>
    </div>
   </section>

   <section id="tested" className="band paper" aria-label="How it was tested">
    <Heading kicker="TESTED, AND STILL HONEST" text="It failed twice. Then we measured." />
    <div className="failures">
     <AnimatedContent distance={40}><article><span className="tag clay">FAILURE 1 · KEYWORDS</span><p className="quote">“Don’t run.”</p><p>The first version only looked for keywords. It saw “run”, and the dog ran. The rules were rewritten to read the whole sentence first.</p></article></AnimatedContent>
     <AnimatedContent distance={40} delay={.1}><article><span className="tag clay">FAILURE 2 · THE REAL AI</span><p className="quote">“I miss you so much.”</p><p>Nobody asked the dog to move, but the language model sent him bounding over with a happy bark. Now an action gate checks every move against what the person really said.</p></article></AnimatedContent>
    </div>
    <div className="grid three">
     {proof.map((item,index)=><AnimatedContent key={index} distance={50} delay={index*.1}>
      <SpotlightCard theme="light" className="card stat" spotlightColor="#2f6b55" style={{'--spotlight-card-surface':'#fffdf8'}}>
       <div className="figure">{item.value}</div><p>{item.label}</p>
      </SpotlightCard>
     </AnimatedContent>)}
    </div>
    <p className="fineprint">These sentences were also used to make the fixes, so they are practice, not a blind exam. Four parser misses and two gate misses are still published. <a href="/judge.html">Read every case on the evidence page</a></p>
   </section>

   <section id="ethics" className="band sage" aria-label="Ethics">
    <Heading kicker="ETHICS" text="Remembering, honestly." />
    <p className="intro">Researchers warn that AI “griefbots” can make people dependent. So Pawprint is built around four promises.</p>
    <div className="grid four">
     {promises.map(([icon,title,text],index)=><AnimatedContent key={title} distance={40} delay={index*.08}>
      <SpotlightCard theme="light" className="card promise" spotlightColor="#a66b4e" style={{'--spotlight-card-surface':'#fbfaf4'}}>
       <span className="promise-icon"><Icon icon={icon} size={26} /></span><h3>{title}</h3><p>{text}</p>
      </SpotlightCard>
     </AnimatedContent>)}
    </div>
   </section>

   <section id="design" className="band paper keepsakes" aria-label="Design">
    <Heading kicker="DESIGN" text="A little presence. Something to hold." />
    <div className="split">
     <div>
      <p className="intro">Lanlao breathes, blinks and glances around on his own, with timing drawn from published studies of real dogs. His paws stay planted when he walks. Every animated control has a text or button alternative, and motion is reduced when your device asks for it.</p>
      <p className="intro">The idea also reaches beyond the screen. These two ceramic tea companions were handmade by the creator in Jingdezhen: an early look at how a pet’s character could become an everyday object.</p>
      <p className="fineprint">Display images recreated with AI from the creator’s own photographs.</p>
     </div>
     <div className="pair" id="keepsakes">
      <AnimatedContent distance={36}><figure><div className="keepsake-image"><img src="/jingdezhen-white-pup.png" alt="Handmade white ceramic dog with pink ears and a smiling face." loading="lazy" width="1120" height="1400" /></div><figcaption>A familiar little smile</figcaption></figure></AnimatedContent>
      <AnimatedContent distance={36} delay={.12}><figure><div className="keepsake-image"><img src="/jingdezhen-little-pup.png" alt="Small handmade cream ceramic puppy with painted eyes and a black nose." loading="lazy" width="1120" height="1400" /></div><figcaption>Quiet company, every day</figcaption></figure></AnimatedContent>
     </div>
    </div>
   </section>

   <section id="limits" className="band forest limits" aria-label="Contributions and limits">
    <Heading kicker="WHAT IS OURS, AND WHAT IS NOT PROVEN" text="Honest about the edges." />
    <div className="grid two">
     <AnimatedContent distance={40}><div className="list"><h3>Who made what</h3><ul>
      <li><strong>Pretrained models:</strong> Tripo (image-to-3D, rigging, walk), OpenAI (language, speech).</li>
      <li><strong>This project:</strong> the honest-memorial idea, the four promises, the action gate, the privacy and distress rules, Lanlao’s behaviour, and the experiments.</li>
      <li><strong>Help received:</strong> AI coding assistants helped write and review the code. Three.js renders the 3D scene.</li>
     </ul></div></AnimatedContent>
     <AnimatedContent distance={40} delay={.1}><div className="list"><h3>Not proven yet</h3><ul>
      <li>Whether Pawprint actually helps anyone who is grieving. No user study has been run.</li>
      <li>How well a brand-new pet is reconstructed. Lanlao is a finished example, not a typical result.</li>
      <li>Behaviour on real phones and with real microphones.</li>
     </ul></div></AnimatedContent>
    </div>
   </section>

   <section className="closing" aria-label="Try it">
    <div className="aurora" aria-hidden="true">
     <Aurora colorStops={['#164934','#83ad88','#d9b56a','#27664d']} amplitude={1.15} blend={.68} speed={.7} layers={2} direction="bottom" height={.51} dpr={.9} mouseInteraction={false} />
    </div>
    <div className="closing-copy">
     <SplitText tag="h2" text="A photo keeps how they looked. Pawprint keeps a little of how it felt." splitType="words" delay={50} duration={.9} textAlign="center" className="h2" />
     <div className="actions center">
      <Magnet padding={28} magnetStrength={7}><a className="button primary" href="/app.html?lang=en"><Icon icon={PawPrint} />Meet Lanlao</a></Magnet>
      <a className="button ghost" href="/studio.html?lang=en"><Icon icon={Boxes} />Create a pet</a>
     </div>
    </div>
   </section>
  </main>

  <footer className="footer">
   <div><strong>Pawprint</strong><span>An independent student project for WAICY 2026 · AI Showcase. Not affiliated with WAICY.</span></div>
   <nav aria-label="Pages"><a href="/app.html?lang=en">Meet Lanlao</a><a href="/family-portrait.html">Family portraits</a><a href="/judge.html">Evidence</a><a href="/studio.html?lang=en">Studio</a><a href="https://www.waicy.org/" target="_blank" rel="noopener noreferrer">About WAICY</a></nav>
  </footer>
 </ClickSpark>;
}
