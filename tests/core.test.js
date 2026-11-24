// Testes das regras principais. Executar: npm test  (ou: node --test tests/)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState } from '../js/core/state.js';
import { buildCatalog } from '../js/core/catalog.js';
import { moduleProgress, moduleStatus, prereqsMet, isWeak, PASS_SCORE } from '../js/core/progress.js';
import { schedule, dueCards, previewIntervals, scheduleModuleReview, INTERVALS } from '../js/core/srs.js';
import { buildQuiz, recordQuiz } from '../js/core/quiz.js';
import { buildPlan, isTaskDone, daysAway } from '../js/core/recommend.js';
import { award, awardCapped, levelInfo, computeStreak, XP } from '../js/core/gamification.js';
import { markLessonRead, recordExercise, reviewCard, saveApplicationsWeek } from '../js/core/actions.js';
import { exportBackup, parseBackup, createStore, memoryAdapter, validateState, STORAGE_KEY } from '../js/core/storage.js';
import { addDays, seededRandom, weekKey } from '../js/core/util.js';
import { catalog as realCatalog } from '../js/data/index.js';

const T = '2026-11-24'; // terça-feira

// Catálogo mínimo e controlado para testes de regra
function miniCatalog() {
  const q = (id, moduleId, lessonId, d = 1) => ({ id, moduleId, lessonId, difficulty: d, prompt: id, options: ['certa', 'errada'], answer: 0, explain: '' });
  return buildCatalog({
    tracks: [{ id: 'A', title: 'A' }, { id: 'D', title: 'D' }],
    modules: [
      { id: 'm1', track: 'A', title: 'JOIN', level: 'fundamental', prereqs: [] },
      { id: 'm2', track: 'A', title: 'GROUP BY', level: 'fundamental', prereqs: ['m1'] },
      { id: 'm3', track: 'A', title: 'Índices', level: 'complementar', prereqs: ['m2'] },
      { id: 'd1', track: 'D', title: 'Python', level: 'fundamental', prereqs: [] },
    ],
    lessons: [
      { id: 'm1-l1', moduleId: 'm1', title: 'L1', minutes: 20, exercise: {} },
      { id: 'm1-l2', moduleId: 'm1', title: 'L2', minutes: 20, exercise: {} },
      { id: 'm2-l1', moduleId: 'm2', title: 'L3', minutes: 25, exercise: {} },
      { id: 'm3-l1', moduleId: 'm3', title: 'L4', minutes: 25, exercise: {} },
      { id: 'd1-l1', moduleId: 'd1', title: 'L5', minutes: 30, exercise: {} },
    ],
    questions: [
      q('m1-q1', 'm1', 'm1-l1'), q('m1-q2', 'm1', 'm1-l1'), q('m1-q3', 'm1', 'm1-l2'), q('m1-q4', 'm1', 'm1-l2'),
      q('m2-q1', 'm2', 'm2-l1'), q('m2-q2', 'm2', 'm2-l1'), q('m2-q3', 'm2', 'm2-l1'), q('m2-q4', 'm2', 'm2-l1'),
      q('m3-q1', 'm3', 'm3-l1'), q('d1-q1', 'd1', 'd1-l1'),
    ],
    flashcards: [
      { id: 'c1', moduleId: 'm1', q: '?', a: '!' }, { id: 'c2', moduleId: 'm1', q: '?', a: '!' }, { id: 'c3', moduleId: 'm2', q: '?', a: '!' },
    ],
    labs: [{ id: 'lab1', title: 'Lab', modules: ['m1'], minutes: 30 }],
    interviews: [],
  });
}

const answersFor = (ids, correctCount) => ids.map((qid, i) => ({ qid, chosen: i < correctCount ? 0 : 1 }));

// ---------------- Progresso e pré-requisitos ----------------
test('progresso começa em zero e leitura não equivale a domínio', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  assert.equal(moduleProgress(s, cat, 'm1').percent, 0);
  markLessonRead(s, cat, 'm1-l1', T); markLessonRead(s, cat, 'm1-l2', T);
  const p = moduleProgress(s, cat, 'm1');
  assert.equal(p.studied, true);
  assert.equal(p.demonstrated, false);
  assert.equal(p.percent, 35); // apenas a parcela de leitura
  assert.equal(moduleStatus(s, cat, 'm1', T), 'in_progress');
});

test('teste de conclusão aprovado marca domínio e agenda revisão de módulo', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  const ids = ['m1-q1', 'm1-q2', 'm1-q3', 'm1-q4'];
  const r = recordQuiz(s, cat, { kind: 'test', moduleId: 'm1', answers: answersFor(ids, 3) }, T);
  assert.equal(r.score, 0.75); assert.equal(r.passed, true); assert.ok(0.75 >= PASS_SCORE);
  assert.equal(moduleStatus(s, cat, 'm1', T), 'completed');
  assert.equal(s.moduleStats.m1.review.due, addDays(T, 7));
  assert.equal(moduleStatus(s, cat, 'm1', addDays(T, 7)), 'review');
});

test('pré-requisitos: atendidos por leitura completa OU domínio demonstrado; bloqueio é só aviso', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  assert.equal(prereqsMet(s, cat, 'm2'), false);
  assert.equal(moduleStatus(s, cat, 'm2', T), 'locked');
  markLessonRead(s, cat, 'm1-l1', T);
  assert.equal(prereqsMet(s, cat, 'm2'), false); // falta 1 lição
  markLessonRead(s, cat, 'm1-l2', T);
  assert.equal(prereqsMet(s, cat, 'm2'), true);
  assert.equal(moduleStatus(s, cat, 'm2', T), 'available');
  // um módulo "bloqueado" pode ser estudado mesmo assim
  const s2 = createInitialState(T);
  markLessonRead(s2, cat, 'm3-l1', T);
  assert.equal(moduleStatus(s2, cat, 'm3', T), 'in_progress');
});

test('fraqueza: acerto recente < 60% com 4+ respostas', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  recordQuiz(s, cat, { kind: 'practice', moduleId: 'm1', answers: answersFor(['m1-q1', 'm1-q2', 'm1-q3', 'm1-q4'], 1) }, T);
  assert.equal(isWeak(s, 'm1'), true);
  recordQuiz(s, cat, { kind: 'practice', moduleId: 'm1', answers: answersFor(['m1-q1', 'm1-q2', 'm1-q3', 'm1-q4'], 4) }, T);
  assert.equal(isWeak(s, 'm1'), false); // 5/8 = 62,5%
});

// ---------------- Revisão espaçada ----------------
test('SRS: regras determinísticas por classificação', () => {
  const novo = { box: 0, due: T, reviews: 0, lapses: 0, history: [] };
  assert.equal(schedule(novo, 'again', T).due, addDays(T, 1));
  assert.equal(schedule(novo, 'hard', T).due, addDays(T, 1));
  assert.equal(schedule(novo, 'good', T).due, addDays(T, 3));
  assert.equal(schedule(novo, 'easy', T).due, addDays(T, 7));
  let c = schedule(novo, 'good', T); // caixa 1
  c = schedule(c, 'good', T); // caixa 2 → 7
  assert.equal(c.box, 2); assert.equal(c.due, addDays(T, 7));
  c = schedule(c, 'hard', T); // mantém caixa, metade do intervalo (7/2 → 4)
  assert.equal(c.box, 2); assert.equal(c.due, addDays(T, 4));
  c = schedule(c, 'again', T);
  assert.equal(c.box, 0); assert.equal(c.lapses, 1); assert.equal(c.due, addDays(T, 1));
  let max = c; for (let i = 0; i < 10; i++) max = schedule(max, 'easy', T);
  assert.equal(max.box, INTERVALS.length - 1); assert.equal(max.due, addDays(T, 60));
  assert.throws(() => schedule(novo, 'talvez', T));
});

test('SRS: prévia de intervalos e ordem dos vencidos (mais atrasado e com mais lapsos primeiro)', () => {
  assert.deepEqual(previewIntervals({ box: 0, reviews: 0, lapses: 0, history: [] }, T), { again: 1, hard: 1, good: 3, easy: 7 });
  const cards = {
    a: { box: 2, due: addDays(T, -1), reviews: 3, lapses: 0 },
    b: { box: 1, due: addDays(T, -5), reviews: 3, lapses: 0 },
    c: { box: 0, due: addDays(T, -1), reviews: 3, lapses: 2 },
    d: { box: 0, due: addDays(T, 2), reviews: 1, lapses: 0 },
    e: { box: 0, due: null, reviews: 0, lapses: 0 },
  };
  assert.deepEqual(dueCards(cards, T), ['b', 'c', 'a']);
});

test('revisão de módulo: aprovada avança, reprovada volta para 3 dias', () => {
  const r0 = scheduleModuleReview(null, true, T);
  assert.deepEqual(r0, { box: 0, due: addDays(T, 7) });
  const r1 = scheduleModuleReview(r0, true, T);
  assert.deepEqual(r1, { box: 1, due: addDays(T, 14) });
  assert.deepEqual(scheduleModuleReview(r1, false, T), { box: 0, due: addDays(T, 3) });
});

// ---------------- XP sem duplicação ----------------
test('XP: mesma atividade não gera XP duas vezes', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  const a = markLessonRead(s, cat, 'm1-l1', T);
  const b = markLessonRead(s, cat, 'm1-l1', addDays(T, 1));
  assert.equal(a.xp, XP.lessonRead); assert.equal(b.xp, 0);
  assert.equal(s.lessons['m1-l1'].readAt, T); // data original preservada
  const e1 = recordExercise(s, cat, 'm1-l1', false, T);
  const e2 = recordExercise(s, cat, 'm1-l1', true, T);
  const e3 = recordExercise(s, cat, 'm1-l1', true, T);
  assert.equal(e1.xp, XP.exerciseAttempt); assert.equal(e2.xp, XP.exerciseCorrect); assert.equal(e3.xp, 0);
  // pergunta: XP apenas no primeiro acerto
  const ids = ['m1-q1', 'm1-q2'];
  const q1 = recordQuiz(s, cat, { kind: 'practice', answers: answersFor(ids, 2) }, T);
  const q2 = recordQuiz(s, cat, { kind: 'practice', answers: answersFor(ids, 2) }, T);
  assert.equal(q1.xp, 2 * XP.questionFirstCorrect); assert.equal(q2.xp, 0);
  // teste de módulo: XP de aprovação uma única vez
  const all = ['m1-q1', 'm1-q2', 'm1-q3', 'm1-q4'];
  const t1 = recordQuiz(s, cat, { kind: 'test', moduleId: 'm1', answers: answersFor(all, 4) }, T);
  const t2 = recordQuiz(s, cat, { kind: 'test', moduleId: 'm1', answers: answersFor(all, 4) }, T);
  assert.ok(t1.xp >= XP.moduleTestPassed); assert.equal(t2.xp, 0);
  // o total confere com o registro
  const sum = Object.values(s.xp.ledger).reduce((x, y) => x + y, 0);
  assert.equal(s.xp.total, sum);
});

test('XP de flashcards tem teto diário', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  let total = 0;
  for (let i = 0; i < 50; i++) {
    s.cards[`x${i}`] = { box: 0, due: T, reviews: 0, lapses: 0, history: [] };
    total += reviewCard(s, `x${i}`, 'good', T).xp;
  }
  assert.equal(total, XP.flashcardDailyCap);
  assert.equal(reviewCard(s, 'x0', 'good', addDays(T, 1)).xp, 1);
  assert.equal(award(s, 'k', 10), 10); assert.equal(award(s, 'k', 10), 0);
  assert.equal(awardCapped(s, 'cap', 7, 10), 7); assert.equal(awardCapped(s, 'cap', 7, 10), 3);
  void cat;
});

test('candidaturas: XP uma vez por semana e valores saneados', () => {
  const s = createInitialState(T); const wk = weekKey(T);
  assert.equal(wk, '2026-11-23');
  const a = saveApplicationsWeek(s, wk, { sent: 5, responses: -3, types: { apps: 3, infra: 0 } }, T);
  const b = saveApplicationsWeek(s, wk, { sent: 9 }, T);
  assert.equal(a.xp, XP.applicationsWeekLogged); assert.equal(b.xp, 0);
  assert.equal(s.applications.weeks[wk].sent, 9);
  assert.equal(s.applications.weeks[wk].responses, 0);
  assert.deepEqual(s.applications.weeks[wk].types, { apps: 3 });
});

test('níveis e sequência flexível', () => {
  assert.equal(levelInfo(0).level, 1); assert.equal(levelInfo(99).level, 1);
  assert.equal(levelInfo(100).level, 2); assert.equal(levelInfo(300).level, 3);
  const act = (days) => Object.fromEntries(days.map((d) => [addDays(T, -d), { minutes: 10, xp: 0, actions: 1 }]));
  assert.equal(computeStreak(act([0, 1, 2]), T).streak, 3);
  assert.equal(computeStreak(act([1, 2, 3]), T).streak, 3);            // hoje ainda sem estudo: não quebra
  assert.equal(computeStreak(act([0, 2, 3]), T).streak, 3);            // 1 dia de descanso tolerado
  assert.equal(computeStreak(act([0, 3, 4]), T).streak, 1);            // 2 dias seguidos sem estudo quebram
  assert.equal(computeStreak({}, T).streak, 0);
});

// ---------------- Quiz ----------------
test('quiz: embaralhamento reproduzível, sem repetição e priorizando erros', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  const pool = cat.questionsByModule.get('m1');
  const a = buildQuiz(pool, { count: 4, rnd: seededRandom(1) });
  const b = buildQuiz(pool, { count: 4, rnd: seededRandom(1) });
  assert.deepEqual(a, b);
  assert.equal(new Set(a.map((x) => x.qid)).size, 4);
  for (const it of a) assert.deepEqual([...it.order].sort(), [0, 1]);
  s.qstats['m1-q4'] = { seen: 1, correct: 0, last: 0 };
  s.qstats['m1-q1'] = { seen: 1, correct: 1, last: 1 };
  for (let seed = 1; seed < 20; seed++) {
    const one = buildQuiz(pool, { count: 1, state: s, rnd: seededRandom(seed) });
    assert.equal(one[0].qid, 'm1-q4'); // a errada por último sempre vem primeiro na seleção
  }
});

// ---------------- Recomendações ----------------
test('recomendação: diagnóstico primeiro e respeito ao orçamento de tempo', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  const p = buildPlan(s, cat, T, { minutes: 60 });
  assert.equal(p.tasks[0].type, 'diagnostic');
  assert.ok(p.used <= 60 * 1.1);
  for (const t of p.tasks) assert.ok(t.reasons.length > 0, 'toda tarefa explica o motivo');
});

test('recomendação: dificuldade em JOIN gera reforço antes de avançar para o módulo dependente', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  s.diagnosticDoneAt = T;
  markLessonRead(s, cat, 'm1-l1', T); markLessonRead(s, cat, 'm1-l2', T);
  recordQuiz(s, cat, { kind: 'practice', moduleId: 'm1', answers: answersFor(['m1-q1', 'm1-q2', 'm1-q3', 'm1-q4'], 1) }, T);
  const p = buildPlan(s, cat, addDays(T, 1), { minutes: 120 });
  const types = p.tasks.map((t) => t.id);
  assert.ok(types.includes('reinforce:m1'));
  const iR = types.indexOf('reinforce:m1');
  const iNext = types.indexOf('lesson:m2-l1');
  assert.ok(iNext === -1 || iR < iNext, 'reforço vem antes da lição dependente');
  const next = p.tasks.find((t) => t.id === 'lesson:m2-l1') || p.alternatives.find((t) => t.id === 'lesson:m2-l1');
  if (next) assert.ok(next.reasons.some((r) => r.includes('Pré-requisito com dificuldade')));
});

test('recomendação: diagnóstico alto permite acelerar (teste em vez de lições)', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  recordQuiz(s, cat, { kind: 'diagnostic', answers: answersFor(['m1-q1', 'm1-q2'], 2) }, T);
  const p = buildPlan(s, cat, T, { minutes: 120 });
  const ids = [...p.tasks, ...p.alternatives].map((t) => t.id);
  assert.ok(ids.includes('fast:m1'));
  assert.ok(!ids.includes('lesson:m1-l1'));
});

test('recomendação: modo retomada após dias sem estudo limita revisões e não apaga progresso', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  s.diagnosticDoneAt = T;
  markLessonRead(s, cat, 'm1-l1', T);
  for (let i = 0; i < 60; i++) s.cards[`k${i}`] = { box: 1, due: addDays(T, 1), reviews: 2, lapses: 0, history: [] };
  const later = addDays(T, 4);
  assert.equal(daysAway(s, later), 3);
  const before = JSON.stringify(s);
  const p = buildPlan(s, cat, later, { minutes: 90 });
  assert.equal(p.recovery, true);
  const cards = p.tasks.find((t) => t.type === 'cards');
  assert.ok(cards && cards.count <= 15);
  assert.ok(p.tasks.filter((t) => t.type === 'lesson').length <= 1);
  assert.ok(p.notes[0].includes('progresso continua intacto'));
  assert.equal(JSON.stringify(s), before, 'montar o plano não altera o estado');
});

test('recomendação: Trilha D recebe prioridade quando abaixo da meta semanal', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  s.diagnosticDoneAt = T;
  const p = buildPlan(s, cat, T, { minutes: 120 });
  const d = [...p.tasks, ...p.alternatives].find((t) => t.id === 'lesson:d1-l1');
  assert.ok(d.reasons.some((r) => r.includes('Trilha D')));
});

test('tarefa concluída é detectada', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  const task = { type: 'lesson', lessonId: 'm1-l1' };
  assert.equal(isTaskDone(task, s, cat, T), false);
  markLessonRead(s, cat, 'm1-l1', T);
  assert.equal(isTaskDone(task, s, cat, T), true);
});

// ---------------- Backup ----------------
test('backup: exportação e importação preservam o estado', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  markLessonRead(s, cat, 'm1-l1', T);
  const json = exportBackup(s, new Date('2026-11-24T12:00:00Z'));
  const r = parseBackup(json);
  assert.equal(r.ok, true);
  assert.deepEqual(r.state.lessons, s.lessons);
  assert.equal(r.state.xp.total, s.xp.total);
  assert.equal(r.summary.lessonsRead, 1);
});

test('backup: rejeita arquivos inválidos, de outro app, de versão futura ou adulterados', () => {
  assert.equal(parseBackup('não é json').ok, false);
  assert.equal(parseBackup(JSON.stringify({ app: 'outro', schemaVersion: 1, data: {} })).ok, false);
  assert.equal(parseBackup(JSON.stringify({ app: 'techpath', schemaVersion: 99, data: {} })).ok, false);
  const s = createInitialState(T);
  s.xp.total = 5000; // não confere com o ledger vazio
  const r = parseBackup(exportBackup(s));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('XP')));
  const s2 = createInitialState(T); s2.cards = { x: { box: 'a', due: 'ontem' } };
  assert.equal(parseBackup(exportBackup(s2)).ok, false);
});

test('armazenamento: salva, carrega e preserva dados corrompidos em vez de sobrescrever', () => {
  const ad = memoryAdapter(); const store = createStore(ad);
  const s = createInitialState(T); s.notes.x = 'teste';
  assert.equal(store.save(s), true);
  assert.equal(store.load().state.notes.x, 'teste');
  ad.setItem(STORAGE_KEY, '{quebrado');
  const r = store.load();
  assert.equal(r.fresh, true); assert.ok(r.error);
  const keys = [...Array(10)].length; void keys;
  assert.ok(ad.getItem(STORAGE_KEY) === '{quebrado'); // não sobrescreveu
  const failing = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem() {} };
  assert.equal(createStore(failing).save(s), false);
});

test('estado inicial é válido', () => {
  assert.deepEqual(validateState(createInitialState(T)), []);
});

// ---------------- Integridade do conteúdo real ----------------
test('conteúdo real: ids únicos, referências válidas e cada lição com quiz', () => {
  const c = realCatalog;
  assert.ok(c.modules.length >= 20 && c.lessons.length >= 30 && c.questions.length >= 150);
  for (const l of c.lessons) {
    assert.ok((c.questionsByLesson.get(l.id) || []).length >= 3, `lição ${l.id} precisa de 3+ perguntas`);
    assert.ok(l.objective && l.explanation && l.example && l.exercise && l.summary?.length, `lição ${l.id} incompleta`);
    for (const r of l.related || []) assert.ok(c.lessonById.has(r), `${l.id} → ${r}`);
    const ok = l.exercise.options.filter((o) => o.ok).length;
    assert.ok(l.exercise.multi ? ok >= 1 : ok === 1, `exercício de ${l.id}: gabarito inválido`);
  }
  for (const m of c.modules) {
    assert.ok((c.questionsByModule.get(m.id) || []).length >= 4, `módulo ${m.id} com poucas perguntas`);
    assert.ok(m.why && m.outcomes?.length && m.roles?.length && m.demonstrate, `módulo ${m.id} sem dados pedagógicos`);
  }
  for (const q of c.questions) assert.ok(q.explain, `pergunta ${q.id} sem explicação`);
  for (const lab of c.labs) for (const st of lab.stages) assert.ok(st.options.some((o) => o.ok), `${lab.id}: etapa sem resposta`);
});

test('tarefa de reforço só conta prática feita depois da sugestão', () => {
  const cat = miniCatalog(); const s = createInitialState(T);
  recordQuiz(s, cat, { kind: 'practice', moduleId: 'm1', answers: answersFor(['m1-q1', 'm1-q2', 'm1-q3', 'm1-q4'], 1) }, T);
  const task = { type: 'reinforce', moduleId: 'm1', since: Date.now() + 1 };
  assert.equal(isTaskDone(task, s, cat, T), false, 'a prática que gerou o reforço não o conclui');
  s.attempts.push({ date: T, ts: Date.now() + 5, kind: 'practice', moduleId: 'm1', total: 4, correct: 3 });
  assert.equal(isTaskDone(task, s, cat, T), true);
});
