// Central de prática: quizzes, flashcards, laboratórios e simulações.
import { html } from '../dom.js';
import { icon } from '../icons.js';
import { pageHead, whereBadge } from '../components.js';
import { isWeak, moduleAccuracy, isStudied, isDemonstrated } from '../../core/progress.js';
import { dueCards } from '../../core/srs.js';

export function practiceView(ctx) {
  const cat = ctx.catalog;
  const actions = {
    'go-module': () => {
      const sel = document.getElementById('pm-select');
      if (sel?.value) ctx.navigate(`#/praticar/modulo/${sel.value}`);
    },
  };

  function render() {
    const s = ctx.state, today = ctx.today();
    const weak = cat.modules.filter((m) => isWeak(s, m.id));
    const due = dueCards(s.cards, today).length;
    const studied = cat.modules.filter((m) => isStudied(s, cat, m.id) || isDemonstrated(s, m.id)).length;
    return html`
      ${pageHead('Praticar', 'Quizzes com explicação, flashcards, laboratórios e simulações de incidentes.')}
      <div class="grid-2">
        <section class="card">
          <h2>${icon('quiz', 18)} Quizzes</h2>
          <div class="stack">
            <a class="btn ${weak.length ? 'primary' : ''}" href="#/praticar/fracos">${icon('target', 16)} Pontos fracos ${weak.length ? html`<span class="count">${weak.length}</span>` : ''}</a>
            <a class="btn" href="#/praticar/mistura">${icon('layers', 16)} Revisão intercalada (${studied} módulo(s) estudados)</a>
          </div>
          <h3>Por trilha</h3>
          <div class="chips">${cat.tracks.map((t) => html`<a class="chip t-${t.color}" href="#/praticar/trilha/${t.id}">${t.id} · ${t.short}</a>`)}</div>
          <h3>Por módulo</h3>
          <div class="row gap">
            <label class="sr-only" for="pm-select">Módulo</label>
            <select id="pm-select">${cat.tracks.map((t) => html`<optgroup label="${t.id} — ${t.title}">${(cat.modulesByTrack.get(t.id) || []).map((m) => html`<option value="${m.id}">${m.title}</option>`)}</optgroup>`)}</select>
            <button class="btn" data-action="go-module">Praticar</button>
          </div>
          ${weak.length ? html`<h3>Dificuldades atuais</h3><ul class="plain">${weak.map((m) => html`<li><a href="#/praticar/modulo/${m.id}">${m.title}</a> <span class="tag warn">${Math.round((moduleAccuracy(s, m.id) ?? 0) * 100)}% recente</span></li>`)}</ul>` : ''}
          <p class="tiny muted"><a href="#/diagnostico">Refazer o diagnóstico</a></p>
        </section>

        <section class="card">
          <h2>${icon('cards', 18)} Flashcards</h2>
          <p>${due ? `${due} cartão(ões) para revisar hoje.` : 'Nenhum cartão vencido hoje.'} Os cartões de um módulo são ativados quando você lê a primeira lição (ou manualmente na página do módulo).</p>
          <a class="btn ${due ? 'primary' : ''}" href="#/revisoes">${icon('review', 16)} Ir para revisões</a>
        </section>
      </div>

      <section class="card">
        <h2>${icon('flask', 18)} Laboratórios e simulações de incidentes</h2>
        <p class="muted small">Cada laboratório indica claramente se a atividade é uma simulação no navegador (logs e saídas fictícias) ou se precisa ser executada no seu computador. O site não executa comandos nem verifica arquivos locais.</p>
        <div class="lab-grid">
          ${cat.labs.map((l) => {
            const ls = s.labs[l.id];
            return html`<a class="lab-card" href="#/lab/${l.id}">
              <strong>${l.title}</strong>
              <span class="small muted">${l.objective}</span>
              <span class="row gap wrap">${whereBadge(l.where)} <span class="tag">${icon('clock', 14)} ${l.minutes} min</span> ${ls?.completedAt ? html`<span class="tag ok">${icon('check', 14)} concluído${ls.selfRating ? ` · ${ls.selfRating}/5` : ''}</span>` : ''}</span>
            </a>`;
          })}
        </div>
      </section>`;
  }
  return { render, actions };
}
