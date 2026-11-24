// Tela de lição: objetivo, explicação, exemplo, exercício, quiz, resumo, relacionados e anotações.
import { html, md, mdInline } from '../dom.js';
import { icon } from '../icons.js';
import { trackTag, difficulty } from '../components.js';
import { markLessonRead, recordExercise } from '../../core/actions.js';
import { buildQuiz } from '../../core/quiz.js';
import { nextLesson } from '../../core/progress.js';
import { createQuizRunner } from '../quizRunner.js';

export function lessonView(ctx, lessonId) {
  const cat = ctx.catalog;
  const L = cat.lessonById.get(lessonId);
  if (!L) return { render: () => html`<div class="card"><h1>Lição não encontrada</h1><a href="#/trilha">Voltar</a></div>`, actions: {} };
  const m = cat.moduleById.get(L.moduleId);
  const t = cat.trackById.get(m.track);
  const ex = L.exercise;

  const exState = { selected: new Set(), submitted: false, correct: null };
  let runner = null;

  function startQuiz() {
    const pool = cat.questionsByLesson.get(L.id) || [];
    runner = createQuizRunner(ctx, {
      kind: 'lesson', moduleId: m.id, lessonId: L.id, title: 'Quiz de fixação',
      items: buildQuiz(pool, { count: 4, state: ctx.state }),
      onRestart: () => { startQuiz(); ctx.rerender({ focus: '#qz-top' }); },
    });
  }

  const actions = {
    'ex-toggle': (el) => {
      if (exState.submitted) return;
      const i = Number(el.dataset.arg);
      if (ex.multi) { exState.selected.has(i) ? exState.selected.delete(i) : exState.selected.add(i); }
      else exState.selected = new Set([i]);
      ctx.rerender();
    },
    'ex-submit': () => {
      if (!exState.selected.size) return;
      const okSet = new Set(ex.options.map((o, i) => (o.ok ? i : -1)).filter((i) => i >= 0));
      const correct = okSet.size === exState.selected.size && [...okSet].every((i) => exState.selected.has(i));
      exState.submitted = true; exState.correct = correct;
      ctx.commit((s) => recordExercise(s, cat, L.id, correct, ctx.today()));
      ctx.rerender({ focus: '#ex-feedback' });
    },
    'ex-retry': () => { exState.selected = new Set(); exState.submitted = false; exState.correct = null; ctx.rerender({ focus: '#exercicio' }); },
    'quiz-start': () => { startQuiz(); ctx.rerender({ focus: '#qz-top' }); },
    'mark-read': () => {
      const r = ctx.commit((s) => markLessonRead(s, cat, L.id, ctx.today()));
      if (r.first) ctx.toast(r.cards ? `Leitura registrada. ${r.cards} flashcards entram nas revisões a partir de amanhã.` : 'Leitura registrada.', 'ok');
      ctx.rerender({ focus: '#after-read' });
    },
    note: (el) => { ctx.commit((s) => { s.notes[L.id] = el.value.slice(0, 5000); }); },
  };

  const proxyActions = new Proxy(actions, {
    get(target, prop) { return target[prop] || runner?.actions[prop]; },
  });

  function exerciseBlock() {
    const prev = ctx.state.lessons[L.id];
    return html`
      <section class="card step" id="exercicio" tabindex="-1" aria-labelledby="h-ex">
        <h2 id="h-ex"><span class="step-n">4</span> Exercício prático</h2>
        ${prev?.exerciseDone && !exState.submitted ? html`<p class="tiny muted">Você já fez este exercício (${prev.exerciseCorrect ? 'acertou' : 'ainda não acertou'}). Pode refazer — o XP não é concedido de novo.</p>` : ''}
        <div class="scenario">${md(ex.prompt)}</div>
        <p class="tiny muted">${ex.multi ? 'Selecione todas as opções adequadas.' : 'Escolha a melhor opção.'}</p>
        <div class="options" role="${ex.multi ? 'group' : 'radiogroup'}">
          ${ex.options.map((o, i) => {
            const sel = exState.selected.has(i);
            const cls = ['opt'];
            if (sel) cls.push('chosen');
            if (exState.submitted && o.ok) cls.push('correct');
            if (exState.submitted && sel && !o.ok) cls.push('wrong');
            return html`<button class="${cls.join(' ')}" role="${ex.multi ? 'checkbox' : 'radio'}" aria-checked="${sel}" data-action="ex-toggle" data-arg="${i}" ${exState.submitted ? 'disabled' : ''}>
              <span class="letter">${ex.multi ? (sel ? '☑' : '☐') : 'ABCDEFGH'[i]}</span><span class="opt-text">${mdInline(o.t)}</span></button>
              ${exState.submitted ? html`<div class="opt-why ${o.ok ? 'ok' : (sel ? 'bad' : '')}">${o.ok ? icon('check', 14) : icon('x', 14)} ${mdInline(o.why)}</div>` : ''}`;
          })}
        </div>
        ${exState.submitted ? html`
          <div class="feedback ${exState.correct ? 'ok' : 'bad'}" id="ex-feedback" tabindex="-1" role="status">
            <strong>${exState.correct ? 'Boa análise.' : 'Ainda não — veja o raciocínio abaixo.'}</strong>
            <div class="reasoning"><h3>Raciocínio técnico</h3>${md(ex.explain)}</div>
            <button class="btn small" data-action="ex-retry">${icon('refresh', 14)} Refazer</button>
          </div>`
        : html`<div class="row end"><button class="btn primary" data-action="ex-submit" ${exState.selected.size ? '' : 'disabled'}>Ver análise</button></div>`}
      </section>`;
  }

  function render() {
    const s = ctx.state;
    const ls = s.lessons[L.id] || {};
    const lessons = cat.lessonsByModule.get(m.id);
    const idx = lessons.indexOf(L);
    const next = lessons[idx + 1];
    const related = (L.related || []).map((id) => cat.lessonById.get(id)).filter(Boolean);
    const nextUnread = nextLesson(s, cat, m.id);
    return html`
      <nav class="crumbs" aria-label="Navegação"><a href="#/trilha">Minha Trilha</a> / <a href="#/modulo/${m.id}">${m.title}</a> / <span>Lição ${idx + 1} de ${lessons.length}</span></nav>
      <header class="lesson-head card t-${t.color}">
        <div class="row gap wrap">${trackTag(t)} ${difficulty(m.difficulty)} <span class="tag">${icon('clock', 14)} ${L.minutes} min</span> ${ls.readAt ? html`<span class="tag ok">${icon('check', 14)} lida</span>` : ''}</div>
        <h1 id="page-title" tabindex="-1">${L.title}</h1>
        <div class="objective"><span class="step-n">1</span><div><strong>Objetivo de aprendizagem</strong><p>${L.objective}</p></div></div>
      </header>

      <article class="card step prose" aria-labelledby="h-expl">
        <h2 id="h-expl"><span class="step-n">2</span> Explicação</h2>
        ${md(L.explanation)}
      </article>

      <article class="card step prose" aria-labelledby="h-exm">
        <h2 id="h-exm"><span class="step-n">3</span> Exemplo técnico: ${L.example.title}</h2>
        ${md(L.example.body)}
      </article>

      ${exerciseBlock()}

      <section class="card step" aria-labelledby="h-quiz">
        <h2 id="h-quiz"><span class="step-n">5</span> Quiz de fixação</h2>
        ${runner ? runner.render() : html`
          <p>${(cat.questionsByLesson.get(L.id) || []).length} perguntas sobre esta lição, em ordem aleatória, com explicação após cada resposta.</p>
          <button class="btn primary" data-action="quiz-start">${icon('quiz', 16)} Iniciar quiz</button>`}
      </section>

      <section class="card step" aria-labelledby="h-sum">
        <h2 id="h-sum"><span class="step-n">6</span> Resumo</h2>
        <ul class="summary">${L.summary.map((x) => html`<li>${icon('check', 16)} <span>${mdInline(x)}</span></li>`)}</ul>
      </section>

      <section class="card step" aria-labelledby="h-rel">
        <h2 id="h-rel"><span class="step-n">7</span> Conteúdos relacionados</h2>
        ${related.length ? html`<div class="chips">${related.map((r) => html`<a class="chip" href="#/licao/${r.id}">${icon('book', 14)} ${r.title}</a>`)}</div>` : html`<p class="muted">Sem relacionados.</p>`}
        ${L.docs?.length ? html`<h3>Documentação de referência</h3><ul class="plain">${L.docs.map((d) => html`<li><a href="${d.url}" target="_blank" rel="noopener noreferrer">${icon('external', 14)} ${d.label}</a></li>`)}</ul><p class="tiny muted">Links externos podem mudar com o tempo; requerem internet.</p>` : ''}
      </section>

      <section class="card">
        <h2>${icon('note', 18)} Minhas anotações</h2>
        <label class="sr-only" for="note">Anotações desta lição</label>
        <textarea id="note" rows="4" data-input="note" placeholder="Pontos que quer lembrar, dúvidas, comandos...">${s.notes[L.id] || ''}</textarea>
        <p class="tiny muted">Salvo automaticamente neste navegador.</p>
      </section>

      <section class="card finish" id="after-read" tabindex="-1">
        ${ls.readAt ? html`
          <p>${icon('check', 18)} Leitura registrada. Lembre: ler não é dominar — o domínio é demonstrado no teste do módulo.</p>
          <div class="row gap wrap">
            ${next ? html`<a class="btn primary" href="#/licao/${next.id}">Próxima lição: ${next.title} ${icon('arrow', 16)}</a>` : ''}
            ${!nextUnread ? html`<a class="btn ${next ? '' : 'primary'}" href="#/teste/${m.id}">${icon('award', 16)} Teste de conclusão do módulo</a>` : ''}
            <a class="btn ghost" href="#/hoje">Voltar ao plano de hoje</a>
          </div>`
        : html`
          <p>Terminou de estudar? Registre a leitura para acompanhar o progresso e ativar os flashcards do módulo.</p>
          <button class="btn primary" data-action="mark-read">${icon('check', 16)} Concluir leitura</button>`}
      </section>`;
  }

  return { render, actions: proxyActions, onKey: (e) => runner?.onKey(e) };
}
