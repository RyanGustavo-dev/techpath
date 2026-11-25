// Executor de quiz reutilizável: uma pergunta por vez, explicação após cada resposta, registro ao final.
import { html, md, mdInline } from './dom.js';
import { icon } from './icons.js';
import { bar, difficulty } from './components.js';
import { recordQuiz } from '../core/quiz.js';
import { PASS_SCORE } from '../core/progress.js';

const LETTERS = 'ABCDEFGH';
const KIND_LABEL = { lesson: 'Quiz de fixação', practice: 'Prática', test: 'Teste de conclusão', review: 'Revisão de módulo', diagnostic: 'Diagnóstico' };

export function createQuizRunner(ctx, opts) {
  const { kind, moduleId = null, lessonId = null, title = KIND_LABEL[kind], onRestart, exitHref = null, exitLabel = 'Voltar' } = opts;
  const st = { items: opts.items, idx: 0, chosen: null, confirmed: false, answers: [], result: null, reasoning: '', alternativesVisible: false };
  const cat = ctx.catalog;

  function finish() {
    st.result = ctx.commit((s) => recordQuiz(s, cat, { kind, moduleId, lessonId, answers: st.answers }, ctx.today()), {
      xpOf: (r) => r.xp,
    });
    if (opts.onFinish) opts.onFinish(st.result);
  }

  const actions = {
    'qz-reasoning': (el) => { st.reasoning = el.value; },
    'qz-show-options': () => {
      if (!st.reasoning.trim()) { ctx.toast('Escreva sua análise antes de abrir as alternativas.', 'info'); return; }
      st.alternativesVisible = true;
      ctx.rerender({ focus: '#qz-options' });
    },
    'qz-choose': (el) => { if (!st.confirmed) { st.chosen = Number(el.dataset.arg); ctx.rerender(); } },
    'qz-confirm': () => {
      if (st.chosen === null || st.confirmed) return;
      st.confirmed = true;
      st.answers.push({ qid: st.items[st.idx].qid, chosen: st.chosen, reasoning: st.reasoning.trim() });
      ctx.rerender({ focus: '#qz-feedback' });
    },
    'qz-next': () => {
      if (!st.confirmed) return;
      if (st.idx + 1 >= st.items.length) finish();
      else { st.idx++; st.chosen = null; st.confirmed = false; st.reasoning = ''; st.alternativesVisible = false; }
      ctx.rerender({ focus: '#qz-top' });
    },
    'qz-restart': () => { if (onRestart) onRestart(); },
  };

  function onKey(e) {
    if (st.result || e.target.matches('input, textarea, select')) return;
    const item = st.items[st.idx];
    if (!item || (cat.questionById.get(item.qid).assessment && !st.alternativesVisible)) return;
    const n = Number(e.key);
    if (!st.confirmed && n >= 1 && n <= item.order.length) { st.chosen = item.order[n - 1]; ctx.rerender(); e.preventDefault(); }
    else if (e.key === 'Enter' && !e.target.closest('button,a')) { (st.confirmed ? actions['qz-next'] : actions['qz-confirm'])(); e.preventDefault(); }
  }

  function renderResult() {
    const r = st.result;
    const pct = Math.round(r.score * 100);
    const isTest = kind === 'test' || kind === 'review';
    const passMsg = kind === 'test'
      ? (r.passed ? html`<p class="ok-text">${icon('award')} Aprovado (mínimo ${Math.round(PASS_SCORE * 100)}%). Domínio demonstrado e revisão agendada.</p>` : html`<p class="warn-text">${icon('info')} Abaixo de ${Math.round(PASS_SCORE * 100)}%. Revise os pontos abaixo e tente novamente quando quiser — nada do seu progresso foi perdido.</p>`)
      : kind === 'review'
        ? (r.passed ? html`<p class="ok-text">${icon('check')} Revisão aprovada: o próximo intervalo ficou maior.</p>` : html`<p class="warn-text">${icon('info')} Revisão abaixo de ${Math.round(PASS_SCORE * 100)}%: o módulo volta para revisão em 3 dias (o domínio continua registrado).</p>`)
        : '';
    const wrongQs = r.wrong.map((id) => cat.questionById.get(id));
    const lessonsToReview = [...new Set(wrongQs.map((q) => q.lessonId).filter(Boolean))].map((id) => cat.lessonById.get(id));
    return html`
      <section class="quiz-result card pop" aria-live="polite">
        <div class="result-score ${r.passed ? 'good' : ''}">${pct}%</div>
        <h2>${r.correct} de ${r.total} corretas</h2>
        ${passMsg}
        ${r.xp ? html`<p class="xp-gain">${icon('bolt', 16)} +${r.xp} XP</p>` : html`<p class="muted small">Sem XP novo: perguntas já acertadas antes não geram XP de novo.</p>`}
        ${wrongQs.length ? html`
          <h3>O que revisar</h3>
          <ul class="review-list">${wrongQs.map((q) => html`<li><div class="q-mini">${md(q.prompt)}</div><div class="explain">${icon('info', 16)} <span><strong>Resposta:</strong> ${mdInline(q.options[q.answer])}. ${mdInline(q.explain)}</span></div></li>`)}</ul>
          ${lessonsToReview.length ? html`<p>Lições relacionadas: ${lessonsToReview.map((l) => html`<a href="#/licao/${l.id}" class="chip">${l.title}</a> `)}</p>` : ''}` : html`<p>Nenhum erro nesta rodada.</p>`}
        ${st.answers.filter((a) => a.reasoning).map((a) => {
          const q = cat.questionById.get(a.qid);
          return html`<details class="attempt-notes"><summary>${q.prompt}</summary><p><strong>Sua análise</strong></p><p>${a.reasoning}</p><p><strong>Referência</strong> ${q.explain}</p></details>`;
        })}
        <div class="row gap">
          ${onRestart ? html`<button class="btn" data-action="qz-restart">${icon('refresh', 16)} ${isTest ? 'Tentar outro teste' : 'Nova rodada'}</button>` : ''}
          ${exitHref ? html`<a class="btn primary" href="${exitHref}">${exitLabel}</a>` : ''}
        </div>
      </section>`;
  }

  function render() {
    if (!st.items.length) return html`<div class="card"><p>Não há perguntas disponíveis para este quiz.</p></div>`;
    if (st.result) return renderResult();
    const item = st.items[st.idx];
    const q = cat.questionById.get(item.qid);
    const mod = cat.moduleById.get(q.moduleId);
    const isOk = st.confirmed && st.chosen === q.answer;
    return html`
      <section class="quiz card" id="qz-top" tabindex="-1" aria-label="${title}">
        <div class="quiz-head">
          <span class="muted small">${title} · ${mod.title}</span>
          <span class="small">Pergunta ${st.idx + 1} de ${st.items.length} ${difficulty(q.difficulty || 1)}</span>
        </div>
        ${bar(((st.idx + (st.confirmed ? 1 : 0)) / st.items.length) * 100, { label: 'Progresso do quiz' })}
        <div class="q-prompt">${md(q.prompt)}</div>
        ${q.assessment && !st.alternativesVisible ? html`
          <label class="field">Sua hipótese, evidência e próximo passo
            <textarea data-input="qz-reasoning" rows="5" maxlength="2000" placeholder="Suspeito de… Conferiria… Se confirmar, faria…">${st.reasoning}</textarea>
          </label>
          <button class="btn primary" data-action="qz-show-options">Ver alternativas</button>
        ` : html`
        <div class="options" id="qz-options" tabindex="-1" role="radiogroup" aria-label="Alternativas">
          ${item.order.map((orig, i) => {
            const cls = ['opt'];
            if (st.chosen === orig) cls.push('chosen');
            if (st.confirmed && orig === q.answer) cls.push('correct');
            if (st.confirmed && st.chosen === orig && orig !== q.answer) cls.push('wrong');
            return html`<button class="${cls.join(' ')}" role="radio" aria-checked="${st.chosen === orig}" data-action="qz-choose" data-arg="${orig}" ${st.confirmed ? 'disabled' : ''}><span class="letter">${LETTERS[i]}</span><span class="opt-text">${mdInline(q.options[orig])}</span></button>`;
          })}
        </div>
        ${st.confirmed ? html`
          <div class="feedback ${isOk ? 'ok' : 'bad'}" id="qz-feedback" tabindex="-1" role="status">
            <strong>${isOk ? 'Correto.' : `Não é essa. Resposta: ${LETTERS[item.order.indexOf(q.answer)]}.`}</strong>
            <div>${md(q.explain)}</div>
            ${!isOk && q.lessonId ? html`<p class="small"><a href="#/licao/${q.lessonId}">Rever a lição “${cat.lessonById.get(q.lessonId).title}”</a></p>` : ''}
          </div>` : ''}
        <div class="row end gap">
          ${exitHref ? html`<a class="btn ghost" href="${exitHref}">${exitLabel}</a>` : ''}
          ${!st.confirmed
            ? html`<button class="btn primary" data-action="qz-confirm" ${st.chosen === null ? 'disabled' : ''}>Confirmar</button>`
            : html`<button class="btn primary" data-action="qz-next">${st.idx + 1 >= st.items.length ? 'Ver resultado' : 'Próxima'} ${icon('arrow', 16)}</button>`}
        </div>
        <p class="muted tiny kbd-hint">Atalhos: teclas 1–${item.order.length} escolhem, Enter confirma/avança.</p>
        `}
      </section>`;
  }

  return { render, actions, onKey, get done() { return !!st.result; } };
}
