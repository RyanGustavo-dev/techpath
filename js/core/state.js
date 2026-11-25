// Formato do estado do usuário e operações básicas de registro de atividade.
import { todayStr } from './util.js';

export const SCHEMA_VERSION = 1;
export const MAX_ATTEMPTS = 600;

export function defaultSettings() {
  return {
    dailyMinutes: 90,            // 60–120 é o intervalo usual; 90 é a referência inicial
    theme: 'dark',               // 'dark' | 'light'
    weeklyAppGoal: 10,           // meta de candidaturas direcionadas (sugestão 8–12)
    devSessionsPerWeek: 2,       // sessões da Trilha D por semana (2–3)
    recoveryAfterDays: 2,        // dias sem estudar que ativam o modo retomada
    reviewShare: 0.3,            // fração máxima do tempo do dia para revisões
    trackWeights: { A: 1.0, B: 0.8, C: 0.8, D: 0.6, E: 0.7 },
    motion: 'system',            // 'system' | 'reduce'
  };
}

export function createInitialState(now = todayStr()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    settings: defaultSettings(),
    lessons: {},        // lessonId -> { readAt, exerciseDone, exerciseCorrect }
    attempts: [],       // histórico de quizzes/testes
    qstats: {},         // questionId -> { seen, correct, last, lastDate }
    moduleStats: {},    // moduleId -> { recent:[0|1], testBest, testLast, testPassedAt, diagnostic, review:{box,due} }
    cards: {},          // flashcardId -> { box, due, reviews, lapses, history:[{d,r}] }
    labs: {},           // labId -> { completedAt, selfRating, notes, stages:{} }
    interviews: {},     // questionId -> { answer, checked:[], selfScore, updatedAt }
    applications: { weeks: {} }, // weekKey -> { sent, types:{}, responses, interviews, notes }
    jobReqs: {},        // skillId -> contagem de vagas em que apareceu
    xp: { ledger: {}, total: 0 },
    activity: {},       // data -> { minutes, xp, actions }
    achievements: {},   // id -> data
    today: { date: null, skipped: [], minutes: null, done: [] },
    notes: {},          // lessonId -> texto livre
    diagnosticDoneAt: null,
    focusModuleId: null,
  };
}

export function ensureModuleStats(state, moduleId) {
  if (!state.moduleStats[moduleId]) {
    state.moduleStats[moduleId] = {
      recent: [], testBest: 0, testLast: null, testPassedAt: null, diagnostic: null, review: null,
    };
  }
  return state.moduleStats[moduleId];
}

/** Registra tempo/ação de estudo em um dia. Usado para sequência e estatísticas. */
export function recordActivity(state, date, minutes = 0, xp = 0) {
  const day = state.activity[date] || (state.activity[date] = { minutes: 0, xp: 0, actions: 0 });
  day.minutes = Math.round((day.minutes + minutes) * 10) / 10;
  day.xp += xp;
  day.actions += 1;
  return day;
}

export function lastActiveDate(state) {
  const days = Object.keys(state.activity).filter((d) => state.activity[d].actions > 0).sort();
  return days.length ? days[days.length - 1] : null;
}
