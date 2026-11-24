// Componentes visuais reutilizáveis (retornam HTML seguro).
import { html, raw } from './dom.js';
import { icon } from './icons.js';
import { STATUS_LABELS } from '../core/progress.js';

export function bar(pct, { label = '', tone = '' } = {}) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return html`<div class="bar ${tone}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}" aria-label="${label || 'Progresso'}"><span style="width:${v}%"></span></div>`;
}

export function ring(pct, size = 44, tone = '') {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  const r = 18, c = 2 * Math.PI * r;
  return raw(`<svg class="ring ${tone}" width="${size}" height="${size}" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="${r}" class="ring-bg"/><circle cx="22" cy="22" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v / 100)}" transform="rotate(-90 22 22)"/></svg>`);
}

const STATUS_ICON = { locked: 'lock', available: 'play', in_progress: 'dot', completed: 'check', review: 'review' };
export function statusBadge(status) {
  return html`<span class="badge st-${status}">${icon(STATUS_ICON[status], 14)} ${STATUS_LABELS[status]}</span>`;
}

export function trackTag(track) {
  return html`<span class="tag t-${track.color}">${track.id} · ${track.short}</span>`;
}

export function levelTag(level) {
  const L = { fundamental: 'Fundamental', complementar: 'Complementar', opcional: 'Opcional' };
  return html`<span class="tag lv-${level}">${L[level] || level}</span>`;
}

export function difficulty(n) {
  return html`<span class="diff" title="Dificuldade ${n} de 3" aria-label="Dificuldade ${n} de 3">${[1, 2, 3].map((i) => html`<i class="${i <= n ? 'on' : ''}"></i>`)}</span>`;
}

export function pageHead(title, subtitle = '', actions = '') {
  return html`<header class="page-head"><div><h1 tabindex="-1" id="page-title">${title}</h1>${subtitle ? html`<p class="muted">${subtitle}</p>` : ''}</div>${actions ? html`<div class="head-actions">${actions}</div>` : ''}</header>`;
}

export function empty(text, cta = '') {
  return html`<div class="empty">${icon('info', 22)}<p>${text}</p>${cta}</div>`;
}

export function stat(value, label, ic = '', tone = '') {
  return html`<div class="stat ${tone}">${ic ? icon(ic, 18) : ''}<strong>${value}</strong><span>${label}</span></div>`;
}

export function tabs(items, active, action) {
  return html`<div class="tabs" role="tablist">${items.map((t) => html`<button role="tab" class="tab ${t.id === active ? 'active' : ''}" aria-selected="${t.id === active}" data-action="${action}" data-arg="${t.id}">${t.label}</button>`)}</div>`;
}

export function whereBadge(where) {
  const map = {
    browser: ['Simulação no navegador', 'practice'],
    computer: ['Executar no seu computador', 'terminal'],
    hybrid: ['Simulação + prática no computador', 'terminal'],
  };
  const [t, ic] = map[where] || map.browser;
  return html`<span class="tag where-${where}">${icon(ic, 14)} ${t}</span>`;
}
