/* ==========================================================================
   config.js — constantes, paletas, valores padrão e estado salvo localmente
   ========================================================================== */

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const MIN = 60 * 1000;

const STORE_KEY = 'relogio-config-v8';
const LEGACY_KEY = 'relogio-config-v7';

// Modos: id da view, abas do painel visíveis e se aceitam o analógico
const MODE_VIEW = {
  clock: 'viewClock',
  stopwatch: 'viewStopwatch',
  timer: 'viewTimer',
  study: 'viewStudy',
  exam: 'viewExam',
  reminders: 'viewRem'
};
const MODE_TABS = {
  clock: ['geral', 'aparencia', 'relogio', 'fuso'],
  stopwatch: ['geral', 'aparencia', 'relogio'],
  timer: ['geral', 'aparencia', 'relogio', 'cronos'],
  study: ['geral', 'aparencia', 'relogio', 'estudo'],
  exam: ['geral', 'aparencia', 'relogio', 'fuso', 'prova'],
  reminders: ['geral', 'aparencia', 'relogio', 'lembretes']
};
const ANALOG_MODES = ['clock', 'exam'];

const ALERTS = [60, 30, 15, 10, 5, 1];                 // minutos antes do fim da prova
const ALERT_TEXT = {
  60: 'Faltam 1 hora', 30: 'Faltam 30 minutos', 15: 'Faltam 15 minutos',
  10: 'Faltam 10 minutos', 5: 'Faltam 5 minutos', 1: 'Falta 1 minuto'
};
const PILL_MS = 60 * 1000;                             // tempo que um aviso fica na tela

// Paletas. hex = cor do fundo; card = cor do relógio; fg = contraste no relógio.
// flipCard/flipEdge = tom dos cartões do flip (levemente diferente do relógio).
const COLORS = {
  preto:       { label: 'Preto',        hex: '#000000', ui: '#151515', border: '#2a2a2a', card: '#000000', fg: '#ffffff', cborder: '#333333', flipCard: '#1f1f1f', flipEdge: '#4d4d4d' },
  cinzaEscuro: { label: 'Cinza escuro', hex: '#2b2d33', ui: '#363942', border: '#454955', card: '#3a3d47', fg: '#ffffff', cborder: '#5c606c', flipCard: '#52545d', flipEdge: '#75777e' },
  cinzaClaro:  { label: 'Cinza claro',  hex: '#d9dce2', ui: '#f2f3f6', border: '#b8bcc8', card: '#d9dce2', fg: '#111111', cborder: '#b8bcc8', flipCard: '#eceef2', flipEdge: '#c5c9d4' },
  branco:      { label: 'Branco',       hex: '#ffffff', ui: '#f5f6f8', border: '#d9dce3', card: '#ffffff', fg: '#111111', cborder: '#d9dce3', flipCard: '#f3f4f6', flipEdge: '#d9dce3' }
};
// Se o fundo virar a cor do texto, o texto passa a usar este contraste
const CONTRAST = { preto: 'branco', branco: 'preto', cinzaEscuro: 'cinzaClaro', cinzaClaro: 'cinzaEscuro' };

const POINTERS = [
  { label: 'Vermelho', c: '#e53935' }, { label: 'Azul', c: '#2f80ed' },
  { label: 'Verde', c: '#27ae60' }, { label: 'Amarelo', c: '#f2c94c' },
  { label: 'Laranja', c: '#f2994a' }, { label: 'Branco', c: '#ffffff' },
  { label: 'Preto', c: '#000000' }
];

const pomodoroBlocks = () => [
  { name: 'Foco', min: 25, kind: 'study' }, { name: 'Pausa', min: 5, kind: 'break' },
  { name: 'Foco', min: 25, kind: 'study' }, { name: 'Pausa', min: 5, kind: 'break' },
  { name: 'Foco', min: 25, kind: 'study' }, { name: 'Pausa', min: 5, kind: 'break' },
  { name: 'Foco', min: 25, kind: 'study' }, { name: 'Pausa longa', min: 15, kind: 'break' }
];
const PRESETS = {
  pomodoro: { repeat: 1, blocks: pomodoroBlocks },
  longo: {
    repeat: 2,
    blocks: () => [
      { name: 'Estudo', min: 50, kind: 'study' }, { name: 'Pausa', min: 10, kind: 'break' },
      { name: 'Estudo', min: 50, kind: 'study' }, { name: 'Pausa longa', min: 30, kind: 'break' }
    ]
  },
  curto: {
    repeat: 3,
    blocks: () => [{ name: 'Estudo', min: 15, kind: 'study' }, { name: 'Pausa', min: 3, kind: 'break' }]
  }
};

const detectedTz = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch (e) { return 'UTC'; }
})();

const DEFAULTS = {
  lastMode: 'clock',
  modeBarHidden: false,
  soundOn: true,
  hideBtns: false,
  autoHideUi: true,
  clock: 'digital',          // digital | flip | analog
  bg: 'preto',
  clockTheme: 'branco',
  textColor: 'branco',
  pointer: '#e53935',
  autoTz: true,
  showTz: true,
  tz: detectedTz,
  hour12: false,
  showDate: true,
  timerMs: 5 * MIN,
  tmOpts: { showInit: true, showBar: true },
  study: {
    mode: 'count',           // count | until | infinite
    repeat: 1,
    until: '',               // "HH:MM"
    timeBase: false,         // blocos em horários fixos
    autoNext: true,
    blocks: pomodoroBlocks()
  },
  reminders: [],
  exam: {
    showTimes: true,
    showCountdown: true,
    start: '',
    end: '',
    alerts: { 60: true, 30: true, 15: true, 10: true, 5: true, 1: true }
  }
};

// Lê as configurações salvas (ou da versão anterior) e corrige valores inválidos
function loadState() {
  const base = JSON.parse(JSON.stringify(DEFAULTS));
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || localStorage.getItem(LEGACY_KEY) || 'null'); }
  catch (e) { saved = null; }
  if (!saved) return base;

  const s = { ...base, ...saved };
  s.tmOpts = { ...base.tmOpts, ...(saved.tmOpts || {}) };
  s.exam = { ...base.exam, ...(saved.exam || {}) };
  s.exam.alerts = { ...base.exam.alerts, ...(s.exam.alerts || {}) };
  s.study = { ...base.study, ...(saved.study || {}) };
  if (!Array.isArray(s.study.blocks)) s.study.blocks = pomodoroBlocks();
  delete s.startMode;

  if (!MODE_VIEW[s.lastMode]) s.lastMode = 'clock';
  if (!s.tz) s.tz = detectedTz;
  if (!COLORS[s.bg]) s.bg = 'preto';
  if (!COLORS[s.clockTheme]) s.clockTheme = 'branco';
  if (!COLORS[s.textColor]) s.textColor = 'branco';
  if (s.textColor === s.bg) s.textColor = CONTRAST[s.bg];
  if (!/^#[0-9a-f]{6}$/i.test(s.pointer || '')) s.pointer = DEFAULTS.pointer;
  if (!['count', 'until', 'infinite'].includes(s.study.mode)) s.study.mode = 'count';
  return s;
}

const state = loadState();

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
}

const effTz = () => (state.autoTz ? detectedTz : state.tz);

// Estado de interface que não é salvo
const ui = {
  mode: state.lastMode,
  infoKey: '',
  examKey: '',
  fired: new Set()
};
