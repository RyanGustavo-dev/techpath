// Teste de conclusão, revisão de módulo, diagnóstico inicial e quizzes de prática.
import { html } from '../dom.js';
import { icon } from '../icons.js';
import { pageHead, empty } from '../components.js';
import { buildQuiz, canAccelerate, DIAGNOSTIC_MIN_QUESTIONS } from '../../core/quiz.js';
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
  const cases = cat.assessmentsByModule.get(m.id) || [];
  const caseCount = Math.min(3, cases.length);
  const count = Math.min(cases.length ? 2 : 5, pool.length);
  return quizScreen(ctx, {
    title: `Teste de conclusão: ${m.title}`,
    subtitle: cases.length ? 'Registre seu raciocínio nos casos e compare com a análise de referência.' : 'Confira seu entendimento com perguntas do banco de prática.',
    crumbs: html`<nav class="crumbs"><a href="#/modulo/${m.id}">${icon('back', 14)} ${m.title}</a></nav>`,
    makeItems: () => {
      const ordered = shuffle(cases).sort((a, b) => (ctx.state.qstats[a.id]?.seen || 0) - (ctx.state.qstats[b.id]?.seen || 0));
      return [
        ...buildQuiz(ordered.slice(0, caseCount), { count: caseCount }),
        ...buildQuiz(pool, { count, state: ctx.state }),
      ];
    },
    runnerOpts: { kind: 'test', moduleId: m.id, title: 'Teste de conclusão', exitHref: `#/modulo/${m.id}`, exitLabel: 'Voltar ao módulo' },
    intro: () => {
      const ms = ctx.state.moduleStats[m.id];
      return html`<section class="card">
        <ul>
          ${cases.length ? html`<li>${caseCount} casos exclusivos do teste e ${count} perguntas de prática. Escreva sua hipótese, a evidência e o próximo passo nos casos.</li><li>As alternativas definem a pontuação. Compare sua resposta escrita com a explicação para avaliar o raciocínio.</li>` : html`<li>${count} perguntas do banco de prática. Use também os exercícios do módulo para avaliar sua aplicação.</li>`}
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
  const picked = new Set(['A']);
  const poolFor = (m) => cat.questionsByModule.get(m.id) || [];
  let runner = null;
  let result = null;

  function makeItems() {
    const items = [];
    for (const m of cat.modules.filter((x) => picked.has(x.track))) {
      const pool = poolFor(m);
      const advanced = shuffle(pool.filter((q) => q.difficulty === 3))[0];
      const others = shuffle(pool.filter((q) => q !== advanced)).slice(0, DIAGNOSTIC_MIN_QUESTIONS - Number(!!advanced));
      const sample = advanced ? [...others, advanced] : others;
      items.push(...buildQuiz(sample, { count: sample.length }));
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
    const eligible = (v) => canAccelerate({ total: v.t, score: v.c / v.t });
    return html`<section class="card">
      <h2>Resultado por módulo</h2>
      <p class="muted small">Use esta amostra para escolher o que revisar. Valide o resultado com um teste e um exercício prático.</p>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Módulo</th><th>Acertos</th><th>Sugestão</th></tr></thead>
        <tbody>${rows.map((x) => html`<tr><td><a href="#/modulo/${x.m.id}">${x.m.title}</a></td><td>${x.c}/${x.t}</td><td>${eligible(x) ? html`<a href="#/teste/${x.m.id}">Validar no teste</a>` : 'Revisar os erros e praticar'}</td></tr>`)}</tbody>
      </table></div>
      <a class="btn primary" href="#/hoje">${icon('today', 16)} Ver plano de estudo adaptado</a>
    </section>`;
  }

  function render() {
    if (runner) return html`${pageHead('Diagnóstico inicial')}${runner.render()}${result ? perModuleTable(result) : ''}`;
    const counts = Object.fromEntries(cat.tracks.map((t) => [t.id, (cat.modulesByTrack.get(t.id) || []).reduce((n, m) => n + Math.min(DIAGNOSTIC_MIN_QUESTIONS, poolFor(m).length), 0)]));
    const total = [...picked].reduce((a, t) => a + counts[t], 0);
    return html`
      ${pageHead('Diagnóstico inicial', 'Verifica seu nível real para não perder tempo com o que você já domina — e não presumir domínio só porque já trabalhou com algo.')}
      <section class="card">
        <p>Comece por Suporte a aplicações. Faça até quatro perguntas por módulo, incluindo uma avançada quando houver. Com quatro respostas e pelo menos 80% de acerto, o plano pode sugerir o teste de conclusão.</p>
        ${ctx.state.diagnosticDoneAt ? html`<p class="small muted">Você já fez o diagnóstico. Refazer atualiza a estimativa dos módulos respondidos.</p>` : ''}
        <h3>Trilhas a diagnosticar</h3>
        <div class="chips">${cat.tracks.map((t) => html`<button class="chip t-${t.color} ${picked.has(t.id) ? 'active' : ''}" aria-pressed="${picked.has(t.id)}" data-action="diag-track" data-arg="${t.id}">${t.id} · ${t.short} (${counts[t.id]})</button>`)}</div>
        <p class="small">${total} perguntas · cerca de ${total} min. Faça uma trilha por sessão para salvar o resultado ao terminar.</p>
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
