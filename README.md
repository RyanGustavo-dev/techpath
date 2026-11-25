# TechPath

Plataforma pessoal de estudos e recolocação profissional em TI — estática, sem login, sem backend e sem IA.
Trilhas com lições reais, exercícios de cenário, quizzes com explicação, laboratórios, revisão espaçada,
plano diário adaptativo, preparação para entrevistas e acompanhamento simples de candidaturas.

**Site publicado:** https://ryangustavo-dev.github.io/techpath/

> A plataforma ajuda a estudar, praticar e manter a constância. Ela **não** garante entrevistas nem contratação.

---

## Como usar o TechPath

Abra **Início → Como usar** na aplicação. A tela inicial também retoma o último módulo lido ou aquele que você definiu como foco. O guia em `#/guia` reúne os atalhos para os exercícios da primeira semana e um roteiro flexível de 90 dias.

1. Em **Configurações**, ajuste o tempo diário, a meta semanal de candidaturas e os dias de programação.
2. Em **Entrevistas → Requisitos de vagas**, registre competências de duas vagas que você consideraria.
3. Escolha um módulo em **Minha Trilha** e, se quiser fixá-lo, selecione **Definir como meu foco**. O diagnóstico de **Suporte a aplicações** fica disponível para quando quiser identificar lacunas.
4. Em **Estudar Hoje**, abra **Ver sugestões do dia** se quiser um plano. Use **Recalcular** para atualizar a lista com seu progresso.
5. Faça um laboratório. Nos testes com casos de avaliação, escreva hipótese, evidência e próximo passo antes de ver as alternativas. A pontuação usa as alternativas e a resposta escrita fica disponível para comparação.
6. Treine entrevistas e registre candidaturas ao longo da semana. Exporte o backup em **Configurações** antes de trocar de navegador ou dispositivo.

## Como executar localmente

Os navegadores bloqueiam módulos JavaScript abertos direto do disco (`file://`), então use um servidor local simples.
Na pasta do projeto:

```powershell
python -m http.server 8080
```

Depois acesse `http://localhost:8080/#/guia` para começar pelo passo a passo. Alternativas: `npx serve .` (Node) ou a extensão *Live Server* do VS Code.

Depois de carregado, o site funciona sem internet. Só os links externos de documentação precisam de conexão.

## Como publicar gratuitamente (GitHub Pages)

1. Crie um repositório no GitHub e envie todos os arquivos desta pasta (`index.html` na raiz).
2. No repositório, abra **Settings → Pages**.
3. Em *Build and deployment*, escolha **Deploy from a branch**, branch `main` e pasta `/ (root)`, e salve.
4. Em alguns minutos, o site fica disponível em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

Como o roteamento usa `#/rotas`, não é preciso configurar nenhum redirecionamento. Qualquer hospedagem estática (Netlify, Cloudflare Pages) também funciona: basta enviar a pasta.

O progresso fica no navegador. Para levar o progresso do teste local para o site publicado, exporte o backup na origem local e importe no endereço publicado. Guarde o JSON fora do repositório, pois ele pode conter anotações e respostas de entrevista.

[Documentação oficial do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

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

(equivale a `node --test tests/*.test.js`; requer Node 18+). São 27 testes cobrindo:

- cálculo de progresso e as quatro dimensões (estudado, praticado, demonstrado, revisão);
- pré-requisitos ("bloqueado" é só um aviso);
- revisão espaçada (todas as classificações, teto de caixas, ordem dos vencidos, revisão de módulos);
- recomendações (diagnóstico primeiro, orçamento de tempo, reforço antes de avançar, aceleração pelo diagnóstico, modo retomada, Trilha D abaixo da meta, conclusão de tarefas);
- XP sem duplicação (lição, exercício, pergunta, teste, flashcards com teto diário, candidaturas por semana);
- exportação/importação de backup (válido, inválido, outro app, versão futura, XP adulterado) e armazenamento corrompido ou cheio;
- integridade do catálogo e separação dos casos de avaliação, persistência das respostas escritas e contagem de sessões de programação em dias diferentes.

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
  assessment.js          casos reservados aos testes de conclusão
  drills.js              desafios curtos com dados e resultados de referência
  flashcards.js, labs.js, interviews.js
  index.js                 monta o catálogo + requisitos de vagas e tipos de vaga
js/ui/                     INTERFACE
  dom.js, icons.js, components.js, quizRunner.js
  views/                   uma tela por arquivo (path, lesson, quizzes, practice, lab, today, reviews, career, progress, settings, guide, home)
tests/core.test.js
```

### Conteúdo atual

| Item | Quantidade |
|---|---|
| Trilhas | 5 (A Suporte a aplicações · B Redes · C Infra/Linux · D Programação · E Empregabilidade) |
| Módulos | 25, cada um com motivo, cargos, objetivos, pré-requisitos e forma de demonstrar domínio |
| Lições | 36, cada uma com objetivo, explicação, exemplo técnico, exercício de cenário com feedback por alternativa, quiz, resumo e relacionados |
| Perguntas de prática | 166, com explicação e dificuldades de 1 a 3 |
| Casos de avaliação | 40, distribuídos em dez módulos prioritários. O teste usa três por rodada e prioriza os menos vistos. |
| Flashcards | 88 |
| Laboratórios e desafios | 13, incluindo quatro desafios de código que podem ser repetidos, um de reconciliação SQL e um de comunicação de incidente |
| Perguntas de entrevista | 25, por cargo, com checklist, resposta de referência e armadilhas |

As lições incluem referências externas para aprofundamento.
Os domínios `exemplo.com`/`exemplo.local` nos exercícios são fictícios de propósito.

## Modelo de dados (localStorage, chave `techpath:state`)

```js
{
  schemaVersion: 1,
  settings: { dailyMinutes, weeklyAppGoal, devSessionsPerWeek, recoveryAfterDays, reviewShare, trackWeights, theme, motion },
  lessons:   { [lessonId]: { readAt, exerciseDone, exerciseCorrect, exerciseAttempts } },
  attempts:  [ { date, ts, kind, moduleId, lessonId, total, correct, wrong, perModule, caseNotes? } ],  // últimas 600
  qstats:    { [questionId]: { seen, correct, last, lastDate } },
  moduleStats: { [moduleId]: { recent:[0|1 ×20], testBest, testLast, testPassedAt, diagnostic, review:{box,due} } },
  cards:     { [cardId]: { box, due, reviews, lapses, history:[{d,r}] } },
  labs:      { [labId]: { stages, checks, criteria, notes, selfRating, completedAt, lastPracticedAt?, practiceDates? } },
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
| Acelerar (quatro ou mais respostas, diagnóstico ≥ 80%, sem lições lidas) | 28 + peso × 10 |
| Lição nova | peso × 10 · +4 continuidade · +até 5 requisitos de vagas · ±2 nível · +ordem · +6 se a Trilha D está abaixo da meta · −12 se um pré-requisito está fraco |
| Desafio de código em dia distinto, se abaixo da meta da semana | 36 |
| Laboratório (módulos estudados) | 20 + peso × 10 |
| Entrevista (≤ 2 respostas na semana) | 18 |
| Candidaturas abaixo do ritmo da semana | 16 |

O diagnóstico inicial abre com Suporte a aplicações selecionado e permite fazer as outras trilhas à parte. Os desafios de código alternam conforme o histórico de prática. Lições com pré-requisitos não atendidos não entram no plano automático. Seleção gulosa até preencher o tempo (tolerância de 10%), com no máximo 3 lições.
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

- **Entrega 1:** layout responsivo (barra lateral no desktop e inferior no celular), página inicial, retomada por módulo e navegação em 6 áreas, trilhas, mapa visual, progresso, persistência, configurações e tema escuro como padrão (claro opcional).
- **Entrega 2:** 36 lições, 166 perguntas de prática, 40 casos de avaliação, diagnóstico por trilha e 13 laboratórios e desafios.
- **Entrega 3:** revisão espaçada, revisões de módulo, recomendações explicadas ("Por que isto?"), modo retomada, histórico, XP, níveis, sequência e conquistas.
- **Entrega 4:** 25 perguntas de entrevista por cargo, candidaturas semanais, requisitos de vagas que influenciam o plano, backup validado, testes automatizados e esta documentação.
- Acessibilidade: navegação por teclado (atalhos 1–4/Enter nos quizzes, espaço/1–4 nos flashcards), foco visível, link "pular para o conteúdo", `aria-live` nos feedbacks e respeito a `prefers-reduced-motion`.

**Testado:**

- 27 testes automatizados passando.
- Nesta atualização, foram conferidos no navegador o guia, o fluxo completo do teste de SQL com justificativas, a recomendação de um desafio de Python e o registro de conclusão desse desafio.

**Pendente / possíveis próximas fases:**

- Os dez módulos prioritários têm casos exclusivos de avaliação. Os demais usam questões de prática no teste de conclusão.
- As respostas abertas de entrevista são autoavaliadas por checklist. Não há correção automática (proposital: não há IA).
- Sem sincronização entre dispositivos (exige backend; fora do escopo). O backup em JSON é a ponte.
- Sem PWA/service worker: o site funciona offline enquanto a aba está aberta, mas abrir sem rede exige que os arquivos estejam acessíveis localmente (servidor local) ou em cache do navegador.
