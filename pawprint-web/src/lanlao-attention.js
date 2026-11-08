// A deliberate response can invite one playful greeting within the same exchange.
const RESPONSE_WINDOW = 5;
const RESPONSE_DEBOUNCE = .22;

export function createLanlaoAttention() {
 let available = true;
 let remaining = 0;
 let debounce = 0;
 let pending = false;

 return {
  get recent() {
   return remaining > 0;
  },
  get fresh() {
   return pending && remaining > 0;
  },
  advance(dt, options = {}) {
   available = options.available ?? available;
   remaining = available ? Math.max(0, remaining - dt) : 0;
   debounce = available ? Math.max(0, debounce - dt) : 0;
   if (!remaining) pending = false;
  },
  engage() {
   if (!available || debounce > 0) return false;
   remaining = RESPONSE_WINDOW;
   debounce = RESPONSE_DEBOUNCE;
   pending = true;
   return true;
  },
  consume() {
   if (!pending) return false;
   pending = false;
   return true;
  },
  discardPending() {
   pending = false;
  },
  disengage() {
   remaining = 0;
   debounce = 0;
   pending = false;
  }
 };
}

function ease(value) {
 const t = Math.max(0, Math.min(1, value));
 return t * t * (3 - 2 * t);
}

function pop(elapsed, rise, release, end) {
 return ease(elapsed / rise) * (1 - ease((elapsed - release) / (end - release)));
}

export function createLanlaoGreeting(attention) {
 const frame = {
  depth: 0, look: 0, phase: 'look', done: false, playful: false, turnIntent: 0, landingAge: undefined
 };
 let first = null;
 let second = null;
 let firstLanded = false;
 let lookAtFirst = 0;
 let lookAtSecond = 0;

 return {
  reset() {
   first = null;
   second = null;
   firstLanded = false;
   lookAtFirst = 0;
   lookAtSecond = 0;
  },
  sample(time) {
   frame.depth = 0;
   frame.phase = 'look';
   frame.turnIntent = 0;
   frame.landingAge = undefined;
   frame.done = false;

   const calmLook = ease(time / .32) * (1 - ease((time - 2.04) / .31));
   if (first === null && time >= .55 && time < 2.35 && attention.consume()) {
    first = time;
    lookAtFirst = calmLook;
   }
   frame.playful = first !== null;
   if (first === null) {
    frame.look = calmLook;
    frame.done = time >= 2.35;
    return frame;
   }

   const elapsed = time - first;
   if (!firstLanded && elapsed >= .55) {
    firstLanded = true;
    // An input captured while the first pop was airborne cannot queue a second.
    attention.discardPending();
   }
   const firstLook = (lookAtFirst + (1 - lookAtFirst) * ease(elapsed / .18)) *
    (1 - ease((elapsed - 1.53) / .27));
   if (second === null && elapsed >= 1 && elapsed < 1.8 && attention.consume()) {
    second = time;
    lookAtSecond = firstLook;
   }
   if (second === null) {
    frame.depth = pop(elapsed, .20, .30, .55);
    frame.look = firstLook;
    frame.phase = elapsed < .55 ? 'pop' : 'look';
    if (firstLanded) frame.landingAge = elapsed - .55;
    frame.done = elapsed >= 1.8;
    return frame;
   }

   const again = time - second;
   frame.depth = .82 * pop(again, .17, .25, .53);
   frame.look = (lookAtSecond + (1 - lookAtSecond) * ease(again / .18)) *
    (1 - ease((again - .43) / .27));
   frame.turnIntent = ease((again - .24) / .18) * (1 - ease((again - .48) / .22));
   frame.phase = again < .53 ? 'pop' : 'look';
   if (again >= .53) frame.landingAge = again - .53;
   frame.done = again >= .70;
   return frame;
  }
 };
}
