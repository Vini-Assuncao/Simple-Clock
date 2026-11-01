(() => {
  'use strict';

  /* ==========================================================================
     Utilidades e constantes
     ========================================================================== */
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const root = document.documentElement;

  const STORE_KEY = 'relogio-config-v4';
  const ALERTS = [60, 30, 15, 10, 5, 1];           // minutos antes do fim
  const ALERT_TEXT = {
    60: 'Faltam 1 hora',
    30: 'Faltam 30 minutos',
    15: 'Faltam 15 minutos',
    10: 'Faltam 10 minutos',
    5: 'Faltam 5 minutos',
    1: 'Falta 1 minuto'
  };
  const ALERT_DURATION = 60 * 1000;                // o aviso some após 1 minuto

  // Paletas de cores
  const BG = {
    preto:       { label: 'Preto',        bg: '#000000', ui: '#151515', border: '#2a2a2a' },
    cinzaEscuro: { label: 'Cinza escuro', bg: '#2b2d33', ui: '#363942', border: '#454955' },
    cinzaClaro:  { label: 'Cinza claro',  bg: '#d9dce2', ui: '#f2f3f6', border: '#b8bcc8' },
    branco:      { label: 'Branco',       bg: '#ffffff', ui: '#f5f6f8', border: '#d9dce3' }
  };
  // card = cor escolhida para o relógio; fg = contraste (números, traços, ponteiros, dígitos)
  const CLOCK = {
    preto:       { label: 'Preto',        card: '#000000', fg: '#ffffff', border: '#333333' },
    cinzaEscuro: { label: 'Cinza escuro', card: '#3a3d47', fg: '#ffffff', border: '#5c606c' },
    cinzaClaro:  { label: 'Cinza claro',  card: '#d9dce2', fg: '#111111', border: '#b8bcc8' },
    branco:      { label: 'Branco',       card: '#ffffff', fg: '#111111', border: '#d9dce3' }
  };
  const TEXT = {
    preto:       { label: 'Preto',        c: '#111111' },
    cinzaEscuro: { label: 'Cinza escuro', c: '#5c606c' },
    cinzaClaro:  { label: 'Cinza claro',  c: '#b8bcc8' },
    branco:      { label: 'Branco',       c: '#ffffff' }
  };
  const POINTERS = [
    { label: 'Vermelho', c: '#e53935' },
    { label: 'Azul',     c: '#2f80ed' },
    { label: 'Verde',    c: '#27ae60' },
    { label: 'Amarelo',  c: '#f2c94c' },
    { label: 'Laranja',  c: '#f2994a' },
    { label: 'Branco',   c: '#ffffff' },
    { label: 'Preto',    c: '#000000' }
  ];

  /* ==========================================================================
     Estado e persistência
     ========================================================================== */
  const detectedTz = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
    catch (e) { return 'UTC'; }
  })();

  const DEFAULTS = {
    clock: 'digital',
    bg: 'preto',
    clockTheme: 'branco',
    textColor: 'branco',
    pointer: '#e53935',
    autoTz: true,
    showTz: true,
    tz: detectedTz,
    hour12: false,
    showDate: true,
    exam: {
      on: false,
      showTimes: true,
      showCountdown: true,
      start: '',
      end: '',
      alerts: { 60: true, 30: true, 15: true, 10: true, 5: true, 1: true }
    }
  };

  let state = JSON.parse(JSON.stringify(DEFAULTS));
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved) {
      state = {
        ...state,
        ...saved,
        exam: {
          ...DEFAULTS.exam,
          ...(saved.exam || {}),
          alerts: { ...DEFAULTS.exam.alerts, ...((saved.exam && saved.exam.alerts) || {}) }
        }
      };
    }
  } catch (e) {}
  if (!state.tz) state.tz = detectedTz;
  if (!/^#[0-9a-f]{6}$/i.test(state.pointer || '')) state.pointer = DEFAULTS.pointer;

  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} };
  const effTz = () => (state.autoTz ? detectedTz : state.tz);

  /* ==========================================================================
     Fuso horário
     ========================================================================== */
  const partsFmtCache = {};
  function getParts(date, tz) {
    if (!partsFmtCache[tz]) {
      partsFmtCache[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
    const o = {};
    for (const p of partsFmtCache[tz].formatToParts(date)) o[p.type] = p.value;
    return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute, s: +o.second };
  }

  function getOffset(date, tz) {
    const p = getParts(date, tz);
    const asUTC = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
    return asUTC - Math.floor(date.getTime() / 1000) * 1000;
  }

  function zonedToEpoch(y, m, d, h, mi, tz) {
    const guess = Date.UTC(y, m - 1, d, h, mi);
    const off1 = getOffset(new Date(guess), tz);
    let t = guess - off1;
    const off2 = getOffset(new Date(t), tz);
    if (off2 !== off1) t = guess - off2;
    return t;
  }

  function parseLocal(value, tz) {
    if (!value || !value.includes('T')) return null;
    const [d, t] = value.split('T');
    const [y, m, dd] = d.split('-').map(Number);
    const [h, mi] = t.split(':').map(Number);
    if ([y, m, dd, h, mi].some(Number.isNaN)) return null;
    return zonedToEpoch(y, m, dd, h, mi, tz);
  }

  function toLocalInput(epoch, tz) {
    const p = getParts(new Date(epoch), tz);
    return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
  }

  // Somente horário (sem data), usado no modo prova
  function fmtTime(epoch, tz) {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: state.hour12
    }).format(new Date(epoch));
  }

  function fmtDur(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
    return d ? `${d}d ${hms}` : hms;
  }

  /* ==========================================================================
     Construção dos relógios
     ========================================================================== */
  function buildFlip() {
    const row = $('flipRow');
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

  let flipVals = [];

  function makeHalf(pos, ch) {
    const d = document.createElement('div');
    d.className = `half ${pos} flap`;
    const s = document.createElement('span');
    s.textContent = ch;
    d.appendChild(s);
    return d;
  }

  function flipAnim(card, oldC, newC) {
    const topS = card.querySelector('.top span');
    const botS = card.querySelector('.bottom span');
    const f1 = makeHalf('top', oldC);
    card.appendChild(f1);
    f1.animate(
      [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }],
      { duration: 260, easing: 'ease-in', fill: 'forwards' }
    ).onfinish = () => {
      f1.remove();
      topS.textContent = newC;
      const f2 = makeHalf('bottom', newC);
      card.appendChild(f2);
      f2.animate(
        [{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }],
        { duration: 260, easing: 'ease-out', fill: 'forwards' }
      ).onfinish = () => {
        f2.remove();
        botS.textContent = newC;
      };
    };
  }

  function setFlipChars(chars, animate) {
    const cards = document.querySelectorAll('#flipRow .flip-card');
    chars.forEach((ch, i) => {
      const card = cards[i];
      if (!card) return;
      const old = flipVals[i];
      if (old === undefined || !animate) {
        card.querySelector('.top span').textContent = ch;
        card.querySelector('.bottom span').textContent = ch;
      } else if (old !== ch) {
        flipAnim(card, old, ch);
      }
      flipVals[i] = ch;
    });
  }

  function buildAnalog() {
    let ticks = '';
    for (let i = 0; i < 60; i++) {
      const len = i % 5 ? 4 : 9;
      const cls = i % 5 ? 'tk' : 'tk major';
      ticks += `<line x1="100" y1="12" x2="100" y2="${12 + len}" transform="rotate(${i * 6} 100 100)" class="${cls}"/>`;
    }
    let nums = '';
    for (let n = 1; n <= 12; n++) {
      const a = n * 30 * Math.PI / 180;
      const x = 100 + 70 * Math.sin(a);
      const y = 100 - 70 * Math.cos(a) + 4.5;
      nums += `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" class="num">${n}</text>`;
    }
    $('analog').innerHTML =
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Relógio analógico">
        <circle cx="100" cy="100" r="96" class="face"/>
        ${ticks}${nums}
        <line id="hH" x1="100" y1="108" x2="100" y2="58" class="hh"/>
        <line id="hM" x1="100" y1="112" x2="100" y2="34" class="hm"/>
        <line id="hS" x1="100" y1="122" x2="100" y2="22" class="hs"/>
        <circle cx="100" cy="100" r="4" class="pin"/>
      </svg>`;
  }

  function renderAnalog(p, now) {
    const sA = (p.s + now.getMilliseconds() / 1000) * 6;
    const mA = (p.mi + p.s / 60) * 6;
    const hA = ((p.h % 12) + p.mi / 60) * 30;
    const hH = $('hH'), hM = $('hM'), hS = $('hS');
    if (!hH) return;
    hH.setAttribute('transform', `rotate(${hA} 100 100)`);
    hM.setAttribute('transform', `rotate(${mA} 100 100)`);
    hS.setAttribute('transform', `rotate(${sA} 100 100)`);
  }

  function renderDigital(p) {
    let h = p.h, suffix = '';
    if (state.hour12) {
      suffix = p.h < 12 ? 'AM' : 'PM';
      h = p.h % 12 || 12;
    }
    $('digitalTime').innerHTML =
      `${state.hour12 ? h : pad(h)}:${pad(p.mi)}:${pad(p.s)}${suffix ? `<small>${suffix}</small>` : ''}`;
  }

  /* ==========================================================================
     Data e fuso exibidos
     ========================================================================== */
  function updateInfo(now, tz) {
    const dl = $('dateLine');
    dl.hidden = !state.showDate;
    if (state.showDate) {
      dl.textContent = new Intl.DateTimeFormat('pt-BR', {
        timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      }).format(now);
    }
    const tzl = $('tzLabel');
    tzl.hidden = !state.showTz;
    if (state.showTz) {
      let off = '';
      try {
        off = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, timeZoneName: 'shortOffset' })
          .formatToParts(now).find(x => x.type === 'timeZoneName')?.value || '';
      } catch (e) {}
      tzl.textContent = tz.replace(/_/g, ' ') + (off ? ` · ${off}` : '');
    }
  }

  /* ==========================================================================
     Modo prova: contagem e avisos
     ========================================================================== */
  let alertKey = '';
  let firedAlerts = new Set();
  let alertTimer = null;

  function showAlert(text) {
    const el = $('examAlert');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(alertTimer);
    alertTimer = setTimeout(() => {
      el.hidden = true;
      alertTimer = null;
    }, ALERT_DURATION);
  }

  function hideAlert() {
    clearTimeout(alertTimer);
    alertTimer = null;
    $('examAlert').hidden = true;
  }

  function checkAlerts(t, S, E) {
    if (S == null || E == null || E <= S) return;
    const key = S + '|' + E;
    // Ao definir um novo intervalo, os avisos já passados não disparam
    if (key !== alertKey) {
      alertKey = key;
      firedAlerts = new Set(ALERTS.filter(m => E - t <= m * 60000));
    }
    if (t >= E) return;
    const fresh = ALERTS.filter(m => E - t <= m * 60000 && !firedAlerts.has(m));
    if (!fresh.length) return;
    fresh.forEach(m => firedAlerts.add(m));
    const mostUrgent = Math.min(...fresh);
    if (state.exam.alerts[mostUrgent]) showAlert(ALERT_TEXT[mostUrgent]);
  }

  function renderExam(now, tz) {
    const box = $('examBox');
    if (!state.exam.on) {
      box.hidden = true;
      hideAlert();
      return;
    }

    const S = parseLocal(state.exam.start, tz);
    const E = parseLocal(state.exam.end, tz);
    const t = now.getTime();
    checkAlerts(t, S, E);

    let h = '';
    if (state.exam.showTimes) {
      h += `<div class="ex-times">
        <div><span>Início</span><strong>${S != null ? fmtTime(S, tz) : '—'}</strong></div>
        <div><span>Fim</span><strong>${E != null ? fmtTime(E, tz) : '—'}</strong></div>
      </div>`;
    }

    if (state.exam.showCountdown) {
      if (S == null || E == null || E <= S) {
        h += `<div class="ex-msg">Defina um início e um fim válidos.</div>`;
      } else if (t < S) {
        h += `<div class="ex-label">Começa em</div><div class="ex-count">${fmtDur(S - t)}</div>`;
        h += `<div class="bar"><i style="width:0%"></i></div>`;
      } else if (t < E) {
        const pct = Math.min(100, Math.max(0, (t - S) / (E - S) * 100));
        h += `<div class="ex-label">Termina em</div><div class="ex-count">${fmtDur(E - t)}</div>`;
        h += `<div class="bar"><i style="width:${pct.toFixed(2)}%"></i></div>`;
      } else {
        h += `<div class="ex-msg">Prova encerrada</div>`;
        h += `<div class="bar"><i style="width:100%"></i></div>`;
      }
    }

    box.hidden = !h;
    if (h) box.innerHTML = h;
  }

  function setDefaultExam() {
    const tz = effTz();
    const now = Date.now();
    state.exam.start = toLocalInput(now, tz);
    state.exam.end = toLocalInput(now + 60 * 60 * 1000, tz);
  }

  /* ==========================================================================
     Tema (cores)
     ========================================================================== */
  function applyTheme() {
    const b = BG[state.bg] || BG.preto;
    const c = CLOCK[state.clockTheme] || CLOCK.branco;
    const t = TEXT[state.textColor] || TEXT.branco;
    const s = root.style;
    s.setProperty('--bg', b.bg);
    s.setProperty('--ui-card', b.ui);
    s.setProperty('--ui-border', b.border);
    s.setProperty('--text', t.c);
    s.setProperty('--clock-card', c.card);
    s.setProperty('--clock-fg', c.fg);
    s.setProperty('--clock-border', c.border);
    s.setProperty('--pointer', state.pointer);
  }

  /* ==========================================================================
     Loop principal
     ========================================================================== */
  let lastKey = '';
  function tick() {
    const now = new Date();
    const tz = effTz();
    const p = getParts(now, tz);
    const mode = state.clock;

    $('digital').hidden = mode !== 'digital';
    $('flip').hidden = mode !== 'flip';
    $('analog').hidden = mode !== 'analog';

    if (mode === 'digital') {
      renderDigital(p);
    } else if (mode === 'flip') {
      const hh = state.hour12 ? (p.h % 12 || 12) : p.h;
      setFlipChars((pad(hh) + pad(p.mi) + pad(p.s)).split(''), true);
      $('flipAmpm').textContent = state.hour12 ? (p.h < 12 ? 'AM' : 'PM') : '';
    } else {
      renderAnalog(p, now);
    }

    const key = Math.floor(now.getTime() / 1000) + '|' + tz + '|' + state.showDate + '|' + state.showTz;
    if (key !== lastKey) { lastKey = key; updateInfo(now, tz); }

    renderExam(now, tz);
  }

  /* ==========================================================================
     Painel de configurações
     ========================================================================== */
  function buildSwatches() {
    const fill = (id, entries) => {
      $(id).innerHTML = entries.map(([value, label, color]) =>
        `<button type="button" class="sw" data-v="${value}" title="${label}" aria-label="${label}" style="--c:${color}"></button>`
      ).join('');
    };
    fill('bgSwatches', Object.entries(BG).map(([k, o]) => [k, o.label, o.bg]));
    fill('clockSwatches', Object.entries(CLOCK).map(([k, o]) => [k, o.label, o.card]));
    fill('textSwatches', Object.entries(TEXT).map(([k, o]) => [k, o.label, o.c]));
    fill('pointerSwatches', POINTERS.map(p => [p.c, p.label, p.c]));
  }

  function fillTz() {
    let list;
    try { list = Intl.supportedValuesOf('timeZone').slice(); }
    catch (e) {
      list = ['America/Sao_Paulo', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
              'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'];
    }
    for (const z of ['UTC', detectedTz, state.tz]) if (!list.includes(z)) list.push(z);
    list.sort();
    $('tzSelect').innerHTML = list
      .map(z => `<option value="${z}">${z.replace(/_/g, ' ')}</option>`).join('');
  }

  function syncControls() {
    applyTheme();

    // Botões de cor: marca o selecionado
    document.querySelectorAll('.swatches').forEach(group => {
      const key = group.dataset.key;
      group.querySelectorAll('button.sw').forEach(b => {
        b.setAttribute('aria-pressed', String(state[key] === b.dataset.v));
      });
    });
    $('pointerColor').value = state.pointer;

    $('clockType').value = state.clock;
    $('fmt').value = state.hour12 ? '12' : '24';
    $('showDate').checked = state.showDate;
    $('showTz').checked = state.showTz;
    $('tzAuto').checked = state.autoTz;
    $('tzSelect').value = state.autoTz ? detectedTz : state.tz;
    $('tzSelect').disabled = state.autoTz;

    $('examOn').checked = state.exam.on;
    $('examOpts').hidden = !state.exam.on;
    $('examStart').value = state.exam.start;
    $('examEnd').value = state.exam.end;
    $('showTimes').checked = state.exam.showTimes;
    $('showCountdown').checked = state.exam.showCountdown;
    ALERTS.forEach(m => { $('alert' + m).checked = !!state.exam.alerts[m]; });
  }

  function readControls() {
    state.clock = $('clockType').value;
    state.hour12 = $('fmt').value === '12';
    state.showDate = $('showDate').checked;
    state.showTz = $('showTz').checked;
    state.autoTz = $('tzAuto').checked;
    if (!state.autoTz) state.tz = $('tzSelect').value;
    state.exam.on = $('examOn').checked;
    state.exam.start = $('examStart').value;
    state.exam.end = $('examEnd').value;
    state.exam.showTimes = $('showTimes').checked;
    state.exam.showCountdown = $('showCountdown').checked;
    ALERTS.forEach(m => { state.exam.alerts[m] = $('alert' + m).checked; });
  }

  function onChange() {
    readControls();
    save();
    syncControls();
    lastKey = '';
    tick();
  }

  // Cliques nos botões de cor
  $('panel').addEventListener('click', e => {
    const btn = e.target.closest('button.sw');
    if (!btn) return;
    const key = btn.parentElement.dataset.key;
    state[key] = btn.dataset.v;
    onChange();
  });

  // Cor personalizada do ponteiro (atualiza enquanto arrasta)
  $('pointerColor').addEventListener('input', e => {
    state.pointer = e.target.value;
    save();
    syncControls();
  });

  $('examOn').addEventListener('change', () => {
    readControls();
    if (state.exam.on && (!state.exam.start || !state.exam.end)) setDefaultExam();
    save();
    syncControls();
    lastKey = '';
    tick();
  });

  ['clockType', 'fmt', 'showDate', 'showTz', 'tzAuto', 'tzSelect',
   'showTimes', 'showCountdown', 'examStart', 'examEnd',
   ...ALERTS.map(m => 'alert' + m)]
    .forEach(id => $(id).addEventListener('change', onChange));

  const panel = $('panel');
  const cfgBtn = $('cfgBtn');
  function setPanel(open) {
    panel.hidden = !open;
    cfgBtn.setAttribute('aria-expanded', String(open));
  }
  cfgBtn.addEventListener('click', () => setPanel(panel.hidden));
  $('closeBtn').addEventListener('click', () => setPanel(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setPanel(false); });

  /* ==========================================================================
     Tela cheia
     ========================================================================== */
  const fsBtn = $('fsBtn');
  const canFS = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  if (!canFS) fsBtn.hidden = true;

  const isFS = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

  fsBtn.addEventListener('click', () => {
    try {
      if (isFS()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
      }
    } catch (e) {}
  });

  const onFsChange = () => {
    const fs = isFS();
    root.classList.toggle('is-fs', fs);
    fsBtn.textContent = fs ? '✕' : '⛶';
    fsBtn.title = fs ? 'Sair da tela cheia' : 'Tela cheia';
    fsBtn.setAttribute('aria-label', fsBtn.title);
    if (fs) setPanel(false);
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  /* ==========================================================================
     Inicialização
     ========================================================================== */
  buildFlip();
  buildAnalog();
  buildSwatches();
  fillTz();
  syncControls();
  tick();
  setInterval(tick, 100);
})();
