/* ==========================================================================
   display.js — desenho dos relógios (digital, flip, analógico) e avisos
   ========================================================================== */

// Displays de texto (cronômetro, temporizador, estudo) e blocos de relógio
const DISP = {};
const CLK = {};

function displayHTML() {
  return `<div class="digital"><span class="dtext"></span></div>
    <div class="flip-wrap" hidden><div class="flip-row"></div><div class="ampm"></div></div>`;
}

function buildFlipCards(row) {
  row.innerHTML = '';
  for (let g = 0; g < 3; g++) {
    if (g) {
      const sep = document.createElement('div');
      sep.className = 'sep';
      sep.textContent = ':';
      row.appendChild(sep);
    }
    for (let k = 0; k < 2; k++) {
      const card = document.createElement('div');
      card.className = 'flip-card';
      card.innerHTML = '<div class="half top"><span></span></div><div class="half bottom"><span></span></div>';
      row.appendChild(card);
    }
  }
}

// Monta um display dentro do elemento e devolve as referências
function makeDisplay(el) {
  el.innerHTML = displayHTML();
  const row = el.querySelector('.flip-row');
  buildFlipCards(row);
  return {
    el,
    dig: el.querySelector('.digital'),
    dtext: el.querySelector('.dtext'),
    wrap: el.querySelector('.flip-wrap'),
    row,
    ampm: el.querySelector('.ampm'),
    vals: []
  };
}

// Bloco de relógio: data acima, display, analógico e fuso abaixo
function mountClockWrap(el) {
  el.innerHTML = `<div class="stack">
      <div class="date" hidden></div>
      <div class="display"></div>
      <div class="analog" hidden></div>
    </div>
    <div class="tz" hidden></div>`;
  return {
    date: el.querySelector('.date'),
    disp: makeDisplay(el.querySelector('.display')),
    ana: el.querySelector('.analog'),
    tz: el.querySelector('.tz')
  };
}

function initDisplays() {
  document.querySelectorAll('[data-display]').forEach(el => {
    DISP[el.dataset.display] = makeDisplay(el);
  });
  document.querySelectorAll('[data-clock]').forEach(el => {
    CLK[el.dataset.clock] = mountClockWrap(el);
  });
  Object.values(CLK).forEach(c => buildAnalog(c.ana));
}

/* ---------- Flip ---------- */
function makeHalf(pos, ch) {
  const d = document.createElement('div');
  d.className = `half ${pos} flap`;
  const s = document.createElement('span');
  s.textContent = ch;
  d.appendChild(s);
  return d;
}

// Animação de virada de um dígito
function flipAnim(card, oldC, newC) {
  const topS = card.querySelector('.top span');
  const botS = card.querySelector('.bottom span');
  const f1 = makeHalf('top', oldC);
  card.appendChild(f1);
  f1.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }],
    { duration: 260, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
    f1.remove();
    topS.textContent = newC;
    const f2 = makeHalf('bottom', newC);
    card.appendChild(f2);
    f2.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }],
      { duration: 260, easing: 'ease-out', fill: 'forwards' }).onfinish = () => {
      f2.remove();
      botS.textContent = newC;
    };
  };
}

function setFlipChars(d, chars) {
  const cards = d.row.querySelectorAll('.flip-card');
  chars.forEach((ch, i) => {
    const card = cards[i];
    if (!card) return;
    const old = d.vals[i];
    if (old === undefined) {
      card.querySelector('.top span').textContent = ch;
      card.querySelector('.bottom span').textContent = ch;
    } else if (old !== ch) {
      flipAnim(card, old, ch);
    }
    d.vals[i] = ch;
  });
}

/* ---------- Escrita em um display ---------- */
// Digital: texto + extras pequenos. Flip: só os 6 dígitos do texto.
function showDisp(d, text, extra, flip, ampm) {
  if (flip) {
    d.dig.hidden = true;
    d.wrap.hidden = false;
    d.ampm.textContent = ampm || '';
    setFlipChars(d, text.replace(/\D/g, '').slice(-6).padStart(6, '0').split(''));
  } else {
    d.dig.hidden = false;
    d.wrap.hidden = true;
    d.dtext.innerHTML = text
      + (extra ? `<small>${extra}</small>` : '')
      + (ampm ? `<small>${ampm}</small>` : '');
  }
}

/* ---------- Analógico ---------- */
function buildAnalog(container) {
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const len = i % 5 ? 4 : 9;
    const cls = i % 5 ? 'tk' : 'tk major';
    ticks += `<line x1="100" y1="12" x2="100" y2="${12 + len}" transform="rotate(${i * 6} 100 100)" class="${cls}"/>`;
  }
  let nums = '';
  for (let n = 1; n <= 12; n++) {
    const a = n * 30 * Math.PI / 180;
    nums += `<text x="${(100 + 70 * Math.sin(a)).toFixed(2)}" y="${(100 - 70 * Math.cos(a) + 4.5).toFixed(2)}" class="num">${n}</text>`;
  }
  container.innerHTML =
    `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Relógio analógico">
      <circle cx="100" cy="100" r="96" class="face"/>
      ${ticks}${nums}
      <line class="hh" x1="100" y1="108" x2="100" y2="58"/>
      <line class="hm" x1="100" y1="112" x2="100" y2="34"/>
      <line class="hs" x1="100" y1="122" x2="100" y2="22"/>
      <circle cx="100" cy="100" r="4" class="pin"/>
    </svg>`;
}

function renderAnalog(ana, now, p) {
  const sA = (p.s + now.getMilliseconds() / 1000) * 6;
  const mA = (p.mi + p.s / 60) * 6;
  const hA = ((p.h % 12) + p.mi / 60) * 30;
  ana.querySelector('.hh').setAttribute('transform', `rotate(${hA} 100 100)`);
  ana.querySelector('.hm').setAttribute('transform', `rotate(${mA} 100 100)`);
  ana.querySelector('.hs').setAttribute('transform', `rotate(${sA} 100 100)`);
}

/* ---------- Avisos e sons ---------- */
let audioCtx = null;
const AudioCtor = window.AudioContext || window.webkitAudioContext;

// Três bipes curtos
function alarm() {
  if (!state.soundOn || !AudioCtor) return;
  try {
    audioCtx = audioCtx || new AudioCtor();
    const t0 = audioCtx.currentTime;
    [0, 0.45, 0.9].forEach(dt => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.3, t0 + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.3);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0 + dt);
      o.stop(t0 + dt + 0.32);
    });
  } catch (e) {}
}

// Libera o áudio no primeiro toque (exigência dos navegadores)
document.addEventListener('pointerdown', () => {
  try {
    if (AudioCtor) {
      audioCtx = audioCtx || new AudioCtor();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    }
  } catch (e) {}
}, { once: true });

// Pílula no topo com a mensagem; some sozinha e toca o som
let pillTimer = null;
function showPill(text) {
  const el = $('examAlert');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(pillTimer);
  pillTimer = setTimeout(() => { el.hidden = true; pillTimer = null; }, PILL_MS);
  alarm();
}
