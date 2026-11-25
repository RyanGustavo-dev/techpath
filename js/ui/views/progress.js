// Minha Evolução: estatísticas, conhecimento por módulo, histórico, dificuldades e conquistas.
import { html, fmtDate } from '../dom.js';
import { icon } from '../icons.js';
import { pageHead, bar, stat } from '../components.js';
import { moduleProgress, moduleStatus, trackProgress, STATUS_LABELS } from '../../core/progress.js';
import { computeStreak, bestStreak, totalStudyDays, levelInfo, ACHIEVEMENTS } from '../../core/gamification.js';
import { addDays } from '../../core/util.js';

const KIND = { lesson: 'Quiz de lição', practice: 'Prática', test: 'Teste de conclusão', review: 'Revisão de módulo', diagnostic: 'Diagnóstico' };

export function progressView(ctx) {
  const cat = ctx.catalog;
  function render() {
    const s = ctx.state, today = ctx.today();
    const lv = levelInfo(s.xp.total);
    const { streak } = computeStreak(s.activity, today);
    const minutes = Math.round(Object.values(s.activity).reduce((a, d) => a + d.minutes, 0));
    const read = Object.values(s.lessons).filter((l) => l.readAt).length;
    const demo = cat.modules.filter((m) => s.moduleStats[m.id]?.testPassedAt).length;
    // mapa de atividade: 12 semanas, começando na segunda-feira
    const start = addDays(today, -83 - ((new Date(`${today}T12:00:00`).getDay() + 6) % 7));
    const days = [...Array(84 + ((new Date(`${today}T12:00:00`).getDay() + 6) % 7) + 1)].map((_, i) => addDays(start, i));
    const lvl = (d) => { const m = s.activity[d]?.actions ? s.activity[d].minutes : -1; return m < 0 ? 0 : m < 20 ? 1 : m < 45 ? 2 : m < 80 ? 3 : 4; };
    const attempts = s.attempts.slice(-15).reverse();
    const weak = cat.modules.filter((m) => moduleProgress(s, cat, m.id).weak);
    const missed = Object.entries(s.qstats).filter(([, q]) => q.seen >= 2 && q.correct / q.seen < 0.5).map(([id, q]) => ({ q: cat.questionById.get(id), st: q })).filter((x) => x.q).slice(0, 8);

    return html`
      ${pageHead('Minha Evolução', 'XP e sequência medem constância. Conhecimento é medido separadamente: lido, praticado, demonstrado em teste e retido nas revisões.')}
      <section class="stats-grid">
        ${stat(`Nível ${lv.level}`, `${s.xp.total} XP`, 'star')}
        ${stat(streak, 'dias seguidos', 'flame')}
        ${stat(bestStreak(s.activity), 'melhor sequência', 'award')}
        ${stat(totalStudyDays(s.activity), 'dias com estudo', 'today')}
        ${stat(`${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`, 'tempo estimado', 'clock')}
        ${stat(`${read}/${cat.lessons.length}`, 'lições lidas', 'book')}
        ${stat(`${demo}/${cat.modules.length}`, 'módulos demonstrados', 'shield')}
        ${stat(Object.values(s.labs).filter((l) => l.completedAt).length, 'laboratórios', 'flask')}
      </section>

      <section class="card">
        <h2 class="h-small">Atividade (últimas 12 semanas)</h2>
        <div class="heat" role="img" aria-label="Mapa de dias estudados">${days.map((d) => html`<span class="h${lvl(d)} ${d > today ? 'future' : ''}" title="${fmtDate(d)}: ${Math.round(s.activity[d]?.minutes || 0)} min"></span>`)}</div>
        <p class="tiny muted">Cada quadrado é um dia (colunas = semanas). Mais escuro = mais minutos estimados. Faltar um dia não apaga nada; a sequência tolera 1 dia de descanso por semana.</p>
      </section>

      <section class="card">
        <h2 class="h-small">Evolução por trilha</h2>
        ${cat.tracks.map((t) => { const tp = trackProgress(s, cat, t.id); return html`<div class="track-row t-${t.color}"><span><strong>${t.id}</strong> ${t.title}</span>${bar(tp.percent, { label: t.title, tone: `t-${t.color}` })}<span class="small">${tp.percent}% · ${tp.demonstrated}/${tp.total}</span></div>`; })}
      </section>

      <section class="card">
        <h2 class="h-small">Conhecimento por módulo</h2>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Módulo</th><th>Estudado</th><th>Praticado</th><th>Acerto recente</th><th>Demonstrado</th><th>Estado</th></tr></thead>
          <tbody>${cat.modules.map((m) => {
            const p = moduleProgress(s, cat, m.id); const st = moduleStatus(s, cat, m.id, today);
            return html`<tr>
              <td><a href="#/modulo/${m.id}">${m.title}</a></td>
              <td>${p.lessonsRead}/${p.lessonsTotal}</td>
              <td>${p.questionsAnswered} perg.</td>
              <td class="${p.weak ? 'warn-text' : ''}">${p.accuracy === null ? '—' : `${Math.round(p.accuracy * 100)}%`}</td>
              <td>${p.demonstrated ? icon('check', 16, 'sim') : `${Math.round(p.testBest * 100)}%`}</td>
              <td><span class="badge st-${st}">${STATUS_LABELS[st]}</span></td></tr>`;
          })}</tbody>
        </table></div>
      </section>

      <div class="grid-2">
        <section class="card">
          <h2 class="h-small">Dificuldades identificadas</h2>
          ${weak.length ? html`<ul class="plain">${weak.map((m) => html`<li>${icon('target', 14)} <a href="#/praticar/modulo/${m.id}">${m.title}</a></li>`)}</ul>` : html`<p class="muted small">Nenhum módulo com acerto recente abaixo de 60%.</p>`}
          ${missed.length ? html`<h3>Perguntas que mais erra</h3><ul class="plain small">${missed.map((x) => html`<li>${x.q.prompt.replace(/[`*]/g, '').slice(0, 90)}… <span class="tag warn">${x.st.correct}/${x.st.seen}</span></li>`)}</ul>` : ''}
        </section>
        <section class="card">
          <h2 class="h-small">Histórico de tentativas</h2>
          ${attempts.length ? html`<ul class="attempts">${attempts.map((a) => html`
            <li><span class="tiny muted">${fmtDate(a.date)}</span>
              <span>${KIND[a.kind]}${a.moduleId ? ` · ${cat.moduleById.get(a.moduleId)?.title}` : ''}</span>
              <span class="tag ${a.correct / a.total >= 0.75 ? 'ok' : ''}">${a.correct}/${a.total}</span>
              ${Array.isArray(a.caseNotes) && a.caseNotes.length ? html`
                <details class="attempt-notes">
                  <summary>Ver raciocínio registrado</summary>
                  ${a.caseNotes.map((note) => {
                    const question = cat.questionById.get(note?.qid);
                    return question ? html`<p><strong>${question.prompt}</strong></p><p>${note.reasoning}</p><p><strong>Referência</strong> ${question.explain}</p>` : '';
                  })}
                </details>` : ''}
            </li>`)}</ul>` : html`<p class="muted small">Nenhum quiz ainda.</p>`}
        </section>
      </div>

      <section class="card">
        <h2 class="h-small">Conquistas (${Object.keys(s.achievements).length}/${ACHIEVEMENTS.length})</h2>
        <ul class="ach-grid">${ACHIEVEMENTS.map((a) => { const got = s.achievements[a.id]; return html`<li class="ach ${got ? 'got' : ''}">${icon(a.icon, 22)}<strong>${a.title}</strong><span class="tiny">${a.desc}</span>${got ? html`<span class="tiny muted">${fmtDate(got)}</span>` : ''}</li>`; })}</ul>
      </section>`;
  }
  return { render, actions: {} };
}
