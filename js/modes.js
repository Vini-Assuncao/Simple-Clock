/* ==========================================================================
   modes.js — lógica de cada modo e loop principal (não salva nada aqui)
   ========================================================================== */

// Estado de execução
const rt = {
  sw: { running: false, acc: 0, start: 0, laps: [] },
  tm: { running: false, acc: 0, start: 0, ended: false },
  st: { idx: 0, cycle: 1, running: false, acc: 0, start: 0, done: false, target: 0, lastSeg: -1 }
};

const elapsed = r => r.acc + (r.running ? Date.now() - r.start : 0);
function startR(r) { if (!r.running) { r.running = true; r.start = Date.now(); } }
function pauseR(r) { if (r.running) { r.acc += Date.now() - r.start; r.running = false; } }
const useFlip = () => state.clock === 'flip';

/* ---------- Relógio ---------- */
function renderClock(c, now, p) {
  if (state.clock === 'analog') {
    c.disp.el.hidden = true;
    c.ana.hidden = false;
    renderAnalog(c.ana, now, p);
    return;
  }
  c.ana.hidden = true;
  c.disp.el.hidden = false;
  const t = clockParts(p);
  showDisp(c.disp, t.text, '', useFlip(), t.ampm);
}

// Data e fuso: escritos nos blocos de relógio (modo relógio e modo prova)
function renderInfo(now, tz) {
  const key = Math.floor(now.getTime() / 1000) + '|' + tz + '|' + state.showDate + '|' + state.showTz;
  if (key === ui.infoKey) return;
  ui.infoKey = key;

  const dateText = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(now);
  const label = tzLabel(tz, now);

  document.querySelectorAll('.date').forEach(el => {
    el.hidden = !state.showDate;
    el.textContent = dateText;
  });
  Object.values(CLK).forEach(c => {
    c.tz.hidden = !state.showTz;
    c.tz.textContent = label;
  });
}

/* ---------- Cronômetro ---------- */
function renderStopwatch() {
  const r = rt.sw;
  const ms = elapsed(r);
  showDisp(DISP.sw, fmtHMS(ms), '.' + pad(Math.floor((ms % 1000) / 10)), useFlip(), '');

  // Destaque conforme o estado: zerado ou rodando → Iniciar/Pausar; pausado → Zerar
  const toggle = $('swToggle');
  const reset = $('swReset');
  toggle.classList.toggle('primary', r.running || ms === 0);
  reset.classList.toggle('primary', !r.running && ms > 0);
  toggle.textContent = r.running ? 'Pausar' : (ms > 0 ? 'Continuar' : 'Iniciar');
}

function renderLaps() {
  $('swLaps').innerHTML = rt.sw.laps
    .map((l, i) => `<li>Volta ${rt.sw.laps.length - i}: ${l.split} <span style="opacity:.6">(total ${l.total})</span></li>`)
    .join('');
}

/* ---------- Temporizador ---------- */
function tickTimer() {
  const r = rt.tm;
  if (r.running && elapsed(r) >= state.timerMs) {
    r.running = false;
    r.acc = state.timerMs;
    r.ended = true;
    showPill('Tempo esgotado!');
  }
}

function renderTimer() {
  const r = rt.tm;
  const total = state.timerMs;
  const e = r.ended ? total : elapsed(r);
  const rem = r.ended ? 0 : Math.max(0, total - e);
  showDisp(DISP.tm, fmtHMS(Math.ceil(rem / 1000) * 1000), '', useFlip(), '');

  $('tmMsg').hidden = !r.ended;
  $('tmInputs').hidden = r.running;
  $('tmToggle').textContent = r.running ? 'Pausar' : 'Iniciar';

  $('tmInit').hidden = !state.tmOpts.showInit;
  $('tmInit').textContent = `Tempo inicial: ${fmtHMS(total)}`;
  $('tmBarWrap').hidden = !state.tmOpts.showBar;
  $('tmBar').style.width = (total > 0 ? Math.min(100, e / total * 100) : 0).toFixed(2) + '%';
}

function setTimerMs(ms) {
  state.timerMs = Math.max(0, Math.min(ms, (99 * 3600 + 59 * 60 + 59) * 1000));
  rt.tm.acc = 0;
  rt.tm.ended = false;
  save();
}

function readTimerInputs(prefix) {
  const h = Math.max(0, +$(prefix + 'H').value || 0);
  const m = Math.max(0, Math.min(59, +$(prefix + 'M').value || 0));
  const s = Math.max(0, Math.min(59, +$(prefix + 'S').value || 0));
  return (h * 3600 + m * 60 + s) * 1000;
}

/* ---------- Estudo ---------- */
function resetStudy() {
  Object.assign(rt.st, { idx: 0, cycle: 1, running: false, acc: 0, start: 0, done: false, target: 0, lastSeg: -1 });
}

function finishStudy() {
  rt.st.done = true;
  rt.st.running = false;
  rt.st.acc = 0;
  showPill('Sequência de estudo concluída');
}

// Modo duração: avança para o próximo bloco
function studyNext(auto) {
  const r = rt.st;
  const S = state.study;
  r.acc = 0;
  r.start = Date.now();
  r.idx++;
  if (r.idx >= S.blocks.length) {
    r.idx = 0;
    r.cycle++;
    if (S.mode === 'count' && r.cycle > S.repeat) {
      r.cycle = S.repeat;
      r.idx = S.blocks.length - 1;
      finishStudy();
      return;
    }
  }
  if (auto && !S.autoNext) r.running = false;
}

// Modo horário como base: bloco atual pelo relógio, a partir do início
function timeBaseSegment(now) {
  const r = rt.st;
  const S = state.study;
  if (!S.blocks.length) return { done: true };
  if (S.mode === 'until' && r.target && now >= r.target) return { done: true };

  let t = r.start;
  let idx = 0, cycle = 1;
  for (let guard = 0; guard < 20000; guard++) {
    const b = S.blocks[idx];
    const end = t + Math.max(1, b.min) * MIN;
    if (S.mode === 'until' && r.target && t >= r.target) return { done: true };
    if (now < end) {
      let cycleStart = t;
      for (let j = idx - 1; j >= 0; j--) cycleStart -= S.blocks[j].min * MIN;
      return { idx, cycle, start: t, end, cycleStart };
    }
    t = end;
    idx++;
    if (idx >= S.blocks.length) {
      idx = 0;
      cycle++;
      if (S.mode === 'count' && cycle > S.repeat) return { done: true };
    }
  }
  return { done: true };
}

function tickStudy(now) {
  const r = rt.st;
  const S = state.study;
  if (!r.running || r.done || !S.blocks.length) return;

  if (S.timeBase) {
    const seg = timeBaseSegment(now);
    if (seg.done) { finishStudy(); alarm(); return; }
    if (seg.start !== r.lastSeg) {
      if (r.lastSeg !== -1) alarm();
      r.lastSeg = seg.start;
    }
    return;
  }

  if (S.mode === 'until' && r.target && now >= r.target) { finishStudy(); return; }

  for (let guard = 0; r.running && !r.done && guard < 200; guard++) {
    const ph = S.blocks[r.idx];
    if (!ph || elapsed(r) < Math.max(1, ph.min) * MIN) break;
    alarm();
    studyNext(true);
  }
}

// Legenda do bloco: "Ciclo 1 de 3 · Bloco 1 de 2" (o tipo já aparece no título e na lista)
function studySub(cycle, idx, len, endTxt) {
  const S = state.study;
  const parts = [S.mode === 'count' ? `Ciclo ${cycle} de ${S.repeat}` : `Ciclo ${cycle}`, `Bloco ${idx + 1} de ${len}`];
  if (endTxt) parts.push(`termina às ${endTxt}`);
  else if (S.mode === 'until' && S.until) parts.push(`até ${S.until}`);
  return parts.join(' · ');
}

function renderStudy(now) {
  const r = rt.st;
  const S = state.study;
  const list = S.blocks;
  const toggle = $('stToggle');
  $('stSkip').hidden = S.timeBase;

  if (!list.length) {
    $('stPhase').textContent = 'Sem blocos';
    $('stSub').textContent = 'Adicione blocos em Configurações → Estudo.';
    showDisp(DISP.st, '00:00:00', '', useFlip(), '');
    $('stBar').style.width = '0%';
    $('stList').innerHTML = '';
    toggle.textContent = 'Iniciar';
    return;
  }

  if (S.timeBase) {
    renderStudyTimeBase(now, list);
    toggle.textContent = r.running ? 'Parar' : 'Iniciar';
  } else {
    renderStudyDuration(list);
    toggle.textContent = r.running ? 'Pausar' : 'Iniciar';
  }
}

// Horário final da sequência (modo "até horário")
function untilTarget() {
  if (rt.st.target) return rt.st.target;
  return nextOccurrence(state.study.until, effTz());
}

// Blocos projetados a partir de um instante. No modo "até horário",
// só entram os blocos que terminam antes desse horário.
function projectList(startMs) {
  const S = state.study;
  const target = S.mode === 'until' ? untilTarget() : 0;
  const out = [];
  let t = startMs;
  S.blocks.forEach((b, idx) => {
    const end = t + Math.max(1, b.min) * MIN;
    if (!target || end <= target) {
      out.push({ idx, start: t, name: b.name || kindLabel(b.kind), min: b.min, kind: b.kind });
    }
    t = end;
  });
  return out;
}

function listHtml(entries, curIdx, tz) {
  if (!entries.length) return `<li class="hint">Nenhum bloco termina até ${escapeHtml(state.study.until)}.</li>`;
  return entries.map(e =>
    `<li class="${e.idx === curIdx ? 'cur' : ''}">${fmtTime(e.start, tz)} ${escapeHtml(e.name)} · ${e.min} min (${kindLabel(e.kind)})</li>`
  ).join('');
}

function renderStudyTimeBase(now, list) {
  const r = rt.st;
  const seg = r.running ? timeBaseSegment(now) : null;
  const tz = effTz();
  const clk = clockParts(getParts(new Date(now), tz));
  showDisp(DISP.st, clk.text, '', useFlip(), clk.ampm);

  if (seg && !seg.done) {
    const b = list[seg.idx];
    $('stPhase').textContent = b.name || kindLabel(b.kind);
    $('stSub').textContent = studySub(seg.cycle, seg.idx, list.length, fmtTime(seg.end, tz));
    $('stBar').style.width = Math.min(100, (now - seg.start) / (seg.end - seg.start) * 100).toFixed(2) + '%';
    $('stList').innerHTML = listHtml(projectList(seg.cycleStart), seg.idx, tz);
  } else {
    $('stPhase').textContent = r.done ? 'Sequência concluída!' : 'Pronto para começar';
    $('stSub').textContent = r.done ? '' : 'Os blocos seguem o horário do relógio a partir de quando você iniciar.';
    $('stBar').style.width = r.done ? '100%' : '0%';
    $('stList').innerHTML = listHtml(projectList(now), -1, tz);
  }
}

function renderStudyDuration(list) {
  const r = rt.st;
  let cur = -1;
  if (r.done) {
    $('stPhase').textContent = 'Sequência concluída!';
    $('stSub').textContent = '';
    showDisp(DISP.st, '00:00:00', '', useFlip(), '');
    $('stBar').style.width = '100%';
  } else {
    const ph = list[r.idx];
    const ms = Math.max(1, ph.min) * MIN;
    const e = elapsed(r);
    const rem = Math.max(0, ms - e);
    cur = r.idx;
    $('stPhase').textContent = ph.name || kindLabel(ph.kind);
    $('stSub').textContent = studySub(r.cycle, r.idx, list.length);
    showDisp(DISP.st, fmtHMS(Math.ceil(rem / 1000) * 1000), '', useFlip(), '');
    $('stBar').style.width = Math.min(100, e / ms * 100).toFixed(2) + '%';
  }
  $('stList').innerHTML = listHtml(projectList(Date.now()), cur, effTz());
}

// Botão Iniciar/Pausar do estudo
function toggleStudy() {
  const r = rt.st;
  const S = state.study;
  if (!S.blocks.length) return;

  if (S.timeBase) {
    if (r.running) {
      resetStudy();
    } else {
      resetStudy();
      r.start = Date.now();
      r.running = true;
      if (S.mode === 'until') r.target = nextOccurrence(S.until, effTz());
    }
  } else {
    if (r.done) resetStudy();
    if (S.mode === 'until' && !r.target) r.target = nextOccurrence(S.until, effTz());
    if (r.running) pauseR(r); else startR(r);
  }
  renderStudy(Date.now());
}

/* ---------- Modo prova ---------- */
function checkExamAlerts(t, S, E) {
  if (S == null || E == null || E <= S || t >= E) return;
  const key = S + '|' + E;
  if (key !== ui.examKey) {
    // Avisos já passados ao definir o intervalo não disparam
    ui.examKey = key;
    ui.fired = new Set(ALERTS.filter(m => E - t <= m * MIN));
  }
  const fresh = ALERTS.filter(m => E - t <= m * MIN && !ui.fired.has(m));
  if (!fresh.length) return;
  fresh.forEach(m => ui.fired.add(m));
  const urgent = Math.min(...fresh);
  if (state.exam.alerts[urgent]) showPill(ALERT_TEXT[urgent]);
}

function renderExam(now, tz) {
  const S = parseLocal(state.exam.start, tz);
  const E = parseLocal(state.exam.end, tz);
  const t = now.getTime();
  checkExamAlerts(t, S, E);

  let h = '';
  if (state.exam.showTimes) {
    h += `<div class="ex-times">
      <div><span>Início</span><strong>${S != null ? fmtTime(S, tz) : '—'}</strong></div>
      <div><span>Fim</span><strong>${E != null ? fmtTime(E, tz) : '—'}</strong></div>
    </div>`;
  }
  if (state.exam.showCountdown) {
    if (S == null || E == null || E <= S) {
      h += '<div class="ex-msg">Defina um início e um fim válidos em Configurações → Modo prova.</div>';
    } else if (t < S) {
      h += `<div class="hint">Começa em</div><div class="ex-count">${fmtHMS(S - t)}</div>`;
      h += '<div class="bar"><i style="width:0%"></i></div>';
    } else if (t < E) {
      const pct = Math.min(100, Math.max(0, (t - S) / (E - S) * 100));
      h += `<div class="hint">Termina em</div><div class="ex-count">${fmtHMS(E - t)}</div>`;
      h += `<div class="bar"><i style="width:${pct.toFixed(2)}%"></i></div>`;
    } else {
      h += '<div class="ex-msg">Prova encerrada</div><div class="bar"><i style="width:100%"></i></div>';
    }
  }
  if (!h) h = '<div class="hint">Nada para mostrar. Ative as opções em Configurações → Modo prova.</div>';
  $('examBox').innerHTML = h;
}

// Ao entrar no modo prova sem horários, sugere agora → +1 hora
function ensureExamDefaults() {
  if (state.exam.start && state.exam.end) return;
  const tz = effTz();
  const now = Date.now();
  state.exam.start = toLocalInput(now, tz);
  state.exam.end = toLocalInput(now + 60 * MIN, tz);
  save();
}

/* ---------- Lembretes ---------- */
const byTime = (a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0);

function renderReminders(p) {
  const items = [...state.reminders].sort(byTime);
  $('remList').innerHTML = items.length ? items.map(r => `
    <li class="${r.done ? 'done' : ''}">
      <span class="rem-time">${r.time}</span>
      <span class="rem-text">${escapeHtml(r.text)}</span>
      <span class="rem-tag">${r.daily ? 'Todo dia' : (r.done ? 'Feito' : 'Uma vez')}</span>
      <button class="rem-del" data-id="${r.id}" aria-label="Remover lembrete" title="Remover">×</button>
    </li>`).join('')
    : '<li class="hint" style="justify-content:center">Nenhum lembrete ainda.</li>';

  const cur = pad(p.h) + ':' + pad(p.mi);
  const pending = items.filter(r => !r.done);
  const next = pending.find(r => r.time >= cur) || pending[0];
  $('remNext').textContent = next ? `Próximo: ${next.time} · ${next.text}` : '';
}

// Dispara lembretes na hora marcada (uma vez por dia)
function checkReminders(p) {
  const hhmm = pad(p.h) + ':' + pad(p.mi);
  const dateKey = `${p.y}-${p.m}-${p.d}`;
  let changed = false;
  for (const r of state.reminders) {
    if (r.done || r.time !== hhmm || r.lastDate === dateKey) continue;
    r.lastDate = dateKey;
    if (!r.daily) r.done = true;
    changed = true;
    showPill('🔔 ' + r.text);
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('Lembrete', { body: r.text }); } catch (e) {}
    }
  }
  if (changed) {
    save();
    if (ui.mode === 'reminders') renderReminders(p);
  }
}

/* ---------- Loop principal (a cada 100 ms) ---------- */
function tick() {
  const now = new Date();
  const tz = effTz();
  const p = getParts(now, tz);

  renderInfo(now, tz);

  switch (ui.mode) {
    case 'clock':
      renderClock(CLK.clock, now, p);
      break;
    case 'exam':
      renderClock(CLK.exam, now, p);
      renderExam(now, tz);
      break;
    case 'stopwatch':
      renderStopwatch();
      break;
    case 'timer':
      tickTimer();
      renderTimer();
      break;
    case 'study':
      tickStudy(now);
      renderStudy(now);
      break;
    case 'reminders':
      renderReminders(p);
      break;
  }

  checkReminders(p);
}
