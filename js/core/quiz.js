// Montagem, correção e registro de quizzes.
import { shuffle } from './util.js';
import { ensureModuleStats, recordActivity, MAX_ATTEMPTS } from './state.js';
import { award, XP } from './gamification.js';
import { PASS_SCORE, RECENT_WINDOW } from './progress.js';
import { scheduleModuleReview } from './srs.js';

/**
 * Seleciona perguntas e embaralha a ordem das perguntas e das alternativas.
 * Prioriza perguntas nunca vistas e as que o usuário errou por último.
 * Se `progressive`, ordena por dificuldade crescente após o sorteio.
 */
export function buildQuiz(pool, { count = 5, state = null, rnd = Math.random, progressive = true } = {}) {
  const weight = (q) => {
    const st = state?.qstats?.[q.id];
    if (!st) return 2;            // nunca vista
    if (st.last === 0) return 3;  // errou na última vez
    return 1;
  };
  const shuffled = shuffle(pool, rnd);
  const sorted = shuffled.sort((a, b) => weight(b) - weight(a));
  let picked = sorted.slice(0, Math.min(count, pool.length));
  picked = shuffle(picked, rnd);
  if (progressive) picked.sort((a, b) => (a.difficulty || 1) - (b.difficulty || 1));
  return picked.map((q) => ({ qid: q.id, order: shuffle(q.options.map((_, i) => i), rnd) }));
}

/** Corrige: `chosen` é o índice ORIGINAL da alternativa escolhida. */
export function isCorrect(question, chosen) {
  return question.answer === chosen;
}

/**
 * Registra o resultado de um quiz no estado.
 * kind: 'lesson' | 'practice' | 'test' | 'review' | 'diagnostic'
 * answers: [{ qid, chosen }]
 */
export function recordQuiz(state, catalog, { kind, moduleId = null, lessonId = null, answers }, today) {
  let correct = 0;
  let xp = 0;
  const wrong = [];
  const perModule = {};
  for (const a of answers) {
    const q = catalog.questionById.get(a.qid);
    if (!q) continue;
    const ok = isCorrect(q, a.chosen);
    if (ok) correct++; else wrong.push(q.id);
    const st = state.qstats[q.id] || (state.qstats[q.id] = { seen: 0, correct: 0, last: null, lastDate: null });
    st.seen++; if (ok) st.correct++; st.last = ok ? 1 : 0; st.lastDate = today;
    const ms = ensureModuleStats(state, q.moduleId);
    ms.recent.push(ok ? 1 : 0);
    if (ms.recent.length > RECENT_WINDOW) ms.recent = ms.recent.slice(-RECENT_WINDOW);
    (perModule[q.moduleId] ||= { c: 0, t: 0 }).t++;
    if (ok) { perModule[q.moduleId].c++; xp += award(state, `q:${q.id}`, XP.questionFirstCorrect, today); }
  }
  const total = answers.length;
  const score = total ? correct / total : 0;
  const passed = score >= PASS_SCORE;
  let firstPass = false;

  if (kind === 'test' && moduleId) {
    const ms = ensureModuleStats(state, moduleId);
    ms.testLast = score;
    ms.testBest = Math.max(ms.testBest, score);
    if (passed) {
      if (!ms.testPassedAt) { ms.testPassedAt = today; firstPass = true; ms.review = scheduleModuleReview(null, true, today); }
      xp += award(state, `test:${moduleId}`, XP.moduleTestPassed, today);
    }
  }
  if (kind === 'review' && moduleId) {
    const ms = ensureModuleStats(state, moduleId);
    ms.review = scheduleModuleReview(ms.review, passed, today);
    if (passed) xp += award(state, `review:${moduleId}:${today}`, XP.moduleReviewPassed, today);
  }
  if (kind === 'diagnostic') {
    for (const [mid, r] of Object.entries(perModule)) {
      ensureModuleStats(state, mid).diagnostic = { score: r.c / r.t, total: r.t, date: today };
    }
    state.diagnosticDoneAt = today;
    xp += award(state, 'diagnostic', XP.diagnostic, today);
  }

  const attempt = { date: today, ts: Date.now(), kind, moduleId, lessonId, total, correct, wrong, perModule };
  state.attempts.push(attempt);
  if (state.attempts.length > MAX_ATTEMPTS) state.attempts = state.attempts.slice(-MAX_ATTEMPTS);
  recordActivity(state, today, Math.max(1, Math.round(total * 1.2)));
  return { correct, total, score, passed, firstPass, xp, wrong, perModule };
}

/** Taxa de acerto por módulo a partir das estatísticas de cada pergunta (histórico completo). */
export function accuracyByModule(state, catalog) {
  const out = {};
  for (const [qid, st] of Object.entries(state.qstats)) {
    const q = catalog.questionById.get(qid);
    if (!q) continue;
    const o = (out[q.moduleId] ||= { seen: 0, correct: 0 });
    o.seen += st.seen; o.correct += st.correct;
  }
  return out;
}
