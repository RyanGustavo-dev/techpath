// Persistência local (localStorage) + exportação/importação de backup em JSON.
// O adaptador é injetável para permitir testes em Node.
import { SCHEMA_VERSION, createInitialState, defaultSettings } from './state.js';
import { isPlainObject } from './util.js';

export const STORAGE_KEY = 'techpath:state';
export const APP_ID = 'techpath';

/** Migrações por versão: migrations[n] converte do esquema n para n+1. */
const migrations = {
  // 1: (s) => { ...; s.schemaVersion = 2; return s; },
};

export function migrate(data) {
  let s = data;
  while (s.schemaVersion < SCHEMA_VERSION) {
    const fn = migrations[s.schemaVersion];
    if (!fn) throw new Error(`Sem migração do esquema ${s.schemaVersion}`);
    s = fn(s);
  }
  return s;
}

const OBJECT_FIELDS = ['settings', 'lessons', 'qstats', 'moduleStats', 'cards', 'labs', 'interviews', 'applications', 'jobReqs', 'xp', 'activity', 'achievements', 'notes'];

/** Valida a estrutura do estado. Retorna lista de erros (vazia = válido). */
export function validateState(s) {
  const errors = [];
  if (!isPlainObject(s)) return ['O conteúdo não é um objeto.'];
  if (!Number.isInteger(s.schemaVersion)) errors.push('schemaVersion ausente ou inválido.');
  else if (s.schemaVersion > SCHEMA_VERSION) errors.push(`Backup de versão mais nova (${s.schemaVersion}) que a aplicação (${SCHEMA_VERSION}).`);
  for (const f of OBJECT_FIELDS) if (!isPlainObject(s[f])) errors.push(`Campo "${f}" ausente ou inválido.`);
  if (!Array.isArray(s.attempts)) errors.push('Campo "attempts" deve ser uma lista.');
  if (isPlainObject(s.xp)) {
    if (typeof s.xp.total !== 'number' || s.xp.total < 0) errors.push('XP total inválido.');
    if (!isPlainObject(s.xp.ledger)) errors.push('Registro de XP inválido.');
    else {
      const sum = Object.values(s.xp.ledger).reduce((a, b) => a + (typeof b === 'number' ? b : NaN), 0);
      if (Number.isNaN(sum)) errors.push('Registro de XP contém valores não numéricos.');
      else if (Math.abs(sum - s.xp.total) > 0.001) errors.push('XP total não confere com o registro.');
    }
  }
  if (isPlainObject(s.cards)) {
    for (const [id, c] of Object.entries(s.cards)) {
      if (!isPlainObject(c) || !Number.isInteger(c.box) || (c.due !== null && !/^\d{4}-\d{2}-\d{2}$/.test(c.due))) { errors.push(`Flashcard "${id}" inválido.`); break; }
    }
  }
  if (isPlainObject(s.settings) && s.settings.dailyMinutes !== undefined && !(s.settings.dailyMinutes >= 10 && s.settings.dailyMinutes <= 600)) {
    errors.push('Minutos diários fora do intervalo (10–600).');
  }
  return errors;
}

/** Completa campos ausentes com padrões (tolerância a backups antigos). */
export function normalize(s) {
  const base = createInitialState(s.createdAt);
  const out = { ...base, ...s };
  out.settings = { ...defaultSettings(), ...(s.settings || {}) };
  out.settings.trackWeights = { ...defaultSettings().trackWeights, ...(s.settings?.trackWeights || {}) };
  out.applications = { weeks: {}, ...(s.applications || {}) };
  out.today = { ...base.today, ...(s.today || {}) };
  return out;
}

export function createStore(adapter) {
  let lastError = null;
  return {
    get lastError() { return lastError; },
    load() {
      try {
        const raw = adapter.getItem(STORAGE_KEY);
        if (!raw) return { state: createInitialState(), fresh: true };
        const parsed = JSON.parse(raw);
        const s = normalize(migrate(parsed));
        const errs = validateState(s);
        if (errs.length) throw new Error(errs.join(' '));
        return { state: s, fresh: false };
      } catch (e) {
        lastError = e;
        // Não sobrescreve dados corrompidos: guarda cópia antes de recomeçar.
        try {
          const raw = adapter.getItem(STORAGE_KEY);
          if (raw) adapter.setItem(`${STORAGE_KEY}:corrupt:${Date.now()}`, raw);
        } catch { /* ignora */ }
        return { state: createInitialState(), fresh: true, error: e };
      }
    },
    save(state) {
      try {
        adapter.setItem(STORAGE_KEY, JSON.stringify(state));
        lastError = null;
        return true;
      } catch (e) {
        lastError = e; // geralmente QuotaExceededError ou armazenamento bloqueado
        return false;
      }
    },
    clear() {
      try { adapter.removeItem(STORAGE_KEY); return true; } catch (e) { lastError = e; return false; }
    },
  };
}

export function exportBackup(state, now = new Date()) {
  return JSON.stringify({ app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data: state }, null, 2);
}

/**
 * Lê e valida um backup. NÃO aplica nada — retorna o estado pronto para a
 * interface pedir confirmação antes de sobrescrever.
 */
export function parseBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return { ok: false, errors: ['Arquivo não é um JSON válido.'] }; }
  if (!isPlainObject(obj) || obj.app !== APP_ID) return { ok: false, errors: ['Este arquivo não é um backup do TechPath.'] };
  if (!Number.isInteger(obj.schemaVersion)) return { ok: false, errors: ['Backup sem versão de esquema.'] };
  if (obj.schemaVersion > SCHEMA_VERSION) return { ok: false, errors: [`Backup criado por uma versão mais nova (esquema ${obj.schemaVersion}).`] };
  if (!isPlainObject(obj.data)) return { ok: false, errors: ['Backup sem dados.'] };
  let s;
  try { s = normalize(migrate({ ...obj.data, schemaVersion: obj.data.schemaVersion ?? obj.schemaVersion })); }
  catch (e) { return { ok: false, errors: [e.message] }; }
  const errors = validateState(s);
  if (errors.length) return { ok: false, errors };
  return { ok: true, state: s, exportedAt: obj.exportedAt, summary: summarize(s) };
}

export function summarize(s) {
  return {
    lessonsRead: Object.values(s.lessons).filter((l) => l.readAt).length,
    attempts: s.attempts.length,
    cardsReviewed: Object.values(s.cards).reduce((a, c) => a + (c.reviews || 0), 0),
    xp: s.xp.total,
    studyDays: Object.values(s.activity).filter((a) => a.actions > 0).length,
  };
}

/** Adaptador em memória (testes ou quando o localStorage está indisponível). */
export function memoryAdapter() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}
