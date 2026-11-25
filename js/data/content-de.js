// Trilha D — Programação e automação; Trilha E — Empregabilidade.

export const lessons = [
  {
    id: 'd1-l1', moduleId: 'd1', title: 'Verificador de disponibilidade em Python', minutes: 30,
    objective: 'Escrever um script que verifica serviços HTTP e portas TCP com timeouts, tratamento de erros e código de saída.',
    explanation: `
Scripts de verificação são pequenos, mas precisam ser **confiáveis**: um verificador que trava ou que mente ("OK" quando falhou) é pior do que nenhum.

**Princípios:**
- **Sempre use timeout.** Sem ele, uma conexão travada prende o script indefinidamente.
- **Trate erros específicos:** timeout, conexão recusada, DNS e HTTP de erro são diagnósticos diferentes. Mostre qual ocorreu.
- **Código de saída:** \`0\` se tudo está ok, diferente de zero se algo falhou. É isso que cron, systemd timers, pipelines e ferramentas de monitoramento leem.
- **Saída legível e estável:** uma linha por verificação, com o motivo da falha e o tempo de resposta.
- **Configuração fora do código:** a lista de alvos vem de um arquivo ou de argumentos.

**Biblioteca padrão é suficiente** (sem instalar nada):
- \`urllib.request\` para HTTP (ou \`requests\`, se estiver disponível no ambiente).
- \`socket.create_connection((host, porta), timeout=3)\` para testar portas TCP.
- \`time.perf_counter()\` para medir a duração.
- \`sys.exit(codigo)\` para o código de saída.
- \`argparse\` para argumentos; \`json\` para ler a configuração.

**Erros que você vai encontrar:**
- \`socket.timeout\` / \`TimeoutError\` → sem resposta no tempo limite.
- \`ConnectionRefusedError\` → host alcançado, porta fechada.
- \`socket.gaierror\` → falha de resolução de nome (DNS).
- \`urllib.error.HTTPError\` → o servidor respondeu com um status de erro (tem \`.code\`).
- \`urllib.error.URLError\` → falha antes da resposta HTTP (DNS, recusa, TLS); veja \`.reason\`.
`,
    example: {
      title: 'Núcleo do verificador',
      body: `
~~~
import socket, sys, time, urllib.request, urllib.error

def check_http(url, timeout=5, expect=200):
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            ms = (time.perf_counter() - t0) * 1000
            ok = r.status == expect
            return ok, f"HTTP {r.status} em {ms:.0f} ms"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}"
    except urllib.error.URLError as e:
        return False, f"falha de conexão: {e.reason}"
    except TimeoutError:
        return False, f"timeout após {timeout}s"

def check_tcp(host, port, timeout=3):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True, "porta aberta"
    except socket.gaierror:
        return False, "nome não resolvido (DNS)"
    except ConnectionRefusedError:
        return False, "conexão recusada"
    except (TimeoutError, socket.timeout):
        return False, "timeout (filtrado ou host inacessível)"

if __name__ == "__main__":
    alvos = [("http", "https://example.com"), ("tcp", ("localhost", 5432))]
    falhas = 0
    for tipo, alvo in alvos:
        ok, msg = check_http(alvo) if tipo == "http" else check_tcp(*alvo)
        print(f"[{'OK ' if ok else 'ERRO'}] {tipo} {alvo}: {msg}")
        falhas += not ok
    sys.exit(1 if falhas else 0)
~~~
Execute no seu computador com \`python verificador.py; echo $?\` (Linux) ou \`python verificador.py; echo $LASTEXITCODE\` (PowerShell). O laboratório 6 amplia este script.
`,
    },
    exercise: {
      prompt: 'Seu verificador é executado pelo cron a cada 5 minutos. Às vezes uma execução "nunca termina" e várias se acumulam. Qual é a correção mais importante?',
      options: [
        { t: 'Executar o cron a cada 1 minuto.', ok: false, why: 'Agrava o acúmulo de execuções.' },
        { t: 'Definir timeout em todas as conexões (HTTP e TCP) e, idealmente, impedir execuções simultâneas (lock).', ok: true, why: 'Sem timeout, uma conexão que não responde prende o processo. Um lock (ex.: flock) evita sobreposição caso uma execução demore.' },
        { t: 'Remover o tratamento de exceções.', ok: false, why: 'O script quebraria sem informar o motivo.' },
        { t: 'Imprimir menos mensagens.', ok: false, why: 'A quantidade de saída não causa o travamento.' },
      ],
      explain: '`urlopen` sem timeout usa o padrão global do socket, que pode ser ilimitado. Em Linux, `flock -n /tmp/verificador.lock python verificador.py` no crontab impede que uma nova execução comece enquanto a anterior roda.',
    },
    summary: [
      'Timeout sempre; erros específicos com mensagens claras.',
      'Exit code 0/1 é a interface com cron, pipelines e monitoramento.',
      'socket.create_connection testa portas; urllib testa HTTP.',
      'gaierror = DNS; ConnectionRefused = porta fechada; timeout = filtrado/inacessível.',
    ],
    related: ['b3-l1', 'c2-l2', 'a4-l2'],
    docs: [
      { label: 'Python — socket', url: 'https://docs.python.org/3/library/socket.html' },
      { label: 'Python — urllib.request', url: 'https://docs.python.org/3/library/urllib.request.html' },
    ],
  },
  {
    id: 'd2-l1', moduleId: 'd2', title: 'Spring Boot: configuração, inicialização e N+1', minutes: 30,
    objective: 'Ler um erro de inicialização do Spring Boot, usar profiles/variáveis e detectar N+1 no JPA.',
    explanation: `
**Configuração externa:** o Spring Boot lê propriedades de várias fontes com uma ordem de precedência. De forma simplificada: argumentos de linha de comando > **variáveis de ambiente** > \`application-{profile}.properties\` > \`application.properties\`.
- Variáveis de ambiente usam *relaxed binding*: \`SPRING_DATASOURCE_URL\` corresponde a \`spring.datasource.url\`.
- Profiles: \`SPRING_PROFILES_ACTIVE=prod\` ativa \`application-prod.properties\`.
- Use placeholders com padrão: \`app.api.url=\${API_URL:http://localhost:8080}\`.

**Lendo um erro de inicialização:** o stack trace é longo, mas a informação útil costuma estar:
1. Na seção **"APPLICATION FAILED TO START"** (quando existe), que descreve o problema e uma ação sugerida.
2. No **último "Caused by:"** da cadeia: é a causa mais profunda.

Causas frequentes:
- \`Failed to configure a DataSource: 'url' attribute is not specified\` → falta a URL do banco (variável/profile não carregado).
- \`Port 8080 was already in use\` → outra instância rodando.
- \`UnsatisfiedDependencyException\` / \`NoSuchBeanDefinitionException\` → um bean necessário não foi criado (classe fora do pacote escaneado, anotação ausente, configuração condicional).
- Erro do **Flyway** na inicialização → migração inválida ou checksum alterado (lembre o módulo de SQL).
- \`Connection refused\` ao banco → banco fora, host errado (em Docker, o nome do serviço), credenciais.

**Actuator:** \`spring-boot-starter-actuator\` expõe endpoints como \`/actuator/health\` (saúde, inclusive do banco) e \`/actuator/info\`. Em produção, exponha apenas o necessário e proteja os endpoints sensíveis.

**N+1 no JPA:** relacionamentos \`@ManyToOne\` são carregados de forma ansiosa (EAGER) por padrão, e \`@OneToMany\`, de forma preguiçosa (LAZY). Em ambos os casos, iterar sobre uma lista e acessar o relacionamento pode disparar uma consulta por item.
- Detecte ativando o log de SQL: \`spring.jpa.show-sql=true\` ou \`logging.level.org.hibernate.SQL=DEBUG\`.
- Corrija com \`JOIN FETCH\` na consulta JPQL ou \`@EntityGraph(attributePaths = "...")\` no repositório.
- \`LazyInitializationException\` ocorre ao acessar um relacionamento LAZY depois que a sessão/transação terminou — outra pista de que o carregamento precisa ser planejado.
`,
    example: {
      title: 'GameReview API não sobe no Docker',
      body: `
~~~
***************************
APPLICATION FAILED TO START
***************************
Description:
Failed to configure a DataSource: 'url' attribute is not specified and no embedded
datasource could be configured.
Reason: Failed to determine a suitable driver class

Action:
If you have database settings to be loaded from a particular profile you may need
to activate it (no profiles are currently active).
~~~
"no profiles are currently active" é a pista: a URL do banco está em \`application-docker.properties\`, mas o contêiner não define \`SPRING_PROFILES_ACTIVE=docker\` (ou \`SPRING_DATASOURCE_URL\`). Corrija no \`environment:\` do compose. A URL deve usar o nome do serviço do banco (ex.: \`jdbc:postgresql://db:5432/gamereview\`).
`,
    },
    exercise: {
      prompt: 'Um endpoint `GET /reviews` (100 reviews, cada uma com `@ManyToOne Game`) gera 101 consultas no log. Qual é a correção mais adequada?',
      options: [
        { t: 'Mudar o relacionamento para EAGER.', ok: false, why: '@ManyToOne já é EAGER por padrão. EAGER não garante JOIN em consultas JPQL e continua podendo gerar N+1.' },
        { t: 'Usar uma consulta com `JOIN FETCH r.game` ou `@EntityGraph(attributePaths = "game")` no método do repositório.', ok: true, why: 'Carrega reviews e games em uma única consulta, eliminando as 100 consultas extras.' },
        { t: 'Aumentar o pool de conexões.', ok: false, why: 'O problema é o número de consultas, não a falta de conexões.' },
        { t: 'Desativar o log de SQL.', ok: false, why: 'Esconderia a evidência sem resolver nada.' },
      ],
      explain: 'Combine com paginação (`Pageable`) para não carregar todas as reviews. Para APIs, retornar DTOs com apenas os campos necessários também reduz o acoplamento e o volume de dados.',
    },
    summary: [
      'Precedência: linha de comando > env > profile > application.properties.',
      'APPLICATION FAILED TO START e o último "Caused by" contêm a causa.',
      'SPRING_PROFILES_ACTIVE e SPRING_DATASOURCE_URL resolvem muitos problemas no Docker.',
      'N+1: detecte com o log de SQL e corrija com JOIN FETCH/@EntityGraph.',
    ],
    related: ['a7-l1', 'c4-l1', 'd3-l1'],
    docs: [
      { label: 'Spring Boot — configuração externa', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html' },
      { label: 'Spring Boot — Actuator', url: 'https://docs.spring.io/spring-boot/reference/actuator/index.html' },
    ],
  },
  {
    id: 'd3-l1', moduleId: 'd3', title: 'Reproduzir, provar e localizar com testes e Git', minutes: 25,
    objective: 'Transformar um bug em um teste, localizar a mudança culpada com git bisect e desfazer com segurança.',
    explanation: `
**Debugging com método:**
1. **Reproduza** de forma confiável (entrada, ambiente, passos).
2. **Reduza** ao menor caso que ainda falha.
3. **Formule uma hipótese** e teste-a — uma variável por vez.
4. **Escreva um teste que falha** por causa do bug.
5. **Corrija** e veja o teste passar; rode os demais para evitar regressões.

O teste que reproduz o bug é a **prova** de que ele existia e de que foi corrigido, e impede que ele volte silenciosamente.

~~~
# pytest
def test_total_nao_duplica_com_varios_itens():
    pedido = criar_pedido(itens=[("A", 10), ("B", 20), ("C", 30)])
    assert faturamento_do_mes() == 60   # falhava com 180 (fan-out do JOIN)
~~~

**Git para investigar:**
- \`git log --oneline -- caminho/arquivo.py\` — histórico de um arquivo.
- \`git log -S "texto"\` — commits que adicionaram ou removeram aquele texto (ótimo para descobrir quando uma linha surgiu).
- \`git blame arquivo\` — quem alterou cada linha por último e em qual commit (use para entender o contexto, não para culpar pessoas).
- \`git diff v1.4.0..v1.5.0 -- app/\` — o que mudou entre versões.
- **\`git bisect\`** — busca binária pelo commit que introduziu o bug:
~~~
git bisect start
git bisect bad                  # o commit atual tem o bug
git bisect good v1.4.0          # esta versão funcionava
# o Git faz checkout de um commit do meio; teste e marque:
git bisect good   # ou: git bisect bad
# ...repita até ele apontar "first bad commit"
git bisect reset
# automatizando com um teste:
git bisect run pytest tests/test_faturamento.py
~~~
Com 1.000 commits, são cerca de 10 testes.

**Desfazendo com segurança:**
- \`git restore arquivo\` — descarta alterações locais **não commitadas** desse arquivo (irreversível para elas).
- \`git revert <commit>\` — cria um novo commit que desfaz outro. **Seguro em branches compartilhadas**, porque não reescreve o histórico.
- \`git reset --hard\` — reescreve o estado local e **descarta trabalho**. Evite em branches compartilhadas.
- \`git stash\` — guarda as alterações temporariamente.
- \`git reflog\` — o "histórico do histórico": recupera commits que pareciam perdidos após um reset.
`,
    example: {
      title: 'Bisect automatizado',
      body: `
~~~
$ git bisect start HEAD v2.3.0
$ git bisect run python -m pytest -q tests/test_relatorio.py
running  python -m pytest -q tests/test_relatorio.py
...
a71c2e9 is the first bad commit
    refactor: consulta de produção com join em apontamentos
$ git show a71c2e9 --stat
$ git bisect reset
~~~
Em poucos minutos, você sai de "o relatório quebrou em algum momento" para "o commit a71c2e9 introduziu o problema". O teste precisa retornar 0 quando o comportamento está correto e outro código quando está errado.
`,
    },
    exercise: {
      prompt: 'Um commit já enviado para a branch `main` (usada por toda a equipe) introduziu um bug em produção. Qual é a forma mais segura de desfazê-lo?',
      options: [
        { t: '`git reset --hard HEAD~1` e `git push --force`.', ok: false, why: 'Reescreve o histórico compartilhado: colegas que já baixaram o commit terão conflitos, e trabalho pode ser perdido.' },
        { t: '`git revert <commit>` e push, gerando um novo commit que desfaz a alteração.', ok: true, why: 'Mantém o histórico intacto e é rastreável. É o padrão para desfazer algo em branches compartilhadas.' },
        { t: 'Apagar o repositório e clonar novamente.', ok: false, why: 'Não desfaz nada no remoto.' },
        { t: '`git restore .`', ok: false, why: 'Descarta apenas alterações locais não commitadas.' },
      ],
      explain: 'Depois do revert, investigue com calma, escreva um teste que reproduza o bug e faça a correção definitiva. Em entrevistas, saber explicar a diferença entre revert e reset mostra maturidade com Git.',
    },
    summary: [
      'Reproduzir → reduzir → hipótese → teste que falha → corrigir.',
      'git log -S, blame e diff entre versões dão contexto.',
      'git bisect (run) encontra o commit culpado por busca binária.',
      'revert em branch compartilhada; reset --hard só localmente; reflog recupera.',
    ],
    related: ['d1-l1', 'd2-l1'],
    docs: [
      { label: 'Git — git-bisect', url: 'https://git-scm.com/docs/git-bisect' },
      { label: 'Pro Git (pt-br)', url: 'https://git-scm.com/book/pt-br/v2' },
    ],
  },

  // ---------------- Trilha E ----------------
  {
    id: 'e1-l1', moduleId: 'e1', title: 'Suas histórias no formato STAR', minutes: 25,
    objective: 'Transformar suas experiências reais em respostas claras, verificáveis e adaptáveis a cada vaga.',
    explanation: `
Perguntas comportamentais ("conte sobre um problema difícil que você resolveu") avaliam **como você age**. O formato **STAR** organiza a resposta:

- **S — Situação:** contexto curto (onde, quando, qual sistema).
- **T — Tarefa:** qual era o seu papel ou o objetivo.
- **A — Ação:** o que **você** fez, passo a passo. É a parte mais importante e deve ocupar cerca de metade da resposta. Use "eu" para o que foi seu e "a equipe" para o que foi coletivo.
- **R — Resultado:** o que mudou, com números quando possível, e o que você aprendeu.

**Suas histórias mais fortes (a partir do que você informou):**
1. **Otimização de consulta SQL:** módulo de produção com resposta de ~50 s reduzida para ~11 s.
2. **Incidente em staging:** front-end quebrado por variáveis de ambiente ausentes. Você analisou os logs, identificou a causa, corrigiu a pipeline e fez um novo deploy.
3. **Workers Gunicorn e migrações Alembic:** correção de problemas de execução e de versionamento do banco.
4. **Automação de deploy:** autenticação SSH para o Bitbucket Pipelines e pipelines para cerca de três ambientes de staging.
5. **Zarpa Sistemas:** organização de backlog, revisão de PRs e validação de implementações em um produto colaborativo.
6. **Manutenção de computadores (informal):** troca de componentes, instalação de sistema e drivers, clonagem de discos e recuperação de dados.

**Adapte a ênfase ao cargo:**
- **Suporte a aplicações:** investigação, logs, comunicação e impacto para o usuário.
- **Infraestrutura/Cloud:** pipeline, variáveis, SSH, ambientes e deploy.
- **Back-End:** a consulta, a técnica de otimização e o código.

**Cuidados:**
- **Não invente nem arredonde para cima.** Se não lembrar um detalhe (ex.: qual índice criou), diga como investigaria hoje. Entrevistadores fazem perguntas de aprofundamento.
- **Seja específico:** "analisei o plano de execução e vi que..." é melhor que "otimizei o sistema".
- **Duração:** de 1,5 a 3 minutos. Ensaie em voz alta.
- **Resultado inclui aprendizado:** "desde então, valido as variáveis obrigatórias no início do build".

**Sobre o fim do emprego:** se perguntarem, responda de forma curta, honesta e sem críticas à empresa anterior, e redirecione para o que você está fazendo agora (estudos, prática, foco nas vagas).
`,
    example: {
      title: 'Estrutura (preencha com os seus detalhes reais)',
      body: `
~~~
S: Em um trabalho anterior, um módulo de produção levava cerca de 50 segundos para responder,
   e os usuários reclamavam da lentidão.
T: Eu fiquei responsável por investigar e melhorar o tempo de resposta.
A: [o que você realmente fez — por exemplo: como mediu, como encontrou a consulta lenta,
   o que observou, qual mudança aplicou, como validou que o resultado continuava correto]
R: O tempo caiu para cerca de 11 segundos (~78% menos). [o que aprendeu / o que faria
   além disso hoje]
~~~
Os colchetes são para você completar com o que aconteceu de fato. Escreva sua versão na área **Entrevistas** (pergunta "Conte sobre um problema técnico difícil que resolveu").
`,
    },
    exercise: {
      prompt: 'Qual versão da parte **Ação** é mais forte em uma entrevista?',
      options: [
        { t: '"Nós melhoramos o sistema e ficou bem mais rápido."', ok: false, why: 'Vaga: não diz o que você fez nem como, e "nós" esconde a sua contribuição.' },
        { t: '"Medi o tempo de cada etapa, isolei a consulta que concentrava o tempo, analisei o plano de execução, testei a alteração em staging comparando os resultados e então publiquei."', ok: true, why: 'Mostra método, evidência e cuidado com a correção do resultado — exatamente o que se avalia em suporte e desenvolvimento. (Use somente os passos que você realmente executou.)' },
        { t: '"Usei técnicas avançadas de otimização de banco de dados que reduziram drasticamente a latência."', ok: false, why: 'Palavras genéricas, sem passos concretos, geram desconfiança e perguntas de aprofundamento difíceis.' },
        { t: '"O sistema era muito mal feito, então reescrevi tudo."', ok: false, why: 'Crítica ao trabalho dos outros e exagero passam uma imagem ruim, mesmo que haja problemas reais.' },
      ],
      explain: 'Ação forte = verbos concretos em primeira pessoa + evidência + validação. Ensaie até conseguir contar sem ler. Na área Entrevistas, a checklist de cada pergunta ajuda a conferir se você cobriu os pontos.',
    },
    summary: [
      'STAR: Situação, Tarefa, Ação (metade da resposta), Resultado.',
      'Use números reais (50 s → 11 s) e não invente detalhes.',
      'Ajuste a ênfase ao cargo: suporte, infra ou back-end.',
      'Ensaie em voz alta; de 1,5 a 3 minutos.',
    ],
    related: ['e2-l1', 'e3-l1', 'a8-l2'],
    docs: [],
  },
  {
    id: 'e2-l1', moduleId: 'e2', title: 'Lendo vagas e direcionando candidaturas', minutes: 25,
    objective: 'Selecionar vagas com chance real, adaptar o currículo e manter uma rotina de candidaturas sustentável.',
    explanation: `
**Enviar mais nem sempre gera mais retorno.** Com 10 a 30 candidaturas por mês e quase nenhuma resposta, vale **direcionar** melhor. Não existe garantia, mas a aderência à vaga é um fator que você controla.

**Lendo a vaga:**
- **Obrigatórios × desejáveis:** atender a ~60–70% dos obrigatórios costuma justificar a candidatura. Desejáveis são diferenciais.
- **Palavras-chave reais:** sistemas e ferramentas citados (SQL, Linux, ITIL, AD, Docker, AWS). Muitas empresas usam triagem automática (ATS) ou recrutadores que procuram esses termos.
- **Sinais do dia a dia:** "atendimento ao cliente" frequente × "sustentação de sistemas" × "rotinas de infraestrutura". Isso ajuda a escolher vagas com menos atendimento direto, que você prefere.
- **Nível:** "júnior" com 5 anos de experiência exigidos é desalinhado; trate como baixa prioridade, mas não descarte se o restante encaixar.

**Adaptando o currículo (sem inventar):**
- **Resumo no topo** por tipo de vaga (3–4 linhas). Exemplo para suporte a aplicações: experiência com APIs REST, investigação de erros por logs, SQL (otimização de ~50 s para ~11 s), Linux, Docker e pipelines de CI/CD.
- **Experiência:** comece cada item com verbo e resultado. Coloque primeiro o que importa para aquela vaga.
- **Competências:** use os mesmos termos da vaga **quando forem verdadeiros**. Se a vaga pede "Active Directory" e você estudou o conceito, mas não administrou um ambiente, não liste como experiência. Pode citar em "em estudo" ou mencionar na entrevista.
- **Formato simples** (sem colunas ou tabelas complexas), em PDF, com o nome do arquivo identificado.

**Transição de dev para suporte/infra — como explicar:**
Sua experiência de desenvolvimento é um **diferencial** em suporte a aplicações: você entende como o sistema funciona por dentro, lê logs e stack traces, consulta o banco e conversa com a equipe de desenvolvimento na mesma linguagem. Apresente a mudança como uma escolha coerente com o que você gosta (investigar incidentes, automatizar, configurar ambientes), e não como falta de opção.

**Rotina semanal sugerida (configurável na plataforma):**
- 8 a 12 candidaturas **direcionadas** por semana, distribuídas em 3 ou 4 sessões curtas.
- Para as vagas que você mais deseja: adaptar o resumo e, se possível, enviar uma mensagem curta e objetiva a um recrutador ou profissional da área.
- Registrar números na área Candidaturas: enviadas, respostas e entrevistas. O objetivo é enxergar tendências (ex.: qual tipo de vaga responde mais) e manter a constância, sem tirar conclusões a partir de poucas semanas.

**Certificações:** priorize as que se conectam a vagas que você vê com frequência. Há trilhas de estudo gratuitas em plataformas oficiais (ex.: Microsoft Learn, AWS Skill Builder, Cisco Networking Academy), mas os exames geralmente são pagos e as condições mudam. **Confirme valores e disponibilidade no site oficial antes de planejar.**
`,
    example: {
      title: 'Mesmo perfil, dois resumos',
      body: `
~~~
Suporte a aplicações / sustentação:
"Analista de sistemas formado em ADS (PUC Minas), com experiência como desenvolvedor
full-stack júnior em sistemas multi-tenant. Investigo incidentes com análise de logs,
APIs REST e SQL — incluindo otimização de consulta de ~50 s para ~11 s — e atuo com
Linux, Docker e pipelines de CI/CD."

Infraestrutura / operações:
"Profissional de TI com experiência em deploys, Linux, Docker/Docker Compose e CI/CD
(Bitbucket Pipelines): configurei autenticação SSH para deploys automatizados e
pipelines para cerca de três ambientes de staging, e investiguei incidentes de ambiente
por meio de logs."
~~~
Os dois são verdadeiros e mudam apenas a ênfase. Revise os termos para que reflitam exatamente o que você fez.
`,
    },
    exercise: {
      prompt: 'Uma vaga de "Analista de Suporte N2" pede: SQL, Linux, ITIL, atendimento a chamados, **desejável** Active Directory e AWS. Você tem SQL, Linux e experiência em investigação, mas nunca trabalhou com ferramenta de chamados nem com AD. O que fazer?',
      options: [
        { t: 'Não se candidatar, pois não atende a tudo.', ok: false, why: 'Você atende à maior parte dos obrigatórios, e AD/AWS são desejáveis. Deixar de se candidatar reduz suas chances sem motivo.' },
        { t: 'Candidatar-se, destacar SQL, Linux e investigação de incidentes no resumo e ser honesto sobre ITIL/AD (em estudo), preparando-se para explicar os conceitos.', ok: true, why: 'Aderência real, honestidade e preparo. Conhecer conceitos de ITIL e AD permite responder bem mesmo sem experiência formal.' },
        { t: 'Listar AD e ITIL como experiência para passar na triagem.', ok: false, why: 'Informações falsas costumam aparecer nas entrevistas técnicas e prejudicam a credibilidade — inclusive para vagas futuras na mesma empresa.' },
        { t: 'Enviar o mesmo currículo genérico.', ok: false, why: 'Perde a chance de mostrar a aderência que você tem.' },
      ],
      explain: 'Direcionar não é exagerar: é destacar o que é verdadeiro e relevante. Os módulos a8 (ITIL) e b4 (AD/M365) existem justamente para preparar você para essas lacunas.',
    },
    summary: [
      'Obrigatórios × desejáveis: ~60–70% dos obrigatórios já justifica a candidatura.',
      'Resumo por tipo de vaga; mesmos termos da vaga, quando verdadeiros.',
      'Experiência de dev é um diferencial em suporte a aplicações.',
      'Rotina semanal de 8–12 candidaturas direcionadas, com registro simples.',
    ],
    related: ['e1-l1', 'e3-l1'],
    docs: [
      { label: 'Microsoft Learn (trilhas de estudo)', url: 'https://learn.microsoft.com/training/' },
      { label: 'AWS Skill Builder', url: 'https://skillbuilder.aws/' },
      { label: 'Cisco Networking Academy', url: 'https://www.netacad.com/' },
    ],
  },
  {
    id: 'e3-l1', moduleId: 'e3', title: 'Como conduzir uma simulação de troubleshooting', minutes: 20,
    objective: 'Responder perguntas do tipo "o sistema caiu, o que você faz?" com um método claro e comunicável.',
    explanation: `
Nesse tipo de pergunta, o entrevistador avalia o **processo**, não apenas o acerto. Pense em voz alta seguindo um roteiro:

**1. Escopo (perguntas antes de agir):**
- Quem é afetado? Todos, um cliente, uma região, um tipo de usuário?
- O que exatamente falha? Mensagem, código de status, tela?
- Desde quando? Houve mudança recente (deploy, configuração, infraestrutura)?
- Qual é o impacto no negócio? (isso define a prioridade)

**2. Hipóteses ordenadas:** do mais provável e mais barato de testar ao mais caro. "Como começou logo após o deploy, a primeira hipótese é a mudança; em seguida, dependências como banco e serviços externos."

**3. Testes que separam hipóteses:** cada teste deve eliminar ou confirmar alguma coisa. "Se o healthcheck responde, mas a rota X falha, o problema é específico da rota."

**4. Mitigação × causa raiz:** em incidente grave, restaure o serviço primeiro (rollback, failover, desabilitar uma funcionalidade) e investigue depois. Diga isso explicitamente.

**5. Comunicação:** quem você avisa e quando (equipe, gestão, usuários). Como registra.

**6. Prevenção:** o que evitaria a recorrência (alerta, teste, validação na pipeline, documentação).

**Frases úteis:**
- "Antes de agir, eu confirmaria o escopo..."
- "Minha primeira hipótese seria X, porque..."
- "Para separar X de Y, eu testaria..."
- "Se fosse um incidente crítico, eu priorizaria restaurar com..."
- "Não tenho experiência direta com [ferramenta], mas eu procuraria [conceito equivalente] porque..."

**Erros comuns:** pular direto para a solução ("reinicio o servidor"), ficar preso a uma única hipótese, não mencionar comunicação e inventar conhecimento sobre ferramentas que você não usou.

Pratique com os laboratórios de simulação (DNS, HTTP 500, contêiner, pipeline): eles seguem exatamente essa estrutura.
`,
    example: {
      title: 'Resposta modelo resumida: "A API está fora do ar"',
      body: `
~~~
"Primeiro, confirmaria o escopo: todos os clientes ou alguns, qual erro aparece
(timeout, 502, 500) e desde quando — e verificaria se houve deploy ou mudança recente.

Com o código de status, separo o componente: 502/504 me levam ao proxy e ao upstream;
500, ao log da aplicação. Checaria o status do serviço, os logs desde o horário de
início e as dependências, como banco e serviços externos.

Se estiver ligado a um deploy recente e o impacto for alto, proporia o rollback
para restaurar o serviço e continuaria a investigação depois.

Durante o processo, atualizaria a equipe e a gestão em intervalos combinados e
registraria a linha do tempo. No fim, proporia uma prevenção, como um alerta ou
uma validação na pipeline."
~~~
`,
    },
    exercise: {
      prompt: 'Na entrevista: "Um cliente diz que o sistema está lento. O que você faz?" Qual é o melhor começo de resposta?',
      options: [
        { t: '"Reiniciaria o servidor para liberar memória."', ok: false, why: 'Ação sem diagnóstico, que pode causar indisponibilidade e apagar evidências.' },
        { t: '"Primeiro, entenderia o escopo: é só esse cliente ou todos? Uma tela específica ou o sistema todo? Desde quando? Houve alguma mudança?"', ok: true, why: 'As perguntas de escopo direcionam toda a investigação: lentidão de um cliente aponta para a rede ou os dados dele; lentidão geral, para a infraestrutura ou uma mudança.' },
        { t: '"Pediria ao cliente para trocar de navegador."', ok: false, why: 'Pode fazer parte do diagnóstico, mas não é por onde começar sem saber o escopo.' },
        { t: '"Diria que o problema é a internet do cliente."', ok: false, why: 'Conclusão sem evidência; transfere a responsabilidade e prejudica a relação com o cliente.' },
      ],
      explain: 'Comece pelo escopo, depois apresente hipóteses e testes. Para lentidão, alguns testes úteis: medir com curl -w de outro ponto, verificar a latência p95 nos painéis, procurar consultas lentas e checar a saturação (CPU, conexões, disco).',
    },
    summary: [
      'Escopo → hipóteses ordenadas → testes que separam → mitigação → comunicação → prevenção.',
      'Pense em voz alta e justifique cada passo.',
      'Mitigar antes de buscar a causa raiz em incidentes graves.',
      'Seja honesto sobre ferramentas que não conhece; mostre o raciocínio.',
    ],
    related: ['a2-l2', 'a8-l1', 'e1-l1'],
    docs: [],
  },
];

export const questions = [
  // d1
  { id: 'd1-q01', moduleId: 'd1', lessonId: 'd1-l1', difficulty: 1, prompt: 'Por que um script de verificação deve retornar exit code diferente de zero quando algo falha?', options: ['Para ficar mais rápido', 'Porque cron, pipelines e monitoramento usam o código de saída para saber se houve falha', 'Para economizar memória', 'É apenas uma convenção estética'], answer: 1, explain: 'O código de saída é a interface do script com outras ferramentas.' },
  { id: 'd1-q02', moduleId: 'd1', lessonId: 'd1-l1', difficulty: 2, prompt: '`socket.create_connection(("db.interno", 5432), timeout=3)` lança `socket.gaierror`. O que isso indica?', options: ['Porta fechada', 'Falha na resolução do nome (DNS)', 'Timeout', 'Senha errada'], answer: 1, explain: 'gaierror vem de getaddrinfo: o nome não foi resolvido.' },
  { id: 'd1-q03', moduleId: 'd1', lessonId: 'd1-l1', difficulty: 2, prompt: 'No urllib, qual exceção traz o código HTTP de uma resposta de erro (ex.: 503)?', options: ['URLError', 'HTTPError (atributo .code)', 'TimeoutError', 'ValueError'], answer: 1, explain: 'HTTPError é levantada quando o servidor responde com erro; URLError cobre falhas antes da resposta.' },
  { id: 'd1-q04', moduleId: 'd1', lessonId: 'd1-l1', difficulty: 3, prompt: 'Seu verificador marca OK um serviço que retorna 200 com a página "Em manutenção". Como melhorar?', options: ['Aumentar o timeout', 'Verificar também o conteúdo esperado (ex.: JSON de /health com status "ok") e não apenas o código HTTP', 'Ignorar o problema', 'Usar ping'], answer: 1, explain: 'Um 200 não garante que o serviço funciona. Healthchecks devem validar algo significativo.' },
  { id: 'd1-q05', moduleId: 'd1', lessonId: 'd1-l1', difficulty: 2, prompt: 'Qual é a melhor forma de informar ao script a lista de serviços a verificar?', options: ['Fixar no código', 'Arquivo de configuração (JSON/YAML) ou argumentos de linha de comando', 'Perguntar via input() a cada execução', 'Variável global sem documentação'], answer: 1, explain: 'Separar configuração de código permite reutilizar o script e executá-lo sem interação (cron).' },
  { id: 'd1-q06', moduleId: 'd1', lessonId: 'd1-l1', difficulty: 3, prompt: 'Um teste de porta demora exatamente 3 s e falha com timeout, enquanto outro falha imediatamente com recusa. O que diferencia os dois casos?', options: ['Nada', 'Timeout: pacotes descartados (firewall/host inacessível); recusa: host alcançado sem serviço na porta', 'Timeout é erro de DNS', 'Recusa é erro de TLS'], answer: 1, explain: 'A mesma distinção da camada de transporte vista na trilha de redes, agora no código.' },

  // d2
  { id: 'd2-q01', moduleId: 'd2', lessonId: 'd2-l1', difficulty: 1, prompt: 'Qual variável de ambiente ativa o profile "prod" no Spring Boot?', options: ['SPRING_ENV=prod', 'SPRING_PROFILES_ACTIVE=prod', 'PROFILE=prod', 'JAVA_OPTS=prod'], answer: 1, explain: 'SPRING_PROFILES_ACTIVE corresponde a spring.profiles.active.' },
  { id: 'd2-q02', moduleId: 'd2', lessonId: 'd2-l1', difficulty: 2, prompt: 'Em um stack trace longo de inicialização, onde normalmente está a causa mais profunda?', options: ['Na primeira linha', 'No último "Caused by:" da cadeia', 'No meio, aleatoriamente', 'No log do sistema operacional'], answer: 1, explain: 'Cada "Caused by" encapsula a exceção anterior; o último é a origem.' },
  { id: 'd2-q03', moduleId: 'd2', lessonId: 'd2-l1', difficulty: 2, prompt: 'O que `SPRING_DATASOURCE_URL` sobrescreve?', options: ['spring.datasource.url', 'server.port', 'spring.jpa.show-sql', 'Nada'], answer: 0, explain: 'Relaxed binding: letras maiúsculas e underscore correspondem à propriedade com pontos.' },
  { id: 'd2-q04', moduleId: 'd2', lessonId: 'd2-l1', difficulty: 3, prompt: 'Uma `LazyInitializationException` ocorre ao serializar uma entidade para JSON. Qual é a causa?', options: ['Banco fora do ar', 'Um relacionamento LAZY foi acessado depois que a sessão/transação do Hibernate terminou', 'Porta em uso', 'Falta o Actuator'], answer: 1, explain: 'Planeje o carregamento (JOIN FETCH/EntityGraph) ou retorne DTOs montados dentro da transação.' },
  { id: 'd2-q05', moduleId: 'd2', lessonId: 'd2-l1', difficulty: 2, prompt: 'Qual endpoint do Actuator é normalmente usado por balanceadores e monitoramento?', options: ['/actuator/env', '/actuator/health', '/actuator/heapdump', '/actuator/beans'], answer: 1, explain: 'health informa o estado da aplicação. env e heapdump expõem dados sensíveis e não devem ficar públicos.' },
  { id: 'd2-q06', moduleId: 'd2', lessonId: 'd2-l1', difficulty: 3, prompt: 'Após editar uma migração Flyway já aplicada, a aplicação Spring não sobe. Qual a boa prática?', options: ['Apagar a tabela flyway_schema_history', 'Reverter a edição e criar uma nova migração com a mudança', 'Desativar o Flyway', 'Mudar a porta'], answer: 1, explain: 'Migrações aplicadas são imutáveis. Mudanças entram como novas versões.' },

  // d3
  { id: 'd3-q01', moduleId: 'd3', lessonId: 'd3-l1', difficulty: 1, prompt: 'Qual é o primeiro passo para corrigir um bug de forma confiável?', options: ['Reescrever o módulo', 'Reproduzir o problema de forma consistente', 'Fazer deploy de uma correção suposta', 'Aumentar os logs em produção'], answer: 1, explain: 'Sem reprodução, não dá para confirmar a causa nem a correção.' },
  { id: 'd3-q02', moduleId: 'd3', lessonId: 'd3-l1', difficulty: 2, prompt: 'Para que serve o `git bisect`?', options: ['Dividir um repositório', 'Encontrar, por busca binária, o commit que introduziu um comportamento', 'Mesclar branches', 'Apagar commits'], answer: 1, explain: 'Você marca commits bons e ruins, e o Git reduz o intervalo pela metade a cada passo.' },
  { id: 'd3-q03', moduleId: 'd3', lessonId: 'd3-l1', difficulty: 2, prompt: 'Qual comando desfaz um commit já publicado em uma branch compartilhada sem reescrever o histórico?', options: ['git reset --hard', 'git revert <commit>', 'git restore', 'git clean -fd'], answer: 1, explain: 'revert cria um novo commit inverso; o histórico existente fica intacto.' },
  { id: 'd3-q04', moduleId: 'd3', lessonId: 'd3-l1', difficulty: 3, prompt: 'Você executou `git reset --hard` e perdeu commits locais que não tinham sido enviados. Como recuperar?', options: ['Não é possível', 'Encontrar o hash no `git reflog` e voltar a ele (ex.: git reset --hard <hash> ou criar uma branch)', 'git pull', 'Reinstalar o Git'], answer: 1, explain: 'O reflog registra por onde o HEAD passou. Commits "perdidos" continuam recuperáveis por um tempo.' },
  { id: 'd3-q05', moduleId: 'd3', lessonId: 'd3-l1', difficulty: 2, prompt: 'Qual comando encontra commits que adicionaram ou removeram o texto "tenant_id = 0"?', options: ['git blame', 'git log -S "tenant_id = 0"', 'git status', 'git show'], answer: 1, explain: 'O "pickaxe" (-S) procura mudanças no número de ocorrências do texto.' },
  { id: 'd3-q06', moduleId: 'd3', lessonId: 'd3-l1', difficulty: 3, prompt: 'Para que um `git bisect run <comando>` funcione, o comando deve:', options: ['Imprimir "bom" ou "ruim"', 'Retornar 0 quando o commit está bom e outro código (exceto 125) quando está ruim', 'Ser escrito em Bash', 'Fazer push'], answer: 1, explain: 'O bisect usa o exit code. 125 indica "pular este commit" (ex.: não compila).' },

  // e1
  { id: 'e1-q01', moduleId: 'e1', lessonId: 'e1-l1', difficulty: 1, prompt: 'Na estrutura STAR, qual parte deve ocupar a maior parte da resposta?', options: ['Situação', 'Tarefa', 'Ação', 'Resultado'], answer: 2, explain: 'A Ação mostra o que você fez e como pensou — é o que o entrevistador quer avaliar.' },
  { id: 'e1-q02', moduleId: 'e1', lessonId: 'e1-l1', difficulty: 2, prompt: 'Durante a entrevista, perguntam qual índice você criou na otimização e você não lembra. Melhor resposta?', options: ['Inventar um nome plausível', 'Dizer que não lembra o detalhe exato e explicar como investigaria e decidiria hoje (plano de execução, colunas do filtro)', 'Mudar de assunto', 'Dizer que foi outra pessoa'], answer: 1, explain: 'Honestidade + raciocínio técnico transmitem mais confiança do que um detalhe inventado, que pode ser desmentido na próxima pergunta.' },
  { id: 'e1-q03', moduleId: 'e1', lessonId: 'e1-l1', difficulty: 2, prompt: 'Para uma vaga de infraestrutura, qual ênfase da sua experiência é mais relevante?', options: ['Telas em React', 'Pipelines, SSH para deploy automatizado, ambientes de staging, Docker e investigação de incidentes de ambiente', 'Modelagem de produto', 'Nenhuma'], answer: 1, explain: 'A mesma experiência pode ser contada com ênfases diferentes, de acordo com o que a vaga valoriza.' },
  { id: 'e1-q04', moduleId: 'e1', lessonId: 'e1-l1', difficulty: 3, prompt: 'Qual frase de Resultado é a mais forte?', options: ['"Ficou muito melhor."', '"O tempo de resposta do módulo caiu de cerca de 50 segundos para 11 segundos."', '"O cliente ficou feliz."', '"Resolvi tudo sozinho em um dia."'], answer: 1, explain: 'Números verificáveis e aprendizado concreto. Evite exageros que não consegue sustentar.' },

  // e2
  { id: 'e2-q01', moduleId: 'e2', lessonId: 'e2-l1', difficulty: 1, prompt: 'Uma vaga lista 6 requisitos obrigatórios; você atende a 4 e a alguns desejáveis. O que fazer?', options: ['Não se candidatar', 'Candidatar-se, destacando os pontos aderentes, e preparar-se para as lacunas', 'Mentir sobre os 2 restantes', 'Esperar ter 100%'], answer: 1, explain: 'Cerca de 60–70% dos obrigatórios é uma referência comum para tentar. As lacunas viram plano de estudo.' },
  { id: 'e2-q02', moduleId: 'e2', lessonId: 'e2-l1', difficulty: 2, prompt: 'Como usar as palavras-chave da vaga no currículo?', options: ['Copiar a descrição inteira da vaga', 'Usar os mesmos termos para descrever experiências e competências que você realmente tem', 'Esconder palavras em texto branco', 'Ignorá-las'], answer: 1, explain: 'Termos alinhados ajudam na triagem, desde que verdadeiros. Truques como texto oculto são vistos como má-fé.' },
  { id: 'e2-q03', moduleId: 'e2', lessonId: 'e2-l1', difficulty: 2, prompt: 'Como apresentar a busca por suporte vindo de desenvolvimento?', options: ['"Não consegui vaga de dev, então qualquer coisa serve."', '"Gosto de investigar incidentes e automatizar; minha experiência de dev me ajuda a entender o sistema por dentro, ler logs e conversar com o time técnico."', '"Suporte é mais fácil."', 'Evitar o assunto'], answer: 1, explain: 'Mostra coerência e transforma a experiência anterior em diferencial.' },
  { id: 'e2-q04', moduleId: 'e2', lessonId: 'e2-l1', difficulty: 3, prompt: 'Depois de 3 semanas registrando candidaturas, o tipo "infraestrutura" teve 0 respostas em 6 envios. Conclusão mais razoável?', options: ['Desistir de infraestrutura', 'A amostra é pequena; mantenha o registro, revise a aderência das vagas e do resumo e reavalie após mais semanas', 'Enviar 100 candidaturas por dia', 'Mudar de área'], answer: 1, explain: 'Poucos dados geram conclusões precipitadas. O registro serve para identificar tendências ao longo do tempo.' },

  // e3
  { id: 'e3-q01', moduleId: 'e3', lessonId: 'e3-l1', difficulty: 1, prompt: 'Em uma simulação de troubleshooting na entrevista, o que fazer primeiro?', options: ['Propor a solução final', 'Fazer perguntas de escopo (quem, o quê, desde quando, o que mudou)', 'Pedir mais tempo', 'Reiniciar o servidor'], answer: 1, explain: 'O escopo direciona as hipóteses e mostra método.' },
  { id: 'e3-q02', moduleId: 'e3', lessonId: 'e3-l1', difficulty: 2, prompt: 'O entrevistador pergunta sobre uma ferramenta que você nunca usou. Melhor abordagem?', options: ['Fingir que conhece', 'Dizer que não usou e explicar como resolveria com os conceitos equivalentes que domina', 'Não responder', 'Mudar de assunto'], answer: 1, explain: 'Honestidade e transferência de conhecimento são valorizadas, principalmente em vagas júnior.' },
  { id: 'e3-q03', moduleId: 'e3', lessonId: 'e3-l1', difficulty: 2, prompt: 'Em um incidente crítico com causa desconhecida, ligado a um deploy recente, qual postura demonstrar?', options: ['Só agir com a causa raiz confirmada', 'Priorizar restaurar o serviço (ex.: rollback conforme o processo) e investigar a causa depois', 'Esperar o próximo dia útil', 'Culpar o desenvolvedor do deploy'], answer: 1, explain: 'Separar mitigação de causa raiz é um conceito central em gestão de incidentes.' },
  { id: 'e3-q04', moduleId: 'e3', lessonId: 'e3-l1', difficulty: 3, prompt: 'Qual elemento costuma faltar em respostas de troubleshooting e diferencia candidatos?', options: ['Citar muitas ferramentas', 'Comunicação (quem avisar e quando) e prevenção (o que evita a recorrência)', 'Falar rápido', 'Usar termos em inglês'], answer: 1, explain: 'Resolver é parte do trabalho; comunicar e evitar a recorrência mostram maturidade profissional.' },
];
