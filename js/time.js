/* ==========================================================================
   time.js — fuso horário, conversões e formatação de horários
   ========================================================================== */

const partsCache = {};

// Partes de data/hora de um instante, no fuso indicado
function getParts(date, tz) {
  if (!partsCache[tz]) {
    partsCache[tz] = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  const o = {};
  for (const p of partsCache[tz].formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute, s: +o.second };
}

// Diferença entre o fuso e o UTC naquele instante (ms)
function getOffset(date, tz) {
  const p = getParts(date, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000;
}

// Data/hora "de parede" no fuso -> timestamp real
function zonedToEpoch(y, m, d, h, mi, tz) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const off1 = getOffset(new Date(guess), tz);
  let t = guess - off1;
  const off2 = getOffset(new Date(t), tz);
  if (off2 !== off1) t = guess - off2;
  return t;
}

// "YYYY-MM-DDTHH:MM" (campo datetime-local) -> timestamp
function parseLocal(value, tz) {
  if (!value || !value.includes('T')) return null;
  const [d, t] = value.split('T');
  const [y, m, dd] = d.split('-').map(Number);
  const [h, mi] = t.split(':').map(Number);
  if ([y, m, dd, h, mi].some(Number.isNaN)) return null;
  return zonedToEpoch(y, m, dd, h, mi, tz);
}

// Próxima ocorrência de "HH:MM" no fuso (hoje, ou amanhã se já passou)
function nextOccurrence(hhmm, tz) {
  const [h, mi] = (hhmm || '').split(':').map(Number);
  if ([h, mi].some(Number.isNaN)) return 0;
  const now = Date.now();
  const p = getParts(new Date(now), tz);
  let t = zonedToEpoch(p.y, p.m, p.d, h, mi, tz);
  if (t <= now) {
    const nd = new Date(Date.UTC(p.y, p.m - 1, p.d + 1));
    t = zonedToEpoch(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate(), h, mi, tz);
  }
  return t;
}

// timestamp -> "YYYY-MM-DDTHH:MM" para o campo datetime-local
function toLocalInput(epoch, tz) {
  const p = getParts(new Date(epoch), tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

// Só o horário (HH:MM), respeitando 12h/24h
function fmtTime(epoch, tz) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: state.hour12 })
    .format(new Date(epoch));
}

// Duração em HH:MM:SS (ou Xd HH:MM:SS)
function fmtHMS(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}

// Horário atual para o relógio: texto HH:MM:SS e sufixo AM/PM quando 12h
function clockParts(p) {
  let h = p.h, ampm = '';
  if (state.hour12) {
    ampm = p.h < 12 ? 'AM' : 'PM';
    h = p.h % 12 || 12;
  }
  return { text: `${state.hour12 ? h : pad(h)}:${pad(p.mi)}:${pad(p.s)}`, ampm };
}

// Texto do fuso: "America/Sao Paulo · GMT-3"
function tzLabel(tz, now) {
  let off = '';
  try {
    off = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(now).find(x => x.type === 'timeZoneName')?.value || '';
  } catch (e) {}
  return tz.replace(/_/g, ' ') + (off ? ` · ${off}` : '');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function kindLabel(kind) {
  return kind === 'break' ? 'Pausa' : 'Estudo';
}
