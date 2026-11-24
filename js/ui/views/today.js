// Estudar Hoje: plano do dia (estável ao longo do dia), com motivos, troca de tarefas e ajuste de tempo.
import { html, fmtDate } from '../dom.js';
import { icon } from '../icons.js';
import { pageHead, bar } from '../components.js';
import { buildPlan, isTaskDone } from '../../core/recommend.js';
import { award, XP } from '../../core/gamification.js';

const TYPE_ICON = { diagnostic: 'compass', lesson: 'book', test: 'award', 'module-review': 'review', cards: 'cards', reinforce: 'target', lab: 'flask', interview: 'mic', applications: 'send' };
const TYPE_LABEL = { diagnostic: 'Diagnóstico', lesson: 'Lição', test: 'Teste', 'module-review': 'Revisão de módulo', cards: 'Flashcards', reinforce: 'Reforço', lab: 'Laboratório', interview: 'Entrevista', applications: 'Carreira' };

export function todayView(ctx) {
  const cat = ctx.catalog;

  function ensureDay(s, today) {
    if (s.today.date !== today) s.today = { date: today, skipped: [], minutes: null, plan: null };
  }
  function recompute(s, today) {
    const prev = s.today.plan;
    const done = prev ? prev.tasks.filter((t) => isTaskDone(t, s, cat, today)) : [];
    const budget = s.today.minutes ?? s.settings.dailyMinutes;
    const usedDone = done.reduce((a, t) => a + t.minutes, 0);
    const fresh = buildPlan(s, cat, today, { minutes: Math.max(15, budget - usedDone), skills: ctx.skills });
    const now = Date.now();
    const tasks = [...done, ...fresh.tasks.filter((t) => !done.some((d) => d.id === t.id)).map((t) => ({ ...t, since: now }))];
    s.today.plan = { ...fresh, budget, tasks, used: tasks.reduce((a, t) => a + t.minutes, 0), alternatives: fresh.alternatives.filter((a) => !tasks.some((t) => t.id === a.id)) };
  }

  const actions = {
    'set-minutes': (el) => {
      const v = Number(el.dataset.arg || el.value);
      if (!(v >= 15 && v <= 300)) return;
      ctx.commit((s) => { ensureDay(s, ctx.today()); s.today.minutes = v; recompute(s, ctx.today()); });
      ctx.rerender();
    },
    'skip-task': (el) => {
      const id = el.dataset.arg;
      ctx.commit((s) => { const t = ctx.today(); ensureDay(s, t); if (!s.today.skipped.includes(id)) s.today.skipped.push(id); s.today.plan.tasks = s.today.plan.tasks.filter((x) => x.id !== id); recompute(s, t); });
      ctx.toast('Tarefa trocada. Ela pode voltar a ser sugerida em outro dia.', 'info');
      ctx.rerender();
    },
    'add-alt': (el) => {
      const id = el.dataset.arg;
      ctx.commit((s) => { const alt = s.today.plan.alternatives.find((a) => a.id === id); if (alt) { s.today.plan.tasks.push({ ...alt, since: Date.now() }); s.today.plan.alternatives = s.today.plan.alternatives.filter((a) => a.id !== id); s.today.plan.used += alt.minutes; } });
      ctx.rerender();
    },
    'replan': () => {
      ctx.commit((s) => { const t = ctx.today(); ensureDay(s, t); s.today.skipped = []; recompute(s, t); });
      ctx.toast('Plano recalculado com base no progresso atual.', 'ok');
      ctx.rerender();
    },
  };

  function render() {
    const today = ctx.today();
    let s = ctx.state;
    if (s.today.date !== today || !s.today.plan) { ctx.commit((st) => { ensureDay(st, today); recompute(st, today); }); s = ctx.state; }
    const plan = s.today.plan;
    const doneFlags = plan.tasks.map((t) => isTaskDone(t, s, cat, today));
    const doneCount = doneFlags.filter(Boolean).length;
    const allDone = plan.tasks.length > 0 && doneCount === plan.tasks.length;
    if (allDone && s.xp.ledger[`daily:${today}`] === undefined) {
      ctx.commit((st) => award(st, `daily:${today}`, XP.dailyGoal, today));
    }
    const studied = Math.round(s.activity[today]?.minutes || 0);
    const budget = plan.budget;
    const presets = [30, 45, 60, 90, 120];
    return html`
      ${pageHead('Estudar Hoje', `${fmtDate(today)} · plano montado por regras transparentes, a partir do seu progresso.`, html`<button class="btn ghost" data-action="replan">${icon('refresh', 16)} Recalcular</button>`)}

      <section class="card today-top">
        <div>
          <h2 class="h-small">Tempo disponível hoje</h2>
          <div class="chips" role="group" aria-label="Minutos disponíveis">
            ${presets.map((p) => html`<button class="chip ${budget === p ? 'active' : ''}" aria-pressed="${budget === p}" data-action="set-minutes" data-arg="${p}">${p} min</button>`)}
            <label class="inline-field"><span class="sr-only">Outro valor em minutos</span><input type="number" min="15" max="300" step="5" value="${presets.includes(budget) ? '' : budget}" placeholder="outro" data-change="set-minutes" /></label>
          </div>
          <p class="tiny muted">Padrão nas configurações: ${s.settings.dailyMinutes} min. Alterar aqui vale só para hoje.</p>
        </div>
        <div class="today-progress">
          <div class="row between"><span class="small">${doneCount}/${plan.tasks.length} tarefas</span><span class="small">${studied} min registrados hoje</span></div>
          ${bar(plan.tasks.length ? (doneCount / plan.tasks.length) * 100 : 0, { label: 'Tarefas concluídas hoje' })}
          <p class="tiny muted">Planejado: ~${plan.used} min de ${budget}.</p>
        </div>
      </section>

      ${plan.notes.map((n) => html`<div class="notice ${plan.recovery ? 'calm' : ''}">${icon(plan.recovery ? 'info' : 'clock', 18)}<div>${n}</div></div>`)}
      ${allDone ? html`<div class="notice success pop">${icon('award', 20)}<div><strong>Plano de hoje concluído.</strong> Consistência é o que mais pesa em 90 dias. Se ainda tiver energia, escolha uma opção extra abaixo — ou descanse.</div></div>` : ''}

      <ol class="tasks">
        ${plan.tasks.map((t, i) => html`
          <li class="task ${doneFlags[i] ? 'done' : ''}">
            <span class="task-ic">${icon(doneFlags[i] ? 'check' : TYPE_ICON[t.type], 20)}</span>
            <div class="task-body">
              <span class="tiny muted">${TYPE_LABEL[t.type]} · ${t.minutes} min${t.subtitle ? ` · ${t.subtitle}` : ''}</span>
              <strong>${t.title}</strong>
              <details><summary>Por que isto?</summary><ul>${t.reasons.map((r) => html`<li>${r}</li>`)}</ul></details>
            </div>
            <div class="task-actions">
              ${doneFlags[i] ? html`<span class="tag ok">feito</span>` : html`
                <a class="btn primary small" href="${t.target}">${icon('play', 14)} Começar</a>
                <button class="btn ghost small" data-action="skip-task" data-arg="${t.id}" aria-label="Trocar a tarefa ${t.title}">${icon('swap', 14)} Trocar</button>`}
            </div>
          </li>`)}
      </ol>
      ${!plan.tasks.length ? html`<div class="empty">${icon('check', 22)}<p>Sem tarefas sugeridas. Explore a trilha ou um laboratório.</p></div>` : ''}

      ${plan.alternatives?.length ? html`
        <section class="card">
          <h2 class="h-small">Outras opções</h2>
          <ul class="alts">${plan.alternatives.map((a) => html`<li><span>${icon(TYPE_ICON[a.type], 16)} ${a.title} <span class="tiny muted">${a.minutes} min</span></span><button class="btn small" data-action="add-alt" data-arg="${a.id}">${icon('plus', 14)} Adicionar</button></li>`)}</ul>
        </section>` : ''}

      <details class="card algo">
        <summary><strong>Como as recomendações funcionam</strong></summary>
        <p>Não há inteligência artificial: são regras fixas, aplicadas na mesma ordem toda vez.</p>
        <ol>
          <li><strong>Revisões primeiro, com limite:</strong> flashcards vencidos (mais atrasados e com mais erros primeiro) ocupam no máximo ${Math.round(s.settings.reviewShare * 100)}% do tempo. O excedente é distribuído nos próximos dias.</li>
          <li><strong>Dificuldades antes de avançar:</strong> módulos com acerto recente abaixo de 60% (com 4+ respostas) geram uma tarefa de reforço. Lições que dependem deles perdem prioridade.</li>
          <li><strong>Aceleração:</strong> se o diagnóstico de um módulo foi de 80% ou mais, o plano sugere o teste de conclusão em vez das lições.</li>
          <li><strong>Lições novas</strong> são pontuadas pelo peso da trilha (A: ${s.settings.trackWeights.A}, B: ${s.settings.trackWeights.B}, C: ${s.settings.trackWeights.C}, D: ${s.settings.trackWeights.D}, E: ${s.settings.trackWeights.E}), por continuidade, pelos requisitos de vagas cadastrados e pela ordem da trilha. Pré-requisitos não atendidos tiram a lição da lista (mas você pode acessá-la pela trilha).</li>
          <li><strong>Programação:</strong> se a Trilha D estiver abaixo de ${s.settings.devSessionsPerWeek} sessões na semana, ela ganha prioridade.</li>
          <li><strong>Retomada:</strong> após ${s.settings.recoveryAfterDays}+ dias sem estudo, o plano encolhe (até 15 flashcards, 1 lição, sem laboratório longo). Nenhum progresso é removido.</li>
          <li>As tarefas são escolhidas por pontuação até preencher o tempo disponível (com 10% de tolerância).</li>
        </ol>
        <p class="tiny muted">Os pesos, o tempo diário e a meta semanal podem ser ajustados em Configurações.</p>
      </details>`;
  }
  return { render, actions };
}
