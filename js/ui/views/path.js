// Minha Trilha (mapa visual) e página de módulo.
import { html, md, fmtDate, plural } from '../dom.js';
import { icon } from '../icons.js';
import { bar, ring, statusBadge, trackTag, levelTag, difficulty, pageHead, whereBadge } from '../components.js';
import { moduleProgress, moduleStatus, trackProgress, missingPrereqs, PASS_SCORE } from '../../core/progress.js';
import { buildPlan } from '../../core/recommend.js';
import { dueCards } from '../../core/srs.js';
import { computeStreak, levelInfo } from '../../core/gamification.js';
import { activateCards } from '../../core/actions.js';

const STATUS_ICON = { locked: 'lock', available: 'play', in_progress: 'dot', completed: 'check', review: 'review' };

function loadPref(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
function savePref(key, v) { try { localStorage.setItem(key, v); } catch { /* sem armazenamento */ } }

export function pathView(ctx) {
  let filter = loadPref('techpath:pathFilter', 'all');
  const actions = {
    'path-filter': (el) => { filter = el.dataset.arg; savePref('techpath:pathFilter', filter); ctx.rerender(); },
  };

  function hero() {
    const s = ctx.state, today = ctx.today(), cat = ctx.catalog;
    const lv = levelInfo(s.xp.total);
    const { streak } = computeStreak(s.activity, today);
    const due = dueCards(s.cards, today).length;
    const plan = buildPlan(s, cat, today, { skills: ctx.skills });
    const next = plan.tasks.find((t) => t.type !== 'cards') || plan.tasks[0];
    return html`
      <section class="hero card">
        <div class="hero-main">
          ${!s.diagnosticDoneAt ? html`
            <span class="eyebrow">${icon('compass', 16)} Comece por aqui</span>
            <h2>Descubra o que você já domina</h2>
            <p>O diagnóstico tem 2 perguntas por módulo. Módulos em que você acertar tudo podem ser acelerados com o teste de conclusão — sem precisar ler as lições.</p>
            <div class="row gap"><a class="btn primary" href="#/diagnostico">${icon('play', 16)} Fazer diagnóstico (~20 min)</a><a class="btn ghost" href="#/hoje">Ver plano de hoje</a></div>`
          : next ? html`
            <span class="eyebrow">${icon('target', 16)} Próximo passo sugerido</span>
            <h2>${next.title}</h2>
            <p class="muted">${next.reasons[0]}</p>
            <div class="row gap"><a class="btn primary" href="${next.target}">${icon('play', 16)} Começar · ${next.minutes} min</a><a class="btn ghost" href="#/hoje">Plano completo de hoje</a></div>`
          : html`<h2>Tudo em dia</h2><p>Nenhuma tarefa pendente agora. Que tal um laboratório ou uma simulação de entrevista?</p>`}
        </div>
        <div class="hero-stats">
          <div class="stat">${icon('star', 18)}<strong>Nível ${lv.level}</strong><span>${s.xp.total} XP</span></div>
          <div class="stat">${icon('flame', 18)}<strong>${streak}</strong><span>${streak === 1 ? 'dia seguido' : 'dias seguidos'}</span></div>
          <a class="stat link" href="#/revisoes">${icon('review', 18)}<strong>${due}</strong><span>revisões hoje</span></a>
        </div>
      </section>`;
  }

  function trackSection(t) {
    const s = ctx.state, cat = ctx.catalog, today = ctx.today();
    const tp = trackProgress(s, cat, t.id);
    const mods = cat.modulesByTrack.get(t.id) || [];
    return html`
      <section class="track t-${t.color}" aria-labelledby="tr-${t.id}">
        <header class="track-head">
          <div>
            <h2 id="tr-${t.id}"><span class="track-letter">${t.id}</span> ${t.title}</h2>
            <p class="muted small">${t.desc}</p>
          </div>
          <div class="track-meta">
            <span class="tag">${t.priority}</span>
            <span class="small">${tp.demonstrated}/${tp.total} demonstrados · ${tp.percent}%</span>
            ${bar(tp.percent, { label: `Progresso da trilha ${t.title}`, tone: `t-${t.color}` })}
          </div>
        </header>
        <ol class="path">
          ${mods.map((m, i) => {
            const st = moduleStatus(s, cat, m.id, today);
            const p = moduleProgress(s, cat, m.id);
            return html`
              <li class="node st-${st} ${i % 2 ? 'alt' : ''}">
                <a class="node-link" href="#/modulo/${m.id}" aria-label="${m.title} — ${p.percent}%">
                  <span class="node-orb">${ring(p.percent, 64)}<span class="node-icon">${icon(STATUS_ICON[st], 22)}</span></span>
                  <span class="node-info">
                    <span class="node-title">${m.title}</span>
                    <span class="node-meta">${statusBadge(st)} ${m.level !== 'fundamental' ? levelTag(m.level) : ''} <span class="tiny muted">${m.hours} h · ${p.percent}%</span></span>
                    ${p.weak ? html`<span class="tiny warn-text">${icon('info', 12)} dificuldade recente — reforço sugerido</span>` : ''}
                  </span>
                </a>
              </li>`;
          })}
        </ol>
      </section>`;
  }

  function render() {
    const tracks = ctx.catalog.tracks;
    const shown = filter === 'all' ? tracks : tracks.filter((t) => t.id === filter);
    return html`
      ${pageHead('Minha Trilha', 'Módulos organizados por assunto. Nenhum conteúdo fica bloqueado de verdade: o cadeado apenas indica que há pré-requisitos recomendados.')}
      ${hero()}
      <div class="chips" role="group" aria-label="Filtrar por trilha">
        <button class="chip ${filter === 'all' ? 'active' : ''}" data-action="path-filter" data-arg="all" aria-pressed="${filter === 'all'}">Todas</button>
        ${tracks.map((t) => html`<button class="chip t-${t.color} ${filter === t.id ? 'active' : ''}" data-action="path-filter" data-arg="${t.id}" aria-pressed="${filter === t.id}">${t.id} · ${t.short}</button>`)}
      </div>
      ${shown.map(trackSection)}
      <p class="legend tiny muted">${icon('lock', 12)} pré-requisito recomendado · ${icon('play', 12)} disponível · ${icon('dot', 12)} em andamento · ${icon('check', 12)} domínio demonstrado · ${icon('review', 12)} revisão pendente</p>`;
  }

  return { render, actions };
}

export function moduleView(ctx, moduleId) {
  const cat = ctx.catalog;
  const m = cat.moduleById.get(moduleId);
  if (!m) return { render: () => html`<div class="card"><h1>Módulo não encontrado</h1><a href="#/trilha">Voltar</a></div>`, actions: {} };
  const t = cat.trackById.get(m.track);

  const actions = {
    'activate-cards': () => {
      const n = ctx.commit((s) => activateCards(s, cat, m.id, ctx.today(), 0));
      ctx.toast(n ? `${n} flashcards adicionados às revisões de hoje.` : 'Os flashcards deste módulo já estão ativos.', 'ok');
      ctx.rerender();
    },
  };

  function render() {
    const s = ctx.state, today = ctx.today();
    const st = moduleStatus(s, cat, m.id, today);
    const p = moduleProgress(s, cat, m.id);
    const ms = s.moduleStats[m.id];
    const lessons = cat.lessonsByModule.get(m.id) || [];
    const missing = missingPrereqs(s, cat, m.id).map((id) => cat.moduleById.get(id));
    const cards = cat.cardsByModule.get(m.id) || [];
    const activeCards = cards.filter((c) => s.cards[c.id]).length;
    const labs = cat.labs.filter((l) => l.modules.includes(m.id));
    const accPct = p.accuracy === null ? '—' : `${Math.round(p.accuracy * 100)}%`;
    const review = ms?.review;
    return html`
      <nav class="crumbs" aria-label="Navegação"><a href="#/trilha">${icon('back', 14)} Minha Trilha</a> / <span>${t.title}</span></nav>
      <header class="module-head card t-${t.color}">
        <div class="row gap wrap">${trackTag(t)} ${levelTag(m.level)} ${difficulty(m.difficulty)} ${statusBadge(st)} <span class="tag">${icon('clock', 14)} ~${m.hours} h</span></div>
        <h1 id="page-title" tabindex="-1">${m.title}</h1>
        <p>${m.desc}</p>
        ${bar(p.percent, { label: 'Progresso do módulo', tone: `t-${t.color}` })}
        <p class="tiny muted">Progresso ${p.percent}% = 35% leitura + 25% prática + 40% domínio demonstrado em teste.</p>
      </header>

      ${missing.length ? html`<div class="notice">${icon('lock', 18)} <div>Recomendado antes: ${missing.map((x) => html`<a href="#/modulo/${x.id}">${x.title}</a> `)}. Você pode estudar ou testar este módulo mesmo assim.</div></div>` : ''}
      ${p.weak ? html`<div class="notice warn">${icon('info', 18)} <div>Acerto recente de ${accPct} neste módulo. Sugestão: <a href="#/praticar/modulo/${m.id}">praticar com explicações</a> e reler a lição correspondente antes de avançar.</div></div>` : ''}

      <section class="dims" aria-label="Situação do conhecimento">
        <div class="dim ${p.studied ? 'on' : ''}">${icon('book', 18)}<strong>Estudado</strong><span>${p.lessonsRead}/${p.lessonsTotal} lições lidas</span></div>
        <div class="dim ${p.practiced ? 'on' : ''}">${icon('practice', 18)}<strong>Praticado</strong><span>${p.exercisesDone}/${p.exercisesTotal} exercícios · ${p.questionsAnswered}/${p.questionsTotal} perguntas · acerto ${accPct}</span></div>
        <div class="dim ${p.demonstrated ? 'on' : ''}">${icon('award', 18)}<strong>Demonstrado</strong><span>${p.demonstrated ? `Aprovado em ${fmtDate(ms.testPassedAt)}` : `Melhor teste: ${Math.round(p.testBest * 100)}% (mín. ${Math.round(PASS_SCORE * 100)}%)`}</span></div>
        <div class="dim ${st === 'review' ? 'warn' : ''}">${icon('review', 18)}<strong>Revisão</strong><span>${review ? (review.due <= today ? 'Pendente hoje' : `Próxima em ${fmtDate(review.due)}`) : 'Agendada após o teste'}</span></div>
      </section>

      <div class="grid-2">
        <section class="card">
          <h2>Por que importa</h2>
          <p>${m.why}</p>
          <h3>Cargos em que é usado</h3>
          <div class="chips">${m.roles.map((r) => html`<span class="chip static">${r}</span>`)}</div>
          <h3>Ao final, você deve conseguir</h3>
          <ul>${m.outcomes.map((o) => html`<li>${o}</li>`)}</ul>
          <h3>Como demonstrar domínio na prática</h3>
          <p>${m.demonstrate}</p>
          <h3>Conhecimentos anteriores</h3>
          <p>${(m.prereqs || []).length ? (m.prereqs || []).map((id) => html`<a class="chip" href="#/modulo/${id}">${cat.moduleById.get(id).title}</a> `) : 'Nenhum pré-requisito formal.'}</p>
          ${ms?.diagnostic ? html`<p class="small muted">Diagnóstico: ${Math.round(ms.diagnostic.score * 100)}% em ${ms.diagnostic.total} pergunta(s) (${fmtDate(ms.diagnostic.date)}).</p>` : ''}
        </section>

        <section class="card">
          <h2>Lições</h2>
          <ol class="lesson-list">
            ${lessons.map((l) => {
              const ls = s.lessons[l.id] || {};
              return html`<li class="${ls.readAt ? 'done' : ''}">
                <a href="#/licao/${l.id}">
                  <span class="li-ic">${icon(ls.readAt ? 'check' : 'book', 18)}</span>
                  <span><strong>${l.title}</strong><span class="tiny muted">${l.minutes} min ${ls.readAt ? '· lida' : ''} ${ls.exerciseDone ? (ls.exerciseCorrect ? '· exercício ✓' : '· exercício feito') : ''}</span></span>
                </a></li>`;
            })}
          </ol>
          <h2>Praticar e demonstrar</h2>
          <div class="stack">
            <a class="btn" href="#/praticar/modulo/${m.id}">${icon('quiz', 16)} Praticar com perguntas</a>
            <a class="btn primary" href="#/teste/${m.id}">${icon('award', 16)} ${p.demonstrated ? 'Refazer teste de conclusão' : 'Teste de conclusão'}</a>
            ${p.demonstrated ? html`<a class="btn" href="#/revisar-modulo/${m.id}">${icon('review', 16)} Revisão rápida do módulo</a>` : ''}
            <button class="btn ghost" data-action="activate-cards">${icon('cards', 16)} Flashcards: ${activeCards}/${cards.length} ativos ${activeCards < cards.length ? '· ativar agora' : ''}</button>
          </div>
          ${labs.length ? html`<h2>Laboratórios</h2><ul class="plain">${labs.map((l) => html`<li><a href="#/lab/${l.id}">${icon('flask', 16)} ${l.title}</a> ${s.labs[l.id]?.completedAt ? html`<span class="tag ok">concluído</span>` : ''}<div>${whereBadge(l.where)}</div></li>`)}</ul>` : ''}
        </section>
      </div>
      <p class="tiny muted">${plural(lessons.length, 'lição', 'lições')} · ${plural((cat.questionsByModule.get(m.id) || []).length, 'pergunta', 'perguntas')} no banco · ${plural(cards.length, 'flashcard', 'flashcards')}</p>
    `;
  }
  void md;
  return { render, actions };
}
