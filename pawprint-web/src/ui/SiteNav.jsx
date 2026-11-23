import {useRef} from 'react';
import {Menu, PawPrint} from 'lucide';
import markURL from '../../public/pawprint-mark-v3.png';
import Icon from './Icon.jsx';

export default function SiteNav({links}) {
  const menu = useRef(null);
  const summary = useRef(null);

  function closeMenu() {
    menu.current.open = false;
  }

  return <header className="nav">
    <a className="wordmark" href="/" aria-label="Pawprint home">
      <img src={markURL} alt="" width="34" height="34" />Pawprint
    </a>
    <nav className="nav-links" aria-label="Sections">
      {links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
    </nav>
    <details className="nav-menu" ref={menu} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) closeMenu();
    }} onKeyDown={event => {
      if (event.key === 'Escape' && menu.current.open) {
        closeMenu();
        summary.current.focus();
      }
    }}>
      <summary ref={summary} aria-label="Sections"><Icon icon={Menu} /></summary>
      <nav aria-label="Sections">
        {links.map(([href, label]) => <a key={href} href={href} onClick={closeMenu}>{label}</a>)}
      </nav>
    </details>
    <a className="nav-cta" href="/app.html?lang=en"><Icon icon={PawPrint} size={17} />Meet Lanlao</a>
    <span className="nav-progress" aria-hidden="true" />
  </header>;
}
