// Cálculo de progresso, pré-requisitos e estado de cada módulo.
//
// Quatro dimensões independentes (ler NÃO significa dominar):
//   estudado     → todas as lições do módulo foram lidas
//   praticado    → exercícios das lições feitos e/ou perguntas respondidas
//   demonstrado  → teste de conclusão aprovado (≥ PASS_SCORE)
//   revisão      → módulo demonstrado com revisão vencida, OU desempenho recente fraco
//
// Progresso (%) = 35% leitura + 25% prática + 40% demonstração.
// Pré-requisito atendido = módulo pré-requisito demonstrado OU todas as suas lições lidas.
// "Bloqueado" é apenas um aviso: o conteúdo continua acessível.

export const PASS_SCORE = 0.75;
export const WEAK_ACCURACY = 0.6;
export const WEAK_MIN_ANSWERS = 4;
export const RECENT_WINDOW = 20;

export function lessonsRead(state, catalog, moduleId) {
  const ls = catalog.lessonsByModule.get(moduleId) || [];
  return { read: ls.filter((l) => state.lessons[l.id]?.readAt).length, total: ls.length };
}

export function exercisesDone(state, catalog, moduleId) {
  const ls = (catalog.lessonsByModule.get(moduleId) || []).filter((l) => l.exercise);
  return { done: ls.filter((l) => state.lessons[l.id]?.exerciseDone).length, total: ls.length };
}

export function moduleAccuracy(state, moduleId) {
  const r = state.moduleStats[moduleId]?.recent || [];
  if (!r.length) return null;
  return r.reduce((a, b) => a + b, 0) / r.length;
}

export function isDemonstrated(state, moduleId) {
  return !!state.moduleStats[moduleId]?.testPassedAt;
}

export function isStudied(state, catalog, moduleId) {
  const { read, total } = lessonsRead(state, catalog, moduleId);
  return total > 0 && read === total;
}

export function prereqsMet(state, catalog, moduleId) {
  const m = catalog.moduleById.get(moduleId);
  return (m.prereqs || []).every((p) => isDemonstrated(state, p) || isStudied(state, catalog, p));
}

export function missingPrereqs(state, catalog, moduleId) {
  const m = catalog.moduleById.get(moduleId);
  return (m.prereqs || []).filter((p) => !(isDemonstrated(state, p) || isStudied(state, catalog, p)));
}

/** Fraqueza: acerto recente < 60% com ≥ 4 respostas, ou último teste reprovado sem aprovação posterior. */
export function isWeak(state, moduleId) {
  const ms = state.moduleStats[moduleId];
  if (!ms) return false;
  const acc = moduleAccuracy(state, moduleId);
  if (ms.recent.length >= WEAK_MIN_ANSWERS && acc < WEAK_ACCURACY) return true;
  if (ms.testLast !== null && ms.testLast < PASS_SCORE && !ms.testPassedAt) return true;
  return false;
}

export function reviewDue(state, moduleId, today) {
  const rv = state.moduleStats[moduleId]?.review;
  return !!(rv && rv.due <= today);
}

export function practiceCount(state, catalog, moduleId) {
  const qs = catalog.questionsByModule.get(moduleId) || [];
  return qs.filter((q) => state.qstats[q.id]?.seen).length;
}

export function moduleProgress(state, catalog, moduleId) {
  const lr = lessonsRead(state, catalog, moduleId);
  const ex = exercisesDone(state, catalog, moduleId);
  const qs = catalog.questionsByModule.get(moduleId) || [];
  const answered = practiceCount(state, catalog, moduleId);
  const readPart = lr.total ? lr.read / lr.total : 0;
  // prática: metade exercícios das lições, metade cobertura do banco de perguntas (até 60% do banco)
  const exPart = ex.total ? ex.done / ex.total : 0;
  const qPart = qs.length ? Math.min(1, answered / (qs.length * 0.6)) : 0;
  const practicePart = (exPart + qPart) / 2;
  const ms = state.moduleStats[moduleId];
  const demoPart = ms?.testPassedAt ? 1 : Math.min(0.5, (ms?.testBest || 0) / PASS_SCORE * 0.5);
  const percent = Math.round((readPart * 0.35 + practicePart * 0.25 + demoPart * 0.4) * 100);
  return {
    percent,
    lessonsRead: lr.read, lessonsTotal: lr.total,
    exercisesDone: ex.done, exercisesTotal: ex.total,
    questionsAnswered: answered, questionsTotal: qs.length,
    accuracy: moduleAccuracy(state, moduleId),
    studied: lr.total > 0 && lr.read === lr.total,
    practiced: ex.done > 0 || answered > 0,
    demonstrated: !!ms?.testPassedAt,
    testBest: ms?.testBest || 0,
    weak: isWeak(state, moduleId),
  };
}

/** 'locked' | 'available' | 'in_progress' | 'completed' | 'review' */
export function moduleStatus(state, catalog, moduleId, today) {
  const p = moduleProgress(state, catalog, moduleId);
  if (p.demonstrated) return reviewDue(state, moduleId, today) || p.weak ? 'review' : 'completed';
  const started = p.lessonsRead > 0 || p.practiced || (state.moduleStats[moduleId]?.testLast ?? null) !== null;
  if (started) return 'in_progress';
  return prereqsMet(state, catalog, moduleId) ? 'available' : 'locked';
}

export const STATUS_LABELS = {
  locked: 'Bloqueado', available: 'Disponível', in_progress: 'Em andamento', completed: 'Concluído', review: 'Revisão pendente',
};

export function trackProgress(state, catalog, trackId) {
  const ms = catalog.modulesByTrack.get(trackId) || [];
  if (!ms.length) return { percent: 0, demonstrated: 0, total: 0 };
  const sum = ms.reduce((a, m) => a + moduleProgress(state, catalog, m.id).percent, 0);
  return {
    percent: Math.round(sum / ms.length),
    demonstrated: ms.filter((m) => isDemonstrated(state, m.id)).length,
    total: ms.length,
  };
}

/** Próxima lição não lida do módulo (ordem definida nos dados). */
export function nextLesson(state, catalog, moduleId) {
  return (catalog.lessonsByModule.get(moduleId) || []).find((l) => !state.lessons[l.id]?.readAt) || null;
}

export function currentModule(state, catalog) {
  const pinned = catalog.moduleById.get(state.focusModuleId);
  if (pinned) return pinned;
  const recent = Object.entries(state.lessons)
    .filter(([id, entry]) => entry.readAt && catalog.lessonById.has(id))
    .reverse()
    .sort((a, b) => b[1].readAt.localeCompare(a[1].readAt))[0];
  return recent ? catalog.moduleById.get(catalog.lessonById.get(recent[0]).moduleId) : null;
}

export function moduleNextStep(state, catalog, moduleId) {
  const lesson = nextLesson(state, catalog, moduleId);
  if (lesson && !isDemonstrated(state, moduleId)) return { href: `#/licao/${lesson.id}`, label: lesson.title };

  const labs = catalog.labs.filter((lab) => lab.modules.includes(moduleId));
  if (!labs.some((lab) => state.labs[lab.id]?.completedAt)) {
    const lab = labs.find((item) => item.practiceOnly && item.modules.length === 1) || labs[0];
    if (lab) return { href: `#/lab/${lab.id}`, label: lab.title };
  }
  if (!isDemonstrated(state, moduleId)) return { href: `#/teste/${moduleId}`, label: 'Teste de conclusão' };
  return { href: `#/modulo/${moduleId}`, label: 'Ver práticas e revisões do módulo' };
}
