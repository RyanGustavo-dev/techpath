// Configurações: metas, tempo, pesos das trilhas, aparência, backup (exportar/importar) e redefinição.
import { html, fmtDate } from '../dom.js';
import { icon } from '../icons.js';
import { pageHead } from '../components.js';
import { exportBackup, parseBackup, summarize } from '../../core/storage.js';
import { createInitialState, defaultSettings } from '../../core/state.js';

export function settingsView(ctx) {
  let pending = null; // backup lido aguardando confirmação

  const set = (fn) => { ctx.commit((s) => { fn(s.settings); s.today.plan = null; }); };
  const num = (el, min, max) => { const v = Number(el.value); return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : null; };

  const actions = {
    'set-num': (el) => {
      const [key, min, max] = [el.dataset.arg, Number(el.min), Number(el.max)];
      const v = num(el, min, max); if (v === null) return;
      set((st) => { st[key] = key === 'reviewShare' ? v / 100 : v; });
      const out = document.getElementById(`out-${key}`); if (out) out.textContent = el.value;
    },
    'set-weight': (el) => {
      const v = num(el, 0, 1.5); if (v === null) return;
      set((st) => { st.trackWeights[el.dataset.arg] = Math.round(v * 10) / 10; });
      const out = document.getElementById(`out-w-${el.dataset.arg}`); if (out) out.textContent = Number(el.value).toFixed(1);
    },
    'set-theme': (el) => { set((st) => { st.theme = el.value; }); },
    'set-motion': (el) => { set((st) => { st.motion = el.value; }); },
    'restore-defaults': async () => {
      const ok = await ctx.confirm({ title: 'Restaurar configurações padrão?', body: 'Metas, pesos e preferências voltam ao padrão. Seu progresso não é alterado.', confirmLabel: 'Restaurar' });
      if (!ok) return;
      ctx.commit((s) => { s.settings = defaultSettings(); s.today.plan = null; });
      ctx.rerender();
    },
    'export': () => {
      const json = exportBackup(ctx.state);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `techpath-backup-${ctx.today()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      ctx.commit((s) => { s.lastExportAt = ctx.today(); });
      ctx.toast('Backup exportado.', 'ok');
      ctx.rerender();
    },
    'import-file': async (el) => {
      const file = el.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { ctx.toast('Arquivo grande demais para ser um backup do TechPath.', 'error'); return; }
      const text = await file.text();
      const r = parseBackup(text);
      el.value = '';
      if (!r.ok) { pending = null; ctx.toast(`Backup inválido: ${r.errors[0]}`, 'error'); ctx.rerender(); return; }
      pending = r;
      ctx.rerender({ focus: '#import-preview' });
    },
    'import-confirm': async () => {
      if (!pending) return;
      const cur = summarize(ctx.state);
      const ok = await ctx.confirm({
        title: 'Substituir os dados atuais?',
        body: html`<p>Os dados atuais deste navegador (${cur.lessonsRead} lições lidas, ${cur.xp} XP, ${cur.studyDays} dias de estudo) serão <strong>substituídos</strong> pelo backup. Recomendação: exporte um backup dos dados atuais antes.</p>`,
        confirmLabel: 'Substituir', danger: true,
      });
      if (!ok) return;
      ctx.replaceState(pending.state);
      pending = null;
      ctx.toast('Backup importado.', 'ok');
      ctx.rerender();
    },
    'import-cancel': () => { pending = null; ctx.rerender(); },
    'reset': async () => {
      const ok = await ctx.confirm({
        title: 'Redefinir todo o progresso?',
        body: html`<p>Apaga lições, quizzes, flashcards, XP, conquistas, candidaturas e anotações <strong>deste navegador</strong>. Não pode ser desfeito. Exporte um backup antes, se quiser guardar.</p>`,
        confirmLabel: 'Apagar tudo', danger: true, requireText: 'REDEFINIR',
      });
      if (!ok) return;
      const keep = ctx.state.settings;
      const fresh = createInitialState(ctx.today());
      fresh.settings = keep;
      ctx.replaceState(fresh);
      ctx.toast('Progresso redefinido.', 'ok');
      ctx.navigate('#/trilha');
    },
  };

  function slider(key, label, min, max, step, value, suffix = '', help = '') {
    return html`<label class="field range">${label} <output id="out-${key}">${value}</output>${suffix}
      <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-input="set-num" data-arg="${key}" />
      ${help ? html`<span class="tiny muted">${help}</span>` : ''}</label>`;
  }

  function render() {
    const s = ctx.state, st = s.settings;
    const size = new Blob([JSON.stringify(s)]).size;
    const err = ctx.storeError();
    return html`
      ${pageHead('Configurações', 'Metas, preferências e seus dados.')}
      <div class="grid-2">
        <section class="card">
          <h2 class="h-small">${icon('target', 18)} Metas e tempo</h2>
          ${slider('dailyMinutes', 'Minutos de estudo por dia:', 30, 180, 5, st.dailyMinutes, ' min', 'Referência inicial: 90 min. Pode ser ajustado também só para o dia, em Estudar Hoje.')}
          ${slider('weeklyAppGoal', 'Meta de candidaturas por semana:', 1, 30, 1, st.weeklyAppGoal, '', 'Sugestão inicial: 8 a 12 candidaturas direcionadas.')}
          ${slider('devSessionsPerWeek', 'Sessões de programação (Trilha D) por semana:', 0, 5, 1, st.devSessionsPerWeek)}
          ${slider('recoveryAfterDays', 'Modo retomada após quantos dias sem estudo:', 1, 7, 1, st.recoveryAfterDays, ' dia(s)')}
          ${slider('reviewShare', 'Fatia máxima do tempo para revisões:', 10, 60, 5, Math.round(st.reviewShare * 100), '%')}
        </section>
        <section class="card">
          <h2 class="h-small">${icon('layers', 18)} Prioridade das trilhas</h2>
          <p class="tiny muted">Peso usado na pontuação das lições novas (0 = não sugerir automaticamente; a trilha continua acessível).</p>
          ${ctx.catalog.tracks.map((t) => html`<label class="field range t-${t.color}"><span>${t.id} — ${t.title}: <output id="out-w-${t.id}">${st.trackWeights[t.id].toFixed(1)}</output></span>
            <input type="range" min="0" max="1.5" step="0.1" value="${st.trackWeights[t.id]}" data-input="set-weight" data-arg="${t.id}" /></label>`)}
          <h2 class="h-small">${icon('settings', 18)} Aparência</h2>
          <label class="field">Tema
            <select data-change="set-theme"><option value="dark" ${st.theme === 'dark' ? 'selected' : ''}>Escuro</option><option value="light" ${st.theme === 'light' ? 'selected' : ''}>Claro</option></select></label>
          <label class="field">Animações
            <select data-change="set-motion"><option value="system" ${st.motion === 'system' ? 'selected' : ''}>Seguir o sistema</option><option value="reduce" ${st.motion === 'reduce' ? 'selected' : ''}>Reduzir sempre</option></select></label>
          <button class="btn ghost small" data-action="restore-defaults">Restaurar padrões</button>
        </section>
      </div>

      <section class="card">
        <h2 class="h-small">${icon('database', 18)} Seus dados</h2>
        <div class="notice calm">${icon('info', 18)}<div>
          <p>Tudo fica salvo <strong>apenas neste navegador</strong> (localStorage, ~${Math.max(1, Math.round(size / 1024))} KB usados). Não há login, servidor nem sincronização: o progresso do computador não aparece no celular, e limpar os dados do navegador apaga tudo.</p>
          <p>Exporte um backup com frequência (ex.: semanalmente) e guarde o arquivo em um lugar seguro. Para usar em outro dispositivo, importe o backup lá.</p>
        </div></div>
        ${err ? html`<div class="notice warn">${icon('info', 18)}<div>Último erro de armazenamento: ${err.message}</div></div>` : ''}
        ${!ctx.persistent ? html`<div class="notice warn">${icon('info', 18)}<div>O armazenamento local está indisponível nesta sessão — exporte antes de fechar a aba.</div></div>` : ''}
        <div class="row gap wrap">
          <button class="btn primary" data-action="export">${icon('download', 16)} Exportar backup (JSON)</button>
          <label class="btn file-btn">${icon('upload', 16)} Importar backup<input type="file" accept="application/json,.json" data-change="import-file" class="sr-only" /></label>
        </div>
        <p class="tiny muted">Último backup exportado: ${s.lastExportAt ? fmtDate(s.lastExportAt) : 'nunca'}.</p>
        ${pending ? html`<div class="card inner" id="import-preview" tabindex="-1">
          <h3>Backup válido</h3>
          <p class="small">Exportado em ${pending.exportedAt ? new Date(pending.exportedAt).toLocaleString('pt-BR') : 'data desconhecida'} · ${pending.summary.lessonsRead} lições lidas · ${pending.summary.attempts} quizzes · ${pending.summary.cardsReviewed} revisões de flashcards · ${pending.summary.xp} XP · ${pending.summary.studyDays} dias de estudo.</p>
          <div class="row gap"><button class="btn danger" data-action="import-confirm">Substituir dados atuais</button><button class="btn ghost" data-action="import-cancel">Cancelar</button></div>
        </div>` : ''}
        <h3>Zona de cuidado</h3>
        <button class="btn danger ghost" data-action="reset">${icon('trash', 16)} Redefinir progresso</button>
      </section>

      <section class="card">
        <h2 class="h-small">${icon('info', 18)} Sobre o TechPath</h2>
        <p class="small">Plataforma pessoal de estudos para recolocação em TI. Funciona offline depois de carregada (exceto links externos de documentação). Recomendações e revisão espaçada usam regras fixas e documentadas — não há inteligência artificial nem avaliação automática de respostas abertas. Nenhuma funcionalidade garante contratação.</p>
      </section>`;
  }
  return { render, actions };
}
