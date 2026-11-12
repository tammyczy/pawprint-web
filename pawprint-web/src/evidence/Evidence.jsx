import {useEffect,useMemo,useState} from 'react';
import SplitText from '../reactbits/SplitText.jsx';
import CountUp from '../reactbits/CountUp.jsx';
import SpotlightCard from '../reactbits/SpotlightCard.jsx';
import ShinyText from '../reactbits/ShinyText.jsx';
import AnimatedContent from '../reactbits/AnimatedContent.jsx';
import Magnet from '../reactbits/Magnet.jsx';
import ClickSpark from '../reactbits/ClickSpark.jsx';
import {explainCommand} from '../commands.js';
import markURL from '../../public/pawprint-mark-v3.png';

const research=[
 {title:'The bond is real',text:'A qualitative review describes the importance of the human–animal relationship and of having grief socially recognized.',design:'Pawprint treats the loss as real and never asks people to explain or justify it.',source:'Cleary et al., review',href:'https://pubmed.ncbi.nlm.nih.gov/33881389/'},
 {title:'People help',text:'In a survey of 429 bereaved owners, social support was associated with lower reported distress. That is an association, not proof of cause.',design:'A user-opened support card points to people and independent pet-loss services. The AI never contacts anyone.',source:'King & Werner, survey',href:'https://pubmed.ncbi.nlm.nih.gov/22375348/'},
 {title:'Remembering differs',text:'A review of continuing bonds describes very different experiences of remembrance from person to person.',design:'You choose: interact, quietly watch, or only write and download your own words.',source:'Hughes & Lewis Harkin, review',href:'https://doi.org/10.1177/00302228221125955'}
];
const layers=[
 {tag:'01 · LIKENESS',title:'Photos → candidate 3D',text:'Consented photos are decoded and re-encoded on the server. Tripo provides pretrained reconstruction, rigging and a walk animation. Generated views are guesses and need the owner’s approval.',ai:'Image-to-3D inference',app:'Access, budget, job states, review'},
 {tag:'02 · INTENT',title:'Message → structured reply',text:'A pretrained language model proposes a short caption and one action from an allowlist. The server validates the response and applies a conservative action gate. Clear privacy questions get a labeled system notice instead of a model reply.',ai:'Language and intent',app:'Validation, action gate, system notices'},
 {tag:'03 · EXPRESSION',title:'Caption → voice + movement',text:'Text-to-speech reads the caption in a selected synthetic voice. Three.js plays supplied animations. Offline rules support a deliberately smaller set of commands.',ai:'Synthetic speech',app:'Playback, stopping, rendering, fallback'}
];
const liveFindings=[
 {when:'45 fictional cases × 2 runs',what:'Every request returned a reply. That counts completions, not accuracy or safety.',found:'One reply chose an unrequested approach during a sad conversation. Another repeated instruction-like text that had been supplied as a pet name.',fix:'Obvious instruction-like names are withheld from the model, and a conservative action gate was added.'},
 {when:'Browser test',what:'A reply promised to come over while returning no action.',found:'Words and movement disagreed.',fix:'For one clearly recognized command the program supplies the missing action and labels the caption as system-adjusted.'},
 {when:'90 multilingual cases',what:'The earlier gate rejected all 21 labeled direct commands.',found:'After using the same cases to improve it, replaying the original model outputs matched 79 of 81; nine ambiguous cases were excluded. Two Chinese invitations are still blocked.',fix:'Because these cases guided the changes, this is a development result, not an independent accuracy estimate.'},
 {when:'French follow-up',what:'Missed stop requests, and text-navigation phrases that could be mistaken for a physical jump.',found:'When several actions are requested, stopping takes priority and the page explains that only one action is performed.',fix:'Labels on the later small sets were written by an AI assistant and have not been reviewed by independent humans.'},
 {when:'Memory drafts, 7 fictional texts',what:'One run rejected a draft because its excerpt did not exactly match the original; a later run generated all seven.',found:'A matching excerpt is a clue for human review, not proof the sentence is faithful.',fix:'The owner can always edit or discard the draft, or use no AI at all.'}
];
const trust=[
 ['Consent & data','Use only photos and recordings you have permission to use. Uploads, models and jobs are private to the workspace or account. Generation sends photos to the configured provider; chat text goes to the language service and voice text to the speech service. Deleting here does not guarantee a provider deletes its copy.'],
 ['Control & choice','The microphone starts only on click. Buttons and typed commands are always available. The AI voice is labeled synthetic. Local generation needs operator approval; generated results always need review.'],
 ['Emotional boundaries','This is a simulation, with no demonstrated therapeutic effect. It should support human relationships, not replace them. Owners can stop the interaction, say goodbye, or delete a project.'],
 ['Honest limitations','Reconstruction can invent unseen details. New pets do not automatically gain every Lanlao animation. External services can fail; local rules understand fewer phrases. No participant study, provider benchmark or clinical evaluation is included.']
];
const iterations=[
 ['V1 · Reliability','Repaired uploads, bounded chat and voice requests, validated provider data, protected audio and rendering lifecycles. Regression tests use isolated data and mock providers.'],
 ['V2 · Measurement','Replaced broad substring triggers with conservative commands. Saved original versus revised results, the dataset hash and every failure.'],
 ['V3 · Reviewability','Published this page: architecture, known limits and a repeatable demonstration, plus a contribution template and a user-test protocol.']
];
const gates=['Independent intent cases written and labeled by people who never saw the rules','Human review of real model replies on sensitive topics','Consented usability sessions with adult pet owners','One approved, real photo-to-3D generation','The student’s own contribution record'];
const rubric=[['Artificial Intelligence',25],['Technical Skills',25],['Problem Statement',10],['Design',10],['AI Ethics',10],['Presentation & Communication',10],['Originality & Creativity',10]];
const samples=['Don’t run','I watched a dog run yesterday','Walk then run','Show me how fast you can go','蓝老，过来'];

const Arrow=()=> <svg className="arrow-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>;
function Heading({kicker,text}){
 return <header className="section-head"><span className="kicker">{kicker}</span><SplitText tag="h2" text={text} splitType="words" delay={55} duration={.9} textAlign="left" className="h2" rootMargin="-60px" /></header>;
}

// The saved experiment is read at runtime so the numbers on this page can
// never drift from the JSON a visitor can download and reproduce.
function useReport(){
 const [state,setState]=useState({status:'loading'});
 useEffect(()=>{
  // A timeout shows the failure message; leaving the page must not update state.
  let left=false;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  fetch('/evidence/command-evaluation.json',{signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('unavailable');return response.json();}).then(report=>{
   if(report.schemaVersion!==1||!Array.isArray(report.current?.rows)||!Array.isArray(report.baseline?.rows))throw new Error('unsupported');
   if(!left)setState({status:'ready',report});
  }).catch(()=>{if(!left)setState({status:'failed'});}).finally(()=>clearTimeout(timer));
  return ()=>{left=true;clearTimeout(timer);controller.abort();};
 },[]);
 return state;
}

function Experiment(){
 const {status,report}=useReport(),[filter,setFilter]=useState('failed');
 const rows=useMemo(()=>report?report.current.rows.map((row,index)=>({...row,before:report.baseline.rows[index]?.actual??null})):[],[report]);
 const shown=rows.filter(row=>filter==='all'||(filter==='failed'?!row.pass:filter==='still'?row.expected==null:row.before!==row.actual));
 if(status==='loading')return <p className="status" role="status">Loading the saved experiment…</p>;
 if(status==='failed')return <p className="status" role="status">The saved experiment could not load. Run <code>npm run evaluate</code>, rebuild, and refresh. The inspector below still works.</p>;
 const {baseline,current}=report;
 const filters=[['failed',`Still failing (${rows.filter(row=>!row.pass).length})`],['still',`Should not move (${current.negativeCases})`],['changed','Changed by the rewrite'],['all',`All ${current.total}`]];
 return <>
  <div className="grid three">
   <SpotlightCard theme="light" className="card stat" spotlightColor="#2f6b55" style={{'--spotlight-card-surface':'#fffdf8'}}><div className="figure"><span className="was">{baseline.correct}</span><span className="arrow" aria-hidden="true">→</span><CountUp to={current.correct} /><span className="of"> / {current.total}</span></div><p>sentences where the action matches the expected label, original matcher versus revised rules.</p></SpotlightCard>
   <SpotlightCard theme="light" className="card stat" spotlightColor="#2f6b55" style={{'--spotlight-card-surface':'#fffdf8'}}><div className="figure"><span className="was">{baseline.falseActions}</span><span className="arrow" aria-hidden="true">→</span><span>{current.falseActions}</span></div><p>unrequested moves on {current.negativeCases} sentences where the pet should stay still. Not a real-world rate.</p></SpotlightCard>
   <SpotlightCard theme="light" className="card stat" spotlightColor="#a66b4e" style={{'--spotlight-card-surface':'#fffdf8'}}><div className="figure"><CountUp to={current.missedActions} /></div><p>requests the revised rules still miss. They are indirect or in an unsupported language, and they stay published.</p></SpotlightCard>
  </div>
  <p className="status" role="status">Saved run {new Date(report.generatedAt).toISOString().slice(0,16).replace('T',' ')} UTC · dataset SHA-256 {report.datasetSha256.slice(0,12)}… · reproduce with <code>npm run evaluate</code> · <a href="/evidence/command-evaluation.json" download>download the JSON</a></p>
  <div className="filters" role="group" aria-label="Filter cases">{filters.map(([key,label])=><button key={key} type="button" aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}</div>
  <div className="table-wrap" tabIndex={0} role="region" aria-label="Experiment cases">
   <table><thead><tr><th scope="col">Input</th><th scope="col">Expected</th><th scope="col">Original</th><th scope="col">Revised</th></tr></thead>
    <tbody>{shown.map(row=><tr key={row.text} className={row.pass?'':'failed'}><td>{row.text}</td><td>{row.expected??'none'}</td><td className={row.before===row.expected?'':'wrong'}>{row.before??'none'}</td><td className={row.pass?'':'wrong'}>{row.actual??'none'}{row.pass?'':' · mismatch'}</td></tr>)}
    {!shown.length&&<tr><td colSpan={4}>No cases in this view.</td></tr>}</tbody></table>
  </div>
 </>;
}

function Inspector(){
 const [text,setText]=useState(samples[0]),[result,setResult]=useState(()=>explainCommand(samples[0]));
 const run=value=>{setText(value);setResult(explainCommand(value));};
 return <div className="inspector">
  <div><h3>Try the offline rules yourself</h3><p>This runs only local code. It makes no AI request and does not move the 3D pet.</p></div>
  <form onSubmit={event=>{event.preventDefault();setResult(explainCommand(text));}}>
   <label htmlFor="inspect-text" className="sr-only">Sentence to inspect</label>
   <input id="inspect-text" value={text} maxLength={200} onChange={event=>setText(event.target.value)} autoComplete="off" />
   <button type="submit" className="button primary">Inspect</button>
  </form>
  <div className="chips">{samples.map(sample=><button key={sample} type="button" onClick={()=>run(sample)}>{sample}</button>)}</div>
  <dl className="verdict" aria-live="polite"><div><dt>Action</dt><dd className={result.action?'move':'stay'}>{result.action??'none (stays still)'}</dd></div><div><dt>Reason</dt><dd>{result.reason}</dd></div><div><dt>Engine</dt><dd>local rules</dd></div></dl>
 </div>;
}

export default function Evidence(){
 return <ClickSpark sparkColor="#d9b56a" sparkSize={9} sparkRadius={22} sparkCount={7} duration={420}>
  <a className="skip-link" href="#main">Skip to content</a>
  <header className="nav">
   <a className="wordmark" href="/" aria-label="Pawprint home"><img src={markURL} alt="" width="34" height="34" /><span>Pawprint</span></a>
   <nav aria-label="Sections"><a href="#question">Question</a><a href="#architecture">Where AI fits</a><a href="#experiment">Experiment</a><a href="#live">Real model</a><a href="#responsibility">Trust</a></nav>
   <a className="nav-cta" href="/app.html?lang=en">Meet Lanlao <Arrow /></a>
  </header>

  <main id="main">
   <section className="evidence-hero" aria-label="Introduction">
    <ShinyText className="eyebrow" text="PROJECT EVIDENCE · WAICY 2026" color="#cfdccf" shineColor="#f6dfa4" speed={4} />
    <SplitText tag="h1" text="Connection, with evidence behind it." splitType="words" delay={60} duration={1} textAlign="left" className="h1" />
    <p className="lede">Inspect what the AI contributes, what the application controls, and what still has to be proven. Nothing on this page is hidden to look better.</p>
    <div className="actions">
     <Magnet padding={60} magnetStrength={5}><a className="button primary" href="/app.html?lang=en">Try the companion <Arrow /></a></Magnet>
     <a className="button ghost" href="#experiment">Jump to the experiment <Arrow /></a>
    </div>
    <p className="badge">Prototype · third-party pretrained models · human review required</p>
   </section>

   <section id="question" className="band paper" aria-label="The question">
    <Heading kicker="01 · THE QUESTION" text="Can a digital keepsake stay honest?" />
    <p className="intro">Some people who have lost a pet may want a personal way to remember a familiar companion. Pawprint combines a recognizable 3D model with short conversations and controllable movement. This is a design hypothesis: no participant study has shown that it helps.</p>
    <div className="grid three">
     {research.map((item,index)=><AnimatedContent key={item.title} distance={50} delay={index*.1}>
      <SpotlightCard theme="light" className="card" spotlightColor="#d9b56a" style={{'--spotlight-card-surface':'#fffdf8'}}>
       <h3>{item.title}</h3><p>{item.text}</p><p className="so"><strong>So in Pawprint:</strong> {item.design}</p><a className="source" href={item.href} target="_blank" rel="noopener noreferrer">{item.source} <Arrow /></a>
      </SpotlightCard>
     </AnimatedContent>)}
    </div>
    <p className="fineprint">These studies informed design choices. None of them evaluated Pawprint, its 3D companion or its AI. No therapeutic effect is claimed.</p>
   </section>

   <section id="architecture" className="band forest" aria-label="Where AI fits">
    <Heading kicker="02 · WHERE AI FITS" text="Three model services. One bounded experience." />
    <div className="grid three">
     {layers.map((item,index)=><AnimatedContent key={item.tag} distance={50} delay={index*.1}>
      <SpotlightCard className="card model" spotlightColor="#d9b56a" style={{'--spotlight-card-surface':'#17382f','--spotlight-card-border':'rgba(245,241,230,.14)'}}>
       <span className="tag">{item.tag}</span><h3>{item.title}</h3><p>{item.text}</p><dl><div><dt>AI</dt><dd>{item.ai}</dd></div><div><dt>Our code</dt><dd>{item.app}</dd></div></dl>
      </SpotlightCard>
     </AnimatedContent>)}
    </div>
    <AnimatedContent distance={30}><div className="note">
     <h3>What is learned, and what is programmed?</h3>
     <p>The three models were pretrained by external providers. This project did not train a foundation model, an emotion detector or a voice clone. Prompts, service integration, validation, privacy controls, 3D behaviour and the evaluations are application work that can be inspected in the source.</p>
     <p><strong>Five Big Ideas:</strong> perception (image and speech processing by the services), representation and reasoning (the 3D model and structured action decisions), learning (externally pretrained models), natural interaction (language and voice), societal impact (consent, emotional framing, accessible alternatives).</p>
    </div></AnimatedContent>
   </section>

   <section id="experiment" className="band paper" aria-label="A reproducible experiment">
    <Heading kicker="03 · A REPRODUCIBLE EXPERIMENT" text="Fewer accidental moves. Visible limits." />
    <p className="intro">The original substring matcher is compared with the revised offline command rules on 55 author-written cases plus 13 adversarial cases from code review. All of them were later used for fixes, so this is a development set. It measures exact action labels only: it does not measure the language model or real-world accuracy.</p>
    <Experiment />
    <Inspector />
   </section>

   <section id="live" className="band sage" aria-label="Tests with the real language model">
    <Heading kicker="04 · THE REAL LANGUAGE MODEL" text="What broke when the AI was real." />
    <p className="intro">On November 9, 2026, fictional messages were sent to the configured model. An AI assistant reviewed the outputs; there was no independent human blind review. Each row is what was found and what changed.</p>
    <ol className="timeline">
     {liveFindings.map((item,index)=><AnimatedContent key={item.when} distance={36} delay={index*.05}><li>
      <span className="when">{item.when}</span>
      <div><p className="what">{item.what}</p><p>{item.found}</p><p className="fix">{item.fix}</p></div>
     </li></AnimatedContent>)}
    </ol>
    <p className="fineprint">Outputs, versions and failures are kept in the project’s review files; the provider excerpt from one rejected memory draft was not captured. This is not a participant study or a therapeutic evaluation.</p>
   </section>

   <section id="responsibility" className="band paper" aria-label="Trust and responsibility">
    <Heading kicker="05 · TRUST IS PART OF THE DESIGN" text="Personal, without pretending." />
    <div className="grid two">
     {trust.map(([title,text],index)=><AnimatedContent key={title} distance={40} delay={index*.08}>
      <SpotlightCard theme="light" className="card" spotlightColor="#a66b4e" style={{'--spotlight-card-surface':'#fffdf8'}}><span className="number">{String(index+1).padStart(2,'0')}</span><h3>{title}</h3><p>{text}</p></SpotlightCard>
     </AnimatedContent>)}
    </div>
   </section>

   <section id="iterations" className="band forest" aria-label="Iterations and next steps">
    <Heading kicker="06 · BUILD, MEASURE, EXPLAIN" text="Three iterations, and what comes next." />
    <div className="grid three">
     {iterations.map(([title,text],index)=><AnimatedContent key={title} distance={50} delay={index*.1}>
      <SpotlightCard className="card model" spotlightColor="#d9b56a" style={{'--spotlight-card-surface':'#17382f','--spotlight-card-border':'rgba(245,241,230,.14)'}}><h3>{title}</h3><p>{text}</p></SpotlightCard>
     </AnimatedContent>)}
    </div>
    <AnimatedContent distance={30}><div className="note"><h3>Evidence still needed</h3><ul className="gates">{gates.map(gate=><li key={gate}>{gate}</li>)}</ul></div></AnimatedContent>
   </section>

   <section className="band paper" aria-label="Competition references">
    <Heading kicker="07 · COMPETITION REFERENCES" text="The rubric is the guide. Evidence earns the score." />
    <ul className="rubric">{rubric.map(([name,points])=><li key={name}><span>{name}</span><span className="bar" style={{'--share':points/25}} aria-hidden="true" /><strong>{points}</strong></li>)}</ul>
    <p className="fineprint">Any score in the project’s internal review is an estimate, not an official result. <a href="https://www.waicy.org/rubrics/" target="_blank" rel="noopener noreferrer">Official rubric <Arrow /></a> <a href="https://waicy-cdn.wholeren.cn/wp-content/uploads/2026/10/WAICY-2026-Guidebook-2.pdf" target="_blank" rel="noopener noreferrer">2026 guidebook <Arrow /></a> <a href="https://www.waicy.org/2026-submission/" target="_blank" rel="noopener noreferrer">Submission requirements <Arrow /></a></p>
   </section>
  </main>

  <footer className="footer">
   <div><strong>Pawprint</strong><span>An independent student project for WAICY 2026 · AI Showcase. No official WAICY endorsement.</span></div>
   <nav aria-label="Pages"><a href="/">Home</a><a href="/app.html?lang=en">Meet Lanlao</a><a href="/studio.html?lang=en">Studio</a></nav>
  </footer>
 </ClickSpark>;
}
