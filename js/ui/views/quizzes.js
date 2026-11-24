// Teste de conclusão, revisão de módulo, diagnóstico inicial e quizzes de prática.
import { html } from '../dom.js';
import { icon } from '../icons.js';
import { pageHead, empty } from '../components.js';
import { buildQuiz } from '../../core/quiz.js';
import { PASS_SCORE, isWeak, isDemonstrated, isStudied } from '../../core/progress.js';
import { shuffle } from '../../core/util.js';
import { createQuizRunner } from '../quizRunner.js';

function notFound() { return { render: () => html`<div class="card"><h1>Não encontrado</h1><a href="#/trilha">Voltar</a></div>`, actions: {} }; }

/** Controlador genérico: tela de introdução → quiz. */
function quizScreen(ctx, { title, subtitle, intro, makeItems, runnerOpts, crumbs = '', extraResult = null }) {
  let runner = null;
  let result = null;
  function start() {
    result = null;
    runner = createQuizRunner(ctx, {
      ...runnerOpts,
      items: makeItems(),
      onRestart: () => { start(); ctx.rerender({ focus: '#qz-top' }); },
      onFinish: (r) => { result = r; },
    });
  }
  const actions = { 'quiz-begin': () => { start(); ctx.rerender({ focus: '#qz-top' }); } };
  const proxy = new Proxy(actions, { get: (t, p) => t[p] || runner?.actions[p] });
  return {
    render: () => html`
      ${crumbs}
      ${pageHead(title, subtitle)}
      ${runner ? html`${runner.render()}${result && extraResult ? extraResult(result) : ''}` : intro()}`,
    actions: proxy,
    onKey: (e) => runner?.onKey(e),
  };
}

export function testView(ctx, moduleId) {
  const cat = ctx.catalog;
  const m = cat.moduleById.get(moduleId);
  if (!m) return notFound();
  const pool = cat.questionsByModule.get(m.id) || [];
  const count = Math.min(8, pool.length);
  return quizScreen(ctx, {
    title: `Teste de conclusão: ${m.title}`,
    subtitle: 'Demonstra domínio do módulo — diferente de apenas ter lido as lições.',
    crumbs: html`<nav class="crumbs"><a href="#/modulo/${m.id}">${icon('back', 14)} ${m.title}</a></nav>`,
    makeItems: () => buildQuiz(pool, { count, state: ctx.state }),
    runnerOpts: { kind: 'test', moduleId: m.id, title: 'Teste de conclusão', exitHref: `#/modulo/${m.id}`, exitLabel: 'Voltar ao módulo' },
    intro: () => {
      const ms = ctx.state.moduleStats[m.id];
      return html`<section class="card">
        <ul>
          <li>${count} perguntas sorteadas do banco do módulo, em ordem de dificuldade crescente.</li>
          <li>Aprovação com ${Math.round(PASS_SCORE * 100)}% ou mais. Ao passar, o módulo fica como <strong>domínio demonstrado</strong> e uma revisão é agendada para daqui a 7 dias.</li>
          <li>Pode refazer quando quiser. Reprovar não remove nenhum progresso.</li>
          <li>Você pode fazer o teste sem ler as lições, se já conhece o assunto.</li>
        </ul>
        ${ms?.testBest ? html`<p class="muted small">Melhor resultado até agora: ${Math.round(ms.testBest * 100)}%.</p>` : ''}
        <button class="btn primary" data-action="quiz-begin">${icon('play', 16)} Começar teste</button>
      </section>`;
    },
  });
}

export function moduleReviewView(ctx, moduleId) {
  const cat = ctx.catalog;
  const m = cat.moduleById.get(moduleId);
  if (!m) return notFound();
  const pool = cat.questionsByModule.get(m.id) || [];
  return quizScreen(ctx, {
    title: `Revisão rápida: ${m.title}`,
    subtitle: 'Confirma que o domínio demonstrado continua firme. Intervalos: 7 → 14 → 30 → 60 dias.',
    crumbs: html`<nav class="crumbs"><a href="#/revisoes">${icon('back', 14)} Revisões</a></nav>`,
    makeItems: () => buildQuiz(pool, { count: Math.min(5, pool.length), state: ctx.state }),
    runnerOpts: { kind: 'review', moduleId: m.id, title: 'Revisão de módulo', exitHref: '#/revisoes', exitLabel: 'Voltar às revisões' },
    intro: () => isDemonstrated(ctx.state, m.id)
      ? html`<section class="card"><p>5 perguntas. Com ${Math.round(PASS_SCORE * 100)}% ou mais, o próximo intervalo aumenta; abaixo disso, a revisão volta em 3 dias. O domínio já registrado não é removido.</p><button class="btn primary" data-action="quiz-begin">${icon('play', 16)} Começar revisão</button></section>`
      : html`<section class="card"><p>Este módulo ainda não teve domínio demonstrado. Faça primeiro o teste de conclusão.</p><a class="btn primary" href="#/teste/${m.id}">Ir para o teste</a></section>`,
  });
}

export function diagnosticView(ctx) {
  const cat = ctx.catalog;
  const picked = new Set(['A', 'B', 'C']);
  let runner = null;
  let result = null;

  function makeItems() {
    const items = [];
    for (const m of cat.modules.filter((x) => picked.has(x.track))) {
      const pool = (cat.questionsByModule.get(m.id) || []).filter((q) => (q.difficulty || 1) <= 2);
      const qs = shuffle(pool.length >= 2 ? pool : cat.questionsByModule.get(m.id)).slice(0, 2);
      items.push(...buildQuiz(qs, { count: 2, progressive: false }));
    }
    return items;
  }
  function start() {
    result = null;
    runner = createQuizRunner(ctx, {
      kind: 'diagnostic', title: 'Diagnóstico', items: makeItems(), exitHref: '#/trilha', exitLabel: 'Ir para a trilha',
      onFinish: (r) => { result = r; },
    });
  }
  const actions = {
    'diag-track': (el) => { const t = el.dataset.arg; picked.has(t) ? picked.delete(t) : picked.add(t); ctx.rerender(); },
    'diag-start': () => { if (picked.size) { start(); ctx.rerender({ focus: '#qz-top' }); } },
  };
  const proxy = new Proxy(actions, { get: (t, p) => t[p] || runner?.actions[p] });

  function perModuleTable(r) {
    const rows = Object.entries(r.perModule).map(([mid, v]) => ({ m: cat.moduleById.get(mid), ...v })).sort((a, b) => a.m.id.localeCompare(b.m.id));
    const verdict = (v) => (v.c === v.t ? ['Acelerar: faça o teste de conclusão', 'ok', `#/teste/${''}`] : v.c > 0 ? ['Revisar: leia e pratique', 'warn'] : ['Estudar desde o início', 'bad']);
    return html`<section class="card">
      <h2>Resultado por módulo</h2>
      <p class="muted small">Com 2 perguntas por módulo, o diagnóstico é uma estimativa inicial — o teste de conclusão é que demonstra domínio.</p>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Módulo</th><th>Acertos</th><th>Sugestão</th></tr></thead>
        <tbody>${rows.map((x) => { const [txt, tone] = verdict(x); return html`<tr><td><a href="#/modulo/${x.m.id}">${x.m.title}</a></td><td>${x.c}/${x.t}</td><td><span class="tag ${tone}">${txt}</span>${x.c === x.t ? html` <a class="small" href="#/teste/${x.m.id}">testar</a>` : ''}</td></tr>`; })}</tbody>
      </table></div>
      <a class="btn primary" href="#/hoje">${icon('today', 16)} Ver plano de estudo adaptado</a>
    </section>`;
  }

  function render() {
    if (runner) return html`${pageHead('Diagnóstico inicial')}${runner.render()}${result ? perModuleTable(result) : ''}`;
    const counts = Object.fromEntries(cat.tracks.map((t) => [t.id, (cat.modulesByTrack.get(t.id) || []).length * 2]));
    const total = [...picked].reduce((a, t) => a + counts[t], 0);
    return html`
      ${pageHead('Diagnóstico inicial', 'Verifica seu nível real para não perder tempo com o que você já domina — e não presumir domínio só porque já trabalhou com algo.')}
      <section class="card">
        <p>Para cada módulo das trilhas escolhidas, 2 perguntas de nível básico/intermediário. No final, você verá a sugestão por módulo:</p>
        <ul>
          <li><strong>2/2:</strong> o plano sugere acelerar — fazer direto o teste de conclusão.</li>
          <li><strong>1/2:</strong> revisar com leitura e prática.</li>
          <li><strong>0/2:</strong> estudar desde o início.</li>
        </ul>
        ${ctx.state.diagnosticDoneAt ? html`<p class="small muted">Você já fez o diagnóstico. Refazer atualiza a estimativa dos módulos respondidos.</p>` : ''}
        <h3>Trilhas a diagnosticar</h3>
        <div class="chips">${cat.tracks.map((t) => html`<button class="chip t-${t.color} ${picked.has(t.id) ? 'active' : ''}" aria-pressed="${picked.has(t.id)}" data-action="diag-track" data-arg="${t.id}">${t.id} · ${t.short} (${counts[t.id]})</button>`)}</div>
        <p class="small">${total} perguntas · cerca de ${Math.round(total * 0.6)} min. Dá para parar e fazer as trilhas separadamente.</p>
        <button class="btn primary" data-action="diag-start" ${picked.size ? '' : 'disabled'}>${icon('play', 16)} Começar</button>
      </section>`;
  }
  return { render, actions: proxy, onKey: (e) => runner?.onKey(e) };
}

export function practiceQuizView(ctx, mode, arg) {
  const cat = ctx.catalog;
  let title, subtitle, poolFn, count = 8, moduleId = null, back = '#/praticar';
  if (mode === 'modulo') {
    const m = cat.moduleById.get(arg);
    if (!m) return notFound();
    title = `Praticar: ${m.title}`; subtitle = 'Perguntas do módulo, priorizando as que você errou por último e as inéditas.';
    poolFn = () => cat.questionsByModule.get(m.id) || []; count = 6; moduleId = m.id; back = `#/modulo/${m.id}`;
  } else if (mode === 'trilha') {
    const t = cat.trackById.get(arg);
    if (!t) return notFound();
    title = `Praticar: Trilha ${t.id} — ${t.title}`; subtitle = 'Mistura de módulos da trilha (prática intercalada).';
    poolFn = () => (cat.modulesByTrack.get(t.id) || []).flatMap((m) => cat.questionsByModule.get(m.id) || []);
  } else if (mode === 'fracos') {
    title = 'Praticar pontos fracos'; subtitle = 'Perguntas de módulos com dificuldade recente e perguntas que você errou por último.';
    poolFn = () => {
      const s = ctx.state;
      const weak = new Set(cat.modules.filter((m) => isWeak(s, m.id)).map((m) => m.id));
      return cat.questions.filter((q) => weak.has(q.moduleId) || s.qstats[q.id]?.last === 0);
    };
  } else {
    title = 'Revisão intercalada'; subtitle = 'Perguntas dos módulos que você já estudou, misturadas — ajuda a reter e a diferenciar assuntos.';
    poolFn = () => cat.questions.filter((q) => isStudied(ctx.state, cat, q.moduleId) || isDemonstrated(ctx.state, q.moduleId));
    count = 10;
  }
  const pool0 = poolFn();
  if (!pool0.length) {
    return { render: () => html`${pageHead(title, subtitle)}${empty(mode === 'fracos' ? 'Nenhum ponto fraco registrado no momento. Continue praticando — os erros aparecem aqui automaticamente.' : 'Ainda não há módulos estudados para misturar. Leia algumas lições primeiro.', html`<a class="btn" href="#/praticar">Voltar</a>`)}`, actions: {} };
  }
  return quizScreen(ctx, {
    title, subtitle,
    crumbs: html`<nav class="crumbs"><a href="${back}">${icon('back', 14)} Voltar</a></nav>`,
    makeItems: () => buildQuiz(poolFn(), { count, state: ctx.state }),
    runnerOpts: { kind: 'practice', moduleId, title: 'Prática', exitHref: back, exitLabel: 'Concluir' },
    intro: () => html`<section class="card"><p>${Math.min(count, pool0.length)} perguntas com explicação após cada resposta. O resultado alimenta a taxa de acerto por assunto e as recomendações.</p><button class="btn primary" data-action="quiz-begin">${icon('play', 16)} Começar</button></section>`,
  });
}
