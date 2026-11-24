// XP, níveis, sequência e conquistas.
// Regra central: XP é concedido por CHAVE única no livro-razão (ledger).
// Repetir a mesma atividade não gera XP de novo — evita inflar o progresso.
import { addDays, diffDays } from './util.js';
import { recordActivity } from './state.js';

export const XP = {
  lessonRead: 20,
  exerciseCorrect: 10,
  exerciseAttempt: 4,
  questionFirstCorrect: 5,
  moduleTestPassed: 60,
  moduleReviewPassed: 25,
  flashcard: 1,          // por cartão revisado; limitado por dia
  flashcardDailyCap: 30,
  labCompleted: 40,
  interviewAnswered: 10,
  applicationsWeekLogged: 10,
  dailyGoal: 15,
  diagnostic: 30,
};

/** Concede XP uma única vez por chave. Retorna o XP efetivamente concedido. */
export function award(state, key, amount, date) {
  if (state.xp.ledger[key] !== undefined) return 0;
  state.xp.ledger[key] = amount;
  state.xp.total += amount;
  if (date) recordActivity(state, date, 0, amount).actions -= 1; // XP não conta como ação extra
  return amount;
}

/** Concede XP incremental sob uma chave com teto (ex.: flashcards do dia). */
export function awardCapped(state, key, amount, cap, date) {
  const cur = state.xp.ledger[key] || 0;
  const gain = Math.max(0, Math.min(amount, cap - cur));
  if (gain === 0) return 0;
  state.xp.ledger[key] = cur + gain;
  state.xp.total += gain;
  if (date) recordActivity(state, date, 0, gain).actions -= 1;
  return gain;
}

/** Nível n exige 100·n(n−1)/2 XP acumulado: 0, 100, 300, 600, 1000... */
export function levelInfo(xp) {
  let level = 1;
  while (100 * (level * (level + 1)) / 2 <= xp) level++;
  const base = (100 * (level * (level - 1))) / 2;
  const next = (100 * (level * (level + 1))) / 2;
  return { level, base, next, into: xp - base, span: next - base, pct: Math.round(((xp - base) / (next - base)) * 100) };
}

/**
 * Sequência flexível: dias consecutivos com estudo, tolerando 1 dia de descanso
 * a cada 7 dias percorridos. Se hoje ainda não houve estudo, a sequência não "quebra" —
 * conta-se a partir de ontem.
 */
export function computeStreak(activity, today) {
  const active = (d) => activity[d] && activity[d].actions > 0;
  let cursor = active(today) ? today : addDays(today, -1);
  let streak = 0;
  let restTokens = 1;
  let walked = 0;
  let restUsed = 0;
  let consecutiveMiss = 0;
  for (let i = 0; i < 400; i++) {
    if (active(cursor)) {
      streak++;
      consecutiveMiss = 0;
    } else {
      consecutiveMiss++;
      if (streak === 0 || consecutiveMiss > 1 || restTokens <= 0) break;
      // olha um dia antes: só gasta o descanso se houver estudo do outro lado
      if (!active(addDays(cursor, -1))) break;
      restTokens--;
      restUsed++;
    }
    walked++;
    if (walked % 7 === 0) restTokens = Math.min(restTokens + 1, 2);
    cursor = addDays(cursor, -1);
  }
  return { streak, restUsed };
}

export function bestStreak(activity) {
  const days = Object.keys(activity).filter((d) => activity[d].actions > 0).sort();
  let best = 0, cur = 0, prev = null;
  for (const d of days) {
    cur = prev && diffDays(prev, d) <= 2 ? cur + 1 : 1; // até 1 dia de descanso
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

export function totalStudyDays(activity) {
  return Object.values(activity).filter((a) => a.actions > 0).length;
}

/** Conquistas: condições sobre o estado. `ctx` traz funções derivadas (ex.: módulos demonstrados). */
export const ACHIEVEMENTS = [
  { id: 'first-lesson', title: 'Primeiro passo', desc: 'Concluir a leitura da primeira lição.', icon: 'book', test: (s) => Object.keys(s.lessons).some((k) => s.lessons[k].readAt) },
  { id: 'diagnostic', title: 'Mapa da realidade', desc: 'Fazer o teste diagnóstico inicial.', icon: 'compass', test: (s) => !!s.diagnosticDoneAt },
  { id: 'ten-lessons', title: 'Ritmo de estudo', desc: 'Ler 10 lições.', icon: 'layers', test: (s) => Object.values(s.lessons).filter((l) => l.readAt).length >= 10 },
  { id: 'first-module', title: 'Domínio demonstrado', desc: 'Passar no teste de conclusão de um módulo.', icon: 'award', test: (s) => Object.values(s.moduleStats).some((m) => m.testPassedAt) },
  { id: 'five-modules', title: 'Base sólida', desc: 'Demonstrar domínio em 5 módulos.', icon: 'shield', test: (s) => Object.values(s.moduleStats).filter((m) => m.testPassedAt).length >= 5 },
  { id: 'sql-proof', title: 'SQL sob controle', desc: 'Passar nos testes de JOIN e de agregações.', icon: 'database', test: (s) => !!(s.moduleStats.a5?.testPassedAt && s.moduleStats.a6?.testPassedAt) },
  { id: 'streak-7', title: 'Uma semana firme', desc: 'Sequência de 7 dias (com descanso permitido).', icon: 'flame', test: (s, c) => c.streak >= 7 },
  { id: 'streak-30', title: 'Hábito construído', desc: 'Sequência de 30 dias.', icon: 'flame', test: (s, c) => c.streak >= 30 },
  { id: 'cards-50', title: 'Memória em treino', desc: 'Fazer 50 revisões de flashcards.', icon: 'cards', test: (s) => Object.values(s.cards).reduce((a, c) => a + c.reviews, 0) >= 50 },
  { id: 'cards-300', title: 'Retenção de longo prazo', desc: 'Fazer 300 revisões de flashcards.', icon: 'cards', test: (s) => Object.values(s.cards).reduce((a, c) => a + c.reviews, 0) >= 300 },
  { id: 'first-lab', title: 'Mão na massa', desc: 'Concluir um laboratório.', icon: 'flask', test: (s) => Object.values(s.labs).some((l) => l.completedAt) },
  { id: 'all-labs', title: 'Investigador', desc: 'Concluir 7 laboratórios.', icon: 'search', test: (s) => Object.values(s.labs).filter((l) => l.completedAt).length >= 7 },
  { id: 'interview-5', title: 'Pronto para conversar', desc: 'Escrever 5 respostas de entrevista.', icon: 'mic', test: (s) => Object.values(s.interviews).filter((i) => (i.answer || '').trim().length > 40).length >= 5 },
  { id: 'apps-goal', title: 'Constância na busca', desc: 'Atingir a meta semanal de candidaturas.', icon: 'send', test: (s) => Object.values(s.applications.weeks).some((w) => w.sent >= s.settings.weeklyAppGoal) },
  { id: 'three-tracks', title: 'Perfil versátil', desc: 'Demonstrar domínio em módulos de 3 trilhas.', icon: 'grid', test: (s) => new Set(Object.keys(s.moduleStats).filter((k) => s.moduleStats[k].testPassedAt).map((k) => k[0].toUpperCase())).size >= 3 },
];

export function evaluateAchievements(state, ctx, date) {
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id] && a.test(state, ctx)) {
      state.achievements[a.id] = date;
      unlocked.push(a);
    }
  }
  return unlocked;
}
