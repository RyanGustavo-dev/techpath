// Utilitários puros (sem DOM). Datas são strings locais 'YYYY-MM-DD'.

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // meio-dia evita problemas de horário de verão
}

export function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return todayStr(d);
}

/** Diferença em dias inteiros: b - a */
export function diffDays(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

/** Chave da semana ISO-like iniciando na segunda-feira: data da segunda (YYYY-MM-DD). */
export function weekKey(dateStr) {
  const d = parseDate(dateStr);
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - dow);
  return todayStr(d);
}

/** PRNG determinístico (mulberry32) para testes e embaralhamento reproduzível. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

export function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}
