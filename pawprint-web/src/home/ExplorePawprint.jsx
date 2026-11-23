import {useLayoutEffect, useRef} from 'react';
import {Boxes, Camera, ClipboardList, PawPrint} from 'lucide';
import Icon from '../ui/Icon.jsx';
import './explore.css';

const destinations = [
  {
    href: '/app.html?lang=en',
    icon: PawPrint,
    title: 'Meet Lanlao',
    text: 'Talk to the 3D companion, ask him to come closer, pet him, and stop him at any time.'
  },
  {
    href: '/studio.html?lang=en',
    icon: Boxes,
    title: 'Create a pet',
    text: 'The private studio where photos become a candidate 3D model that a person must approve.'
  },
  {
    href: '/judge.html',
    icon: ClipboardList,
    title: 'See the evidence',
    text: 'The architecture, every experiment, and the mistakes that are still not fixed.'
  }
];

export default function ExplorePawprint() {
  const heading = useRef(null);
  useLayoutEffect(() => {
    if (window.location.hash === '#explore') heading.current.scrollIntoView({behavior: 'instant'});
  }, []);

  return <section className="explore" aria-labelledby="explore">
    <div className="explore-inner">
      <header className="explore-heading">
        <h2 className="h2" id="explore" ref={heading}>Explore Pawprint</h2>
      </header>

      <article className="explore-feature" aria-labelledby="explore-portrait-title" data-pointer-fx="">
        <div className="explore-feature-copy">
          <span className="explore-icon"><Icon icon={Camera} size={26} /></span>
          <h3 id="explore-portrait-title">Family portraits</h3>
          <p>Bring people and pets together from separate photos.</p>
          <a className="button primary" href="/family-portrait.html">Make a family portrait</a>
        </div>
        <figure className="explore-print">
          <img src="/art/family-portrait-sample.webp" alt="Two people sit beside a golden retriever and an orange tabby in a sunlit room." width="1536" height="1024" loading="lazy" />
          <figcaption>AI-generated sample</figcaption>
        </figure>
        <span className="pointer-glow" aria-hidden="true" />
        <span className="border-beam" aria-hidden="true" />
      </article>

      <ul className="explore-destinations">
        {destinations.map(({href, icon, title, text}) => <li key={href}>
          <a className="explore-link" href={href} data-pointer-fx="">
            <span className="explore-icon"><Icon icon={icon} size={23} /></span>
            <div><h3>{title}</h3><p>{text}</p></div>
            <span className="pointer-glow" aria-hidden="true" />
          </a>
        </li>)}
      </ul>
    </div>
  </section>;
}
