import SplitText from '../reactbits/SplitText.jsx';
import BlurText from '../reactbits/BlurText.jsx';
import CountUp from '../reactbits/CountUp.jsx';
import SpotlightCard from '../reactbits/SpotlightCard.jsx';
import Aurora from '../reactbits/Aurora.jsx';
import ShinyText from '../reactbits/ShinyText.jsx';
import AnimatedContent from '../reactbits/AnimatedContent.jsx';
import Magnet from '../reactbits/Magnet.jsx';
import ClickSpark from '../reactbits/ClickSpark.jsx';
import markURL from '../../public/pawprint-mark-v3.png';

// Each section answers one line of the WAICY AI Showcase rubric. The order
// follows the talk: problem, idea, how the AI works, how it was tested,
// ethics, design, and what is original or still unproven.
const tour=[
 {step:'01',title:'Meet Lanlao',text:'Talk to the 3D companion, ask him to come closer, pet him, and stop him at any time.',href:'/app.html?lang=en',cta:'Open the demo'},
 {step:'02',title:'See the evidence',text:'The architecture, every experiment, and the mistakes that are still not fixed.',href:'/judge.html',cta:'Open the evidence'},
 {step:'03',title:'Create a pet',text:'The private studio where photos become a candidate 3D model that a person must approve.',href:'/studio.html?lang=en',cta:'Open the studio'}
];
const stats=[
 {value:<CountUp to={94} suffix=" million" />,label:'U.S. households live with a pet. Nearly every one will one day say goodbye.',source:'APPA, 2025',href:'https://americanpetproducts.org/news/the-american-pet-products-association-appa-releases-2025-state-of-the-industry-report-archive'},
 {value:<CountUp to={7.5} decimals={1} suffix="%" />,label:'of UK adults whose hardest loss was a pet reported signs of prolonged grief. The study did not include young people.',source:'Hyland, PLOS ONE, 2026',href:'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0339213'},
 {value:'“Just a pet.”',label:'Current guidelines do not allow prolonged grief disorder to be diagnosed after a pet dies, and mourners often hear exactly this.',source:'Maynooth University',href:'https://www.maynoothuniversity.ie/node/562044'}
];
const models=[
 {tag:'SEEING',title:'Photos become a shape',text:'An image-to-3D model infers a whole body from flat photos, including sides the camera never saw. Because it guesses, a person must approve the result.',ai:'Tripo image-to-3D',app:'Consent, private storage, budget, human review'},
 {tag:'UNDERSTANDING',title:'Words become one action',text:'“It’s lonely here, could you come sit with me?” No button understands that. A language model does, and returns a short reply plus one action from a fixed list.',ai:'OpenAI language model',app:'Reply checks, action gate, fixed privacy answer'},
 {tag:'SPEAKING',title:'A reply becomes a voice',text:'A speech model reads the reply aloud in a voice that is always labeled synthetic. It is not a clone of any pet.',ai:'OpenAI text-to-speech',app:'Play, replay, stop, text-only alternative'}
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
 ['No pretending','Your companion always says it is an AI simulation. It is told never to claim the real pet’s thoughts or memories.'],
 ['No pull to come back','No notifications, no streaks, and no “I miss you.” You choose when to visit, and you can say goodbye.'],
 ['Your photos, your choice','Location data is removed on upload. Nothing is sent for 3D generation without your consent.'],
 ['Real people first','A message about self-harm is never answered by the AI. The page shows ways to reach people who can help.']
];

function Heading({kicker,text}){
 return <header className="section-head">
  <span className="kicker">{kicker}</span>
  <SplitText tag="h2" text={text} splitType="words" delay={55} duration={.9} textAlign="left" className="h2" rootMargin="-60px" />
 </header>;
}
const Arrow=()=> <svg className="arrow-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>;

export default function Home(){
 return <ClickSpark sparkColor="#d9b56a" sparkSize={9} sparkRadius={22} sparkCount={7} duration={420}>
  <a className="skip-link" href="#main">Skip to content</a>
  <header className="nav">
   <a className="wordmark" href="/" aria-label="Pawprint home"><img src={markURL} alt="" width="34" height="34" /><span>Pawprint</span></a>
   <nav aria-label="Sections">
    <a href="#problem">Problem</a><a href="#ai">How the AI works</a><a href="#tested">Tested</a><a href="#ethics">Ethics</a><a href="#limits">Limits</a>
   </nav>
   <a className="nav-cta" href="/app.html?lang=en">Meet Lanlao <Arrow /></a>
  </header>

  <main id="main">
   <section className="hero" aria-label="Introduction">
    <img className="hero-art" src="/art/hero-pomeranian-1774.webp" srcSet="/art/hero-pomeranian-960.webp 960w, /art/hero-pomeranian-1774.webp 1774w" sizes="100vw" width="1774" height="1183" fetchPriority="high" alt="A fluffy white Pomeranian walks toward the camera beside a printed photo of the same dog, joined by a faint trail of golden light." />
    <div className="hero-shade" />
    <div className="hero-copy">
     <ShinyText className="eyebrow" text="AN AI SIMULATION · NEVER A RESURRECTION" color="#cfdccf" shineColor="#f6dfa4" speed={4} />
     <SplitText tag="h1" text="A little closer, always." splitType="chars" delay={38} duration={1.1} textAlign="left" className="h1" trigger="view" />
     <p className="lede">Pawprint is an honest AI companion for remembering a pet. Photos become a 3D friend you can talk to, pet, and say goodbye to, on your own terms.</p>
     <div className="actions">
      <Magnet padding={60} magnetStrength={5}><a className="button primary" href="/app.html?lang=en">Meet Lanlao <Arrow /></a></Magnet>
      <a className="button ghost" href="/judge.html">See the evidence <Arrow /></a>
     </div>
    </div>
    <p className="art-note">AI illustration · based on a real pet’s photos</p>
   </section>

   <section className="tour" aria-label="Three places to visit">
    {tour.map((item,index)=><AnimatedContent key={item.step} distance={40} delay={index*.1} className="tour-item">
     <a href={item.href}><span className="step">{item.step}</span><strong>{item.title}</strong><span className="tour-text">{item.text}</span><span className="tour-cta">{item.cta} <Arrow /></span></a>
    </AnimatedContent>)}
   </section>

   <section id="problem" className="band paper" aria-label="The problem">
    <Heading kicker="01 · THE PROBLEM" text="A real grief, rarely recognized." />
    <BlurText className="statement" text="When a pet dies, people are often told it was just a dog. But the sadness is real, and a photo cannot show what being with them felt like." delay={45} stepDuration={.3} />
    <div className="grid three">
     {stats.map((item,index)=><AnimatedContent key={item.source} distance={50} delay={index*.1}>
      <SpotlightCard theme="light" className="card stat" spotlightColor="#d9b56a" style={{'--spotlight-card-surface':'#fffdf8'}}>
       <div className="figure">{item.value}</div><p>{item.label}</p><a className="source" href={item.href} target="_blank" rel="noopener noreferrer">{item.source} <Arrow /></a>
      </SpotlightCard>
     </AnimatedContent>)}
    </div>
   </section>

   <section id="ai" className="band forest" aria-label="How the AI works">
    <Heading kicker="02 · HOW THE AI WORKS" text="Three models. One rule." />
    <p className="rule"><ShinyText text="The AI suggests. The program decides." color="#f5f1e6" shineColor="#e7c676" speed={3.5} /></p>
    <div className="grid three">
     {models.map((item,index)=><AnimatedContent key={item.tag} distance={50} delay={index*.1}>
      <SpotlightCard className="card model" spotlightColor="#d9b56a" style={{'--spotlight-card-surface':'#17382f','--spotlight-card-border':'rgba(245,241,230,.14)'}}>
       <span className="tag">{item.tag}</span><h3>{item.title}</h3><p>{item.text}</p>
       <dl><div><dt>AI</dt><dd>{item.ai}</dd></div><div><dt>Our code</dt><dd>{item.app}</dd></div></dl>
      </SpotlightCard>
     </AnimatedContent>)}
    </div>
    <div className="ideas" aria-label="The Five Big Ideas in AI, as used in Pawprint">
     <h3>The Five Big Ideas, in this project</h3>
     <ol>{ideas.map(([name,text],index)=><AnimatedContent key={name} distance={24} delay={index*.06}><li><strong>{name}</strong><span>{text}</span></li></AnimatedContent>)}</ol>
    </div>
   </section>

   <section id="tested" className="band paper" aria-label="How it was tested">
    <Heading kicker="03 · TESTED, AND STILL HONEST" text="It failed twice. Then we measured." />
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
    <p className="fineprint">These sentences were also used to make the fixes, so they are practice, not a blind exam. Four parser misses and two gate misses are still published. <a href="/judge.html">Read every case on the evidence page <Arrow /></a></p>
   </section>

   <section id="ethics" className="band sage" aria-label="Ethics">
    <Heading kicker="04 · ETHICS" text="Remembering, honestly." />
    <p className="intro">Researchers warn that AI “griefbots” can make people dependent. So Pawprint is built around four promises.</p>
    <div className="grid four">
     {promises.map(([title,text],index)=><AnimatedContent key={title} distance={40} delay={index*.08}>
      <SpotlightCard theme="light" className="card promise" spotlightColor="#a66b4e" style={{'--spotlight-card-surface':'#fbfaf4'}}>
       <span className="number">{String(index+1).padStart(2,'0')}</span><h3>{title}</h3><p>{text}</p>
      </SpotlightCard>
     </AnimatedContent>)}
    </div>
   </section>

   <section id="design" className="band paper keepsakes" aria-label="Design">
    <Heading kicker="05 · DESIGN" text="A little presence. Something to hold." />
    <div className="split">
     <div>
      <p className="intro">Lanlao breathes, blinks and glances around on his own, with timing drawn from published studies of real dogs. His paws stay planted when he walks. Every animated control has a text or button alternative, and motion is reduced when your device asks for it.</p>
      <p className="intro">The idea also reaches beyond the screen. These two ceramic tea companions were handmade by the creator in Jingdezhen: an early look at how a pet’s character could become an everyday object.</p>
      <p className="fineprint">Display images recreated with AI from the creator’s own photographs.</p>
     </div>
     <div className="pair">
      <AnimatedContent distance={50}><figure><img src="/jingdezhen-white-pup.png" alt="Handmade white ceramic dog with pink ears and a smiling face." loading="lazy" width="1120" height="1400" /><figcaption>A familiar little smile</figcaption></figure></AnimatedContent>
      <AnimatedContent distance={50} delay={.12}><figure><img src="/jingdezhen-little-pup.png" alt="Small handmade cream ceramic puppy with painted eyes and a black nose." loading="lazy" width="1120" height="1400" /><figcaption>Quiet company, every day</figcaption></figure></AnimatedContent>
     </div>
    </div>
   </section>

   <section id="limits" className="band forest limits" aria-label="Contributions and limits">
    <Heading kicker="06 · WHAT IS OURS, AND WHAT IS NOT PROVEN" text="Honest about the edges." />
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
    <div className="aurora"><Aurora colorStops={['#1f6a50','#d9b56a','#2c7f63']} amplitude={1.1} blend={.6} speed={.6} mouseInteraction={false} /></div>
    <div className="closing-copy">
     <SplitText tag="h2" text="A photo keeps how they looked. Pawprint keeps a little of how it felt." splitType="words" delay={50} duration={.9} textAlign="center" className="h2" />
     <div className="actions center">
      <Magnet padding={60} magnetStrength={5}><a className="button primary" href="/app.html?lang=en">Meet Lanlao <Arrow /></a></Magnet>
      <a className="button ghost" href="/studio.html?lang=en">Create a pet <Arrow /></a>
     </div>
    </div>
   </section>
  </main>

  <footer className="footer">
   <div><strong>Pawprint</strong><span>An independent student project for WAICY 2026 · AI Showcase. Not affiliated with WAICY.</span></div>
   <nav aria-label="Pages"><a href="/app.html?lang=en">Meet Lanlao</a><a href="/judge.html">Evidence</a><a href="/studio.html?lang=en">Studio</a><a href="https://www.waicy.org/" target="_blank" rel="noopener noreferrer">About WAICY</a></nav>
  </footer>
 </ClickSpark>;
}
