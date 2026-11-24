# TechPath

Plataforma pessoal de estudos e recolocação profissional em TI — estática, sem login, sem backend e sem IA.
Trilhas com lições reais, exercícios de cenário, quizzes com explicação, laboratórios, revisão espaçada,
plano diário adaptativo, preparação para entrevistas e acompanhamento simples de candidaturas.

**Site publicado:** https://ryangustavo-dev.github.io/techpath/

> A plataforma ajuda a estudar, praticar e manter a constância. Ela **não** garante entrevistas nem contratação.

---

## Como executar localmente

Os navegadores bloqueiam módulos JavaScript abertos direto do disco (`file://`), então use um servidor local simples.
Na pasta do projeto:

```powershell
python -m http.server 8080
```

Depois acesse `http://localhost:8080`. Alternativas: `npx serve .` (Node) ou a extensão *Live Server* do VS Code.

Depois de carregado, o site funciona sem internet. Só os links externos de documentação precisam de conexão.

## Como publicar gratuitamente (GitHub Pages)

1. Crie um repositório no GitHub e envie todos os arquivos desta pasta (`index.html` na raiz).
2. No repositório, abra **Settings → Pages**.
3. Em *Build and deployment*, escolha **Deploy from a branch**, branch `main` e pasta `/ (root)`, e salve.
4. Em alguns minutos, o site fica disponível em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

Como o roteamento usa `#/rotas`, não é preciso configurar nenhum redirecionamento. Qualquer hospedagem estática (Netlify, Cloudflare Pages) também funciona: basta enviar a pasta.

**Importante:** o progresso fica no navegador de quem usa. Publicar o site não publica os seus dados.

## Backup do progresso

- **Configurações → Exportar backup (JSON)** baixa `techpath-backup-AAAA-MM-DD.json`.
- **Importar backup** valida o arquivo (aplicativo, versão de esquema, estrutura, consistência do XP), mostra um resumo e **só substitui os dados após a sua confirmação**.
- Não existe sincronização automática entre computador e celular. Para usar em outro dispositivo, exporte em um e importe no outro.
- Limpar os dados do navegador apaga o progresso. Exporte com frequência (por exemplo, toda semana).
- **Redefinir progresso** exige digitar `REDEFINIR`. As configurações são mantidas.

## Testes

```powershell
npm test
```

(equivale a `node --test tests/*.test.js`; requer Node 18+). São 24 testes cobrindo:

- cálculo de progresso e as quatro dimensões (estudado, praticado, demonstrado, revisão);
- pré-requisitos ("bloqueado" é só um aviso);
- revisão espaçada (todas as classificações, teto de caixas, ordem dos vencidos, revisão de módulos);
- recomendações (diagnóstico primeiro, orçamento de tempo, reforço antes de avançar, aceleração pelo diagnóstico, modo retomada, Trilha D abaixo da meta, conclusão de tarefas);
- XP sem duplicação (lição, exercício, pergunta, teste, flashcards com teto diário, candidaturas por semana);
- exportação/importação de backup (válido, inválido, outro app, versão futura, XP adulterado) e armazenamento corrompido ou cheio;
- integridade do conteúdo real (ids, referências, gabaritos, cada lição com 3+ perguntas).

---

## Arquitetura

Aplicação estática com ES modules, sem framework, organizada em camadas:

```
index.html                 casca da página (sidebar, área principal, diálogo, toasts)
css/styles.css             identidade visual, temas escuro/claro, responsivo, movimento reduzido
js/app.js                  inicialização, roteamento por hash, delegação de eventos, feedback de XP/conquistas
js/core/                   REGRAS (puras, sem DOM, testadas em Node)
  util.js                  datas locais, semanas, PRNG, embaralhamento
  state.js                 formato do estado e padrões
  catalog.js               índices e validação do conteúdo
  progress.js              progresso, pré-requisitos e estados dos módulos
  quiz.js                  montagem, correção e registro de quizzes
  srs.js                   revisão espaçada (flashcards e módulos)
  recommend.js             algoritmo do "Estudar Hoje"
  gamification.js          XP, níveis, sequência e conquistas
  actions.js               ações de domínio (ler lição, exercício, flashcard, laboratório, entrevista, candidaturas)
  storage.js               localStorage, migrações, validação, exportação/importação
js/data/                   CONTEÚDO EDUCACIONAL (dados, sem interface)
  tracks.js                trilhas e módulos
  content-a.js ...-de.js   lições e banco de perguntas por trilha
  flashcards.js, labs.js, interviews.js
  index.js                 monta o catálogo + requisitos de vagas e tipos de vaga
js/ui/                     INTERFACE
  dom.js, icons.js, components.js, quizRunner.js
  views/                   uma tela por arquivo (path, lesson, quizzes, practice, lab, today, reviews, career, progress, settings)
tests/core.test.js
```

### Conteúdo atual

| Item | Quantidade |
|---|---|
| Trilhas | 5 (A Suporte a aplicações · B Redes · C Infra/Linux · D Programação · E Empregabilidade) |
| Módulos | 25, cada um com motivo, cargos, objetivos, pré-requisitos e forma de demonstrar domínio |
| Lições | 36, cada uma com objetivo, explicação, exemplo técnico, exercício de cenário com feedback por alternativa, quiz, resumo e relacionados |
| Perguntas | 166, com explicação; dificuldades 1–3 |
| Flashcards | 88 |
| Laboratórios | 7 (simulações com logs fictícios + parte prática no seu computador, claramente indicada) |
| Perguntas de entrevista | 25, por cargo, com checklist, resposta de referência e armadilhas |

Os 41 links de documentação oficial foram verificados (HTTP 200) em 24/11/2026. Links podem mudar com o tempo.
Os domínios `exemplo.com`/`exemplo.local` nos exercícios são fictícios de propósito.

## Modelo de dados (localStorage, chave `techpath:state`)

```js
{
  schemaVersion: 1,
  settings: { dailyMinutes, weeklyAppGoal, devSessionsPerWeek, recoveryAfterDays, reviewShare, trackWeights, theme, motion },
  lessons:   { [lessonId]: { readAt, exerciseDone, exerciseCorrect, exerciseAttempts } },
  attempts:  [ { date, ts, kind, moduleId, lessonId, total, correct, wrong, perModule } ],  // últimas 600
  qstats:    { [questionId]: { seen, correct, last, lastDate } },
  moduleStats: { [moduleId]: { recent:[0|1 ×20], testBest, testLast, testPassedAt, diagnostic, review:{box,due} } },
  cards:     { [cardId]: { box, due, reviews, lapses, history:[{d,r}] } },
  labs:      { [labId]: { stages, checks, criteria, notes, selfRating, completedAt } },
  interviews:{ [questionId]: { answer, checked, selfScore, updatedAt } },
  applications: { weeks: { [segunda-feira]: { sent, types, responses, interviews, notes } } },
  jobReqs:   { [skillId]: contagem },
  xp:        { ledger: { [chaveÚnica]: xp }, total },
  activity:  { [data]: { minutes, xp, actions } },
  achievements: { [id]: data },
  today:     { date, minutes, skipped, plan },
  notes:     { [lessonId]: texto }
}
```

**Por que localStorage e não IndexedDB:** o uso estimado após 90 dias é bem abaixo de 1 MB (o limite típico do localStorage é ~5 MB por site). O histórico de tentativas é limitado a 600 registros e o de cada flashcard a 12 entradas. Se o volume crescer muito (ex.: anexos), a troca natural é IndexedDB, isolada em `storage.js`, sem servidor. Se a gravação falhar (cota ou bloqueio), um aviso aparece e o backup continua disponível. Dados ilegíveis não são sobrescritos: uma cópia é guardada em `techpath:state:corrupt:*`.

## Regras de aprendizagem

### Progresso e estados

- **Estudado:** todas as lições do módulo lidas. **Praticado:** exercícios feitos e/ou perguntas respondidas. **Demonstrado:** teste de conclusão com 75% ou mais. **Revisão:** módulo demonstrado com revisão vencida, ou desempenho recente fraco.
- Progresso (%) = 35% leitura + 25% prática + 40% demonstração. Ler tudo sem passar no teste chega, no máximo, a ~60%.
- **Pré-requisito atendido** = módulo anterior demonstrado **ou** com todas as lições lidas. "Bloqueado" só indica que há pré-requisitos recomendados: todo conteúdo pode ser aberto e testado.
- **Fraqueza:** acerto abaixo de 60% nas últimas 20 respostas (com 4 ou mais respostas), ou último teste reprovado sem aprovação posterior.

### Revisão espaçada (regras fixas, estilo Leitner)

Intervalos por caixa: **1, 3, 7, 14, 30, 60 dias**.

| Classificação | Efeito |
|---|---|
| Errei | volta para a caixa 0, revisar em 1 dia (conta como lapso) |
| Difícil | mantém a caixa, metade do intervalo (mínimo 1 dia) |
| Bom | sobe 1 caixa (cartão novo vai para 3 dias) |
| Fácil | sobe 2 caixas (cartão novo vai para 7 dias) |

Os flashcards de um módulo entram na fila (para o dia seguinte) quando você lê a primeira lição dele, ou manualmente. Os vencidos são ordenados por atraso, depois por lapsos, depois pela caixa mais baixa.
**Revisão de módulos:** depois de passar no teste, há revisões rápidas de 5 perguntas em 7 → 14 → 30 → 60 dias. Se reprovar, a revisão volta em 3 dias, e o domínio continua registrado.

### Algoritmo do "Estudar Hoje"

Pontuação das tarefas candidatas (também documentada dentro do app):

| Tarefa | Pontos |
|---|---|
| Diagnóstico inicial pendente | 100 |
| Revisão de módulo vencida | 60 + dias de atraso |
| Flashcards vencidos (no máximo 30% do tempo) | 55 |
| Reforço de módulo fraco | 50 + peso da trilha × 10 |
| Teste de conclusão (lições lidas) | 30 + peso × 10 |
| Acelerar (diagnóstico ≥ 80%, sem lições lidas) | 28 + peso × 10 |
| Lição nova | peso × 10 · +4 continuidade · +até 5 requisitos de vagas · ±2 nível · +ordem · +6 se a Trilha D está abaixo da meta · −12 se um pré-requisito está fraco |
| Laboratório (módulos estudados) | 20 + peso × 10 |
| Entrevista (≤ 2 respostas na semana) | 18 |
| Candidaturas abaixo do ritmo da semana | 16 |

Lições com pré-requisitos não atendidos não entram no plano automático. Seleção gulosa até preencher o tempo (tolerância de 10%), com no máximo 3 lições.
**Modo retomada** (2 ou mais dias sem estudo, configurável): até 15 flashcards, 1 revisão de módulo, 1 lição e nenhum laboratório. O excedente é distribuído nos dias seguintes. Nenhum progresso é removido por inatividade.
O plano do dia fica fixo (com checkmarks) até você usar **Recalcular**, **Trocar** uma tarefa ou mudar o tempo do dia.

### Gamificação

XP é concedido por **chave única** em um registro (ledger): repetir a mesma atividade não gera XP de novo.
Lição lida 20 · exercício tentado 4 / correto +10 · pergunta acertada pela 1ª vez 5 · teste aprovado 60 · revisão de módulo aprovada 25 (1 por dia) · flashcard 1 (teto de 30/dia) · laboratório 40 · resposta de entrevista 10 · semana de candidaturas registrada 10 · plano do dia concluído 15 · diagnóstico 30.
Níveis: 0, 100, 300, 600, 1000… XP. A sequência tolera 1 dia de descanso por semana e não "quebra" enquanto o dia de hoje não termina.
XP mede constância. O conhecimento aparece separadamente em Minha Evolução (lido, praticado, demonstrado, acerto recente).

## Como adicionar conteúdo

Tudo fica em `js/data/`. **Nunca renomeie ids já usados**: o progresso salvo depende deles.

**Nova lição** (em `content-x.js`, no array `lessons`, na ordem desejada dentro do módulo):

```js
{
  id: 'b3-l2', moduleId: 'b3', title: 'Título', minutes: 20,
  objective: 'O que você conseguirá fazer.',
  explanation: `Texto em Markdown simples: **negrito**, \`código\`, listas com "- " e blocos ~~~`,
  example: { title: 'Nome do exemplo', body: `~~~\nsaída de comando\n~~~\nExplicação.` },
  exercise: {
    prompt: 'Cenário…', multi: false,        // multi: true permite várias respostas
    options: [{ t: 'Opção', ok: true, why: 'Por que está certa/errada' }, /* ... */],
    explain: 'Raciocínio técnico e hipóteses alternativas.',
  },
  summary: ['Ponto 1', 'Ponto 2'],
  related: ['b3-l1'],
  docs: [{ label: 'Documentação oficial', url: 'https://…' }],   // só URLs verificadas
}
```

**Nova pergunta** (array `questions`, pelo menos 3 por lição):

```js
{ id: 'b3-q08', moduleId: 'b3', lessonId: 'b3-l2', difficulty: 2,
  prompt: 'Enunciado', options: ['A', 'B', 'C', 'D'], answer: 1, explain: 'Por quê.' }
```

**Novo módulo:** adicione-o em `tracks.js` (com `why`, `roles`, `outcomes`, `demonstrate`, `prereqs`). **Flashcards:** `flashcards.js`. **Laboratórios:** `labs.js` (`where: 'browser' | 'computer' | 'hybrid'`). **Entrevistas:** `interviews.js`.
Depois rode `npm test`: o teste de integridade aponta ids duplicados, referências quebradas, gabaritos inválidos e lições com menos de 3 perguntas.
Se mudar o formato do **estado salvo** (não do conteúdo), incremente `SCHEMA_VERSION` em `state.js` e adicione uma migração em `storage.js`.

---

## Situação das entregas

**Implementado:**

- **Entrega 1:** layout responsivo (sidebar no desktop, barra inferior no celular), 7 áreas, trilhas, mapa visual, progresso, persistência, configurações e tema escuro como padrão (claro opcional).
- **Entrega 2:** 36 lições reais, 166 perguntas, exercícios de cenário com explicação por alternativa, testes de conclusão, diagnóstico por trilha e 7 laboratórios.
- **Entrega 3:** revisão espaçada, revisões de módulo, recomendações explicadas ("Por que isto?"), modo retomada, histórico, XP, níveis, sequência e conquistas.
- **Entrega 4:** 25 perguntas de entrevista por cargo, candidaturas semanais, requisitos de vagas que influenciam o plano, backup validado, testes automatizados e esta documentação.
- Acessibilidade: navegação por teclado (atalhos 1–4/Enter nos quizzes, espaço/1–4 nos flashcards), foco visível, link "pular para o conteúdo", `aria-live` nos feedbacks e respeito a `prefers-reduced-motion`.

**Testado:**

- 24 testes automatizados passando.
- No navegador (desktop e 375 px): todas as rotas sem erros de console e sem rolagem horizontal; fluxo completo de lição (exercício, quiz, conclusão), teste de conclusão aprovado (XP, nível, conquista, revisão agendada), sessão de flashcards com os intervalos corretos, plano com reforço de JOIN após erros, importação válida/inválida e tema claro.

**Pendente / possíveis próximas fases:**

- Mais lições por módulo nos assuntos complementares (ex.: Windows Server e GPO em mais profundidade, Kubernetes básico, Azure) e mais perguntas por lição, para reduzir a repetição em quizzes longos.
- As respostas abertas de entrevista são autoavaliadas por checklist. Não há correção automática (proposital: não há IA).
- Sem sincronização entre dispositivos (exige backend; fora do escopo). O backup em JSON é a ponte.
- Sem PWA/service worker: o site funciona offline enquanto a aba está aberta, mas abrir sem rede exige que os arquivos estejam acessíveis localmente (servidor local) ou em cache do navegador.
