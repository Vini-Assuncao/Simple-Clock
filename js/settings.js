/* ==========================================================================
   settings.js — tema, painel de configurações e sincronização dos controles
   ========================================================================== */

/* ---------- Tema ---------- */
function mix(a, b, t) {
  const f = h => [0, 2, 4].map(i => parseInt(h.slice(1 + i, 3 + i), 16));
  const A = f(a), B = f(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Escreve as cores escolhidas nas variáveis CSS
function applyTheme() {
  const b = COLORS[state.bg];
  const c = COLORS[state.clockTheme];
  const t = COLORS[state.textColor];
  const s = document.documentElement.style;
  s.setProperty('--bg', b.hex);
  s.setProperty('--ui-card', b.ui);
  s.setProperty('--ui-border', b.border);
  s.setProperty('--text', t.hex);
  s.setProperty('--clock-card', c.card);
  s.setProperty('--clock-fg', c.fg);
  s.setProperty('--clock-border', c.cborder);
  s.setProperty('--flip-card', c.flipCard);
  s.setProperty('--flip-edge', c.flipEdge);
  s.setProperty('--pointer', state.pointer);
  s.setProperty('--on-pointer', luminance(state.pointer) > 0.6 ? '#111111' : '#ffffff');
}

/* ---------- Montagem dos controles ---------- */
function buildSwatches() {
  const fill = (id, entries) => {
    $(id).innerHTML = entries.map(([v, label, color]) =>
      `<button type="button" class="sw" data-v="${v}" title="${label}" aria-label="${label}" style="--c:${color}"></button>`
    ).join('');
  };
  fill('bgSw', Object.entries(COLORS).map(([k, o]) => [k, o.label, o.hex]));
  fill('clockSw', Object.entries(COLORS).map(([k, o]) => [k, o.label, o.card]));
  fill('textSw', Object.entries(COLORS).map(([k, o]) => [k, o.label, o.hex]));
  fill('ptrSw', POINTERS.map(p => [p.c, p.label, p.c]));
}

function fillTz() {
  let list;
  try {
    list = Intl.supportedValuesOf('timeZone').slice();
  } catch (e) {
    list = ['America/Sao_Paulo', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
      'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'];
  }
  for (const z of ['UTC', detectedTz, state.tz]) if (!list.includes(z)) list.push(z);
  list.sort();
  $('tzSelect').innerHTML = list.map(z => `<option value="${z}">${z.replace(/_/g, ' ')}</option>`).join('');
}

function renderBlocks() {
  $('stBlocks').innerHTML = state.study.blocks.map((b, i) => `
    <div class="blk" data-i="${i}">
      <input type="text" class="bn" value="${escapeHtml(b.name || '')}" placeholder="Nome" aria-label="Nome do bloco">
      <input type="number" class="bm" min="1" max="600" value="${b.min}" aria-label="Minutos">
      <select class="bk" aria-label="Tipo">
        <option value="study"${b.kind !== 'break' ? ' selected' : ''}>Estudo</option>
        <option value="break"${b.kind === 'break' ? ' selected' : ''}>Pausa</option>
      </select>
      <button class="bdel" aria-label="Remover bloco" title="Remover">×</button>
    </div>`).join('') || '<p class="hint">Nenhum bloco. Adicione abaixo.</p>';
}

/* ---------- Abas e painel ---------- */
// Mostra só as abas do modo atual; se a aba ativa sumir, escolhe a primeira
function refreshTabs() {
  const allowed = MODE_TABS[ui.mode];
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t => { t.hidden = !allowed.includes(t.dataset.tab); });

  let active = document.querySelector('.tab.active');
  if (!active || active.hidden) {
    active = document.querySelector(`.tab[data-tab="${allowed[0]}"]`);
    tabs.forEach(t => t.classList.toggle('active', t === active));
  }
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.dataset.pane === active.dataset.tab));
}

function setPanel(open) {
  if (open) refreshTabs();
  $('panel').hidden = !open;
  $('cfgBtn').setAttribute('aria-expanded', String(open));
}

function applyBarVisibility() {
  $('modeBar').hidden = state.modeBarHidden;
  $('modeShow').hidden = !state.modeBarHidden;
}

/* ---------- Sincronização: estado → controles ---------- */
function syncTimerInputs() {
  const t = Math.floor(state.timerMs / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  $('tmH').value = h; $('tmM').value = m; $('tmS').value = s;
  $('dH').value = h; $('dM').value = m; $('dS').value = s;
}

function syncControls() {
  applyTheme();

  document.querySelectorAll('.swatches').forEach(group => {
    const key = group.dataset.key;
    group.querySelectorAll('button.sw').forEach(b => {
      const on = key === 'pointer' ? state.pointer === b.dataset.v : state[key] === b.dataset.v;
      b.setAttribute('aria-pressed', String(on));
    });
  });
  $('pointerColor').value = state.pointer;

  $('soundOn').checked = state.soundOn;
  $('hideBtns').checked = state.hideBtns;
  $('autoHideUi').checked = state.autoHideUi;
  document.body.classList.toggle('hide-btns', state.hideBtns);
  if (!state.autoHideUi) document.body.classList.remove('ui-idle');

  // Analógico só no relógio e no modo prova
  const analogOk = ANALOG_MODES.includes(ui.mode);
  $('optAnalog').hidden = !analogOk;
  $('optAnalog').disabled = !analogOk;
  $('clockType').value = (!analogOk && state.clock === 'analog') ? 'digital' : state.clock;

  $('fmt').value = state.hour12 ? '12' : '24';
  $('showDate').checked = state.showDate;
  $('showTz').checked = state.showTz;
  $('tzAuto').checked = state.autoTz;
  $('tzSelect').value = state.autoTz ? detectedTz : state.tz;
  $('tzSelect').disabled = state.autoTz;

  $('tmShowInit').checked = state.tmOpts.showInit;
  $('tmShowBar').checked = state.tmOpts.showBar;
  syncTimerInputs();

  $('examStart').value = state.exam.start;
  $('examEnd').value = state.exam.end;
  $('showTimes').checked = state.exam.showTimes;
  $('showCountdown').checked = state.exam.showCountdown;
  ALERTS.forEach(m => { $('alert' + m).checked = !!state.exam.alerts[m]; });

  const S = state.study;
  $('stMode').value = S.mode;
  $('stRepeat').value = S.repeat;
  $('stUntil').value = S.until || '';
  $('stTimeBase').checked = S.timeBase;
  $('stAuto').checked = S.autoNext;
  $('stRepeatRow').hidden = S.mode !== 'count';
  $('stUntilRow').hidden = S.mode !== 'until';
  $('stAutoRow').hidden = S.timeBase;

  document.querySelectorAll('.mb[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === ui.mode));
  applyBarVisibility();

  const hasNotif = 'Notification' in window;
  $('notifBtn').hidden = !hasNotif;
  if (hasNotif) $('notifBtn').textContent = Notification.permission === 'granted' ? 'Ativa' : 'Permitir';

  refreshTabs();
}

/* ---------- Leitura: controles → estado ---------- */
function readControls() {
  state.soundOn = $('soundOn').checked;
  state.hideBtns = $('hideBtns').checked;
  state.autoHideUi = $('autoHideUi').checked;
  state.clock = $('clockType').value;
  state.hour12 = $('fmt').value === '12';
  state.showDate = $('showDate').checked;
  state.showTz = $('showTz').checked;
  state.autoTz = $('tzAuto').checked;
  if (!state.autoTz) state.tz = $('tzSelect').value;
  state.tmOpts.showInit = $('tmShowInit').checked;
  state.tmOpts.showBar = $('tmShowBar').checked;
  state.exam.start = $('examStart').value;
  state.exam.end = $('examEnd').value;
  state.exam.showTimes = $('showTimes').checked;
  state.exam.showCountdown = $('showCountdown').checked;
  ALERTS.forEach(m => { state.exam.alerts[m] = $('alert' + m).checked; });
  state.study.mode = $('stMode').value;
  state.study.repeat = Math.min(50, Math.max(1, +$('stRepeat').value || 1));
  state.study.until = $('stUntil').value;
  state.study.timeBase = $('stTimeBase').checked;
  state.study.autoNext = $('stAuto').checked;
}

// Qualquer alteração: lê, salva, sincroniza e redesenha
function onChange() {
  readControls();
  save();
  syncControls();
  ui.infoKey = '';
  tick();
}
