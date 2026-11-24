// Revisão espaçada baseada em regras (sistema de caixas, estilo Leitner).
// NÃO é um modelo estatístico de memória: as regras abaixo são fixas e determinísticas.
//
// Intervalos por caixa (dias): [1, 3, 7, 14, 30, 60]
// Classificação após ver a resposta:
//   Errei   → caixa 0, revisar amanhã (+1). Conta como lapso.
//   Difícil → mantém a caixa, intervalo = metade do intervalo da caixa (mín. 1 dia).
//   Bom     → sobe 1 caixa, intervalo da nova caixa.
//   Fácil   → sobe 2 caixas, intervalo da nova caixa.
// Cartão novo começa na caixa 0 sem data (está "novo", não "vencido").
import { addDays, diffDays } from './util.js';

export const INTERVALS = [1, 3, 7, 14, 30, 60];
export const RATINGS = ['again', 'hard', 'good', 'easy'];
export const RATING_LABELS = { again: 'Errei', hard: 'Difícil', good: 'Bom', easy: 'Fácil' };
const MAX_BOX = INTERVALS.length - 1;

export function newCardState() {
  return { box: 0, due: null, reviews: 0, lapses: 0, history: [] };
}

/** Calcula o próximo estado de um cartão. Função pura. */
export function schedule(card, rating, today) {
  if (!RATINGS.includes(rating)) throw new Error(`Classificação inválida: ${rating}`);
  const c = card ? { ...card, history: [...(card.history || [])] } : newCardState();
  const isNew = c.reviews === 0;
  let box = c.box;
  let interval;
  switch (rating) {
    case 'again':
      box = 0; interval = 1; c.lapses += 1; break;
    case 'hard':
      interval = Math.max(1, Math.round(INTERVALS[box] / 2)); break;
    case 'good':
      box = isNew ? Math.min(1, MAX_BOX) : Math.min(box + 1, MAX_BOX); interval = INTERVALS[box]; break;
    case 'easy':
      box = isNew ? 2 : Math.min(box + 2, MAX_BOX); interval = INTERVALS[box]; break;
  }
  c.box = box;
  c.due = addDays(today, interval);
  c.reviews += 1;
  c.lastReviewed = today;
  c.history.push({ d: today, r: rating });
  if (c.history.length > 12) c.history = c.history.slice(-12);
  return c;
}

/** Prévia do intervalo de cada botão (para mostrar "Bom · 7d"). */
export function previewIntervals(card, today) {
  const out = {};
  for (const r of RATINGS) out[r] = diffDays(today, schedule(card, r, today).due);
  return out;
}

export function isDue(card, today) {
  return !!(card && card.due && card.due <= today);
}

/**
 * Lista de cartões vencidos ordenada por importância:
 * mais atrasado primeiro, depois mais lapsos, depois caixa mais baixa.
 */
export function dueCards(cardsState, today) {
  return Object.entries(cardsState)
    .filter(([, c]) => isDue(c, today))
    .map(([id, c]) => ({ id, overdue: diffDays(c.due, today), lapses: c.lapses, box: c.box }))
    .sort((a, b) => b.overdue - a.overdue || b.lapses - a.lapses || a.box - b.box)
    .map((x) => x.id);
}

/** Retenção: % de revisões (não novas) classificadas como Bom/Fácil. */
export function retentionRate(cardsState) {
  let total = 0, ok = 0;
  for (const c of Object.values(cardsState)) {
    (c.history || []).forEach((h, i) => {
      if (i === 0 && c.history.length === c.reviews) return; // ignora a 1ª vista do cartão
      total++;
      if (h.r === 'good' || h.r === 'easy') ok++;
    });
  }
  return total ? Math.round((ok / total) * 100) : null;
}

// ---- Revisão de módulos (após demonstrar domínio) ----
// Passou no teste do módulo → revisão em 7 dias. Cada revisão aprovada: 7 → 14 → 30 → 60.
// Revisão reprovada: volta ao início (revisar em 3 dias). O domínio NÃO é removido.
export const MODULE_REVIEW_INTERVALS = [7, 14, 30, 60];

export function scheduleModuleReview(review, passed, today) {
  if (!review) return { box: 0, due: addDays(today, MODULE_REVIEW_INTERVALS[0]) };
  if (passed) {
    const box = Math.min(review.box + 1, MODULE_REVIEW_INTERVALS.length - 1);
    return { box, due: addDays(today, MODULE_REVIEW_INTERVALS[box]) };
  }
  return { box: 0, due: addDays(today, 3) };
}
