// Entrevistas (perguntas por cargo), candidaturas semanais e requisitos de vagas.
import { html, md, fmtDate } from '../dom.js';
import { icon } from '../icons.js';
import { pageHead, tabs, empty } from '../components.js';
import { saveInterviewAnswer, saveApplicationsWeek } from '../../core/actions.js';
import { weekKey, addDays, pct } from '../../core/util.js';

export function careerView(ctx, tab) {
  const cat = ctx.catalog;
  const ui = { role: 'all', kind: 'all', open: null, reveal: new Set(), week: weekKey(ctx.today()) };
  let draft = null; // edição da semana antes de salvar

  const actions = {
    tab: (el) => ctx.navigate(el.dataset.arg === 'perguntas' ? '#/entrevistas' : `#/entrevistas/${el.dataset.arg}`),
    'iv-role': (el) => { ui.role = el.dataset.arg; ctx.rerender(); },
    'iv-kind': (el) => { ui.kind = el.dataset.arg; ctx.rerender(); },
    'iv-open': (el) => { ui.open = ui.open === el.dataset.arg ? null : el.dataset.arg; ctx.rerender({ focus: ui.open ? `#iv-${ui.open}` : null }); },
    'iv-reveal': (el) => { ui.reveal.add(el.dataset.arg); ctx.rerender({ focus: `#iv-ref-${el.dataset.arg}` }); },
    'iv-answer': (el) => {
      const id = el.dataset.arg;
      ctx.commit((s) => saveInterviewAnswer(s, id, { answer: el.value.slice(0, 8000) }, ctx.today()));
      const c = document.getElementById(`iv-count-${id}`); if (c) c.textContent = `${el.value.length} caracteres`;
    },
    'iv-check': (el) => {
      const id = el.dataset.q, i = Number(el.dataset.arg);
      ctx.commit((s) => {
        const cur = new Set(s.interviews[id]?.checked || []);
        el.checked ? cur.add(i) : cur.delete(i);
        saveInterviewAnswer(s, id, { checked: [...cur] }, ctx.today());
      });
      ctx.rerender();
    },
    'iv-score': (el) => { ctx.commit((s) => saveInterviewAnswer(s, el.dataset.arg, { selfScore: Number(el.value) || null }, ctx.today())); },
    // candidaturas
    'wk-select': (el) => { ui.week = el.value; draft = null; ctx.rerender(); },
    'wk-field': (el) => {
      draft ||= structuredClone(ctx.state.applications.weeks[ui.week] || { sent: 0, types: {}, responses: 0, interviews: 0, notes: '' });
      const f = el.dataset.arg;
      if (f.startsWith('type:')) draft.types[f.slice(5)] = Number(el.value) || 0;
      else if (f === 'notes') draft.notes = el.value;
      else draft[f] = Number(el.value) || 0;
    },
    'wk-step': (el) => {
      draft ||= structuredClone(ctx.state.applications.weeks[ui.week] || { sent: 0, types: {}, responses: 0, interviews: 0, notes: '' });
      const [f, d] = el.dataset.arg.split(':');
      draft[f] = Math.max(0, (draft[f] || 0) + Number(d));
      ctx.rerender();
    },
    'wk-save': () => {
      if (!draft) { ctx.toast('Nada para salvar.', 'info'); return; }
      const typesSum = Object.values(draft.types || {}).reduce((a, b) => a + (b || 0), 0);
      if (typesSum > draft.sent) draft.sent = typesSum;
      ctx.commit((s) => saveApplicationsWeek(s, ui.week, draft, ctx.today()));
      draft = null;
      ctx.toast('Semana registrada.', 'ok');
      ctx.rerender();
    },
    // requisitos
    'req-step': (el) => {
      const [id, d] = el.dataset.arg.split(':');
      ctx.commit((s) => { s.jobReqs[id] = Math.max(0, Math.min(99, (s.jobReqs[id] || 0) + Number(d))); if (!s.jobReqs[id]) delete s.jobReqs[id]; s.today.plan = null; });
      ctx.rerender();
    },
  };

  // ---------- Perguntas ----------
  function questionsTab() {
    const s = ctx.state;
    const list = cat.interviews.filter((q) => (ui.role === 'all' || q.roles.includes(ui.role)) && (ui.kind === 'all' || q.kind === ui.kind));
    const answered = cat.interviews.filter((q) => (s.interviews[q.id]?.answer || '').trim().length >= 40).length;
    return html`
      <div class="notice">${icon('info', 18)}<div>Escreva sua resposta <strong>antes</strong> de abrir a referência. O site não avalia o texto automaticamente (não há IA): use a checklist de pontos-chave para se autoavaliar e ensaie em voz alta. ${answered}/${cat.interviews.length} respondidas.</div></div>
      <div class="chips" role="group" aria-label="Filtrar por cargo">
        <button class="chip ${ui.role === 'all' ? 'active' : ''}" data-action="iv-role" data-arg="all">Todos os cargos</button>
        ${ctx.roles.map((r) => html`<button class="chip ${ui.role === r.id ? 'active' : ''}" aria-pressed="${ui.role === r.id}" data-action="iv-role" data-arg="${r.id}">${r.title}</button>`)}
      </div>
      <div class="chips" role="group" aria-label="Filtrar por tipo">
        ${[['all', 'Todas'], ['tecnica', 'Técnicas'], ['comportamental', 'Comportamentais']].map(([k, l]) => html`<button class="chip ${ui.kind === k ? 'active' : ''}" aria-pressed="${ui.kind === k}" data-action="iv-kind" data-arg="${k}">${l}</button>`)}
      </div>
      <ul class="iv-list">${list.map((q) => ivItem(q))}</ul>`;
  }

  function ivItem(q) {
    const s = ctx.state;
    const st = s.interviews[q.id] || {};
    const open = ui.open === q.id;
    const has = (st.answer || '').trim().length >= 40;
    return html`<li class="card iv ${open ? 'open' : ''}" id="iv-${q.id}" tabindex="-1">
      <button class="iv-head" data-action="iv-open" data-arg="${q.id}" aria-expanded="${open}">
        <span class="tag ${q.kind === 'tecnica' ? '' : 'alt'}">${q.kind === 'tecnica' ? 'Técnica' : 'Comportamental'}</span>
        <span class="iv-title">${q.prompt}</span>
        <span class="tiny muted">${q.topic}${has ? ' · respondida' : ''}${st.selfScore ? ` · ${st.selfScore}/5` : ''}</span>
      </button>
      ${open ? html`<div class="iv-body">
        <p class="tiny muted">Cargos: ${q.roles.map((r) => ctx.roles.find((x) => x.id === r).title).join(', ')}${st.updatedAt ? ` · atualizado em ${fmtDate(st.updatedAt)}` : ''}</p>
        <label class="field">Sua resposta
          <textarea rows="7" data-input="iv-answer" data-arg="${q.id}" placeholder="Escreva como se estivesse falando com o entrevistador...">${st.answer || ''}</textarea></label>
        <p class="tiny muted" id="iv-count-${q.id}">${(st.answer || '').length} caracteres</p>
        ${ui.reveal.has(q.id) ? html`
          <div class="iv-ref" id="iv-ref-${q.id}" tabindex="-1">
            <h3>Pontos que deveriam aparecer</h3>
            <ul class="checklist">${q.keyPoints.map((k, i) => html`<li><label><input type="checkbox" data-change="iv-check" data-q="${q.id}" data-arg="${i}" ${(st.checked || []).includes(i) ? 'checked' : ''}/> ${k}</label></li>`)}</ul>
            <p class="small">Cobertura: ${(st.checked || []).length}/${q.keyPoints.length}</p>
            <h3>Resposta de referência</h3>
            <div class="model">${md(q.model)}</div>
            <h3>Evite</h3>
            <ul>${q.pitfalls.map((p) => html`<li>${p}</li>`)}</ul>
            ${q.modules.length ? html`<p class="small">Estudar: ${q.modules.map((id) => html`<a class="chip" href="#/modulo/${id}">${cat.moduleById.get(id).title}</a> `)}</p>` : ''}
            <label class="field inline">Autoavaliação
              <select data-change="iv-score" data-arg="${q.id}"><option value="">—</option>${[1, 2, 3, 4, 5].map((v) => html`<option value="${v}" ${st.selfScore === v ? 'selected' : ''}>${v}/5</option>`)}</select></label>
          </div>`
        : html`<button class="btn" data-action="iv-reveal" data-arg="${q.id}">${icon('book', 16)} Ver critérios e resposta de referência</button>`}
      </div>` : ''}
    </li>`;
  }

  // ---------- Candidaturas ----------
  function appsTab() {
    const s = ctx.state, today = ctx.today();
    const goal = s.settings.weeklyAppGoal;
    const cur = weekKey(today);
    const weeksOpts = [...Array(12)].map((_, i) => addDays(cur, -7 * i));
    const w = draft || s.applications.weeks[ui.week] || { sent: 0, types: {}, responses: 0, interviews: 0, notes: '' };
    const all = Object.entries(s.applications.weeks).sort(([a], [b]) => a.localeCompare(b));
    const last8 = [...Array(8)].map((_, i) => addDays(cur, -7 * (7 - i)));
    const max = Math.max(goal, ...last8.map((k) => s.applications.weeks[k]?.sent || 0), 1);
    const tot = all.reduce((a, [, x]) => ({ sent: a.sent + (x.sent || 0), resp: a.resp + (x.responses || 0), int: a.int + (x.interviews || 0) }), { sent: 0, resp: 0, int: 0 });
    const typeTot = {};
    for (const [, x] of all) for (const [k, v] of Object.entries(x.types || {})) typeTot[k] = (typeTot[k] || 0) + v;
    const stepper = (f, label) => html`<div class="stepper"><span>${label}</span><div><button class="btn small ghost" data-action="wk-step" data-arg="${f}:-1" aria-label="Diminuir ${label}">${icon('minus', 14)}</button><input type="number" min="0" max="999" value="${w[f] || 0}" data-input="wk-field" data-arg="${f}" aria-label="${label}"/><button class="btn small ghost" data-action="wk-step" data-arg="${f}:1" aria-label="Aumentar ${label}">${icon('plus', 14)}</button></div></div>`;
    return html`
      <div class="notice calm">${icon('info', 18)}<div>Meta atual: <strong>${goal} candidaturas direcionadas por semana</strong> (ajuste em Configurações). O registro serve para manter constância e ver tendências — nenhuma quantidade garante retorno ou contratação.</div></div>
      <div class="grid-2">
        <section class="card">
          <h2 class="h-small">Registrar semana</h2>
          <label class="field">Semana (a partir de segunda-feira)
            <select data-change="wk-select">${weeksOpts.map((k) => html`<option value="${k}" ${k === ui.week ? 'selected' : ''}>${fmtDate(k)}${k === cur ? ' (atual)' : ''}</option>`)}</select></label>
          ${stepper('sent', 'Candidaturas enviadas')}
          ${stepper('responses', 'Respostas recebidas')}
          ${stepper('interviews', 'Entrevistas')}
          <fieldset class="types"><legend class="small">Tipos de vaga (opcional)</legend>
            ${ctx.appTypes.map((t) => html`<label class="type-field"><span>${t.label}</span><input type="number" min="0" max="999" value="${w.types?.[t.id] || ''}" placeholder="0" data-input="wk-field" data-arg="type:${t.id}"/></label>`)}
          </fieldset>
          <label class="field">Observações
            <textarea rows="2" data-input="wk-field" data-arg="notes" placeholder="Ex.: vagas que mais combinaram, retornos, ajustes no currículo...">${w.notes || ''}</textarea></label>
          <button class="btn primary" data-action="wk-save">${icon('check', 16)} Salvar semana</button>
        </section>
        <section class="card">
          <h2 class="h-small">Últimas 8 semanas</h2>
          <div class="app-chart" role="img" aria-label="Candidaturas enviadas por semana nas últimas 8 semanas, meta ${goal}">
            <div class="ab-area">
              ${last8.map((k) => { const x = s.applications.weeks[k]; const v = x?.sent || 0; return html`<div class="ab" title="${fmtDate(k)}: ${v} enviadas, ${x?.responses || 0} respostas"><b>${v || ''}</b><span class="ab-bar ${v >= goal ? 'met' : ''}" style="height:${(v / max) * 100}%"></span></div>`; })}
              <div class="goal-line" style="bottom:${(goal / max) * 100}%"><span>meta ${goal}</span></div>
            </div>
            <div class="ab-labels">${last8.map((k) => html`<i>${k.slice(8)}/${k.slice(5, 7)}</i>`)}</div>
          </div>
          <div class="stats-row">
            <div class="stat"><strong>${tot.sent}</strong><span>enviadas</span></div>
            <div class="stat"><strong>${tot.resp}</strong><span>respostas</span></div>
            <div class="stat"><strong>${tot.int}</strong><span>entrevistas</span></div>
            <div class="stat"><strong>${tot.sent ? `${pct(tot.resp, tot.sent)}%` : '—'}</strong><span>taxa de resposta</span></div>
          </div>
          ${Object.keys(typeTot).length ? html`<p class="small">Por tipo: ${ctx.appTypes.filter((t) => typeTot[t.id]).map((t) => html`<span class="tag">${t.label}: ${typeTot[t.id]}</span> `)}</p>` : ''}
          <p class="tiny muted">Com poucas semanas registradas, diferenças entre tipos de vaga podem ser só acaso.</p>
        </section>
      </div>`;
  }

  // ---------- Requisitos de vagas ----------
  function reqsTab() {
    const s = ctx.state;
    return html`
      <section class="card">
        <h2 class="h-small">Requisitos que aparecem nas vagas</h2>
        <p class="small">Ao ler uma vaga que te interessa, some +1 em cada requisito pedido. O plano diário dá mais prioridade (até +5 pontos) aos módulos ligados aos requisitos mais frequentes.</p>
        <ul class="req-list">
          ${ctx.skills.map((k) => html`<li>
            <div><strong>${k.label}</strong><span class="tiny muted">${k.modules.map((id) => cat.moduleById.get(id).title).join(' · ')}</span></div>
            <div class="stepper compact"><button class="btn small ghost" data-action="req-step" data-arg="${k.id}:-1" aria-label="Diminuir ${k.label}">${icon('minus', 14)}</button><b aria-live="polite">${s.jobReqs[k.id] || 0}</b><button class="btn small ghost" data-action="req-step" data-arg="${k.id}:1" aria-label="Aumentar ${k.label}">${icon('plus', 14)}</button></div>
          </li>`)}
        </ul>
      </section>`;
  }

  function render() {
    const body = tab === 'candidaturas' ? appsTab() : tab === 'requisitos' ? reqsTab() : questionsTab();
    return html`
      ${pageHead('Entrevistas e carreira', 'Perguntas técnicas e comportamentais por cargo, acompanhamento simples de candidaturas e requisitos de vagas.')}
      ${tabs([{ id: 'perguntas', label: 'Perguntas' }, { id: 'candidaturas', label: 'Candidaturas' }, { id: 'requisitos', label: 'Requisitos de vagas' }], tab, 'tab')}
      ${body}`;
  }
  void empty;
  return { render, actions };
}
