import { dueCards } from '../../core/srs.js';
import { continueStudy, pageHead } from '../components.js';
import { html } from '../dom.js';
import { icon } from '../icons.js';

export function homeView(ctx) {
  function render() {
    const reviews = dueCards(ctx.state.cards, ctx.today()).length;
    return html`
      ${pageHead('Seu espaço de estudo', 'Continue um assunto, pratique um caso ou prepare sua próxima candidatura.', html`<a class="btn ghost" href="#/guia">Como usar</a>`)}
      ${continueStudy(ctx) || html`
        <section class="card study-focus">
          <h2>Escolha seu ponto de partida</h2>
          <p>Se já tem um assunto em mente, abra o módulo e defina o seu foco.</p>
          <div class="row gap wrap">
            <a class="btn primary" href="#/trilha">Explorar trilhas</a>
            <a class="btn ghost" href="#/diagnostico">Fazer diagnóstico</a>
          </div>
        </section>`}
      <section aria-labelledby="home-actions">
        <h2 id="home-actions">O que você quer fazer?</h2>
        <div class="home-actions">
          <a class="card home-action" href="#/praticar">${icon('flask', 24)}<strong>Praticar um caso</strong><span>Simule um incidente, escreva SQL ou implemente um desafio de código.</span></a>
          <a class="card home-action" href="#/revisoes">${icon('cards', 24)}<strong>Revisar</strong><span>${reviews ? `${reviews} flashcard(s) para revisar. Confira também as revisões de módulo.` : 'Veja os flashcards e as revisões dos módulos.'}</span></a>
          <a class="card home-action" href="#/entrevistas">${icon('mic', 24)}<strong>Preparar uma candidatura</strong><span>Treine uma resposta, registre os requisitos da vaga e acompanhe seus envios.</span></a>
        </div>
      </section>
      <section class="card home-planner">
        <div><h2>Organizar o tempo de hoje</h2><p>Se quiser uma sessão guiada, monte um plano com estudo, prática e revisões.</p></div>
        <a class="btn" href="#/hoje">${icon('today', 18)} Estudar Hoje</a>
      </section>`;
  }
  return { render, actions: {} };
}
