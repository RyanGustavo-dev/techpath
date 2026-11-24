// Templates HTML com escape automático e um renderizador de Markdown simples e seguro.

class Safe {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const raw = (s) => new Safe(String(s));

function renderVal(v) {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(renderVal).join('');
  return esc(v);
}

/** Template literal com escape: html`<p>${texto}</p>` */
export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += renderVal(vals[i]) + strings[i + 1];
  return new Safe(out);
}

// ---------- Markdown ----------
function inline(text) {
  return text.split(/(`[^`\n]+`)/g).map((part) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) return `<code>${esc(part.slice(1, -1))}</code>`;
    let s = esc(part);
    s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(“"])\*([^*\s][^*]*?)\*(?=[\s.,;:!?)”"]|$)/g, '$1<em>$2</em>');
    return s;
  }).join('');
}

/** Markdown mínimo: parágrafos, listas (- e 1.), blocos de código (~~~ ou ```), negrito, itálico e `código`. */
export function md(src) {
  if (!src) return raw('');
  const lines = String(src).replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^(~~~|```)/.test(line.trim())) {
      const fence = line.trim().slice(0, 3);
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) buf.push(lines[i++]);
      i++;
      out.push(`<pre class="code" tabindex="0"><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    if (/^\s*-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*-\s+/, ''));
      out.push(`<ul>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ''));
      out.push(`<ol>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ol>`);
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(~~~|```)/.test(lines[i].trim()) && !/^\s*-\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return raw(out.join('\n'));
}

/** Markdown em linha (sem parágrafo). */
export const mdInline = (s) => raw(inline(String(s ?? '')));

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function prefersReducedMotion(settings) {
  if (settings?.motion === 'reduce') return true;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function plural(n, sing, plur) { return `${n} ${n === 1 ? sing : plur}`; }
