// Laboratório: etapas de simulação com escolhas, parte prática no computador, critérios e autoavaliação.
import { html, md, mdInline, fmtDate } from '../dom.js';
import { icon } from '../icons.js';
import { pageHead, whereBadge } from '../components.js';
import { completeLab } from '../../core/actions.js';

export function labView(ctx, labId) {
  const cat = ctx.catalog;
  const lab = cat.labById.get(labId);
  if (!lab) return { render: () => html`<div class="card"><h1>Laboratório não encontrado</h1><a href="#/praticar">Voltar</a></div>`, actions: {} };

  const ensure = (s) => (s.labs[lab.id] ||= { stages: {}, checks: [], criteria: [] });
  const local = { selected: {} }; // etapa -> Set de índices (antes de confirmar)

  const actions = {
    'st-toggle': (el) => {
      const [si, oi] = el.dataset.arg.split(':').map(Number);
      const stage = lab.stages[si];
      if (ctx.state.labs[lab.id]?.stages?.[si]) return;
      const set = local.selected[si] || (local.selected[si] = new Set());
      if (stage.multi) { set.has(oi) ? set.delete(oi) : set.add(oi); } else { set.clear(); set.add(oi); }
      ctx.rerender();
    },
    'st-submit': (el) => {
      const si = Number(el.dataset.arg);
      const set = local.selected[si];
      if (!set?.size) return;
      const stage = lab.stages[si];
      const okSet = stage.options.map((o, i) => (o.ok ? i : -1)).filter((i) => i >= 0);
      const correct = okSet.length === set.size && okSet.every((i) => set.has(i));
      ctx.commit((s) => { ensure(s).stages[si] = { chosen: [...set], correct, date: ctx.today() }; });
      ctx.rerender({ focus: `#stage-${si}-fb` });
    },
    'st-reset': () => {
      ctx.commit((s) => { ensure(s).stages = {}; });
      local.selected = {};
      ctx.rerender({ focus: '#stage-0' });
    },
    'chk': (el) => {
      const i = Number(el.dataset.arg); const kind = el.dataset.kind;
      ctx.commit((s) => {
        const l = ensure(s); const arr = l[kind] || (l[kind] = []);
        const pos = arr.indexOf(i);
        if (el.checked && pos < 0) arr.push(i); if (!el.checked && pos >= 0) arr.splice(pos, 1);
      });
    },
    'lab-notes': (el) => { ctx.commit((s) => { ensure(s).notes = el.value.slice(0, 8000); }); },
    'lab-rate': (el) => { ctx.commit((s) => { ensure(s).selfRating = Number(el.value); }); },
    'lab-complete': () => {
      const ls = ctx.state.labs[lab.id] || {};
      if (lab.practiceOnly && (!(ls.notes || '').trim() || (ls.criteria || []).length !== lab.criteria.length)) {
        ctx.toast('Registre seu resultado e confirme os critérios antes de concluir.', 'info');
        return;
      }
      if (!ls.selfRating) { ctx.toast('Escolha uma autoavaliação antes de concluir.', 'error'); return; }
      ctx.commit((s) => completeLab(s, lab.id, { selfRating: ls.selfRating, notes: ls.notes || '' }, ctx.today()));
      ctx.rerender({ focus: '#lab-done' });
    },
  };

  function stageBlock(stage, si, ls) {
    const done = ls?.stages?.[si];
    const sel = done ? new Set(done.chosen) : (local.selected[si] || new Set());
    const prevDone = si === 0 || ls?.stages?.[si - 1];
    if (!prevDone) return html`<section class="card stage locked" aria-label="Etapa ${si + 1} bloqueada"><h3>Etapa ${si + 1}: ${stage.title}</h3><p class="muted small">${icon('lock', 14)} Conclua a etapa anterior para ver esta.</p></section>`;
    return html`
      <section class="card stage" id="stage-${si}" tabindex="-1">
        <h3>Etapa ${si + 1}: ${stage.title}</h3>
        <div class="scenario">${md(stage.context)}</div>
        <p><strong>${stage.question}</strong> ${stage.multi ? html`<span class="tiny muted">(várias respostas)</span>` : ''}</p>
        <div class="options">
          ${stage.options.map((o, oi) => {
            const cls = ['opt'];
            if (sel.has(oi)) cls.push('chosen');
            if (done && o.ok) cls.push('correct');
            if (done && sel.has(oi) && !o.ok) cls.push('wrong');
            return html`<button class="${cls.join(' ')}" data-action="st-toggle" data-arg="${si}:${oi}" aria-pressed="${sel.has(oi)}" ${done ? 'disabled' : ''}><span class="letter">${stage.multi ? (sel.has(oi) ? '☑' : '☐') : 'ABCDEF'[oi]}</span><span class="opt-text">${mdInline(o.t)}</span></button>
              ${done ? html`<div class="opt-why ${o.ok ? 'ok' : (sel.has(oi) ? 'bad' : '')}">${o.ok ? icon('check', 14) : icon('x', 14)} ${mdInline(o.why)}</div>` : ''}`;
          })}
        </div>
        ${done ? html`<div class="feedback ${done.correct ? 'ok' : 'bad'}" id="stage-${si}-fb" tabindex="-1" role="status"><strong>${done.correct ? 'Diagnóstico coerente.' : 'Não exatamente — veja o raciocínio.'}</strong>${md(stage.explain)}</div>`
          : html`<div class="row end"><button class="btn primary" data-action="st-submit" data-arg="${si}" ${sel.size ? '' : 'disabled'}>Confirmar</button></div>`}
      </section>`;
  }

  function render() {
    const s = ctx.state;
    const ls = s.labs[lab.id];
    const stagesDone = lab.stages.filter((_, i) => ls?.stages?.[i]).length;
    const mods = lab.modules.map((id) => cat.moduleById.get(id));
    return html`
      <nav class="crumbs"><a href="#/praticar">${icon('back', 14)} Praticar</a></nav>
      ${pageHead(lab.title, lab.objective)}
      <section class="card">
        <div class="row gap wrap">${whereBadge(lab.where)} <span class="tag">${icon('clock', 14)} ~${lab.minutes} min</span> ${ls?.completedAt ? html`<span class="tag ok">${icon('check', 14)} concluído em ${fmtDate(ls.completedAt)}</span>` : ''}</div>
        <p><strong>Pré-requisitos:</strong> ${lab.prereqText} ${mods.map((m) => html`<a class="chip" href="#/modulo/${m.id}">${m.title}</a> `)}</p>
        <p><strong>Critérios de conclusão:</strong></p>
        <ul class="checklist">${lab.criteria.map((c, i) => html`<li><label><input type="checkbox" data-change="chk" data-kind="criteria" data-arg="${i}" ${(ls?.criteria || []).includes(i) ? 'checked' : ''}/> ${c}</label></li>`)}</ul>
      </section>

      ${lab.stages.length ? html`<h2 class="section-title">${icon('practice', 18)} Simulação (${stagesDone}/${lab.stages.length})</h2>
        ${lab.stages.map((st, i) => stageBlock(st, i, ls))}
        ${stagesDone ? html`<p class="tiny"><button class="btn small ghost" data-action="st-reset">${icon('refresh', 14)} Refazer simulação</button></p>` : ''}` : ''}

      ${lab.offline ? html`
        <section class="card offline">
          <h2>${icon('terminal', 18)} ${lab.where === 'browser' ? 'Exercício de escrita' : 'Parte prática no seu computador'}</h2>
          <div class="notice">${icon('info', 18)}<div>${md(lab.offline.intro)}</div></div>
          <ol class="checklist">${lab.offline.steps.map((st, i) => html`<li><label><input type="checkbox" data-change="chk" data-kind="checks" data-arg="${i}" ${(ls?.checks || []).includes(i) ? 'checked' : ''}/> <span>${mdInline(st)}</span></label></li>`)}</ol>
          ${lab.reference ? html`<details><summary>Ver resposta de referência</summary>${md(lab.reference)}</details>` : ''}
          ${lab.where !== 'browser' ? html`<p class="tiny muted">Use os resultados esperados para verificar a execução no computador.</p>` : ''}
        </section>` : ''}

      <section class="card" id="lab-done" tabindex="-1">
        <h2>${icon('note', 18)} Anotações e conclusão</h2>
        <label class="field">O que você encontrou, conclusões e o que faria diferente
          <textarea rows="5" data-input="lab-notes" placeholder="Ex.: registro do incidente, comandos usados, dúvidas...">${ls?.notes || ''}</textarea></label>
        <label class="field">Autoavaliação
          <select data-change="lab-rate">
            <option value="">Selecione…</option>
            ${[[1, 'Precisei de muita ajuda'], [2, 'Entendi parcialmente'], [3, 'Consegui com algumas dúvidas'], [4, 'Consegui com segurança'], [5, 'Conseguiria explicar para outra pessoa']].map(([v, t]) => html`<option value="${v}" ${ls?.selfRating === v ? 'selected' : ''}>${v} — ${t}</option>`)}
          </select></label>
        ${ls?.completedAt ? html`<p class="ok-text">${icon('check', 16)} Última sessão registrada em ${fmtDate(ls.lastPracticedAt || ls.completedAt)}.</p>` : ''}
        ${!ls?.completedAt || (lab.repeatable && (ls.lastPracticedAt || ls.completedAt) !== ctx.today())
          ? html`<button class="btn primary" data-action="lab-complete">${icon('check', 16)} ${ls?.completedAt ? 'Registrar nova sessão' : 'Registrar conclusão'}</button>` : ''}
      </section>`;
  }
  return { render, actions };
}
