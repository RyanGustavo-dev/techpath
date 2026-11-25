// Inicialização, roteamento por hash, delegação de eventos e feedback (XP, nível, conquistas).
import { catalog, skills, appTypes, roles } from './data/index.js';
import { createStore, memoryAdapter } from './core/storage.js';
import { todayStr } from './core/util.js';
import { evaluateAchievements, computeStreak, levelInfo } from './core/gamification.js';
import { html, esc, $, prefersReducedMotion } from './ui/dom.js';
import { icon } from './ui/icons.js';

import { pathView, moduleView } from './ui/views/path.js';
import { lessonView } from './ui/views/lesson.js';
import { testView, moduleReviewView, diagnosticView, practiceQuizView } from './ui/views/quizzes.js';
import { practiceView } from './ui/views/practice.js';
import { labView } from './ui/views/lab.js';
import { todayView } from './ui/views/today.js';
import { reviewsView } from './ui/views/reviews.js';
import { careerView } from './ui/views/career.js';
import { progressView } from './ui/views/progress.js';
import { settingsView } from './ui/views/settings.js';
import { guideView } from './ui/views/guide.js';

// ---------- Armazenamento ----------
function pickAdapter() {
  try {
    const k = '__techpath_test__';
    localStorage.setItem(k, '1'); localStorage.removeItem(k);
    return { adapter: localStorage, persistent: true };
  } catch {
    return { adapter: memoryAdapter(), persistent: false };
  }
}
const { adapter, persistent } = pickAdapter();
const store = createStore(adapter);
let { state, error: loadError } = store.load();

// ---------- Contexto compartilhado pelas telas ----------
const NAV = [
  { id: 'trilha', label: 'Minha Trilha', short: 'Trilha', icon: 'map', href: '#/trilha', match: /^#\/(trilha|modulo|licao|teste|diagnostico|guia)/ },
  { id: 'hoje', label: 'Estudar Hoje', short: 'Hoje', icon: 'today', href: '#/hoje', match: /^#\/hoje/ },
  { id: 'praticar', label: 'Praticar', short: 'Praticar', icon: 'practice', href: '#/praticar', match: /^#\/(praticar|lab)/ },
  { id: 'revisoes', label: 'Revisões', short: 'Revisões', icon: 'review', href: '#/revisoes', match: /^#\/(revisoes|revisar-modulo)/ },
  { id: 'entrevistas', label: 'Entrevistas', short: 'Carreira', icon: 'mic', href: '#/entrevistas', match: /^#\/entrevistas/ },
  { id: 'evolucao', label: 'Minha Evolução', short: 'Evolução', icon: 'chart', href: '#/evolucao', match: /^#\/evolucao/ },
  { id: 'config', label: 'Configurações', short: 'Ajustes', icon: 'settings', href: '#/config', match: /^#\/config/ },
];

let controller = null;
let saveTimer = null;

const ctx = {
  catalog, skills, appTypes, roles, persistent,
  get state() { return state; },
  today: () => todayStr(),
  storeError: () => store.lastError,

  /** Executa uma mutação, salva e dá feedback de XP/nível/conquistas. Retorna o resultado da mutação. */
  commit(fn) {
    const xpBefore = state.xp.total;
    const lvBefore = levelInfo(xpBefore).level;
    const result = fn(state);
    const gained = state.xp.total - xpBefore;
    const today = ctx.today();
    const unlocked = evaluateAchievements(state, { streak: computeStreak(state.activity, today).streak, catalog }, today);
    saveSoon();
    if (gained > 0) toast(`+${gained} XP`, 'xp');
    const lvAfter = levelInfo(state.xp.total).level;
    if (lvAfter > lvBefore) toast(`Nível ${lvAfter} alcançado!`, 'level');
    for (const a of unlocked) toast(`Conquista: ${a.title}`, 'achievement');
    updateChrome();
    return result;
  },
  replaceState(next) { state = next; saveNow(); updateChrome(); },
  saveNow,
  navigate(hash) { if (location.hash === hash) route(); else location.hash = hash; },
  rerender(opts = {}) { renderController(opts); },
  toast,
  confirm,
};

function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 250); }
function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  const ok = store.save(state);
  const banner = $('#storage-banner');
  if (!ok && banner) {
    banner.hidden = false;
    banner.querySelector('span').textContent = 'Não foi possível salvar no navegador (armazenamento cheio ou bloqueado). Exporte um backup em Configurações para não perder dados.';
  }
}
window.addEventListener('beforeunload', () => { if (saveTimer) saveNow(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimer) saveNow(); });

// ---------- Feedback ----------
function toast(msg, tone = 'info') {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast ${tone}`;
  const ic = { xp: 'bolt', level: 'star', achievement: 'award', error: 'info', ok: 'check', info: 'info' }[tone] || 'info';
  el.innerHTML = `${icon(ic, 18)}<span>${esc(msg)}</span>`;
  box.appendChild(el);
  const life = tone === 'achievement' || tone === 'level' ? 4200 : 2400;
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, life);
}

function confirm({ title, body = '', confirmLabel = 'Confirmar', danger = false, requireText = null }) {
  return new Promise((resolve) => {
    const dlg = $('#dialog');
    dlg.innerHTML = String(html`
      <form method="dialog" class="dialog-body">
        <h2>${title}</h2>
        <div class="dialog-text">${body}</div>
        ${requireText ? html`<label class="field">Digite <strong>${requireText}</strong> para confirmar<input id="dlg-text" autocomplete="off" /></label>` : ''}
        <div class="row end gap">
          <button class="btn ghost" value="cancel">Cancelar</button>
          <button class="btn ${danger ? 'danger' : 'primary'}" value="ok" id="dlg-ok" ${requireText ? 'disabled' : ''}>${confirmLabel}</button>
        </div>
      </form>`);
    const input = dlg.querySelector('#dlg-text');
    if (input) input.addEventListener('input', () => { dlg.querySelector('#dlg-ok').disabled = input.value.trim() !== requireText; });
    dlg.addEventListener('close', function onClose() {
      dlg.removeEventListener('close', onClose);
      resolve(dlg.returnValue === 'ok');
    });
    dlg.showModal();
  });
}

// ---------- Moldura (sidebar, cabeçalho) ----------
function updateChrome() {
  const today = ctx.today();
  const lv = levelInfo(state.xp.total);
  const { streak } = computeStreak(state.activity, today);
  const el = $('#user-stats');
  if (el) {
    el.innerHTML = String(html`
      <div class="us-row"><span class="us-level">${icon('star', 16)} Nível ${lv.level}</span><span class="us-streak" title="Sequência de dias (1 dia de descanso por semana é tolerado)">${icon('flame', 16)} ${streak}</span></div>
      <div class="bar xp" role="progressbar" aria-label="XP até o próximo nível" aria-valuenow="${lv.pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${lv.pct}%"></span></div>
      <div class="us-xp tiny muted">${state.xp.total} XP · faltam ${lv.next - state.xp.total} para o nível ${lv.level + 1}</div>`);
  }
  document.documentElement.dataset.theme = state.settings.theme;
  document.documentElement.classList.toggle('reduce-motion', prefersReducedMotion(state.settings));
}

function renderNav() {
  const items = NAV.map((n) => html`<li><a href="${n.href}" data-nav="${n.id}" aria-label="${n.label}">${icon(n.icon, 20)}<span class="nl-long">${n.label}</span><span class="nl-short" aria-hidden="true">${n.short}</span></a></li>`);
  $('#nav-list').innerHTML = String(html`${items}`);
}

function highlightNav() {
  const h = location.hash || '#/trilha';
  for (const n of NAV) {
    const a = document.querySelector(`[data-nav="${n.id}"]`);
    if (!a) continue;
    const on = n.match.test(h);
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}

// ---------- Rotas ----------
const ROUTES = [
  [/^#\/trilha$/, (p) => pathView(ctx, p)],
  [/^#\/modulo\/([\w-]+)$/, (p) => moduleView(ctx, p[1])],
  [/^#\/licao\/([\w-]+)$/, (p) => lessonView(ctx, p[1])],
  [/^#\/teste\/([\w-]+)$/, (p) => testView(ctx, p[1])],
  [/^#\/revisar-modulo\/([\w-]+)$/, (p) => moduleReviewView(ctx, p[1])],
  [/^#\/diagnostico$/, () => diagnosticView(ctx)],
  [/^#\/hoje$/, () => todayView(ctx)],
  [/^#\/praticar\/(modulo|trilha|fracos|mistura)(?:\/([\w-]+))?$/, (p) => practiceQuizView(ctx, p[1], p[2])],
  [/^#\/praticar$/, () => practiceView(ctx)],
  [/^#\/lab\/([\w-]+)$/, (p) => labView(ctx, p[1])],
  [/^#\/revisoes$/, () => reviewsView(ctx)],
  [/^#\/entrevistas(?:\/(\w+))?$/, (p) => careerView(ctx, p[1] || 'perguntas')],
  [/^#\/evolucao$/, () => progressView(ctx)],
  [/^#\/guia$/, guideView],
  [/^#\/config$/, () => settingsView(ctx)],
];

function notFound() {
  return { render: () => html`<div class="card"><h1>Página não encontrada</h1><p><a href="#/trilha">Voltar para a trilha</a></p></div>`, actions: {} };
}

function route() {
  const h = location.hash || '#/trilha';
  if (!location.hash) history.replaceState(null, '', '#/trilha');
  let c = null;
  for (const [re, make] of ROUTES) {
    const m = h.match(re);
    if (m) { c = make(m); break; }
  }
  controller = c || notFound();
  highlightNav();
  renderController({ navigated: true });
}

function renderController({ navigated = false, focus = null } = {}) {
  const main = $('#main');
  const y = window.scrollY;
  try {
    main.innerHTML = String(controller.render());
  } catch (e) {
    console.error(e);
    main.innerHTML = String(html`<div class="card"><h1>Algo deu errado nesta tela</h1><p class="muted">${e.message}</p><p>Seu progresso salvo não foi afetado. <a href="#/trilha">Voltar para a trilha</a></p></div>`);
  }
  if (controller.mount) controller.mount(main);
  if (navigated) {
    window.scrollTo(0, 0);
    const t = $('#page-title', main) || main.querySelector('h1');
    if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
    const title = main.querySelector('h1')?.textContent;
    document.title = title ? `${title} · TechPath` : 'TechPath';
  } else if (focus) {
    const f = $(focus, main);
    if (f) { f.focus({ preventScroll: true }); f.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion(state.settings) ? 'auto' : 'smooth' }); }
    else window.scrollTo(0, y);
  } else {
    window.scrollTo(0, y);
  }
}

// ---------- Delegação de eventos ----------
function dispatch(name, el, ev) {
  const fn = controller?.actions?.[name];
  if (fn) { fn(el, ev); return true; }
  return false;
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el || el.disabled) return;
  if (dispatch(el.dataset.action, el, ev)) ev.preventDefault();
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-change]');
  if (el) dispatch(el.dataset.change, el, ev);
});
document.addEventListener('input', (ev) => {
  const el = ev.target.closest('[data-input]');
  if (el) dispatch(el.dataset.input, el, ev);
});
document.addEventListener('keydown', (ev) => {
  if ($('#dialog').open) return;
  if (controller?.onKey) controller.onKey(ev);
});

// ---------- Início ----------
renderNav();
updateChrome();
window.addEventListener('hashchange', route);
route();

if (!persistent) {
  const b = $('#storage-banner');
  b.hidden = false;
  b.querySelector('span').textContent = 'O armazenamento local está bloqueado neste navegador (ex.: modo privado restrito). O progresso desta sessão será perdido ao fechar a aba.';
}
if (loadError) {
  toast('Os dados salvos estavam ilegíveis. Uma cópia foi preservada e um novo perfil foi iniciado.', 'error');
}

// Atualiza a data do "hoje" ao virar o dia com a aba aberta.
let lastDay = ctx.today();
setInterval(() => { const d = ctx.today(); if (d !== lastDay) { lastDay = d; updateChrome(); if (/^#\/(hoje|trilha|revisoes)/.test(location.hash)) route(); } }, 60_000);

// Para depuração no console (somente leitura recomendada).
window.techpath = { get state() { return state; }, catalog };
