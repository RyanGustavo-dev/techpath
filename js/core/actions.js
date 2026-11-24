// Ações de domínio que alteram o estado. Puras em relação ao DOM (testáveis em Node).
import { recordActivity } from './state.js';
import { award, awardCapped, XP } from './gamification.js';
import { schedule, newCardState } from './srs.js';
import { addDays, weekKey } from './util.js';

/** Ativa os flashcards de um módulo (entram na fila a partir de `due`). Não altera cartões já ativos. */
export function activateCards(state, catalog, moduleId, today, delayDays = 1) {
  let n = 0;
  for (const c of catalog.cardsByModule.get(moduleId) || []) {
    if (!state.cards[c.id]) {
      state.cards[c.id] = { ...newCardState(), due: addDays(today, delayDays) };
      n++;
    }
  }
  return n;
}

export function markLessonRead(state, catalog, lessonId, today) {
  const lesson = catalog.lessonById.get(lessonId);
  if (!lesson) throw new Error(`Lição inexistente: ${lessonId}`);
  const l = state.lessons[lessonId] || (state.lessons[lessonId] = {});
  const first = !l.readAt;
  if (first) {
    l.readAt = today;
    recordActivity(state, today, lesson.minutes);
  }
  const xp = award(state, `lesson:${lessonId}`, XP.lessonRead, today);
  const cards = activateCards(state, catalog, lesson.moduleId, today);
  return { first, xp, cards };
}

/** Registra o exercício prático da lição. XP: completo na 1ª tentativa correta; parcial por tentar. */
export function recordExercise(state, catalog, lessonId, correct, today) {
  const l = state.lessons[lessonId] || (state.lessons[lessonId] = {});
  const firstAttempt = !l.exerciseDone;
  l.exerciseDone = true;
  l.exerciseCorrect = l.exerciseCorrect || correct;
  l.exerciseAttempts = (l.exerciseAttempts || 0) + 1;
  if (firstAttempt) l.exerciseFirstCorrect = correct;
  recordActivity(state, today, 3);
  let xp = award(state, `exercise-try:${lessonId}`, XP.exerciseAttempt, today);
  if (correct) xp += award(state, `exercise:${lessonId}`, XP.exerciseCorrect, today);
  return { xp };
}

export function reviewCard(state, cardId, rating, today) {
  const next = schedule(state.cards[cardId], rating, today);
  state.cards[cardId] = next;
  recordActivity(state, today, 0.5);
  const xp = awardCapped(state, `cards:${today}`, XP.flashcard, XP.flashcardDailyCap, today);
  return { card: next, xp };
}

export function completeLab(state, labId, { selfRating, notes = '' }, today) {
  const lab = state.labs[labId] || (state.labs[labId] = { stages: {}, checks: [] });
  lab.completedAt = lab.completedAt || today;
  lab.selfRating = selfRating;
  lab.notes = notes;
  recordActivity(state, today, 10);
  return { xp: award(state, `lab:${labId}`, XP.labCompleted, today) };
}

export function saveInterviewAnswer(state, qid, { answer, checked, selfScore }, today) {
  const it = state.interviews[qid] || (state.interviews[qid] = { answer: '', checked: [], selfScore: null });
  if (answer !== undefined) it.answer = answer;
  if (checked !== undefined) it.checked = checked;
  if (selfScore !== undefined) it.selfScore = selfScore;
  it.updatedAt = today;
  let xp = 0;
  if ((it.answer || '').trim().length >= 40) {
    xp = award(state, `interview:${qid}`, XP.interviewAnswered, today);
    if (xp) recordActivity(state, today, 10);
  }
  return { xp };
}

export function saveApplicationsWeek(state, wk, data, today) {
  const w = state.applications.weeks[wk] || (state.applications.weeks[wk] = { sent: 0, types: {}, responses: 0, interviews: 0, notes: '' });
  const clean = (n) => Math.max(0, Math.min(999, Math.floor(Number(n) || 0)));
  if (data.sent !== undefined) w.sent = clean(data.sent);
  if (data.responses !== undefined) w.responses = clean(data.responses);
  if (data.interviews !== undefined) w.interviews = clean(data.interviews);
  if (data.types) w.types = Object.fromEntries(Object.entries(data.types).map(([k, v]) => [k, clean(v)]).filter(([, v]) => v > 0));
  if (data.notes !== undefined) w.notes = String(data.notes).slice(0, 2000);
  w.updatedAt = today;
  const xp = w.sent > 0 ? award(state, `apps:${wk}`, XP.applicationsWeekLogged, today) : 0;
  return { xp, week: w };
}

export function currentWeek(today) {
  return weekKey(today);
}
