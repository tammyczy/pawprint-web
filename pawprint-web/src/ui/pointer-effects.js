const pointerMotion = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

export function bindPointerEffects() {
  const enabled = matchMedia(pointerMotion);
  let frame = 0;
  let target;
  let clientX;
  let clientY;

  function update() {
    frame = 0;
    const box = target.getBoundingClientRect();
    if (!box.width || !box.height) return;
    target.style.setProperty('--fx-x', (clientX - box.left) / box.width);
    target.style.setProperty('--fx-y', (clientY - box.top) / box.height);
  }

  function move(event) {
    if (!enabled.matches || event.pointerType === 'touch') return;
    const surface = event.target.closest?.('[data-pointer-fx]');
    if (!surface || surface.matches(':disabled')) return;
    target = surface;
    clientX = event.clientX;
    clientY = event.clientY;
    if (!frame) frame = requestAnimationFrame(update);
  }

  document.addEventListener('pointermove', move, {passive: true});
  return () => {
    document.removeEventListener('pointermove', move);
    cancelAnimationFrame(frame);
  };
}
