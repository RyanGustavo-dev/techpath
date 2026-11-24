// Algoritmo de recomendação do "Estudar Hoje" — regras explícitas, sem IA.
//
// 1. Orçamento: minutos do dia (configuração ou ajuste do dia).
// 2. Modo retomada: se faltaram ≥ 2 dias (configurável), o plano encolhe:
//    revisões limitadas às mais importantes, no máximo 1 lição nova, sem laboratório longo.
//    Pendências restantes são distribuídas pelos próximos dias. Nada de progresso é removido.
// 3. Tarefas candidatas recebem uma pontuação:
//      diagnóstico inicial pendente ................ 100
//      revisão de módulo vencida ................... 60 + dias de atraso
//      flashcards vencidos ......................... 55
//      reforço de módulo fraco ..................... 50 + peso da trilha·10
//      teste de conclusão (lições lidas) ............ 30 + peso·10
//      acelerar (diagnóstico ≥ 80%) ................ 28 + peso·10
//      lição nova: peso da trilha·10
//                  + 4 se o módulo já está em andamento (continuidade)
//                  + até 5 por requisitos de vagas cadastrados
//                  + 2 se fundamental, −2 se opcional
//                  + ordem na trilha (módulos iniciais primeiro)
//                  + 6 se a Trilha D está abaixo da meta semanal de sessões
//                  − 12 se um pré-requisito está fraco (reforçar antes de avançar)
//      laboratório com módulos estudados ........... 20 + peso·10
//      entrevista (≤ 2 respostas na semana) ........ 18
//      candidaturas abaixo do ritmo da semana ...... 16
// 4. Seleção gulosa por pontuação até preencher o tempo (tolerância de 10%).
//    Revisões ocupam no máximo `reviewShare` do tempo (padrão 30%).
// Cada tarefa carrega `reasons`, exibidas na interface ("por que isto?").
import { diffDays, weekKey } from './util.js';
import { lastActiveDate } from './state.js';
import { dueCards } from './srs.js';
import {
  isDemonstrated, isStudied, isWeak, prereqsMet, moduleStatus, nextLesson, reviewDue,
} from './progress.js';

export const CARD_MINUTES = 0.6;

export function daysAway(state, today) {
  const last = lastActiveDate(state);
  if (!last) return 0;
  return Math.max(0, diffDays(last, today) - 1);
}

function jobBoost(state, skills, moduleId) {
  let b = 0;
  for (const s of skills) if (s.modules.includes(moduleId)) b += state.jobReqs[s.id] || 0;
  return Math.min(5, b);
}

function trackDSessionsThisWeek(state, catalog, today) {
  const wk = weekKey(today);
  const days = new Set();
  for (const a of state.attempts) {
    if (a.date >= wk && a.moduleId && catalog.moduleById.get(a.moduleId)?.track === 'D') days.add(a.date);
  }
  for (const [lid, l] of Object.entries(state.lessons)) {
    const les = catalog.lessonById.get(lid);
    if (les && l.readAt >= wk && catalog.moduleById.get(les.moduleId)?.track === 'D') days.add(l.readAt);
  }
  return days.size;
}

function interviewAnswersThisWeek(state, today) {
  const wk = weekKey(today);
  return Object.values(state.interviews).filter((i) => i.updatedAt && i.updatedAt >= wk && (i.answer || '').trim()).length;
}

export function buildPlan(state, catalog, today, { minutes = null, skills = [] } = {}) {
  const s = state.settings;
  const budget = minutes ?? state.today?.minutes ?? s.dailyMinutes;
  const away = daysAway(state, today);
  const recovery = away >= s.recoveryAfterDays;
  const skipped = new Set(state.today?.date === today ? state.today.skipped : []);
  const w = (m) => s.trackWeights[catalog.moduleById.get(m).track] ?? 0.5;
  const cands = [];
  const notes = [];

  if (!state.diagnosticDoneAt) {
    cands.push({ id: 'diagnostic', type: 'diagnostic', title: 'Teste diagnóstico inicial', minutes: 20, score: 100, target: '#/diagnostico',
      reasons: ['Ainda não há diagnóstico: ele identifica o que você já domina e permite pular etapas.'] });
  }

  // Revisões de módulos demonstrados
  const modReviews = catalog.modules.filter((m) => isDemonstrated(state, m.id) && reviewDue(state, m.id, today));
  modReviews.sort((a, b) => state.moduleStats[a.id].review.due.localeCompare(state.moduleStats[b.id].review.due));
  modReviews.slice(0, recovery ? 1 : 2).forEach((m) => {
    const late = diffDays(state.moduleStats[m.id].review.due, today);
    cands.push({ id: `mreview:${m.id}`, type: 'module-review', moduleId: m.id, title: `Revisão rápida: ${m.title}`, minutes: 8, score: 60 + late,
      target: `#/revisar-modulo/${m.id}`, reasons: [late > 0 ? `Revisão vencida há ${late} dia(s).` : 'Revisão programada para hoje.', 'Confirma que o domínio demonstrado continua firme.'] });
  });
  if (modReviews.length > 2) notes.push(`${modReviews.length - 2} revisão(ões) de módulo ficaram para os próximos dias.`);

  // Flashcards
  const due = dueCards(state.cards, today);
  const reviewBudget = Math.max(5, Math.floor(budget * s.reviewShare));
  const cardCap = Math.floor(reviewBudget / CARD_MINUTES);
  const recoveryCap = Math.min(cardCap, 15);
  const cap = recovery ? recoveryCap : cardCap;
  if (due.length) {
    const n = Math.min(due.length, cap);
    const reasons = [`${due.length} flashcard(s) vencido(s). Revisar perto do vencimento ajuda a reter.`];
    if (due.length > n) {
      const days = Math.ceil((due.length - n) / cap);
      reasons.push(`Hoje: os ${n} mais importantes (mais atrasados e com mais erros). O restante se distribui em ~${days} dia(s).`);
    }
    cands.push({ id: 'cards', type: 'cards', title: `Revisar ${n} flashcard(s)`, count: n, minutes: Math.max(3, Math.ceil(n * CARD_MINUTES)), score: 55, target: '#/revisoes', reasons });
  }

  // Reforço de módulos fracos
  const weak = catalog.modules.filter((m) => isWeak(state, m.id));
  for (const m of weak) {
    const deps = (catalog.dependents.get(m.id) || []).map((d) => catalog.moduleById.get(d).title);
    const acc = state.moduleStats[m.id].recent;
    const pctv = Math.round((acc.reduce((a, b) => a + b, 0) / acc.length) * 100);
    cands.push({ id: `reinforce:${m.id}`, type: 'reinforce', moduleId: m.id, title: `Reforço: ${m.title}`, minutes: 15, score: 50 + w(m.id) * 10,
      target: `#/praticar/modulo/${m.id}`,
      reasons: [`Acerto recente de ${pctv}% neste módulo.`, deps.length ? `Reforçar antes de avançar para: ${deps.join(', ')}.` : 'Pratique com as explicações e releia a lição relacionada.'] });
  }
  const weakSet = new Set(weak.map((m) => m.id));

  const dSessions = trackDSessionsThisWeek(state, catalog, today);
  const dBehind = dSessions < s.devSessionsPerWeek;

  // Lições, testes e aceleração
  for (const m of catalog.modules) {
    if (isDemonstrated(state, m.id) || weakSet.has(m.id)) continue;
    if (!prereqsMet(state, catalog, m.id)) continue;
    const diag = state.moduleStats[m.id]?.diagnostic;
    const status = moduleStatus(state, catalog, m.id, today);
    const lesson = nextLesson(state, catalog, m.id);
    const noLessonRead = (catalog.lessonsByModule.get(m.id) || []).every((l) => !state.lessons[l.id]?.readAt);
    const testTried = (state.moduleStats[m.id]?.testLast ?? null) !== null;
    if (diag && diag.score >= 0.8 && noLessonRead && !testTried) {
      cands.push({ id: `fast:${m.id}`, type: 'test', moduleId: m.id, title: `Acelerar: teste de ${m.title}`, minutes: 10, score: 28 + w(m.id) * 10,
        target: `#/teste/${m.id}`, reasons: [`Você acertou ${Math.round(diag.score * 100)}% no diagnóstico deste módulo.`, 'Passando no teste de conclusão, o módulo é marcado como demonstrado e você pula as lições.'] });
      continue;
    }
    if (!lesson) {
      if (isStudied(state, catalog, m.id)) {
        cands.push({ id: `test:${m.id}`, type: 'test', moduleId: m.id, title: `Teste de conclusão: ${m.title}`, minutes: 10, score: 30 + w(m.id) * 10,
          target: `#/teste/${m.id}`, reasons: ['Todas as lições foram lidas. Ler não é dominar: o teste demonstra o conhecimento.'] });
      }
      continue;
    }
    const reasons = [];
    let score = w(m.id) * 10;
    if (status === 'in_progress') { score += 4; reasons.push('Continua um módulo em andamento.'); }
    const jb = jobBoost(state, skills, m.id);
    if (jb) { score += jb; reasons.push('Assunto presente nos requisitos de vagas que você cadastrou.'); }
    if (m.level === 'fundamental') score += 2;
    if (m.level === 'opcional') { score -= 2; reasons.push('Conteúdo opcional.'); }
    const order = (catalog.modulesByTrack.get(m.track) || []).indexOf(m);
    score += Math.max(0, 3 - order * 0.4);
    if (m.track === 'D' && dBehind) { score += 6; reasons.push(`Trilha D: ${dSessions}/${s.devSessionsPerWeek} sessões de programação nesta semana.`); }
    const weakPre = (m.prereqs || []).filter((p) => weakSet.has(p));
    if (weakPre.length) { score -= 12; reasons.push(`Pré-requisito com dificuldade: ${weakPre.map((p) => catalog.moduleById.get(p).title).join(', ')}.`); }
    reasons.unshift(`Trilha ${m.track} — ${catalog.trackById.get(m.track).title} (prioridade ${s.trackWeights[m.track]}).`);
    cands.push({ id: `lesson:${lesson.id}`, type: 'lesson', moduleId: m.id, lessonId: lesson.id, title: lesson.title, subtitle: m.title, minutes: lesson.minutes, score, target: `#/licao/${lesson.id}`, reasons });
  }

  // Laboratórios
  if (!recovery) {
    for (const lab of catalog.labs) {
      if (state.labs[lab.id]?.completedAt) continue;
      const ready = lab.modules.every((mid) => isStudied(state, catalog, mid) || isDemonstrated(state, mid));
      if (!ready) continue;
      let score = 20 + Math.max(...lab.modules.map(w)) * 10;
      const reasons = ['Os módulos relacionados já foram estudados: hora de aplicar.'];
      if (lab.modules.some((mid) => catalog.moduleById.get(mid).track === 'D') && dBehind) { score += 6; reasons.push('Conta como sessão de programação da semana.'); }
      cands.push({ id: `lab:${lab.id}`, type: 'lab', labId: lab.id, title: lab.title, minutes: lab.minutes, score, target: `#/lab/${lab.id}`, reasons });
    }
  }

  // Entrevistas
  const iw = interviewAnswersThisWeek(state, today);
  if (iw <= 2 && Object.keys(state.lessons).length >= 2) {
    cands.push({ id: 'interview', type: 'interview', title: 'Praticar 1–2 perguntas de entrevista', minutes: 15, score: 18 + (recovery ? -10 : 0), target: '#/entrevistas',
      reasons: [`${iw} resposta(s) escritas nesta semana. Escrever a resposta organiza o raciocínio para a entrevista real.`] });
  }

  // Candidaturas
  const wk = weekKey(today);
  const sent = state.applications.weeks[wk]?.sent || 0;
  const dow = diffDays(wk, today) + 1; // 1..7
  const pace = Math.ceil((s.weeklyAppGoal * dow) / 7);
  if (sent < pace) {
    cands.push({ id: 'apps', type: 'applications', title: 'Candidaturas direcionadas', minutes: 20, score: 16, target: '#/entrevistas/candidaturas',
      reasons: [`${sent}/${s.weeklyAppGoal} nesta semana; o ritmo até hoje seria ~${pace}.`, 'Registrar o número ajuda a enxergar a constância (não garante retorno).'] });
  }

  // Seleção
  const pool = cands.filter((c) => !skipped.has(c.id)).sort((a, b) => b.score - a.score);
  const tasks = [];
  let used = 0;
  let lessons = 0;
  const maxLessons = recovery ? 1 : 3;
  const limit = budget * 1.1;
  for (const c of pool) {
    if (c.type === 'lesson' && lessons >= maxLessons) continue;
    if (used + c.minutes > limit && tasks.length > 0) continue;
    tasks.push(c);
    used += c.minutes;
    if (c.type === 'lesson') lessons++;
  }
  if (recovery) notes.unshift(`Modo retomada: ${away} dia(s) sem estudo. O plano de hoje é menor de propósito — seu progresso continua intacto.`);
  return { date: today, budget, used, recovery, away, tasks, notes, alternatives: pool.filter((c) => !tasks.includes(c)).slice(0, 5) };
}

/** Verifica se uma tarefa do plano já foi cumprida hoje. */
export function isTaskDone(task, state, catalog, today) {
  // Tentativas só contam se feitas depois que a tarefa foi sugerida (task.since, em ms).
  const after = (a) => a.date === today && (!task.since || (a.ts || 0) >= task.since);
  switch (task.type) {
    case 'diagnostic': return !!state.diagnosticDoneAt;
    case 'lesson': return !!state.lessons[task.lessonId]?.readAt;
    case 'test': return state.attempts.some((a) => a.kind === 'test' && a.moduleId === task.moduleId && after(a));
    case 'module-review': return state.attempts.some((a) => a.kind === 'review' && a.moduleId === task.moduleId && after(a));
    case 'reinforce': return state.attempts.some((a) => a.kind === 'practice' && a.moduleId === task.moduleId && after(a));
    case 'cards': {
      const n = Object.values(state.cards).filter((c) => c.lastReviewed === today).length;
      return n >= task.count || dueCards(state.cards, today).length === 0;
    }
    case 'lab': return !!state.labs[task.labId]?.completedAt;
    case 'interview': return Object.values(state.interviews).some((i) => i.updatedAt === today);
    case 'applications': return !!state.applications.weeks[weekKey(today)]?.updatedAt && state.applications.weeks[weekKey(today)].updatedAt === today;
    default: return false;
  }
}

