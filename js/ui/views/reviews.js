// Revisões: sessão de flashcards (Errei/Difícil/Bom/Fácil), revisões de módulos e histórico de retenção.
import { html, md, fmtDate } from '../dom.js';
import { icon } from '../icons.js';
import { pageHead, bar, empty, difficulty } from '../components.js';
import { dueCards, previewIntervals, retentionRate, RATINGS, RATING_LABELS, INTERVALS } from '../../core/srs.js';
import { reviewCard, activateCards } from '../../core/actions.js';
import { isDemonstrated, reviewDue, isStudied } from '../../core/progress.js';
import { addDays } from '../../core/util.js';

export function reviewsView(ctx) {
  const cat = ctx.catalog;
  let session = null; // { queue, idx, revealed, counts }

  const actions = {
    'srs-start': () => {
      const q = dueCards(ctx.state.cards, ctx.today());
      if (!q.length) return;
      session = { queue: q, idx: 0, revealed: false, counts: { again: 0, hard: 0, good: 0, easy: 0 } };
      ctx.rerender({ focus: '#fc' });
    },
    'srs-reveal': () => { if (session) { session.revealed = true; ctx.rerender({ focus: '#fc-rate' }); } },
    'srs-rate': (el) => rate(el.dataset.arg),
    'srs-end': () => { session = null; ctx.rerender(); },
    'activate-studied': () => {
      const t = ctx.today();
      const n = ctx.commit((s) => cat.modules.filter((m) => isStudied(s, cat, m.id) || isDemonstrated(s, m.id)).reduce((a, m) => a + activateCards(s, cat, m.id, t, 0), 0));
      ctx.toast(n ? `${n} cartão(ões) ativados para hoje.` : 'Nenhum cartão novo para ativar.', 'ok');
      ctx.rerender();
    },
  };

  function rate(r) {
    if (!session || !session.revealed || !RATINGS.includes(r)) return;
    const id = session.queue[session.idx];
    ctx.commit((s) => reviewCard(s, id, r, ctx.today()));
    session.counts[r]++;
    session.idx++;
    session.revealed = false;
    ctx.rerender({ focus: '#fc' });
  }

  function onKey(e) {
    if (!session || e.target.matches('input, textarea, select')) return;
    if (!session.revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); actions['srs-reveal'](); }
    else if (session.revealed && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); rate(RATINGS[Number(e.key) - 1]); }
  }

  function sessionView() {
    const s = ctx.state, today = ctx.today();
    if (session.idx >= session.queue.length) {
      const c = session.counts;
      return html`<section class="card pop" id="fc" tabindex="-1">
        <h2>${icon('check', 20)} Sessão concluída</h2>
        <p>${session.queue.length} cartão(ões): ${c.again} errei · ${c.hard} difícil · ${c.good} bom · ${c.easy} fácil.</p>
        <p class="muted small">Cartões marcados como “Errei” voltam amanhã. Os demais seguem os intervalos da caixa.</p>
        <button class="btn primary" data-action="srs-end">Voltar</button>
      </section>`;
    }
    const id = session.queue[session.idx];
    const card = cat.cardById.get(id);
    const st = s.cards[id];
    const m = cat.moduleById.get(card.moduleId);
    const prev = previewIntervals(st, today);
    const hist = (st.history || []).slice(-6);
    return html`
      <section class="flashcard card" id="fc" tabindex="-1" aria-live="polite">
        <div class="row between small"><span class="muted">${m.title}</span><span>${session.idx + 1}/${session.queue.length} ${difficulty(card.difficulty || 1)}</span></div>
        ${bar((session.idx / session.queue.length) * 100, { label: 'Progresso da sessão' })}
        <div class="fc-q">${md(card.q)}</div>
        ${session.revealed ? html`
          <div class="fc-a">${md(card.a)}</div>
          <p class="tiny muted">Caixa ${st.box} · ${st.reviews} revisão(ões) · ${st.lapses} erro(s)${hist.length ? ` · últimas: ${hist.map((h) => RATING_LABELS[h.r]).join(', ')}` : ''}</p>
          <div class="rate" id="fc-rate" tabindex="-1" role="group" aria-label="Como foi sua lembrança?">
            ${RATINGS.map((r, i) => html`<button class="btn rate-${r}" data-action="srs-rate" data-arg="${r}"><strong>${RATING_LABELS[r]}</strong><span class="tiny">${prev[r]} dia(s) · tecla ${i + 1}</span></button>`)}
          </div>`
        : html`<div class="row center"><button class="btn primary" data-action="srs-reveal">Mostrar resposta <span class="tiny">(espaço)</span></button></div>`}
        <div class="row end"><button class="btn ghost small" data-action="srs-end">Encerrar sessão</button></div>
      </section>`;
  }

  function history() {
    const s = ctx.state, today = ctx.today();
    const days = [...Array(14)].map((_, i) => addDays(today, i - 13));
    const perDay = Object.fromEntries(days.map((d) => [d, 0]));
    for (const c of Object.values(s.cards)) for (const h of c.history || []) if (perDay[h.d] !== undefined) perDay[h.d]++;
    const maxD = Math.max(1, ...Object.values(perDay));
    const ahead = [...Array(7)].map((_, i) => addDays(today, i + 1));
    const forecast = ahead.map((d) => Object.values(s.cards).filter((c) => c.due === d).length);
    const maxF = Math.max(1, ...forecast);
    const boxes = INTERVALS.map((_, b) => Object.values(s.cards).filter((c) => c.reviews > 0 && c.box === b).length);
    const ret = retentionRate(s.cards);
    const wd = (d) => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(`${d}T12:00:00`).getDay()];
    return html`
      <div class="grid-2">
        <section class="card">
          <h2 class="h-small">Revisões nos últimos 14 dias</h2>
          <div class="mini-bars" role="img" aria-label="Revisões por dia nos últimos 14 dias">${days.map((d) => html`<div class="mb" title="${fmtDate(d)}: ${perDay[d]}"><span style="height:${(perDay[d] / maxD) * 100}%"></span><i>${d.slice(8)}</i></div>`)}</div>
          <p class="small">Retenção: <strong>${ret === null ? '—' : `${ret}%`}</strong> <span class="tiny muted">(revisões repetidas avaliadas como Bom ou Fácil)</span></p>
        </section>
        <section class="card">
          <h2 class="h-small">Próximos 7 dias</h2>
          <div class="mini-bars alt" role="img" aria-label="Cartões previstos por dia">${ahead.map((d, i) => html`<div class="mb" title="${fmtDate(d)}: ${forecast[i]}"><span style="height:${(forecast[i] / maxF) * 100}%"></span><i>${wd(d)}</i></div>`)}</div>
          <p class="small">Cartões por caixa (intervalo): ${boxes.map((n, b) => html`<span class="tag">${INTERVALS[b]}d: ${n}</span> `)}</p>
        </section>
      </div>`;
  }

  function render() {
    const s = ctx.state, today = ctx.today();
    if (session) return html`${pageHead('Revisões')}${sessionView()}`;
    const due = dueCards(s.cards, today);
    const active = Object.keys(s.cards).length;
    const modDue = cat.modules.filter((m) => isDemonstrated(s, m.id) && reviewDue(s, m.id, today));
    const modNext = cat.modules.filter((m) => isDemonstrated(s, m.id) && !reviewDue(s, m.id, today)).sort((a, b) => s.moduleStats[a.id].review.due.localeCompare(s.moduleStats[b.id].review.due));
    return html`
      ${pageHead('Revisões', 'Revisão espaçada por regras: Errei → 1 dia; Difícil → metade do intervalo; Bom → próxima caixa; Fácil → pula uma caixa. Intervalos: 1, 3, 7, 14, 30 e 60 dias.')}
      <section class="card review-hero">
        <div>
          <h2>${due.length ? `${due.length} flashcard(s) para hoje` : 'Nenhum flashcard vencido'}</h2>
          <p class="muted small">${active} cartão(ões) ativos de ${cat.flashcards.length}. Os cartões de um módulo entram na fila quando você lê a primeira lição dele.</p>
          ${due.length > 20 ? html`<p class="small">${icon('info', 14)} Muitos cartões acumulados? Faça os primeiros — a fila já está ordenada por importância — e deixe o resto para amanhã. Nada se perde.</p>` : ''}
        </div>
        <div class="stack">
          ${due.length ? html`<button class="btn primary" data-action="srs-start">${icon('play', 16)} Começar revisão</button>` : ''}
          <button class="btn ghost small" data-action="activate-studied">${icon('plus', 14)} Ativar cartões de módulos já estudados</button>
        </div>
      </section>

      <section class="card">
        <h2 class="h-small">Revisões de módulos (domínio demonstrado)</h2>
        ${modDue.length ? html`<ul class="alts">${modDue.map((m) => html`<li><span>${icon('review', 16)} ${m.title} <span class="tiny muted">vencida em ${fmtDate(s.moduleStats[m.id].review.due)}</span></span><a class="btn small primary" href="#/revisar-modulo/${m.id}">Revisar (5 perguntas)</a></li>`)}</ul>`
          : empty('Nenhuma revisão de módulo pendente. Elas aparecem 7, 14, 30 e 60 dias após cada aprovação.')}
        ${modNext.length ? html`<p class="tiny muted">Próximas: ${modNext.slice(0, 6).map((m) => `${m.title} (${fmtDate(s.moduleStats[m.id].review.due)})`).join(' · ')}</p>` : ''}
      </section>

      ${history()}`;
  }
  return { render, actions, onKey };
}
