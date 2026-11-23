import {useEffect, useState} from 'react';

const palettes = {
  christmas: ['#f8eee0', '#8b2635'],
  winter: ['#edf2e9', '#254a39'],
  lunar: ['#fae7d4', '#962e32'],
  halloween: ['#f5e1cd', '#75412f'],
  birthday: ['#f9eaf0', '#75435a']
};

function wrapText(context, text, width) {
  const lines = [];
  let line = '';
  const tokens = typeof Intl.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter(undefined, {granularity: 'word'}).segment(text), item => item.segment)
    : Array.from(text);
  for (const token of tokens) {
    if (line && context.measureText(line + token).width > width) {
      lines.push(line.trimEnd());
      line = '';
    }
    line += line ? token : token.trimStart();
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

async function createCard(source, greeting, paper, ink) {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', {alpha: false});
  const width = 1440;
  const inset = 58;
  const innerWidth = width - 2 * inset;
  const photoHeight = Math.round(innerWidth * image.naturalHeight / image.naturalWidth);
  const font = '600 61px "Cormorant Garamond", "PingFang SC", "Songti SC", Georgia, serif';
  context.font = font;
  const lines = wrapText(context, greeting, innerWidth - 40);
  canvas.width = width;
  canvas.height = photoHeight + 3 * inset + 72 * lines.length;
  context.fillStyle = paper;
  context.fillRect(0, 0, width, canvas.height);
  context.strokeStyle = ink;
  context.lineWidth = 2;
  context.strokeRect(21, 21, width - 42, canvas.height - 42);
  context.drawImage(image, inset, inset, innerWidth, photoHeight);
  context.fillStyle = ink;
  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  lines.forEach((line, index) => {
    context.fillText(line, width / 2, photoHeight + 2 * inset + 36 + index * 72, innerWidth - 40);
  });
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .94));
  if (!blob) throw new Error('Card export failed.');
  return blob;
}

export default function GreetingCard({result, copy}) {
  const [message, setMessage] = useState(null);
  const [card, setCard] = useState(null);
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);
  const scene = result.config.scene;
  const greeting = message ?? (copy.greetings[scene] || copy.greetings.default);
  const [paper, ink] = palettes[scene] ?? ['#f5eee1', '#31503c'];

  useEffect(() => {
    if (card) return () => URL.revokeObjectURL(card);
  }, [card]);

  async function prepareCard(event) {
    event.preventDefault();
    setWorking(true);
    setFailed(false);
    try {
      const blob = await createCard(result.url, greeting.trim(), paper, ink);
      setCard(URL.createObjectURL(blob));
    } catch {
      setFailed(true);
    } finally {
      setWorking(false);
    }
  }

  return <details className="greeting-card">
    <summary>{copy.greetingCard}</summary>
    <form onSubmit={prepareCard}>
      <label>
        <span>{copy.greetingText}</span>
        <input type="text" maxLength={72} value={greeting} disabled={working} onChange={event => {
          setMessage(event.target.value);
          setCard(null);
          setFailed(false);
        }} />
      </label>
      {card ? <>
        <img src={card} alt={copy.greetingPreview} />
        <a className="download" href={card} download="pawprint-greeting-card.jpg">{copy.downloadCard}</a>
      </> : <button type="submit" className="secondary-action" disabled={working || !greeting.trim()}>
        {working ? copy.greetingPreparing : copy.previewCard}
      </button>}
      {failed && <p className="form-error" role="alert">{copy.greetingFailed}</p>}
    </form>
  </details>;
}
