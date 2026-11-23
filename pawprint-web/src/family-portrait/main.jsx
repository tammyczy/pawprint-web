import {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Aperture, Camera, Download, House, ImagePlus, PawPrint, Share, Sun, Users, X} from 'lucide';
import Icon from '../ui/Icon.jsx';
import {bindPointerEffects} from '../ui/pointer-effects.js';
import {portraitCopy} from './messages.js';
import FrontCamera from './FrontCamera.jsx';
import GreetingCard from './GreetingCard.jsx';
import {MAX_UPLOAD_BYTES, photoTypes, preparePhoto} from './prepare-photo.js';
import './portrait.css';

const endpoint = '/api/family-portrait';
const localeKey = 'pawprint-locale';
const limits = {people: 3, pets: 4};
const sceneIcons = {window: House, garden: Sun, studio: Aperture};
const celebrations = ['christmas', 'winter', 'lunar', 'halloween', 'birthday'];
const artStyles = ['photo', 'film', 'watercolor', 'oil', 'storybook'];
const fallbacks = {413: 'uploadTooLarge', 429: 'rateLimited', 503: 'unavailable', 504: 'generationTimeout'};
const sample = '/art/family-portrait-sample.webp';

function initialLanguage() {
  const query = new URLSearchParams(window.location.search).get('lang');
  const preferred = window.localStorage.getItem(localeKey) || navigator.language.split('-')[0];
  if (Object.hasOwn(portraitCopy, query)) return query;
  return Object.hasOwn(portraitCopy, preferred) ? preferred : 'en';
}

function PhotoPicker({group, items, copy, busy, preparing, onAdd, onRemove, onOpenCamera}) {
  const [dragging, setDragging] = useState(false);
  const label = copy[group];
  const full = items.length >= limits[group];
  const disabled = busy || Boolean(preparing);
  return <section className="photo-group" aria-labelledby={`${group}-label`}>
    <div className="photo-heading">
      <Icon icon={group === 'people' ? Users : PawPrint} />
      <h3 id={`${group}-label`}>{label}</h3>
      <span>{items.length ? `${items.length}/${limits[group]}` : copy[`${group}Hint`]}</span>
    </div>
    {items.length > 0 && <ul className="photo-list" aria-label={label}>
      {items.map(item => <li key={item.url}>
        <img src={item.url} alt={item.name} />
        <button type="button" disabled={busy} aria-label={`${copy.remove} · ${item.name}`}
          onClick={() => onRemove(group, item)}><Icon icon={X} size={16} /></button>
      </li>)}
    </ul>}
    {!full && <label className="file-picker" data-dragging={dragging}
      onDragOver={event => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
        if (!disabled) setDragging(true);
      }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={event => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) onAdd(group, Array.from(event.dataTransfer.files));
      }}>
      <input className="visually-hidden" type="file" name={group} multiple accept={photoTypes}
        aria-label={`${copy.addPhotos} · ${label}`} disabled={disabled} onChange={event => {
          const files = Array.from(event.currentTarget.files);
          event.currentTarget.value = '';
          onAdd(group, files);
        }} />
      <Icon icon={ImagePlus} size={21} />
      <span>{preparing === group ? copy.adding : copy.addPhotos}</span>
    </label>}
    {group === 'people' && !full && <button type="button" className="camera-open"
      disabled={busy || Boolean(preparing)} onClick={onOpenCamera}>
      <Icon icon={Camera} size={19} />{copy.frontCamera}
    </button>}
  </section>;
}

function FamilyPortrait() {
  const [language, setLanguage] = useState(initialLanguage);
  const [photos, setPhotos] = useState({people: [], pets: []});
  const [scene, setScene] = useState('window');
  const [style, setStyle] = useState('photo');
  const [format, setFormat] = useState('landscape');
  const [details, setDetails] = useState('');
  const [consent, setConsent] = useState(false);
  const [available, setAvailable] = useState(null);
  const [preparing, setPreparing] = useState(null);
  const [busy, setBusy] = useState(null);
  const [issue, setIssue] = useState(null);
  const [notice, setNotice] = useState(null);
  const [results, setResults] = useState([]);
  const [result, previous] = results;
  const [refinement, setRefinement] = useState('');
  const [refinementIssue, setRefinementIssue] = useState(null);
  const [shareFailed, setShareFailed] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const preview = useRef(null);
  const enlarged = useRef(null);
  const pending = useRef(null);
  const resultUrls = useRef(new Set());
  const copy = portraitCopy[language];

  useEffect(bindPointerEffects, []);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
    document.title = `${copy.pageTitle} — Pawprint`;
  }, [language, copy.pageTitle]);

  useEffect(() => {
    async function checkAvailability() {
      try {
        const response = await fetch(endpoint, {signal: AbortSignal.timeout?.(8000)});
        setAvailable(response.ok && (await response.json()).available === true);
      } catch {
        setAvailable(false);
      }
    }
    void checkAvailability();
  }, []);

  useEffect(() => {
    for (const url of resultUrls.current) {
      if (results.some(item => item.url === url)) continue;
      URL.revokeObjectURL(url);
      resultUrls.current.delete(url);
    }
    if (!result) return;
    if (window.matchMedia('(max-width: 800px)').matches) {
      preview.current.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start'
      });
    }
  }, [results, result]);

  async function addPhotos(group, files) {
    if (!files.length || busy || preparing) return;
    if (files.length + photos[group].length > limits[group]) {
      setIssue('tooMany');
      return;
    }
    setIssue(null);
    setPreparing(group);
    const added = [];
    let failed = null;
    try {
      for (const file of files) {
        try {
          const blob = await preparePhoto(file);
          added.push({blob, url: URL.createObjectURL(blob), name: file.name});
        } catch (error) {
          failed ??= Object.hasOwn(copy, error.message) ? error.message : 'invalidPhoto';
        }
      }
    } finally {
      setPhotos(current => ({...current, [group]: [...current[group], ...added]}));
      if (failed) setIssue(failed);
      setPreparing(null);
    }
  }

  function removePhoto(group, item) {
    URL.revokeObjectURL(item.url);
    setPhotos(current => ({...current, [group]: current[group].filter(photo => photo !== item)}));
    setIssue(null);
  }

  function addCameraPhoto(blob) {
    const photo = {blob, url: URL.createObjectURL(blob), name: copy.cameraPhoto};
    setPhotos(current => ({...current, people: [...current.people, photo]}));
    setIssue(null);
    setCameraOpen(false);
  }

  async function generate(base) {
    if (pending.current || preparing || available !== true) return;
    const reportIssue = base ? setRefinementIssue : setIssue;
    const config = base?.config ?? {
      scene, style, format, details: details.trim(),
      references: {people: photos.people.map(photo => photo.blob), pets: photos.pets.map(photo => photo.blob)}
    };
    if (!config.references.people.length || !config.references.pets.length) return reportIssue('photosRequired');
    if (!consent) return reportIssue('consentRequired');
    if (base && !refinement.trim()) return reportIssue('refinementRequired');
    setIssue(null);
    setRefinementIssue(null);
    setNotice(null);
    setShareFailed(false);
    setBusy(base ? 'refine' : 'generate');
    const body = new FormData();
    for (const group of Object.keys(limits)) {
      config.references[group].forEach((photo, index) => body.append(group, photo, `${group}-${index + 1}.jpg`));
    }
    body.append('scene', config.scene);
    body.append('style', config.style);
    body.append('format', config.format);
    if (config.details) body.append('details', config.details);
    body.append('consent', 'yes');
    const controller = new AbortController();
    pending.current = controller;
    const timer = window.setTimeout(() => controller.abort('timeout'), 280_000);
    try {
      if (base) {
        const image = base.file.size > MAX_UPLOAD_BYTES ? await preparePhoto(base.file) : base.file;
        if (controller.signal.aborted) throw controller.signal.reason;
        body.append('base', image, 'portrait-to-edit.jpg');
        body.append('refinement', refinement.trim());
      }
      const response = await fetch(endpoint, {method: 'POST', body, signal: controller.signal});
      if (controller.signal.aborted) throw controller.signal.reason;
      if (!response.ok) {
        const {code} = await response.json().catch(() => ({}));
        reportIssue(Object.hasOwn(copy, code) ? code : fallbacks[response.status] || 'generationFailed');
        return;
      }
      const image = await response.blob();
      if (controller.signal.aborted) throw controller.signal.reason;
      if (image.type !== 'image/jpeg' || !image.size) throw new Error('Empty portrait response.');
      const url = URL.createObjectURL(image);
      resultUrls.current.add(url);
      const revision = base ? base.revision + 1 : 1;
      const name = base ? `pawprint-family-portrait-v${revision}.jpg` : 'pawprint-family-portrait.jpg';
      const next = {url, config, revision, file: new File([image], name, {type: image.type})};
      setResults(base ? [next, base] : [next]);
      setRefinement('');
    } catch {
      if (controller.signal.reason === 'cancelled') {
        if (base) setRefinementIssue('refinementCancelled');
        else setNotice('generationCancelled');
      } else reportIssue(controller.signal.aborted ? 'generationTimeout' : 'generationFailed');
    } finally {
      window.clearTimeout(timer);
      pending.current = null;
      setBusy(null);
    }
  }

  async function sharePortrait() {
    setShareFailed(false);
    try {
      await navigator.share({files: [result.file]});
    } catch (error) {
      if (error.name !== 'AbortError') setShareFailed(true);
    }
  }

  const error = issue || (available === false ? 'unavailable' : null);
  const canShare = result && navigator.share && navigator.canShare?.({files: [result.file]});
  const celebrationSample = celebrations.includes(scene);
  const styleSample = style !== 'photo';
  const sampleCaption = celebrationSample || styleSample
    ? `${copy[celebrationSample ? scene : style]} · ${copy.sample}` : copy.sample;
  return <>
    <a className="skip-link" href="#portrait">{copy.skip}</a>
    <header className="site-header">
      <div className="header-inner">
        <a className="wordmark" href="/" aria-label={copy.home}>
          <img width="33" height="33" src="/pawprint-mark-v3.png" alt="" />
          Pawprint
        </a>
        <div className="header-actions">
          <a href={`/app.html?lang=${language}`}>{copy.lanlao}</a>
          <select aria-label={copy.language} value={language} onChange={event => {
            window.localStorage.setItem(localeKey, event.target.value);
            setLanguage(event.target.value);
          }}>
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="fr">Français</option>
          </select>
        </div>
      </div>
    </header>
    <main className="portrait-layout" id="portrait" tabIndex={-1}>
      <section className="intro" aria-labelledby="portrait-title">
        <h1 id="portrait-title">{copy.title}{' '}<em>{copy.titleDetail}</em></h1>
        <p>{copy.intro}</p>
      </section>
      <aside className="portrait-preview" aria-label={result ? copy.result : copy.sample} ref={preview}>
        <figure className="print" data-format={result?.config.format || 'landscape'} data-pointer-fx="">
          {result ? <button className="open-portrait" type="button" aria-label={copy.enlarge}
            onClick={() => enlarged.current.showModal()}>
            <img src={result.url} alt={copy.result} />
          </button> : celebrationSample
            ? <div className="celebration-thumbnail" data-scene={scene} role="img" aria-label={sampleCaption} />
            : styleSample
              ? <div className="art-thumbnail" data-style={style} role="img" aria-label={sampleCaption} />
              : <img src={sample} alt={copy.sampleAlt} width="1536" height="1024" fetchPriority="high" />}
          <figcaption>
            <span>{result ? copy.result : sampleCaption}</span>
            {result && <div className="result-actions">
              {canShare && <button className="secondary-action" type="button" onClick={sharePortrait}>
                <Icon icon={Share} size={18} />{copy.share}
              </button>}
              <a className="download" href={result.url} download={result.file.name}>
                <Icon icon={Download} size={18} />{copy.save}
              </a>
            </div>}
          </figcaption>
          <span className="pointer-glow" aria-hidden="true" />
          <span className="border-beam" aria-hidden="true" />
        </figure>
        {result && <GreetingCard key={result.url} result={result} copy={copy} />}
        {result && <p className="result-note">{copy.ready}</p>}
        {shareFailed && <p className="form-error" role="alert">{copy.shareFailed}</p>}
        {result && <form className="refinement" onSubmit={event => {event.preventDefault(); void generate(result);}}>
          <h2>{copy.refine}</h2>
          <label>
            <span>{copy.refinementLabel}</span>
            <textarea rows={2} maxLength={280} value={refinement} disabled={Boolean(busy)}
              placeholder={copy.refinementHint} onChange={event => {setRefinement(event.target.value); setRefinementIssue(null);}} />
          </label>
          <div className="generate-actions">
            <button type="submit" className="generate" disabled={Boolean(busy) || Boolean(preparing)}>
              {busy === 'refine' && <span className="spinner" aria-hidden="true" />}
              {busy === 'refine' ? copy.refining : copy.applyRefinement}
            </button>
            {busy === 'refine' && <button className="secondary-action" type="button"
              onClick={() => pending.current?.abort('cancelled')}>{copy.cameraClose}</button>}
          </div>
          {busy === 'refine' && <p className="form-status" role="status">{copy.waiting}</p>}
          {refinementIssue && <p className={refinementIssue === 'refinementCancelled' ? 'form-status' : 'form-error'}
            role={refinementIssue === 'refinementCancelled' ? 'status' : 'alert'}>{copy[refinementIssue]}</p>}
          {previous && <a className="previous-portrait" href={previous.url} download={previous.file.name}>{copy.downloadPrevious}</a>}
        </form>}
      </aside>
      <form className="portrait-form" onSubmit={event => {event.preventDefault(); void generate();}}>
        <section aria-labelledby="photos-title">
          <h2 id="photos-title">{copy.photos}</h2>
          <p className="help">{copy.formats}</p>
          <div className="photo-groups">
            {Object.keys(limits).map(group => <PhotoPicker key={group} group={group} items={photos[group]}
              copy={copy} busy={busy} preparing={preparing} onAdd={addPhotos} onRemove={removePhoto}
              onOpenCamera={() => setCameraOpen(true)} />)}
          </div>
        </section>
        <fieldset className="scenes" disabled={busy}>
          <legend>{copy.setting}</legend>
          <div className="scene-list">
            {Object.entries(sceneIcons).map(([value, icon]) => <label key={value} className="scene">
              <input className="visually-hidden" type="radio" name="scene" value={value}
                checked={scene === value} onChange={() => {setScene(value); setIssue(null);}} />
              <span><Icon icon={icon} size={19} />{copy[value]}</span>
            </label>)}
          </div>
          <h3 className="celebration-heading">{copy.celebrations}</h3>
          <div className="scene-list celebrations">
            {celebrations.map(value => <label key={value} className="art-style">
              <input className="visually-hidden" type="radio" name="scene" value={value}
                checked={scene === value} onChange={() => {setScene(value); setIssue(null);}} />
              <span><span className="celebration-thumbnail" data-scene={value} aria-hidden="true" />{copy[value]}</span>
            </label>)}
          </div>
        </fieldset>
        <fieldset className="scenes art-styles" disabled={busy}>
          <legend>{copy.artStyle}</legend>
          <p className="help">{copy.artSample}</p>
          <div className="art-style-list">
            {artStyles.map(value => <label key={value} className="art-style">
              <input className="visually-hidden" type="radio" name="style" value={value}
                checked={style === value} onChange={() => {setStyle(value); setIssue(null);}} />
              <span><span className="art-thumbnail" data-style={value} aria-hidden="true" />{copy[value]}</span>
            </label>)}
          </div>
        </fieldset>
        <div className="portrait-options">
          <label>
            <span>{copy.format}</span>
            <select value={format} disabled={busy} onChange={event => setFormat(event.target.value)}>
              <option value="landscape">{copy.landscape}</option>
              <option value="portrait">{copy.portrait}</option>
            </select>
          </label>
          <label>
            <span>{copy.details}</span>
            <textarea rows={2} maxLength={180} placeholder={copy.detailsHint} value={details}
              disabled={busy} onChange={event => setDetails(event.target.value)} />
          </label>
        </div>
        <label className="consent">
          <input type="checkbox" name="consent" checked={consent} disabled={busy}
            onChange={event => {setConsent(event.target.checked); setIssue(null);}} />
          <span>{copy.consent}</span>
        </label>
        <div className="generate-actions">
          <button className="generate" type="submit" disabled={busy || Boolean(preparing) || available !== true}>
            {busy === 'generate' ? <span className="spinner" aria-hidden="true" /> : <Icon icon={Camera} />}
            {busy === 'generate' ? copy.generating : copy.generate}
          </button>
          {busy === 'generate' && <button className="secondary-action" type="button"
            onClick={() => pending.current?.abort('cancelled')}>{copy.cameraClose}</button>}
        </div>
        {error && <p className="form-error" role="alert">{copy[error]}</p>}
        <p className="form-status" role="status">{busy === 'generate' ? copy.waiting : notice ? copy[notice] : result && !error ? copy.done : ''}</p>
      </form>
    </main>
    {cameraOpen && <FrontCamera copy={copy} onClose={() => setCameraOpen(false)} onCapture={addCameraPhoto} />}
    {result && <dialog className="portrait-lightbox" ref={enlarged} aria-label={copy.result}>
      <img src={result.url} alt={copy.result} />
      <form method="dialog"><button type="submit" className="secondary-action">{copy.closePreview}</button></form>
    </dialog>}
  </>;
}

createRoot(document.getElementById('root')).render(<FamilyPortrait />);
