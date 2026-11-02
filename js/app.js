/* ==========================================================================
   app.js — eventos, troca de modos, tela cheia, tela ligada e inicialização
   ========================================================================== */

/* ---------- Troca de modos ---------- */
function setMode(m) {
  if (ui.mode === 'study' && m !== 'study') resetStudy();
  ui.mode = m;
  state.lastMode = m;
  save();
  if (m === 'exam') ensureExamDefaults();
  Object.values(MODE_VIEW).forEach(id => { $(id).hidden = true; });
  $(MODE_VIEW[m]).hidden = false;
  ui.infoKey = '';
  syncControls();
  tick();
}

/* ---------- Cronômetro ---------- */
function bindStopwatch() {
  $('swToggle').addEventListener('click', () => {
    if (rt.sw.running) pauseR(rt.sw); else startR(rt.sw);
    renderStopwatch();
  });
  $('swLap').addEventListener('click', () => {
    if (!rt.sw.running) return;
    const total = elapsed(rt.sw);
    const prev = rt.sw.laps.length ? rt.sw.laps[rt.sw.laps.length - 1].totalMs : 0;
    rt.sw.laps.push({ total: fmtHMS(total), totalMs: total, split: fmtHMS(total - prev) });
    renderLaps();
  });
  $('swReset').addEventListener('click', () => {
    pauseR(rt.sw);
    rt.sw.acc = 0;
    rt.sw.laps = [];
    renderLaps();
    renderStopwatch();
  });
}

/* ---------- Temporizador ---------- */
function bindTimer() {
  $('tmToggle').addEventListener('click', () => {
    const r = rt.tm;
    if (r.running) { pauseR(r); return; }
    if (r.ended || elapsed(r) >= state.timerMs) { r.acc = 0; r.ended = false; }
    if (state.timerMs > 0) startR(r);
    renderTimer();
  });
  $('tmReset').addEventListener('click', () => {
    pauseR(rt.tm);
    rt.tm.acc = 0;
    rt.tm.ended = false;
    renderTimer();
  });
  // Campos da tela do temporizador e das configurações mudam a mesma duração
  ['tmH', 'tmM', 'tmS'].forEach(id => $(id).addEventListener('change', () => {
    setTimerMs(readTimerInputs('tm'));
    syncTimerInputs();
    renderTimer();
  }));
  ['dH', 'dM', 'dS'].forEach(id => $(id).addEventListener('change', () => {
    setTimerMs(readTimerInputs('d'));
    syncTimerInputs();
    renderTimer();
  }));
  ['tmShowInit', 'tmShowBar'].forEach(id => $(id).addEventListener('change', onChange));
}

/* ---------- Estudo ---------- */
function bindStudy() {
  $('stToggle').addEventListener('click', toggleStudy);
  $('stSkip').addEventListener('click', () => {
    const S = state.study;
    if (!S.blocks.length || rt.st.done || S.timeBase) return;
    studyNext(false);
    renderStudy(Date.now());
  });
  $('stReset').addEventListener('click', () => {
    resetStudy();
    renderStudy(Date.now());
  });

  // Estilos prontos
  document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
    const P = PRESETS[b.dataset.preset];
    state.study.repeat = P.repeat;
    state.study.blocks = P.blocks();
    resetStudy();
    save();
    syncControls();
    renderBlocks();
  }));

  // Opções de repetição e base de tempo
  ['stMode', 'stRepeat', 'stUntil', 'stTimeBase', 'stAuto'].forEach(id =>
    $(id).addEventListener('change', () => { resetStudy(); onChange(); }));

  // Editor de blocos (delegado)
  $('stBlocks').addEventListener('change', e => {
    const row = e.target.closest('.blk');
    const b = row && state.study.blocks[+row.dataset.i];
    if (!b) return;
    if (e.target.classList.contains('bn')) b.name = e.target.value.trim();
    if (e.target.classList.contains('bm')) b.min = Math.min(600, Math.max(1, +e.target.value || 1));
    if (e.target.classList.contains('bk')) b.kind = e.target.value;
    resetStudy();
    save();
    renderBlocks();
  });
  $('stBlocks').addEventListener('click', e => {
    const del = e.target.closest('.bdel');
    if (!del) return;
    state.study.blocks.splice(+del.closest('.blk').dataset.i, 1);
    resetStudy();
    save();
    renderBlocks();
  });
  $('stAdd').addEventListener('click', () => {
    state.study.blocks.push({ name: 'Estudo', min: 25, kind: 'study' });
    resetStudy();
    save();
    renderBlocks();
  });
}

/* ---------- Lembretes ---------- */
function bindReminders() {
  $('remAdd').addEventListener('click', () => {
    const time = $('remTime').value;
    const text = $('remText').value.trim();
    if (!time || !text) return;
    state.reminders.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      time, text, daily: $('remDaily').checked, done: false, lastDate: ''
    });
    $('remText').value = '';
    save();
    renderReminders(getParts(new Date(), effTz()));
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(syncControls).catch(() => {});
    }
  });
  $('remList').addEventListener('click', e => {
    const b = e.target.closest('.rem-del');
    if (!b) return;
    state.reminders = state.reminders.filter(r => r.id !== b.dataset.id);
    save();
    renderReminders(getParts(new Date(), effTz()));
  });
  $('notifBtn').addEventListener('click', () => {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(syncControls).catch(() => {});
  });
}

/* ---------- Painel ---------- */
function bindPanel() {
  $('cfgBtn').addEventListener('click', () => setPanel($('panel').hidden));
  $('closeBtn').addEventListener('click', () => setPanel(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setPanel(false); });

  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.dataset.pane === t.dataset.tab));
  }));

  // Botões de cor
  $('panel').addEventListener('click', e => {
    const btn = e.target.closest('button.sw');
    if (!btn) return;
    const key = btn.parentElement.dataset.key;
    const v = btn.dataset.v;
    if (key === 'bg') {
      if (state.textColor === v) state.textColor = CONTRAST[v];
      state.bg = v;
      $('textWarn').hidden = true;
    } else if (key === 'textColor') {
      if (v === state.bg) {
        // Cor do texto igual à do fundo: não aceita e avisa
        const w = $('textWarn');
        w.hidden = false;
        clearTimeout(w._t);
        w._t = setTimeout(() => { w.hidden = true; }, 3000);
        return;
      }
      state.textColor = v;
    } else if (key === 'clockTheme') {
      state.clockTheme = v;
    } else if (key === 'pointer') {
      state.pointer = v;
    }
    onChange();
  });
  $('pointerColor').addEventListener('input', e => {
    state.pointer = e.target.value;
    save();
    syncControls();
  });

  // Demais opções
  ['soundOn', 'hideBtns', 'autoHideUi', 'clockType', 'fmt', 'showDate', 'showTz', 'tzAuto', 'tzSelect',
    'showTimes', 'showCountdown', 'examStart', 'examEnd', ...ALERTS.map(m => 'alert' + m)]
    .forEach(id => $(id).addEventListener('change', onChange));
}

/* ---------- Barra de modos ---------- */
function bindModeBar() {
  $('modeBar').addEventListener('click', e => {
    if (e.target.closest('#modeHide')) {
      state.modeBarHidden = true;
      save();
      applyBarVisibility();
      return;
    }
    const b = e.target.closest('.mb[data-mode]');
    if (b) setMode(b.dataset.mode);
  });
  $('modeShow').addEventListener('click', () => {
    state.modeBarHidden = false;
    save();
    applyBarVisibility();
  });
}

/* ---------- Botões ocultos: aparecem ao tocar ou mover o mouse ---------- */
const CTRL_IDLE_MS = 3000;   // botões de controle (cronômetro, estudo...)
const UI_IDLE_MS = 15000;    // barra de modos, tela cheia e configurações
// Inatividade de menus só em computador (mouse fino). No celular os menus ficam visíveis.
const DESKTOP_POINTER = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : true;
let showTimer = null;
let uiTimer = null;

// Qualquer atividade do usuário reativa os botões e reinicia as contagens de inatividade
function wakeButtons() {
  if (state.hideBtns) {
    document.body.classList.add('btn-show');
    clearTimeout(showTimer);
    showTimer = setTimeout(() => document.body.classList.remove('btn-show'), CTRL_IDLE_MS);
  }
  document.body.classList.remove('ui-idle');
  clearTimeout(uiTimer);
  if (state.autoHideUi && DESKTOP_POINTER) {
    uiTimer = setTimeout(() => {
      if ($('panel').hidden) document.body.classList.add('ui-idle');
    }, UI_IDLE_MS);
  }
}

/* ---------- Tela cheia ---------- */
const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

function bindFullscreen() {
  const root = document.documentElement;
  const btn = $('fsBtn');
  if (!(root.requestFullscreen || root.webkitRequestFullscreen)) btn.hidden = true;

  btn.addEventListener('click', () => {
    try {
      if (isFullscreen()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    } catch (e) {}
  });

  const onChangeFs = () => {
    const fs = isFullscreen();
    root.classList.toggle('is-fs', fs);
    btn.textContent = fs ? '✕' : '⛶';
    btn.title = fs ? 'Sair da tela cheia' : 'Tela cheia';
    btn.setAttribute('aria-label', btn.title);
    if (fs) setPanel(false);
  };
  document.addEventListener('fullscreenchange', onChangeFs);
  document.addEventListener('webkitfullscreenchange', onChangeFs);
}

/* ---------- Tela sempre ligada (Screen Wake Lock) ---------- */
let wakeLock = null;
async function keepAwake() {
  if (!('wakeLock' in navigator) || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {
    wakeLock = null;
  }
}

function bindWakeLock() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') keepAwake();
  });
  // Alguns navegadores só liberam a tela com um gesto do usuário
  document.addEventListener('pointerdown', keepAwake, { passive: true });
  keepAwake();
}

/* ---------- Inicialização ---------- */
function init() {
  initDisplays();
  buildSwatches();
  fillTz();
  renderBlocks();

  bindStopwatch();
  bindTimer();
  bindStudy();
  bindReminders();
  bindPanel();
  bindModeBar();
  bindFullscreen();
  bindWakeLock();

  ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, wakeButtons, { passive: true }));

  setMode(ui.mode);
  wakeButtons();
  setInterval(tick, 100);
}

init();
