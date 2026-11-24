// Laboratórios: simulação no navegador (logs/saídas fictícias + escolhas) e/ou prática no seu computador.
// where: 'browser' (só simulação), 'computer' (execução local), 'hybrid' (os dois).
// O site NÃO executa comandos nem verifica arquivos locais: a parte prática é marcada por você.

export const labs = [
  {
    id: 'lab-dns', title: 'Laboratório 1 — Diagnosticar falhas de DNS', modules: ['b2'], minutes: 35, where: 'hybrid',
    objective: 'Isolar uma falha de resolução de nomes e confirmar a causa com comandos reais no seu computador.',
    prereqText: 'Lições "Diagnóstico de DNS" e "Camadas como roteiro de diagnóstico".',
    criteria: ['Concluir as 3 etapas da simulação', 'Executar os comandos no seu computador e interpretar a saída', 'Escrever uma conclusão curta nas anotações'],
    stages: [
      {
        title: 'Relato',
        context: 'Chamado: *"Desde ontem não consigo abrir o portal.empresa.local. O Google abre normal."* Você acessa remotamente e executa:\n~~~\nC:\\> ping portal.empresa.local\nA solicitação ping não pôde encontrar o host portal.empresa.local.\nC:\\> ping 192.168.0.45\nResposta de 192.168.0.45: bytes=32 tempo=2ms TTL=128\n~~~',
        question: 'O que esses resultados permitem concluir?',
        options: [
          { t: 'A rede até o servidor funciona; a falha está na resolução do nome.', ok: true, why: 'O ping por IP responde (camadas 1–3 ok) e o nome não é encontrado: a diferença é o DNS.' },
          { t: 'O servidor do portal está fora do ar.', ok: false, why: 'O servidor responde ao ping pelo IP.' },
          { t: 'O cabo de rede está com problema.', ok: false, why: 'Se o cabo estivesse com problema, nem o ping por IP nem o Google funcionariam.' },
        ],
        explain: 'Você eliminou rede e servidor com dois comandos. O foco agora é descobrir **qual servidor DNS** a máquina consulta e o que ele responde.',
      },
      {
        title: 'Configuração da máquina',
        context: '~~~\nC:\\> ipconfig /all\n   DHCP Habilitado . . . . . : Não\n   Endereço IPv4 . . . . . . : 192.168.0.88\n   Gateway Padrão. . . . . . : 192.168.0.1\n   Servidores DNS. . . . . . : 1.1.1.1\n                               8.8.8.8\n~~~\nEm uma máquina que funciona, os servidores DNS são `192.168.0.10` e o DHCP está habilitado.',
        question: 'Qual é a causa mais provável?',
        options: [
          { t: 'A máquina foi configurada manualmente com DNS públicos, que não conhecem a zona interna empresa.local.', ok: true, why: 'DNS públicos resolvem a internet (por isso o Google abre), mas não têm os registros internos.' },
          { t: 'O DNS 1.1.1.1 está fora do ar.', ok: false, why: 'Se estivesse fora, o Google também falharia (salvo cache). E mesmo funcionando, ele não conhece nomes internos.' },
          { t: 'O servidor DHCP caiu.', ok: false, why: 'A máquina nem usa DHCP (configuração manual), e o IP está ok.' },
        ],
        explain: 'Confirmação: `nslookup portal.empresa.local 192.168.0.10` deve responder com o IP correto. A correção é voltar a obter IP/DNS automaticamente (ou configurar o DNS interno) e registrar no chamado **quem/por que** alterou, se for possível descobrir.',
      },
      {
        title: 'Hipótese alternativa',
        context: 'Imagine que o DNS **estivesse correto** (192.168.0.10) e mesmo assim só essa máquina abrisse o portal em um IP antigo (192.168.0.20), desativado na migração da semana passada.',
        question: 'O que verificar nesse caso? (selecione todas as opções adequadas)',
        multi: true,
        options: [
          { t: 'O arquivo hosts (C:\\Windows\\System32\\drivers\\etc\\hosts).', ok: true, why: 'Uma entrada manual com o IP antigo tem precedência sobre o DNS.' },
          { t: 'O cache DNS (ipconfig /displaydns) e, se necessário, ipconfig /flushdns.', ok: true, why: 'Uma resposta antiga em cache explicaria o IP velho até expirar o TTL.' },
          { t: 'Reinstalar o navegador.', ok: false, why: 'O navegador tem cache próprio, mas reinstalar é desproporcional; teste em uma aba anônima ou limpe o cache do navegador antes.' },
          { t: 'Proxy configurado no navegador ou no sistema.', ok: true, why: 'Um proxy pode resolver nomes por conta própria e mascarar o DNS local.' },
        ],
        explain: 'Com o sintoma diferente ("vai para o lugar errado" em vez de "não resolve"), as causas são outras: hosts, cache e proxy. Treinar hipóteses alternativas evita ficar preso à primeira ideia.',
      },
    ],
    offline: {
      intro: '**Execute no seu computador (fora do navegador).** Os comandos são somente leitura, exceto o flushdns, que apenas limpa o cache local. Este site não executa nem verifica nada.',
      steps: [
        'Rode `ipconfig /all` e anote quais servidores DNS sua máquina usa e se o DHCP está habilitado.',
        'Rode `nslookup google.com` e identifique qual servidor respondeu.',
        'Rode `nslookup google.com 1.1.1.1` e compare a resposta com a do passo anterior.',
        'Rode `nslookup nome-que-nao-existe-12345.com` e observe a mensagem de domínio inexistente.',
        'Rode `ipconfig /displaydns | more` e localize uma entrada recente e o seu TTL.',
        'Abra o arquivo hosts no Bloco de Notas (somente leitura) e verifique se há entradas além dos comentários.',
      ],
    },
  },
  {
    id: 'lab-http500', title: 'Laboratório 2 — Investigar uma API que retorna HTTP 500', modules: ['a2', 'a4'], minutes: 30, where: 'browser',
    objective: 'Seguir um erro 500 do relato do usuário até a causa raiz usando logs fictícios.',
    prereqText: 'Lições de 5xx e de logs.',
    criteria: ['Concluir as 4 etapas', 'Escrever, nas anotações, o registro do incidente (sintoma, causa, solução, prevenção)'],
    stages: [
      {
        title: 'Escopo',
        context: 'Desde 9h40, o suporte recebe chamados: *"Erro ao gerar boleto"*. A tela mostra "Erro interno". Pelo DevTools:\n~~~\nPOST /api/v2/cobrancas/boleto   500   312 ms\nResponse: {"detail": "Internal Server Error", "request_id": "c41e-77ab"}\n~~~\nOutras funções (login, listagem de clientes) funcionam.',
        question: 'Qual é o próximo passo mais eficiente?',
        options: [
          { t: 'Buscar o request_id c41e-77ab nos logs da aplicação.', ok: true, why: 'O 500 vem da aplicação e o request id leva direto à linha do erro.' },
          { t: 'Verificar o error.log do Nginx.', ok: false, why: 'O Nginx repassou uma resposta 500 gerada pela aplicação; um 502/504 apontaria para ele.' },
          { t: 'Reiniciar a aplicação.', ok: false, why: 'Apenas uma função falha, e reiniciar não explica a causa.' },
        ],
        explain: 'Escopo restrito (uma rota) + 500 = algo específico daquela funcionalidade: código, dados ou dependência externa.',
      },
      {
        title: 'Log da aplicação',
        context: '~~~\n09:41:02 INFO  req=c41e-77ab POST /api/v2/cobrancas/boleto tenant=18 user=532\n09:41:02 ERROR req=c41e-77ab Traceback (most recent call last):\n  File "cobrancas/service.py", line 88, in gerar_boleto\n    resp = gateway.emitir(payload, timeout=10)\n  File "integracoes/gateway.py", line 41, in emitir\n    r.raise_for_status()\nrequests.exceptions.HTTPError: 401 Client Error: Unauthorized for url:\n  https://api.gateway-pagamentos.exemplo/v1/boletos\n~~~',
        question: 'O que o log revela?',
        options: [
          { t: 'O gateway de pagamentos externo rejeita a credencial da integração (401), e a aplicação transforma isso em 500.', ok: true, why: 'O traceback mostra a chamada externa retornando 401. A aplicação não trata esse erro e responde 500 ao usuário.' },
          { t: 'O usuário 532 não tem permissão para gerar boletos.', ok: false, why: 'O 401 vem do gateway externo, não da autorização da sua aplicação.' },
          { t: 'O banco de dados está fora.', ok: false, why: 'Não há erro de banco; o erro está na chamada HTTP externa.' },
        ],
        explain: 'Repare na diferença entre o status que o usuário vê (500) e o status real da dependência (401). Ler o traceback até a última linha é o que revela isso.',
      },
      {
        title: 'Linha do tempo',
        context: 'Você consulta o histórico:\n~~~\n09:30  Deploy v2.8.1 (mudança: "rotação de segredos da integração de pagamentos")\n09:40  Primeiro erro 401 do gateway\n~~~\nNo cofre de segredos, a nova chave `GATEWAY_API_KEY` foi gerada, mas o painel do gateway mostra que a chave ativa ainda é a anterior.',
        question: 'Qual é a causa raiz e a mitigação mais rápida?',
        options: [
          { t: 'A chave nova não foi ativada no gateway; mitigar ativando-a no painel (ou voltando a chave anterior na aplicação, conforme o processo).', ok: true, why: 'A rotação ficou pela metade: a aplicação usa a chave nova, que o gateway ainda não aceita.' },
          { t: 'Bug no código do deploy v2.8.1; reverter todo o código.', ok: false, why: 'A mudança era de segredo, e o erro é de credencial. Reverter o código pode não resolver se o segredo continuar o mesmo.' },
          { t: 'Aumentar o timeout para 30 s.', ok: false, why: 'O erro é imediato (401), não um timeout.' },
        ],
        explain: 'Correlacionar com mudanças (deploy às 9h30, erro às 9h40) é decisivo. A causa raiz é de processo: a rotação de segredos não tinha uma etapa de verificação.',
      },
      {
        title: 'Prevenção',
        context: 'O serviço foi restaurado às 10h05 após ativar a chave no gateway.',
        question: 'Quais ações preventivas fazem sentido? (selecione todas as adequadas)',
        multi: true,
        options: [
          { t: 'Tratar o erro do gateway e responder ao usuário com uma mensagem clara (ex.: 502/503 com texto amigável), registrando o detalhe no log.', ok: true, why: 'Erros de dependência não devem virar 500 genérico; isso facilita diagnóstico e comunicação.' },
          { t: 'Incluir no procedimento de rotação de segredos um teste da integração antes de concluir.', ok: true, why: 'Fecha a lacuna do processo que causou o incidente.' },
          { t: 'Alertar quando a taxa de erros da integração de pagamentos passar de um limite.', ok: true, why: 'A detecção teria vindo antes dos chamados.' },
          { t: 'Desativar a rotação de segredos.', ok: false, why: 'Rotacionar segredos é uma boa prática de segurança; o problema foi a execução incompleta.' },
        ],
        explain: 'Escreva nas anotações do laboratório o registro do incidente: sintoma, escopo, linha do tempo, causa, mitigação e as ações preventivas. Use o modelo da lição de documentação.',
      },
    ],
    offline: null,
  },
  {
    id: 'lab-linuxlogs', title: 'Laboratório 3 — Analisar logs de um serviço Linux', modules: ['c2'], minutes: 40, where: 'hybrid',
    objective: 'Diagnosticar uma unit systemd que não inicia e praticar journalctl em uma máquina Linux real (ou WSL).',
    prereqText: 'Lições de systemd/journalctl e de permissões.',
    criteria: ['Concluir as etapas da simulação', 'Criar e quebrar de propósito um serviço de teste no seu Linux/WSL e diagnosticá-lo pelos logs'],
    stages: [
      {
        title: 'Status',
        context: '~~~\n$ systemctl status relatorios\n× relatorios.service - Gerador de relatórios\n     Active: failed (Result: exit-code)\n    Process: 9182 ExecStart=/opt/relatorios/venv/bin/python -m relatorios (code=exited, status=1/FAILURE)\n~~~',
        question: 'Qual é o próximo comando mais útil?',
        options: [
          { t: '`journalctl -u relatorios -n 50 --no-pager`', ok: true, why: 'status=1 é um erro genérico da aplicação; a mensagem detalhada está no log da unit.' },
          { t: '`systemctl restart relatorios` várias vezes.', ok: false, why: 'Sem saber a causa, vai falhar de novo e pode atingir o limite de reinícios.' },
          { t: '`reboot`', ok: false, why: 'Desproporcional e não informa nada.' },
        ],
        explain: 'status mostra **que** falhou; journalctl mostra **por quê**.',
      },
      {
        title: 'Log',
        context: '~~~\n$ journalctl -u relatorios -n 6 --no-pager\npython[9182]: Traceback (most recent call last):\npython[9182]:   File "/opt/relatorios/relatorios/__main__.py", line 12, in <module>\npython[9182]:     cfg = carregar("/etc/relatorios/config.toml")\npython[9182]: PermissionError: [Errno 13] Permission denied: \'/etc/relatorios/config.toml\'\n$ ls -l /etc/relatorios/config.toml\n-rw------- 1 root root 412 nov 23 18:20 /etc/relatorios/config.toml\n$ systemctl show relatorios -p User\nUser=relatorios\n~~~',
        question: 'Qual é a correção com menor privilégio?',
        options: [
          { t: 'Dar ao grupo do serviço permissão de leitura: `chgrp relatorios config.toml && chmod 640 config.toml`.', ok: true, why: 'O serviço roda como "relatorios" e só precisa ler. O root continua dono, e outros usuários não leem o arquivo (que pode ter segredos).' },
          { t: '`chmod 777 /etc/relatorios/config.toml`', ok: false, why: 'Qualquer usuário poderia ler e alterar a configuração.' },
          { t: 'Mudar a unit para User=root.', ok: false, why: 'Executar como root amplia muito o estrago em caso de falha ou invasão.' },
        ],
        explain: 'O arquivo foi alterado ontem às 18h20 (data no ls) — provavelmente recriado por alguém como root, com permissão 600. Vale registrar isso e incluir a permissão correta no processo de deploy/configuração.',
      },
      {
        title: 'Reincidência',
        context: 'Após corrigir, o serviço sobe. Dois dias depois, falha de novo com a mesma mensagem, logo após o deploy automático.',
        question: 'Qual é a melhor ação?',
        options: [
          { t: 'Ajustar a etapa do deploy que grava o config.toml para definir dono/grupo/permissão corretos (ex.: `install -m 640 -o root -g relatorios`).', ok: true, why: 'A causa raiz está no processo de deploy, que recria o arquivo com permissões erradas.' },
          { t: 'Corrigir manualmente após cada deploy.', ok: false, why: 'Trata o sintoma e garante a recorrência.' },
          { t: 'Desativar o deploy automático.', ok: false, why: 'Remove um benefício para contornar um detalhe corrigível.' },
        ],
        explain: 'Recorrência após cada deploy = problema de processo. É a diferença entre incidente e problema (ITIL) aplicada na prática.',
      },
    ],
    offline: {
      intro: '**Execute no seu Linux, em uma VM ou no WSL com systemd habilitado.** Use apenas uma máquina de testes sua. O site não verifica a execução.',
      steps: [
        'Crie `/opt/labsvc/run.sh` com `#!/usr/bin/env bash` e `while true; do echo "vivo $(date)"; sleep 5; done`, e dê permissão de execução (`chmod +x`).',
        'Crie `/etc/systemd/system/labsvc.service` com `[Service] ExecStart=/opt/labsvc/run.sh` e `User=nobody`, e uma seção `[Install] WantedBy=multi-user.target`.',
        'Execute `sudo systemctl daemon-reload && sudo systemctl start labsvc` e acompanhe com `journalctl -u labsvc -f`.',
        'Quebre de propósito: `sudo chmod 700 /opt/labsvc` e reinicie o serviço. Identifique o erro no `systemctl status` e no journalctl (deve aparecer um erro de permissão/203).',
        'Corrija a permissão e confirme que o serviço volta. Depois, pare e remova o serviço de teste (`systemctl disable --now labsvc`, apagar a unit e `daemon-reload`).',
      ],
    },
  },
  {
    id: 'lab-sql', title: 'Laboratório 4 — Consultas SQL com JOIN e GROUP BY', modules: ['a5', 'a6'], minutes: 50, where: 'hybrid',
    objective: 'Responder perguntas de suporte com SQL em um banco PostgreSQL local, criado a partir de um script fornecido.',
    prereqText: 'Lições de JOIN, anti-join e agregações. Docker instalado (ou PostgreSQL local).',
    criteria: ['Concluir as etapas da simulação', 'Criar o banco local e escrever as 5 consultas propostas', 'Conferir os resultados esperados indicados'],
    stages: [
      {
        title: 'Escolha da consulta',
        context: 'Tabelas: `clientes(id, nome)`, `pedidos(id, cliente_id, total, status)`.\nPergunta do chamado: *"Quais clientes nunca fizeram pedido?"*',
        question: 'Qual consulta responde corretamente?',
        options: [
          { t: '`SELECT c.nome FROM clientes c WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id);`', ok: true, why: 'Anti-join com NOT EXISTS: correto e robusto a NULL.' },
          { t: '`SELECT c.nome FROM clientes c JOIN pedidos p ON p.cliente_id = c.id WHERE p.id IS NULL;`', ok: false, why: 'INNER JOIN nunca produz p.id NULL; o resultado será vazio.' },
          { t: '`SELECT c.nome FROM clientes c WHERE c.id NOT IN (SELECT cliente_id FROM pedidos);`', ok: false, why: 'Funciona só se não houver cliente_id NULL em pedidos; com um NULL, retorna vazio.' },
        ],
        explain: 'LEFT JOIN … WHERE p.id IS NULL também estaria correto.',
      },
      {
        title: 'Resultado inflado',
        context: '~~~\nSELECT c.nome, SUM(p.total) AS faturado, COUNT(pg.id) AS pagamentos\nFROM clientes c\nJOIN pedidos p ON p.cliente_id = c.id\nLEFT JOIN pagamentos pg ON pg.pedido_id = p.id\nGROUP BY c.id, c.nome;\n~~~\nO "faturado" da cliente Ana aparece como R$ 900, mas ela tem um único pedido de R$ 300, pago em 3 parcelas.',
        question: 'Por que o valor está errado?',
        options: [
          { t: 'O JOIN com pagamentos repete o pedido 3 vezes (uma por parcela), e o SUM(p.total) soma 3 × 300.', ok: true, why: 'Fan-out 1:N. Agregue os pagamentos antes do JOIN, ou use subconsultas separadas para cada medida.' },
          { t: 'O LEFT JOIN deveria ser INNER.', ok: false, why: 'Com INNER, as linhas repetidas continuariam lá.' },
          { t: 'Falta DISTINCT no SELECT.', ok: false, why: 'DISTINCT não corrige somas; SUM(DISTINCT p.total) erraria quando dois pedidos tivessem o mesmo valor.' },
        ],
        explain: 'Regra prática: ao somar colunas de uma tabela, não faça JOIN com tabelas que multiplicam as linhas dela sem agregá-las antes.',
      },
    ],
    offline: {
      intro: '**Execute no seu computador.** Suba um PostgreSQL temporário com Docker:\n~~~\ndocker run --name lab-pg -e POSTGRES_PASSWORD=lab -p 5432:5432 -d postgres:16\ndocker exec -it lab-pg psql -U postgres\n~~~\nCole o script abaixo no psql para criar os dados:\n~~~\nCREATE TABLE clientes (id int PRIMARY KEY, nome text NOT NULL, cidade text);\nCREATE TABLE pedidos (id int PRIMARY KEY, cliente_id int, total numeric(10,2), status text, criado_em date);\nCREATE TABLE pagamentos (id int PRIMARY KEY, pedido_id int, valor numeric(10,2), pago_em date);\nINSERT INTO clientes VALUES (1,\'Ana\',\'Contagem\'),(2,\'Bruno\',\'Belo Horizonte\'),(3,\'Carla\',\'Betim\'),(4,\'Diego\',\'Belo Horizonte\'),(5,\'Eva\',NULL);\nINSERT INTO pedidos VALUES (10,1,300,\'pago\',\'2026-11-03\'),(11,2,120,\'pago\',\'2026-11-05\'),(12,2,80,\'cancelado\',\'2026-11-06\'),(13,4,500,\'pendente\',\'2026-11-10\'),(14,99,50,\'pago\',\'2026-11-11\'),(15,2,60,\'pago\',\'2026-11-20\');\nINSERT INTO pagamentos VALUES (100,10,100,\'2026-11-03\'),(101,10,100,\'2026-11-10\'),(102,10,100,\'2026-11-17\'),(103,11,120,\'2026-11-05\'),(104,15,60,\'2026-11-20\'),(105,14,50,\'2026-11-11\');\n~~~\nAo terminar: `docker rm -f lab-pg` remove o contêiner e os dados de teste.',
      steps: [
        'Q1 — Clientes sem nenhum pedido. **Esperado:** Carla e Eva.',
        'Q2 — Pedidos cujo cliente não existe (dado órfão). **Esperado:** pedido 14 (cliente 99).',
        'Q3 — Quantidade de pedidos por cliente, incluindo quem tem zero, ordenada da maior para a menor. **Esperado:** Bruno 3, Ana 1, Diego 1, Carla 0, Eva 0.',
        'Q4 — Total pago por pedido sem inflar valores (agregue pagamentos antes do JOIN). **Esperado:** pedido 10 = 300, 11 = 120, 15 = 60, 14 = 50; 12 e 13 = 0 (use COALESCE).',
        'Q5 — Clientes com mais de 1 pedido não cancelado em novembro/2026, usando HAVING e intervalo de datas semiaberto. **Esperado:** Bruno (2).',
      ],
    },
  },
  {
    id: 'lab-docker', title: 'Laboratório 5 — Contêiner Docker que reinicia continuamente', modules: ['c4'], minutes: 40, where: 'hybrid',
    objective: 'Diagnosticar um loop de reinício pelos logs e exit codes, e reproduzir o cenário localmente.',
    prereqText: 'Lição de Docker/Compose. Docker instalado para a parte local.',
    criteria: ['Concluir as etapas da simulação', 'Reproduzir localmente um contêiner com exit code 1 e outro com 137, e identificar cada um'],
    stages: [
      {
        title: 'Estado',
        context: '~~~\n$ docker compose ps\nNAME      STATUS\nworker    Restarting (1) 8 seconds ago\napi       Up 3 hours\nredis     Up 3 hours\n~~~',
        question: 'O que "Restarting (1)" indica e qual é o próximo comando?',
        options: [
          { t: 'O processo saiu com código 1 (erro da aplicação); ver `docker compose logs --tail 50 worker`.', ok: true, why: 'O número entre parênteses é o último exit code. O motivo está na saída do processo.' },
          { t: 'Falta de memória; aumentar o limite.', ok: false, why: 'Falta de memória geralmente aparece como 137 (SIGKILL), não 1.' },
          { t: 'O Docker está com defeito; reinstalar.', ok: false, why: 'Os outros serviços estão saudáveis.' },
        ],
        explain: 'Exit code primeiro, logs em seguida.',
      },
      {
        title: 'Logs',
        context: '~~~\n$ docker compose logs --tail 4 worker\nworker  | Iniciando worker de e-mails...\nworker  | KeyError: \'SMTP_HOST\'\nworker  | Iniciando worker de e-mails...\nworker  | KeyError: \'SMTP_HOST\'\n$ git log --oneline -1 -- compose.yaml\n7e1d2c0 refactor: mover variáveis do worker para env_file\n$ ls\ncompose.yaml  api.env\n~~~\nTrecho do compose.yaml:\n~~~\nworker:\n  env_file: worker.env\n~~~',
        question: 'Qual é a causa?',
        options: [
          { t: 'O compose aponta para `worker.env`, que não existe ou não foi criado no servidor após a refatoração; o worker inicia sem SMTP_HOST.', ok: true, why: 'O commit mais recente moveu variáveis para worker.env, e o arquivo não está no diretório.' },
          { t: 'O Redis está fora.', ok: false, why: 'O Redis está "Up", e o erro é de variável ausente.' },
          { t: 'Bug no código do worker.', ok: false, why: 'O código está correto ao exigir a variável; o problema é a configuração.' },
        ],
        explain: 'Dependendo da versão do Compose, um env_file inexistente gera erro ao subir. Aqui, imagine que o arquivo existe vazio no servidor. Prevenção: um `worker.env.example` versionado e a validação de variáveis no início do worker, com mensagem clara.',
      },
    ],
    offline: {
      intro: '**Execute no seu computador com Docker.** Os comandos criam contêineres de teste com a imagem pública `python:3.12-alpine`.',
      steps: [
        'Rode `docker run --name lab-exit1 --restart on-failure:3 python:3.12-alpine python -c "import os; os.environ[\'SMTP_HOST\']"`. Depois, `docker ps -a` e `docker logs lab-exit1`: identifique o KeyError e o exit code 1.',
        'Rode `docker inspect lab-exit1 --format "{{.State.ExitCode}} {{.RestartCount}}"` e confira o número de reinícios.',
        'Rode `docker run --name lab-oom -m 32m python:3.12-alpine python -c "x = bytearray(200_000_000)"` e depois `docker inspect lab-oom --format "{{.State.ExitCode}} {{.State.OOMKilled}}"`: espere 137 e true (em alguns ambientes, o Python pode falhar com MemoryError e código 1 — registre o que observou).',
        'Corrija o primeiro caso passando `-e SMTP_HOST=localhost` e confirme que o contêiner sai com código 0.',
        'Limpe tudo: `docker rm -f lab-exit1 lab-oom`.',
      ],
    },
  },
  {
    id: 'lab-python', title: 'Laboratório 6 — Script Python de disponibilidade de serviços', modules: ['d1'], minutes: 60, where: 'computer',
    objective: 'Escrever, no seu computador, um verificador configurável com timeouts, mensagens claras e exit code.',
    prereqText: 'Lição "Verificador de disponibilidade em Python". Python 3.10+ instalado.',
    criteria: [
      'Lê os alvos de um arquivo `alvos.json` (HTTP e TCP)',
      'Usa timeout em todas as verificações',
      'Diferencia DNS, recusa, timeout e erro HTTP na mensagem',
      'Mostra o tempo de resposta das verificações HTTP',
      'Retorna exit code 0 se todos estiverem ok e 1 se algum falhar',
      'Tem pelo menos 2 testes automatizados (ex.: com pytest e um servidor local ou mocks)',
    ],
    stages: [
      {
        title: 'Leitura de código',
        context: '~~~\ndef check(url):\n    try:\n        r = urllib.request.urlopen(url)\n        return True\n    except Exception:\n        return False\n~~~',
        question: 'Quais são os problemas desta função? (selecione todos)',
        multi: true,
        options: [
          { t: 'Não tem timeout: pode travar indefinidamente.', ok: true, why: 'Sem timeout, uma conexão que não responde prende o script.' },
          { t: 'O `except Exception` esconde o motivo da falha.', ok: true, why: 'DNS, recusa, timeout e HTTP 500 viram apenas "False", sem diagnóstico.' },
          { t: 'Não fecha a resposta (falta `with`).', ok: true, why: 'Recursos (sockets) ficam abertos até o coletor de lixo agir.' },
          { t: 'Usar urllib é proibido para HTTPS.', ok: false, why: 'urllib suporta HTTPS e valida certificados por padrão.' },
        ],
        explain: 'Compare com a versão da lição: with, timeout, exceções específicas e mensagem com o motivo.',
      },
    ],
    offline: {
      intro: '**Atividade no seu computador.** Crie uma pasta `verificador/` com `verificador.py`, `alvos.json` e `test_verificador.py`. Este site não executa nem avalia o seu código: use os critérios de conclusão como checklist.\n\nExemplo de `alvos.json`:\n~~~\n[\n  {"tipo": "http", "nome": "site", "url": "https://example.com", "esperado": 200},\n  {"tipo": "tcp", "nome": "postgres-local", "host": "localhost", "porta": 5432},\n  {"tipo": "tcp", "nome": "porta-fechada", "host": "localhost", "porta": 6553}\n]\n~~~\nSaída esperada (formato sugerido):\n~~~\n[OK  ] site            HTTP 200 em 184 ms\n[ERRO] postgres-local  conexão recusada\n[ERRO] porta-fechada   conexão recusada\n~~~',
      steps: [
        'Implemente `check_http` e `check_tcp` com timeout e exceções específicas.',
        'Leia `alvos.json` com `json.load` e use `argparse` para aceitar `--config` e `--timeout`.',
        'Imprima uma linha por alvo, com nome alinhado, estado e motivo.',
        'Retorne `sys.exit(1)` se algum alvo falhar; confira com `echo $LASTEXITCODE` (PowerShell) ou `echo $?` (Linux).',
        'Escreva 2 testes com pytest: um para porta fechada (ex.: localhost em uma porta livre) e um para HTTP usando `http.server` em uma thread, ou com mock.',
        'Opcional: agende a execução (Agendador de Tarefas do Windows ou cron) e grave a saída em um arquivo de log.',
      ],
    },
  },
  {
    id: 'lab-pipeline', title: 'Laboratório 7 — Pipeline com variáveis de ambiente ausentes', modules: ['c5'], minutes: 30, where: 'browser',
    objective: 'Investigar um deploy "verde" que publicou um front-end quebrado e propor a prevenção.',
    prereqText: 'Lição "Pipelines, variáveis de ambiente e segredos".',
    criteria: ['Concluir as 3 etapas', 'Escrever nas anotações a checagem de variáveis que você colocaria na pipeline'],
    stages: [
      {
        title: 'Sintoma',
        context: 'Após o deploy em **staging-2**, a tela de login abre, mas ao clicar em "Entrar" nada acontece. Console do navegador:\n~~~\nPOST https://staging-2.app.exemplo/undefined/auth/login 404\n~~~\nA pipeline terminou com sucesso (verde).',
        question: 'O que o "undefined" na URL sugere?',
        options: [
          { t: 'A URL base da API não foi definida no build do front-end.', ok: true, why: 'Variáveis de build ausentes viram a string "undefined" no JavaScript gerado.' },
          { t: 'A API de autenticação está fora do ar.', ok: false, why: 'A requisição nem foi para a API: o caminho está errado.' },
          { t: 'O usuário digitou a senha errada.', ok: false, why: 'Senha errada geraria 401 na rota correta.' },
        ],
        explain: 'O 404 é consequência do caminho inválido, não de uma rota inexistente na API.',
      },
      {
        title: 'Configuração',
        context: '~~~\n# bitbucket-pipelines.yml (trecho)\n- step:\n    name: Build e deploy staging-2\n    deployment: staging-2\n    script:\n      - npm ci\n      - npm run build\n      - rsync -az dist/ deploy@$STAGING2_HOST:/var/www/app/\n\n# Variáveis do deployment\nstaging-1:  VITE_API_URL ✓   STAGING1_HOST ✓\nstaging-2:  STAGING2_HOST ✓                      (ambiente criado na semana passada)\nstaging-3:  VITE_API_URL ✓   STAGING3_HOST ✓\n~~~',
        question: 'Qual é a causa raiz e a correção?',
        options: [
          { t: 'O ambiente staging-2 foi criado sem VITE_API_URL; adicionar a variável a esse deployment e rodar a pipeline novamente (novo build).', ok: true, why: 'Cada deployment tem as próprias variáveis. Como a variável é de build, é preciso gerar o build de novo.' },
          { t: 'Editar o arquivo JS já publicado no servidor, trocando undefined pela URL.', ok: false, why: 'Contorno frágil: o próximo deploy desfaz a edição, e o processo continua quebrado.' },
          { t: 'Copiar as variáveis de produção para staging-2.', ok: false, why: 'Staging apontando para a API de produção pode causar efeitos reais (dados, cobranças).' },
        ],
        explain: 'Ambientes criados por cópia manual são uma fonte clássica de divergência. Ter uma lista de variáveis obrigatórias documentada (ou validada) evita isso.',
      },
      {
        title: 'Prevenção',
        context: 'Você quer que a pipeline falhe se faltar alguma variável obrigatória.',
        question: 'Qual abordagem é a mais adequada?',
        options: [
          { t: 'Um passo no início do script que verifica as variáveis obrigatórias e termina com `exit 1` e uma mensagem clara se alguma estiver vazia.', ok: true, why: 'Falha cedo, com uma mensagem que diz exatamente o que falta.' },
          { t: 'Usar um valor padrão de produção quando a variável estiver vazia.', ok: false, why: 'Esconde o erro e pode ligar staging à produção.' },
          { t: 'Revisar manualmente antes de cada deploy.', ok: false, why: 'Depende de memória e atenção; é fácil esquecer.' },
        ],
        explain: 'Anote nas anotações do laboratório o trecho de script que você usaria (veja o exemplo da lição) e como explicaria esse caso em uma entrevista, relacionando-o à sua experiência real com pipelines de staging.',
      },
    ],
    offline: null,
  },
];
