// Trilha A — Suporte a aplicações: lições e banco de perguntas.
// Formato de texto: Markdown simples (parágrafos, listas "- ", **negrito**, `código`, blocos ~~~).

export const lessons = [
  // ---------------- a1 ----------------
  {
    id: 'a1-l1', moduleId: 'a1', title: 'Anatomia de uma requisição HTTP', minutes: 20,
    objective: 'Ler uma requisição e uma resposta HTTP e saber o que cada parte revela durante um diagnóstico.',
    explanation: `
HTTP é um protocolo de **pedido e resposta**. O cliente (navegador, app, Postman, curl ou outro serviço) envia uma requisição; o servidor devolve uma resposta. Tudo o que você precisa para começar um diagnóstico está nessas duas mensagens.

**Requisição:** linha inicial com **método**, **caminho** e versão; **cabeçalhos** (Host, Authorization, Content-Type, Accept, Cookie); e, opcionalmente, um **corpo** (JSON de um POST, por exemplo).

**Resposta:** **código de status**, cabeçalhos (Content-Type, Set-Cookie, Cache-Control, Location) e corpo.

**Métodos e o que se espera deles:**
- \`GET\` lê dados. Não deve alterar estado. É **seguro** e **idempotente**.
- \`POST\` cria ou dispara uma ação. **Não** é idempotente: repetir pode criar duplicatas.
- \`PUT\` substitui um recurso inteiro. Idempotente: enviar duas vezes produz o mesmo resultado.
- \`PATCH\` altera parte de um recurso.
- \`DELETE\` remove. Idempotente: apagar algo já apagado não muda o estado final (a resposta pode ser 404).

**Idempotência importa no suporte:** quando um usuário diz "cliquei duas vezes e foram criados dois pedidos", a causa costuma ser um POST repetido sem proteção (chave de idempotência, bloqueio do botão ou verificação no servidor).

**Cabeçalhos que mais aparecem em chamados:**
- \`Content-Type\`: formato do corpo enviado. Enviar JSON sem \`Content-Type: application/json\` pode causar 400 ou 415.
- \`Authorization\`: credencial (ex.: \`Bearer <token>\`). Ausente ou inválida → 401.
- \`Host\`: qual site o servidor deve atender. Proxies e servidores com vários sites usam esse cabeçalho para escolher o destino.
- \`Cache-Control\` / \`ETag\`: explicam por que o usuário "não vê a alteração" (resposta em cache).

**Onde enxergar isso:** a aba Network do DevTools (F12) mostra método, URL, status, cabeçalhos, corpo e tempo de cada chamada. É a primeira ferramenta para chamados de sistemas web.
`,
    example: {
      title: 'Lendo uma chamada no curl -v',
      body: `
~~~
$ curl -v -X POST https://api.exemplo.com/v1/pedidos \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer eyJhbGciOi..." \\
    -d '{"cliente_id": 42, "itens": [{"sku": "A1", "qtd": 2}]}'

> POST /v1/pedidos HTTP/2
> Host: api.exemplo.com
> Content-Type: application/json
> Authorization: Bearer eyJhbGciOi...
>
< HTTP/2 201
< content-type: application/json
< location: /v1/pedidos/9817
<
{"id": 9817, "status": "criado"}
~~~
Linhas com \`>\` são o que **foi enviado**; com \`<\`, o que **voltou**. O status 201 (Created) e o cabeçalho \`location\` mostram que o recurso foi criado e onde encontrá-lo. Se o usuário disser que "não salvou", você já sabe que o servidor confirmou a criação — o problema está em outro lugar (listagem, cache, filtro de tela).
`,
    },
    exercise: {
      prompt: 'Um usuário relata que, ao clicar em "Finalizar compra" com a internet lenta, às vezes são gerados **dois pedidos iguais**. No DevTools você vê duas requisições `POST /pedidos` com status 201, com 2 segundos de intervalo. Qual é a explicação mais provável?',
      options: [
        { t: 'O servidor tem um bug no GET que duplica registros na listagem.', ok: false, why: 'As duas requisições registradas são POST com 201: foram duas criações reais, não um problema de exibição.' },
        { t: 'O POST não é idempotente e o cliente enviou a requisição duas vezes (duplo clique ou nova tentativa), sem proteção no servidor.', ok: true, why: 'Duas chamadas POST bem-sucedidas criam dois recursos. A correção típica combina desabilitar o botão após o clique e usar uma chave de idempotência ou verificação de duplicidade no servidor.' },
        { t: 'O certificado TLS expirou e o navegador reenviou a requisição.', ok: false, why: 'Com certificado expirado, a conexão falharia antes de qualquer resposta 201.' },
        { t: 'O PUT foi usado no lugar do POST.', ok: false, why: 'As chamadas são POST. Além disso, PUT é idempotente: repeti-lo não criaria dois recursos.' },
      ],
      explain: 'O raciocínio parte da evidência (duas chamadas POST 201) e não do relato ("o sistema duplicou"). Hipóteses alternativas a considerar: um retry automático do cliente HTTP ou um proxy que reenviou após timeout — ambas também explicam o padrão, e a correção no servidor (idempotência) protege contra todas.',
    },
    summary: [
      'Requisição = método + caminho + cabeçalhos + corpo; resposta = status + cabeçalhos + corpo.',
      'GET, PUT e DELETE são idempotentes; POST não é.',
      'Content-Type, Authorization, Host e Cache-Control explicam muitos chamados.',
      'DevTools (Network) e curl -v mostram exatamente o que foi enviado e recebido.',
    ],
    related: ['a2-l1', 'a4-l2'],
    docs: [
      { label: 'MDN — Visão geral do HTTP', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview' },
      { label: 'RFC 9110 — Semântica do HTTP', url: 'https://www.rfc-editor.org/rfc/rfc9110' },
    ],
  },
  {
    id: 'a1-l2', moduleId: 'a1', title: 'HTTPS, TLS e certificados', minutes: 15,
    objective: 'Entender o que o HTTPS protege e diagnosticar erros de certificado comuns.',
    explanation: `
**HTTPS = HTTP dentro de uma conexão TLS.** O TLS garante três coisas: **confidencialidade** (ninguém no caminho lê o conteúdo), **integridade** (ninguém altera sem ser detectado) e **autenticidade do servidor** (o certificado prova que você está falando com o domínio certo).

**Como o cliente confia no servidor:** o servidor apresenta um certificado emitido por uma Autoridade Certificadora (CA). O cliente verifica:
- se o certificado está **dentro da validade**;
- se o **nome** (domínio) bate com o endereço acessado (campo SAN);
- se a **cadeia** até uma CA confiável está completa (certificado intermediário incluído).

**Erros que viram chamados:**
- **Certificado expirado** → todos os usuários afetados ao mesmo tempo, geralmente em uma data "redonda". Verifique a validade.
- **Nome não confere** → acesso por IP ou por um subdomínio não coberto pelo certificado.
- **Cadeia incompleta** → funciona no navegador (que às vezes completa a cadeia sozinho), mas falha em integrações, \`curl\` ou apps Java/Python.
- **Relógio errado no cliente** → um computador com data muito errada pode considerar válido um certificado expirado (ou inválido um certificado em dia). Ocorre em máquinas com bateria da placa-mãe fraca.
- **Inspeção TLS corporativa** → proxies de empresas substituem o certificado; integrações falham se a CA corporativa não estiver instalada.

**O que o HTTPS não protege:** ele não impede que um usuário autenticado acesse dados de outro (isso é autorização) e não valida o conteúdo enviado. A porta padrão é 443; HTTP usa 80.
`,
    example: {
      title: 'Verificando validade e emissor',
      body: `
~~~
$ curl -vI https://intranet.exemplo.com 2>&1 | grep -E "expire|subject|issuer|SSL"
*  subject: CN=intranet.exemplo.com
*  expire date: Nov 20 23:59:59 2026 GMT
*  issuer: C=US; O=Let's Encrypt; CN=R11
*  SSL certificate problem: certificate has expired
~~~
O \`expire date\` já passou: a correção é renovar o certificado no servidor. Não oriente o usuário a "aceitar o risco": isso apenas esconde o sintoma e acostuma o usuário a ignorar alertas de segurança.

Para testar sem o curl, \`openssl s_client -connect intranet.exemplo.com:443 -servername intranet.exemplo.com\` mostra a cadeia apresentada pelo servidor.
`,
    },
    exercise: {
      prompt: 'Uma integração em Python passou a falhar com `CERTIFICATE_VERIFY_FAILED: unable to get local issuer certificate` ao chamar a API de um parceiro. Pelo navegador, a mesma URL abre normalmente com cadeado. Qual hipótese investigar primeiro?',
      options: [
        { t: 'O certificado do parceiro expirou.', ok: false, why: 'Se tivesse expirado, o navegador também mostraria erro. A mensagem fala em emissor (issuer) não encontrado, não em expiração.' },
        { t: 'O servidor do parceiro não envia o certificado intermediário (cadeia incompleta).', ok: true, why: 'Navegadores podem buscar intermediários sozinhos ou já tê-los em cache; bibliotecas como a do Python normalmente não fazem isso. "Unable to get local issuer" é a mensagem típica dessa situação.' },
        { t: 'A API está retornando 500.', ok: false, why: 'O erro acontece na negociação TLS, antes de qualquer resposta HTTP.' },
        { t: 'Desativar a verificação de certificado no código resolve definitivamente.', ok: false, why: 'Isso remove a proteção contra interceptação. É aceitável apenas como teste pontual de diagnóstico, nunca como correção.' },
      ],
      explain: 'A diferença de comportamento entre navegador e cliente programático é a pista principal. Outra hipótese possível: a máquina da integração está atrás de um proxy corporativo com inspeção TLS, cuja CA não está no repositório de confiança do Python. Em ambos os casos, verifique a cadeia com `openssl s_client -showcerts`.',
    },
    summary: [
      'TLS garante confidencialidade, integridade e autenticidade do servidor.',
      'Verifique validade, nome (SAN) e cadeia completa.',
      'Funciona no navegador mas falha no código → suspeite de cadeia incompleta ou proxy com inspeção.',
      'Nunca desative a verificação de certificado como solução.',
    ],
    related: ['a1-l1', 'b3-l1'],
    docs: [{ label: 'MDN — Transport Layer Security', url: 'https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security' }],
  },

  // ---------------- a2 ----------------
  {
    id: 'a2-l1', moduleId: 'a2', title: '4xx: o problema está na requisição', minutes: 20,
    objective: 'Interpretar os principais códigos 4xx e saber o que verificar em cada um.',
    explanation: `
Códigos **4xx** indicam que o servidor recebeu a requisição, mas a recusou por algo relacionado **ao que o cliente enviou ou a quem está enviando**. O servidor está funcionando. Isso muda a investigação: você olha dados, credenciais, permissões e URL — não CPU ou infraestrutura.

- **400 Bad Request** — requisição malformada: JSON inválido, campo com tipo errado, parâmetro obrigatório ausente. Veja o corpo da resposta: APIs bem feitas dizem qual campo falhou.
- **401 Unauthorized** — na prática, "não autenticado": sem credencial, token expirado, assinatura inválida. A solução passa por autenticar de novo.
- **403 Forbidden** — autenticado, mas **sem permissão** para aquele recurso ou ação. Repetir o login não resolve; é preciso ajustar papel, grupo, escopo ou tenant.
- **404 Not Found** — recurso ou rota inexistente. Pode ser URL errada, id que não existe, rota removida em um deploy ou, em algumas APIs, um recurso de outro tenant (muitas APIs respondem 404 para não revelar que o recurso existe).
- **405 Method Not Allowed** — a rota existe, mas não aceita aquele método (ex.: GET onde só há POST).
- **409 Conflict** — conflito com o estado atual: registro duplicado, versão desatualizada.
- **415 Unsupported Media Type** — Content-Type não aceito.
- **422 Unprocessable Content** — formato correto, mas regra de negócio violada (ex.: data final antes da inicial). Comum no FastAPI para erros de validação.
- **429 Too Many Requests** — limite de taxa. Veja o cabeçalho \`Retry-After\`.

**Pergunta-chave no 4xx:** "o que essa requisição tem de diferente das que funcionam?" Compare usuário, payload, URL, horário e versão do app.
`,
    example: {
      title: 'Mesma rota, usuários diferentes',
      body: `
~~~
# usuário A (funciona)
GET /api/relatorios/financeiro  → 200
# usuário B (chamado aberto)
GET /api/relatorios/financeiro  → 403 {"detail": "permissão 'financeiro:ler' necessária"}
~~~
Os dois estão autenticados (senão seria 401). O 403 e a mensagem indicam falta de permissão. O próximo passo é verificar o papel do usuário B — e confirmar com o responsável se ele **deveria** ter esse acesso antes de concedê-lo. Conceder permissão sem aprovação é um risco de segurança, não uma solução de suporte.
`,
    },
    exercise: {
      prompt: 'Após um deploy, o app mobile passou a receber **404** em `GET /api/v1/clientes/123`, enquanto a versão web, atualizada, usa `/api/v2/clientes/123` e funciona. O que é mais provável?',
      options: [
        { t: 'O cliente 123 foi apagado do banco.', ok: false, why: 'A versão web consegue ler o mesmo cliente pela v2, então o registro existe.' },
        { t: 'A rota v1 foi removida ou alterada no deploy, e o app mobile ainda usa a rota antiga.', ok: true, why: 'O 404 apareceu logo após o deploy e afeta apenas a rota antiga. Isso aponta para quebra de compatibilidade: manter a v1 por um período ou atualizar o app.' },
        { t: 'O token do app expirou.', ok: false, why: 'Token expirado gera 401, não 404.' },
        { t: 'O servidor está sobrecarregado.', ok: false, why: 'Sobrecarga gera 503/504 ou lentidão, não 404 em uma rota específica.' },
      ],
      explain: 'Correlação com mudança recente ("após o deploy") é uma das pistas mais fortes em suporte. Confirme comparando a lista de rotas (Swagger/OpenAPI) antes e depois do deploy. Hipótese alternativa: um proxy/gateway com regra de roteamento alterada para /v1 — o log do gateway mostraria se a requisição chegou à aplicação.',
    },
    summary: [
      '4xx = servidor funcionando; o problema está na requisição ou em quem a faz.',
      '401 = não autenticado; 403 = autenticado sem permissão.',
      '404 após deploy → suspeite de rota alterada.',
      'Compare a requisição que falha com uma que funciona.',
    ],
    related: ['a2-l2', 'a3-l1'],
    docs: [{ label: 'MDN — Códigos de status HTTP', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status' }],
  },
  {
    id: 'a2-l2', moduleId: 'a2', title: '5xx: 500, 502, 503 e 504', minutes: 25,
    objective: 'Identificar qual componente gerou um erro 5xx e onde procurar a causa.',
    explanation: `
Erros **5xx** indicam falha **do lado do servidor**. A pergunta mais útil é: **qual componente gerou esse status?** Em arquiteturas comuns, a requisição passa por vários pontos: **balanceador/proxy (Nginx) → servidor de aplicação (Gunicorn, Tomcat) → aplicação → banco/serviços externos.**

- **500 Internal Server Error** — gerado pela **aplicação**: exceção não tratada, bug, erro em query, dado inesperado. O lugar certo para procurar é o log da aplicação (stack trace).
- **502 Bad Gateway** — gerado pelo **proxy**: ele tentou falar com a aplicação (upstream) e recebeu uma resposta inválida ou a conexão foi recusada/fechada. Causas: aplicação parada, porta errada no \`proxy_pass\`, worker que morreu no meio da resposta (ex.: worker Gunicorn morto por timeout ou falta de memória).
- **503 Service Unavailable** — serviço **temporariamente indisponível**: manutenção, sobrecarga, nenhuma instância saudável no balanceador, limite de conexões. Pode ser gerado pelo proxy, pelo balanceador ou pela própria aplicação.
- **504 Gateway Timeout** — o proxy esperou a aplicação e o **tempo acabou**. A aplicação está viva, mas lenta: consulta pesada, chamada externa travada, lock no banco.

**Roteiro prático:**
1. Escopo: todos os usuários ou alguns? Todas as rotas ou uma? Desde quando?
2. Qual componente respondeu? Corpo HTML com "nginx" → o próprio proxy gerou o erro.
3. Log do proxy (\`/var/log/nginx/error.log\`) para 502/504; log da aplicação para 500.
4. A aplicação está rodando? (\`systemctl status\`, \`docker ps\`). A porta está escutando? (\`ss -tlnp\`)
5. Mudança recente: deploy, migração, variável de ambiente, aumento de carga?

**Erro comum:** tratar 502 como "bug no código". Muitas vezes o código nem chegou a executar.
`,
    example: {
      title: '502 com worker Gunicorn morto',
      body: `
~~~
# /var/log/nginx/error.log
upstream prematurely closed connection while reading response header from upstream,
  client: 10.0.3.15, request: "GET /relatorios/producao HTTP/1.1",
  upstream: "http://127.0.0.1:8000/relatorios/producao"

# journalctl -u gunicorn
[CRITICAL] WORKER TIMEOUT (pid:2314)
[INFO] Booting worker with pid: 2398
~~~
O Nginx recebeu a conexão fechada porque o Gunicorn matou o worker que passou do \`--timeout\` (padrão de 30 s). A rota é um relatório pesado. Aumentar o timeout pode mitigar, mas a causa raiz é a lentidão da consulta — o tipo de situação em que otimizar a query (como a melhoria de ~50 s para ~11 s) resolve de verdade.
`,
    },
    exercise: {
      prompt: 'Às 14h, todos os usuários passam a receber **502** em todas as rotas. Às 13h55 houve um deploy. O que você verifica **primeiro**? (selecione as duas melhores ações iniciais)',
      multi: true,
      options: [
        { t: 'Se o processo da aplicação está rodando e escutando na porta configurada no proxy.', ok: true, why: 'Erro 502 geral logo após o deploy sugere que o upstream não sobe ou está em outra porta. É um teste rápido e decisivo.' },
        { t: 'O log da aplicação/serviço desde o deploy (erro de inicialização, variável ausente, migração).', ok: true, why: 'Se a aplicação não iniciou, o motivo estará no log de inicialização: variável de ambiente faltando, migração falhando, dependência ausente.' },
        { t: 'Reiniciar o servidor de banco de dados.', ok: false, why: 'Não há evidência de problema no banco, e reiniciá-lo afeta outros sistemas. Ações invasivas sem evidência podem ampliar o incidente.' },
        { t: 'Pedir aos usuários que limpem o cache do navegador.', ok: false, why: 'O 502 é gerado no servidor; o cache do cliente não muda isso.' },
      ],
      explain: 'Erro geral + deploy recente → a mudança é a principal suspeita. Se a causa não for encontrada rapidamente, a **mitigação** (rollback para a versão anterior) pode vir antes da causa raiz: restaurar o serviço é prioridade em incidentes, e a investigação continua depois.',
    },
    summary: [
      '500 → aplicação; 502 → proxy sem resposta válida do upstream; 503 → indisponível/sobrecarga; 504 → upstream lento.',
      'Descubra qual componente gerou o status antes de olhar o código.',
      '502/504: log do proxy; 500: log da aplicação.',
      'Erro geral após deploy → considere rollback como mitigação.',
    ],
    related: ['c3-l1', 'a4-l1', 'a7-l1'],
    docs: [
      { label: 'MDN — Códigos de status HTTP', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status' },
      { label: 'Nginx — módulo proxy', url: 'https://nginx.org/en/docs/http/ngx_http_proxy_module.html' },
    ],
  },

  // ---------------- a3 ----------------
  {
    id: 'a3-l1', moduleId: 'a3', title: 'Sessões, JWT e o 401 × 403', minutes: 25,
    objective: 'Diagnosticar falhas de autenticação e autorização, incluindo tokens JWT e sistemas multi-tenant.',
    explanation: `
- **Autenticação**: provar **quem você é** (login, token, certificado).
- **Autorização**: decidir **o que você pode fazer** (papéis, permissões, escopos, tenant).

**Sessão × token:**
- Em **sessões**, o servidor guarda o estado e o navegador envia um cookie com o id da sessão. Se o servidor reinicia sem armazenamento compartilhado (ex.: sessões em memória com várias instâncias), usuários "caem" aleatoriamente.
- Em **tokens (JWT)**, o próprio token carrega informações (claims) assinadas. O servidor valida a **assinatura** e a **expiração** (\`exp\`) sem consultar um armazenamento de sessão.

**Estrutura do JWT:** três partes em Base64URL separadas por ponto: \`header.payload.assinatura\`. O payload **não é criptografado**, apenas codificado: qualquer pessoa com o token consegue lê-lo. Nunca coloque senhas ou dados sensíveis nele, e trate o token como uma credencial — não cole tokens de produção em sites externos para decodificar.

**Claims comuns:** \`sub\` (usuário), \`exp\` (expiração, em segundos desde 1970), \`iat\` (emissão), \`roles\`/\`scope\`, e em multi-tenant algo como \`tenant_id\`.

**Diagnóstico por sintoma:**
- 401 depois de um tempo logado → token expirou; o refresh falhou ou não existe.
- 401 apenas em um ambiente → chave/segredo de assinatura diferente entre ambientes (ex.: variável \`JWT_SECRET\` diferente entre staging e produção, ou entre instâncias).
- 401 aleatório com várias instâncias → instâncias com segredos diferentes ou relógios dessincronizados (\`exp\`/\`nbf\` dependem do horário).
- 403 → token válido, mas papel/escopo insuficiente.
- Dados de outro cliente aparecendo → **falha grave de isolamento de tenant**: filtro por \`tenant_id\` ausente em alguma consulta. É um incidente de segurança; escale imediatamente.
`,
    example: {
      title: 'Lendo um payload JWT localmente',
      body: `
~~~
$ echo 'eyJzdWIiOiIxMjMiLCJ0ZW5hbnRfaWQiOjcsInJvbGVzIjpbInZlbmRhcyJdLCJleHAiOjE3OTQ1MDAwMDB9' | base64 -d
{"sub":"123","tenant_id":7,"roles":["vendas"],"exp":1794500000}

$ date -d @1794500000
~~~
O usuário 123 pertence ao tenant 7 e tem apenas o papel "vendas". Se ele recebe 403 no módulo financeiro, o comportamento está correto: a pergunta passa a ser se o papel dele deveria incluir esse acesso. (Base64URL pode exigir ajuste de padding com \`=\` para o \`base64 -d\` funcionar.)
`,
    },
    exercise: {
      prompt: 'Em um sistema multi-tenant com 3 instâncias atrás de um balanceador, usuários relatam **401 intermitente**: às vezes a mesma ação funciona, às vezes não, sem que tenham saído do sistema. Qual a hipótese mais forte?',
      options: [
        { t: 'Os usuários estão digitando a senha errada.', ok: false, why: 'Eles já estão autenticados; o 401 ocorre em requisições comuns, sem novo login.' },
        { t: 'Uma das instâncias usa um segredo de assinatura JWT diferente (ou está com relógio errado), então rejeita tokens emitidos pelas outras.', ok: true, why: 'O padrão intermitente com várias instâncias sugere que algumas instâncias se comportam de forma diferente. Comparar a configuração (variáveis de ambiente) e o horário das instâncias confirma.' },
        { t: 'Falta permissão no papel do usuário.', ok: false, why: 'Falta de permissão gera 403 consistente, não 401 intermitente.' },
        { t: 'O banco de dados está lento.', ok: false, why: 'Lentidão gera timeouts (504) ou demora, não falha de autenticação.' },
      ],
      explain: 'Intermitente + várias instâncias é um padrão clássico: o balanceador distribui requisições e só uma parte cai na instância com problema. Para confirmar, procure nos logs qual instância respondeu 401 (hostname/container id). Hipóteses alternativas: sessões em memória sem armazenamento compartilhado (se o sistema usar sessão) ou um deploy parcial, em que nem todas as instâncias foram atualizadas.',
    },
    summary: [
      'Autenticação = quem é; autorização = o que pode.',
      'JWT: payload legível, assinatura verificada, exp define a validade.',
      '401 intermitente com várias instâncias → configuração ou horário divergentes.',
      'Vazamento entre tenants é incidente de segurança: escale imediatamente.',
    ],
    related: ['a2-l1', 'c5-l1'],
    docs: [{ label: 'RFC 7519 — JSON Web Token', url: 'https://www.rfc-editor.org/rfc/rfc7519' }],
  },

  // ---------------- a4 ----------------
  {
    id: 'a4-l1', moduleId: 'a4', title: 'Lendo logs com método', minutes: 25,
    objective: 'Encontrar rapidamente a linha de log relevante e distinguir causa raiz de erros em cascata.',
    explanation: `
Logs são a memória do sistema. O desafio não é ter logs, é **achar a linha certa**.

**1. Delimite antes de procurar.** Pergunte: horário aproximado, usuário/cliente, ação executada, mensagem exibida. Com isso você filtra por **janela de tempo** e **identificadores**.

**2. Use identificadores de correlação.** Sistemas bem instrumentados geram um **request id** (ou trace id) por requisição e o registram em todos os componentes (proxy, aplicação, workers). Com ele, você segue uma requisição de ponta a ponta. Se o sistema não tiver, sugerir a inclusão é uma melhoria valiosa.

**3. Entenda os níveis.** DEBUG < INFO < WARNING < ERROR < CRITICAL. Filtrar por ERROR ajuda, mas a causa às vezes aparece antes como WARNING (ex.: "pool de conexões perto do limite").

**4. Procure o primeiro erro, não o mais barulhento.** Uma falha costuma gerar uma **cascata**: o banco recusa conexões → cada requisição registra um erro → 500 em todas as rotas. Os milhares de erros "500" são consequência; a causa é a primeira linha anômala no tempo.

**5. Compare com o normal.** Como é o log de uma requisição bem-sucedida? A diferença revela onde o fluxo quebrou.

**Ferramentas de linha de comando:**
- \`grep -i "erro" app.log\` — filtra linhas; \`-C 5\` mostra 5 linhas de contexto.
- \`grep "req_id=8f2a" *.log\` — segue uma requisição.
- \`tail -f app.log\` — acompanha em tempo real enquanto o usuário reproduz.
- \`awk '{print $9}' access.log | sort | uniq -c | sort -rn\` — conta status HTTP no log de acesso do Nginx (formato padrão).
- \`journalctl -u servico --since "14:00" --until "14:15"\` — logs de um serviço systemd em uma janela.
`,
    example: {
      title: 'Causa raiz no meio da cascata',
      body: `
~~~
14:02:11 WARNING db.pool  pool size 20 reached, waiting for connection
14:02:41 ERROR   db.pool  QueuePool limit of size 20 overflow 0 reached, connection timed out
14:02:41 ERROR   api      GET /pedidos 500 req_id=a91f
14:02:42 ERROR   api      GET /clientes 500 req_id=a920
... (centenas de linhas iguais)
14:01:58 INFO    jobs     iniciando exportacao_mensal (sem limite de linhas)
~~~
Os 500 são consequência. A sequência aponta: um job de exportação iniciou às 14:01:58, ocupou conexões e esgotou o pool. A investigação segue no job (consulta sem paginação? conexões não devolvidas ao pool?), e não nas rotas /pedidos e /clientes.
`,
    },
    exercise: {
      prompt: 'Um usuário diz: "Às 10h tentei emitir a nota e deu erro". O sistema tem request id e logs centralizados. Qual é a melhor sequência de busca?',
      options: [
        { t: 'Buscar todas as linhas ERROR do dia e ler uma por uma.', ok: false, why: 'Funciona em sistemas pequenos, mas desperdiça tempo e pode levar à primeira linha de erro que não tem relação com o caso.' },
        { t: 'Filtrar 9h50–10h10 pelo usuário e pela rota de emissão, achar o request id da chamada com erro e seguir esse id em todos os componentes.', ok: true, why: 'Delimitar por tempo e identidade reduz o volume, e o request id liga proxy, aplicação e serviços externos à mesma requisição.' },
        { t: 'Reiniciar o serviço de notas e pedir para o usuário tentar novamente.', ok: false, why: 'Reiniciar pode apagar evidências (estado em memória) e não explica a causa. Só faria sentido como mitigação em incidente ativo e amplo.' },
        { t: 'Pedir um print ao usuário e encerrar o chamado se a tela não mostrar detalhes.', ok: false, why: 'O print ajuda, mas a investigação técnica é responsabilidade do suporte; os logs têm mais informações que a tela.' },
      ],
      explain: 'Método: delimitar (tempo, usuário, ação) → localizar a requisição → seguir o id → identificar o primeiro erro. Se não houver request id, use horário + usuário + rota e cruze o log do proxy com o da aplicação pelo timestamp. Hipótese a manter em aberto: o erro pode estar em um serviço externo (ex.: o serviço da prefeitura/SEFAZ), e o log mostrará a resposta dele.',
    },
    summary: [
      'Delimite por tempo, usuário e ação antes de buscar.',
      'Request id liga todos os componentes de uma requisição.',
      'Procure o primeiro erro no tempo; os demais costumam ser cascata.',
      'grep -C, tail -f, journalctl --since/--until e contagem de status.',
    ],
    related: ['a4-l2', 'c2-l1', 'a7-l2'],
    docs: [{ label: 'journalctl (systemd)', url: 'https://www.freedesktop.org/software/systemd/man/latest/journalctl.html' }],
  },
  {
    id: 'a4-l2', moduleId: 'a4', title: 'Reproduzindo chamadas com curl e Postman', minutes: 20,
    objective: 'Reproduzir com precisão a requisição de um usuário para confirmar ou descartar hipóteses.',
    explanation: `
"Não consigo reproduzir" encerra muitos chamados sem solução. Reproduzir a **mesma requisição** — mesmo método, URL, cabeçalhos, corpo e credencial (de um usuário de teste com o mesmo perfil) — permite testar hipóteses em minutos.

**curl essencial:**
- \`curl -i URL\` — mostra status e cabeçalhos da resposta.
- \`curl -v URL\` — mostra também a requisição enviada, DNS/IP conectado e TLS.
- \`-X POST\` define o método; \`-H "Chave: valor"\` adiciona cabeçalho; \`-d '{...}'\` envia corpo.
- \`-w "%{http_code} %{time_total}\\n" -o /dev/null -s\` — mede status e tempo total, útil para lentidão.
- \`--resolve api.exemplo.com:443:10.0.0.5\` — força o IP, contornando o DNS: ótimo para testar um servidor específico atrás do balanceador.
- \`-k\` ignora erros de certificado: use apenas para diagnóstico, nunca em scripts de produção.

**Postman:** útil para coleções organizadas, variáveis de ambiente (\`{{base_url}}\`, \`{{token}}\`) e testes automáticos simples. O botão "Code" gera o curl equivalente — bom para anexar ao chamado. Atenção a segredos: não compartilhe coleções com tokens reais.

**DevTools → "Copy as cURL":** na aba Network, clique com o botão direito em uma requisição e copie-a como curl. Assim, você reproduz exatamente o que o navegador enviou (remova cookies/tokens antes de colar no chamado).

**Isolando variáveis:** ao reproduzir, mude **uma coisa por vez**: outro usuário, outro payload, outro servidor (\`--resolve\`), outro ambiente. Cada mudança confirma ou elimina uma hipótese.
`,
    example: {
      title: 'Lentidão em apenas uma instância',
      body: `
~~~
$ for ip in 10.0.0.5 10.0.0.6 10.0.0.7; do
    curl -s -o /dev/null -w "$ip %{http_code} %{time_total}s\\n" \\
      --resolve app.exemplo.com:443:$ip https://app.exemplo.com/saude
  done
10.0.0.5 200 0.081s
10.0.0.6 200 0.077s
10.0.0.7 200 9.812s
~~~
A instância 10.0.0.7 está lenta. Isso explica a reclamação de "às vezes demora": o balanceador distribui as requisições entre as instâncias. Próximo passo: CPU, memória, disco e logs da instância .7, e considerar retirá-la do balanceador enquanto investiga.
`,
    },
    exercise: {
      prompt: 'Um cliente diz que a API retorna **400** no cadastro, mas pelo seu Postman a mesma rota funciona. Qual é o próximo passo mais eficiente?',
      options: [
        { t: 'Responder que a API funciona e pedir que o cliente revise a integração.', ok: false, why: 'Pode até ser um erro do cliente, mas você ainda não sabe o que ele envia de diferente. Sem evidência, o chamado volta.' },
        { t: 'Obter a requisição exata do cliente (curl ou log com payload) e compará-la campo a campo com a sua.', ok: true, why: '400 é sobre o conteúdo da requisição. A diferença entre a requisição que funciona e a que falha (Content-Type, campo, formato de data, encoding) é a resposta.' },
        { t: 'Aumentar o timeout do servidor.', ok: false, why: '400 não tem relação com tempo de resposta.' },
        { t: 'Reiniciar a API.', ok: false, why: 'A API responde normalmente para você; reiniciar não muda a validação da requisição.' },
      ],
      explain: 'Comparar o que funciona com o que falha é a técnica central. Diferenças típicas: data em formato brasileiro (24/11/2026) em vez de ISO (2026-11-24), número como texto, campo novo obrigatório após deploy, `Content-Type` ausente. Se a API retornar detalhes de validação no corpo, peça ao cliente o corpo completo da resposta.',
    },
    summary: [
      'Reproduzir com precisão transforma suposição em evidência.',
      'curl -v / -i / -w / --resolve resolvem a maioria dos diagnósticos.',
      '"Copy as cURL" no DevTools copia exatamente o que o navegador enviou.',
      'Mude uma variável por vez.',
    ],
    related: ['a4-l1', 'a1-l1', 'd1-l1'],
    docs: [{ label: 'curl — manual', url: 'https://curl.se/docs/manpage.html' }],
  },

  // ---------------- a5 ----------------
  {
    id: 'a5-l1', moduleId: 'a5', title: 'INNER JOIN e LEFT JOIN sem adivinhação', minutes: 25,
    objective: 'Escolher o JOIN correto para responder perguntas de suporte sem perder ou inventar linhas.',
    explanation: `
Modelo usado nos exemplos:
~~~
clientes(id, nome, tenant_id)
pedidos(id, cliente_id, criado_em, status, total)
pagamentos(id, pedido_id, valor, pago_em)
~~~

**INNER JOIN** retorna apenas as linhas que têm correspondência **nos dois lados**.
~~~
SELECT p.id, c.nome
FROM pedidos p
JOIN clientes c ON c.id = p.cliente_id;
~~~
Pedidos com \`cliente_id\` que não existe em \`clientes\` **somem** do resultado — sem nenhum aviso.

**LEFT JOIN** mantém **todas as linhas da tabela da esquerda**; quando não há correspondência, as colunas da direita vêm como \`NULL\`.
~~~
SELECT p.id, p.total, pg.valor
FROM pedidos p
LEFT JOIN pagamentos pg ON pg.pedido_id = p.id;
~~~
Pedidos sem pagamento aparecem com \`pg.valor = NULL\`.

**A armadilha do WHERE após LEFT JOIN:**
~~~
-- ERRADO: transforma o LEFT em INNER
SELECT p.id, pg.valor
FROM pedidos p
LEFT JOIN pagamentos pg ON pg.pedido_id = p.id
WHERE pg.pago_em >= '2026-11-01';

-- CERTO: a condição da tabela da direita vai no ON
SELECT p.id, pg.valor
FROM pedidos p
LEFT JOIN pagamentos pg ON pg.pedido_id = p.id AND pg.pago_em >= '2026-11-01';
~~~
No primeiro caso, as linhas sem pagamento têm \`pago_em = NULL\`, e \`NULL >= data\` não é verdadeiro: o WHERE as descarta.

**Como escolher:**
- "Quero só o que tem correspondência" → INNER.
- "Quero tudo de A, com B se houver" → LEFT.
- Em chamados, a pergunta geralmente é sobre um lado: "todos os pedidos do cliente X, pagos ou não" → LEFT a partir de pedidos.

**Hábito de suporte:** antes de concluir algo a partir de um JOIN, compare contagens: \`SELECT COUNT(*) FROM pedidos WHERE ...\` antes e depois do JOIN.
`,
    example: {
      title: 'Chamado: "o pedido 5521 não aparece no relatório"',
      body: `
~~~
SELECT p.id, p.cliente_id, c.id AS cliente_existe
FROM pedidos p
LEFT JOIN clientes c ON c.id = p.cliente_id
WHERE p.id = 5521;

 id   | cliente_id | cliente_existe
------+------------+----------------
 5521 |        903 |           NULL
~~~
O pedido existe, mas o cliente 903 não está em \`clientes\` (foi apagado ou importado com id errado). O relatório usa INNER JOIN e descarta o pedido. A causa do chamado é um **dado órfão**, e não um bug do relatório. A correção envolve o dado (e talvez uma foreign key para impedir o problema), não o SQL do relatório.
`,
    },
    exercise: {
      prompt: 'Você precisa listar **todos os clientes do tenant 7 e a quantidade de pedidos de cada um, incluindo quem tem zero pedidos**. Qual consulta está correta?',
      options: [
        { t: '`SELECT c.nome, COUNT(*) FROM clientes c JOIN pedidos p ON p.cliente_id = c.id WHERE c.tenant_id = 7 GROUP BY c.nome;`', ok: false, why: 'INNER JOIN exclui quem não tem pedidos — exatamente o grupo pedido.' },
        { t: '`SELECT c.nome, COUNT(p.id) FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id WHERE c.tenant_id = 7 GROUP BY c.id, c.nome;`', ok: true, why: 'LEFT mantém todos os clientes; COUNT(p.id) ignora NULL e retorna 0 para quem não tem pedidos; agrupar por c.id evita juntar homônimos.' },
        { t: '`SELECT c.nome, COUNT(*) FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id WHERE c.tenant_id = 7 GROUP BY c.id, c.nome;`', ok: false, why: 'COUNT(*) conta a linha gerada pelo LEFT mesmo sem pedido: clientes sem pedidos apareceriam com 1, não 0.' },
        { t: '`SELECT c.nome, COUNT(p.id) FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id WHERE p.status IS NOT NULL AND c.tenant_id = 7 GROUP BY c.id, c.nome;`', ok: false, why: 'O filtro em p.status no WHERE remove as linhas sem pedido, transformando o LEFT em INNER.' },
      ],
      explain: 'Três detalhes fazem a diferença: LEFT JOIN, COUNT(coluna da direita) em vez de COUNT(*) e nenhum filtro da tabela da direita no WHERE. Agrupar pela chave (c.id) evita juntar dois clientes com o mesmo nome em uma única linha.',
    },
    summary: [
      'INNER descarta linhas sem correspondência — silenciosamente.',
      'LEFT mantém tudo da esquerda; a direita vem NULL.',
      'Filtro da tabela da direita no WHERE anula o LEFT; coloque-o no ON.',
      'COUNT(coluna) ignora NULL; COUNT(*) não.',
    ],
    related: ['a5-l2', 'a6-l1'],
    docs: [{ label: 'PostgreSQL — Table Expressions (JOINs)', url: 'https://www.postgresql.org/docs/current/queries-table-expressions.html' }],
  },
  {
    id: 'a5-l2', moduleId: 'a5', title: 'Anti-join e linhas multiplicadas', minutes: 20,
    objective: 'Encontrar registros sem correspondência e explicar por que um JOIN aumentou o número de linhas.',
    explanation: `
**Anti-join: "quais A não têm B?"** É uma das perguntas mais comuns no suporte: pedidos sem pagamento, usuários sem perfil, notas sem item.

Duas formas equivalentes:
~~~
-- LEFT JOIN + IS NULL
SELECT p.id FROM pedidos p
LEFT JOIN pagamentos pg ON pg.pedido_id = p.id
WHERE pg.id IS NULL;

-- NOT EXISTS (geralmente a mais clara e segura)
SELECT p.id FROM pedidos p
WHERE NOT EXISTS (SELECT 1 FROM pagamentos pg WHERE pg.pedido_id = p.id);
~~~
**Cuidado com NOT IN:** \`WHERE p.id NOT IN (SELECT pedido_id FROM pagamentos)\` retorna **zero linhas** se a subconsulta tiver algum \`NULL\`. Isso ocorre porque \`x NOT IN (1, NULL)\` é desconhecido, nunca verdadeiro. Prefira NOT EXISTS.

**Linhas multiplicadas (fan-out):** um JOIN em uma relação 1:N repete a linha do lado "1" para cada correspondência do lado "N".
~~~
-- um pedido com 3 pagamentos parciais aparece 3 vezes
SELECT p.id, p.total, pg.valor
FROM pedidos p JOIN pagamentos pg ON pg.pedido_id = p.id;
~~~
Somar \`p.total\` nesse resultado **triplica** o total do pedido. É o bug clássico de "o relatório está com valor maior que o real".

**Como evitar:**
- Agregue o lado N **antes** do JOIN (subconsulta ou CTE) e junte o resultado agregado.
- Ou some apenas colunas do lado N.
- Desconfie quando \`COUNT(*)\` depois do JOIN for maior que o da tabela principal.
~~~
SELECT p.id, p.total, COALESCE(pg.pago, 0) AS pago
FROM pedidos p
LEFT JOIN (SELECT pedido_id, SUM(valor) AS pago
           FROM pagamentos GROUP BY pedido_id) pg
  ON pg.pedido_id = p.id;
~~~
`,
    example: {
      title: 'Faturamento duplicado no dashboard',
      body: `
~~~
-- consulta do dashboard (com bug)
SELECT SUM(p.total) FROM pedidos p
JOIN pedido_itens i ON i.pedido_id = p.id
WHERE p.criado_em >= '2026-11-01';
-- resultado: R$ 184.300   (o financeiro diz R$ 61.200)
~~~
Os pedidos têm em média 3 itens; cada pedido foi somado uma vez **por item**. O JOIN com \`pedido_itens\` nem era necessário para somar \`p.total\`. Remover o JOIN (ou agregar os itens antes) resolve. Ao explicar o problema no chamado, mostre a contagem: "o JOIN gera 3.012 linhas para 1.004 pedidos".
`,
    },
    exercise: {
      prompt: 'A consulta `SELECT id FROM usuarios WHERE id NOT IN (SELECT usuario_id FROM perfis)` retorna **zero linhas**, mas você sabe que existem usuários sem perfil. O que explica isso?',
      options: [
        { t: 'Todos os usuários têm perfil; sua informação está errada.', ok: false, why: 'Antes de duvidar da informação, vale conhecer o comportamento de NOT IN com NULL.' },
        { t: 'A tabela `perfis` tem pelo menos uma linha com `usuario_id` NULL, e NOT IN com NULL nunca é verdadeiro.', ok: true, why: 'Comparações com NULL resultam em "desconhecido". Um único NULL na lista faz NOT IN falhar para todas as linhas. NOT EXISTS ou LEFT JOIN … IS NULL não têm esse problema.' },
        { t: 'Falta um índice em `perfis.usuario_id`.', ok: false, why: 'Índices afetam velocidade, não o resultado.' },
        { t: 'É preciso usar DISTINCT na subconsulta.', ok: false, why: 'Duplicatas não alteram o resultado de NOT IN; NULL altera.' },
      ],
      explain: 'Confirme com `SELECT COUNT(*) FROM perfis WHERE usuario_id IS NULL`. Correção: reescrever com NOT EXISTS. Esse tipo de detalhe costuma aparecer em entrevistas, e explicá-lo bem mostra profundidade em SQL.',
    },
    summary: [
      'Anti-join: LEFT JOIN … IS NULL ou NOT EXISTS.',
      'NOT IN com NULL na subconsulta retorna vazio.',
      'JOIN 1:N multiplica linhas; somas do lado "1" ficam infladas.',
      'Agregue antes de juntar; compare contagens.',
    ],
    related: ['a5-l1', 'a6-l1'],
    docs: [{ label: 'PostgreSQL — Subquery Expressions (EXISTS, IN)', url: 'https://www.postgresql.org/docs/current/functions-subquery.html' }],
  },

  // ---------------- a6 ----------------
  {
    id: 'a6-l1', moduleId: 'a6', title: 'GROUP BY, HAVING e medição de impacto', minutes: 25,
    objective: 'Usar agregações para responder "quantos", "quais" e "quanto" durante incidentes.',
    explanation: `
**GROUP BY** agrupa linhas com o mesmo valor e permite funções de agregação: \`COUNT\`, \`SUM\`, \`AVG\`, \`MIN\`, \`MAX\`.

**Regra:** toda coluna do SELECT que não está dentro de uma agregação deve estar no GROUP BY. (O PostgreSQL aceita omitir colunas quando você agrupa pela chave primária da tabela. Já o MySQL, sem o modo \`ONLY_FULL_GROUP_BY\`, aceita colunas indefinidas — e retorna valores arbitrários.)

**WHERE × HAVING:**
- \`WHERE\` filtra **linhas antes** de agrupar.
- \`HAVING\` filtra **grupos depois** de agregar.
~~~
SELECT cliente_id, COUNT(*) AS falhas
FROM pagamentos
WHERE status = 'recusado' AND criado_em >= now() - interval '1 day'
GROUP BY cliente_id
HAVING COUNT(*) >= 3
ORDER BY falhas DESC;
~~~

**Consultas de incidente que valem ouro:**
- **Impacto:** quantos clientes/tenants foram afetados?
~~~
SELECT COUNT(DISTINCT tenant_id) FROM erros_integracao
WHERE ocorrido_em BETWEEN '2026-11-24 09:00' AND '2026-11-24 11:00';
~~~
- **Linha do tempo:** volume por hora.
~~~
SELECT date_trunc('hour', criado_em) AS hora, COUNT(*)
FROM pedidos WHERE criado_em >= '2026-11-24'
GROUP BY 1 ORDER BY 1;
~~~
- **Duplicidades:**
~~~
SELECT email, COUNT(*) FROM usuarios
GROUP BY email HAVING COUNT(*) > 1;
~~~

**Detalhes que enganam:**
- \`COUNT(*)\` conta linhas; \`COUNT(col)\` ignora NULL; \`COUNT(DISTINCT col)\` conta valores únicos.
- \`AVG\` ignora NULL (não trata NULL como zero).
- \`SUM\` de nenhuma linha retorna \`NULL\`, não 0 → use \`COALESCE(SUM(x), 0)\`.
- Comparações de data com \`BETWEEN '2026-11-24' AND '2026-11-24'\` em colunas timestamp pegam só a meia-noite. Prefira \`>= '2026-11-24' AND < '2026-11-25'\`.
`,
    example: {
      title: 'Medindo o impacto de uma falha de integração',
      body: `
~~~
SELECT t.nome, COUNT(*) AS notas_com_erro,
       MIN(e.ocorrido_em) AS primeira, MAX(e.ocorrido_em) AS ultima
FROM erros_integracao e
JOIN tenants t ON t.id = e.tenant_id
WHERE e.ocorrido_em >= '2026-11-24 08:00'
GROUP BY t.id, t.nome
ORDER BY notas_com_erro DESC;
~~~
Com uma consulta, você responde às perguntas que o gestor fará: **quem** foi afetado, **quanto** e **desde quando**. Isso entra no registro do incidente e orienta a comunicação aos clientes.
`,
    },
    exercise: {
      prompt: 'Você quer os clientes com **mais de 5 pedidos cancelados em novembro**. Qual consulta está correta?',
      options: [
        { t: "`SELECT cliente_id, COUNT(*) FROM pedidos WHERE status='cancelado' AND COUNT(*) > 5 GROUP BY cliente_id;`", ok: false, why: 'Agregações não podem ser usadas no WHERE, porque o WHERE é avaliado antes do agrupamento. Isso gera erro.' },
        { t: "`SELECT cliente_id, COUNT(*) FROM pedidos WHERE status='cancelado' AND criado_em >= '2026-11-01' AND criado_em < '2026-12-01' GROUP BY cliente_id HAVING COUNT(*) > 5;`", ok: true, why: 'O WHERE filtra as linhas (status e período) e o HAVING filtra os grupos pela contagem. O intervalo de datas semiaberto cobre todo o mês.' },
        { t: "`SELECT cliente_id, COUNT(*) FROM pedidos GROUP BY cliente_id HAVING status='cancelado' AND COUNT(*) > 5;`", ok: false, why: 'status não é agregado nem está no GROUP BY; essa condição de linha pertence ao WHERE.' },
        { t: "`SELECT cliente_id, COUNT(*) FROM pedidos WHERE status='cancelado' AND criado_em BETWEEN '2026-11-01' AND '2026-11-30' GROUP BY cliente_id HAVING COUNT(*) > 5;`", ok: false, why: 'Quase certo, mas em uma coluna timestamp, BETWEEN até "2026-11-30" para em 30/11 00:00 e perde quase todo o último dia.' },
      ],
      explain: 'Ordem lógica de execução: FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY. Saber essa ordem explica por que o WHERE não enxerga agregações e por que alias do SELECT não pode ser usado no WHERE.',
    },
    summary: [
      'WHERE filtra linhas; HAVING filtra grupos.',
      'COUNT(*), COUNT(col) e COUNT(DISTINCT col) respondem perguntas diferentes.',
      'Use intervalos de data semiabertos (>= início e < fim).',
      'Impacto, linha do tempo e duplicidade: três consultas essenciais em incidentes.',
    ],
    related: ['a6-l2', 'a8-l2'],
    docs: [{ label: 'PostgreSQL — Funções de agregação', url: 'https://www.postgresql.org/docs/current/functions-aggregate.html' }],
  },
  {
    id: 'a6-l2', moduleId: 'a6', title: 'Subconsultas, EXISTS e CTEs', minutes: 20,
    objective: 'Escrever consultas investigativas legíveis usando subconsultas, EXISTS e CTEs.',
    explanation: `
**Subconsulta escalar:** retorna um único valor.
~~~
SELECT id, total FROM pedidos
WHERE total > (SELECT AVG(total) FROM pedidos);
~~~

**Subconsulta correlacionada:** referencia a linha externa. É executada (logicamente) para cada linha.
~~~
SELECT c.id, c.nome,
  (SELECT MAX(p.criado_em) FROM pedidos p WHERE p.cliente_id = c.id) AS ultimo_pedido
FROM clientes c;
~~~

**EXISTS:** verdadeiro se a subconsulta retornar ao menos uma linha. Ideal para "tem/não tem", sem multiplicar linhas.
~~~
SELECT c.id FROM clientes c
WHERE EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id AND p.status = 'pendente');
~~~

**CTE (WITH):** dá nome a etapas e torna a investigação legível, passo a passo.
~~~
WITH falhas AS (
  SELECT pedido_id, COUNT(*) AS tentativas
  FROM pagamentos WHERE status = 'recusado'
  GROUP BY pedido_id
),
pedidos_afetados AS (
  SELECT p.id, p.cliente_id, f.tentativas
  FROM pedidos p JOIN falhas f ON f.pedido_id = p.id
  WHERE f.tentativas >= 3
)
SELECT c.nome, pa.id, pa.tentativas
FROM pedidos_afetados pa JOIN clientes c ON c.id = pa.cliente_id
ORDER BY pa.tentativas DESC;
~~~

**Funções de janela (bônus útil):** pegar o registro mais recente por grupo sem subconsultas complicadas.
~~~
SELECT * FROM (
  SELECT p.*, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY criado_em DESC) AS rn
  FROM pedidos p
) x WHERE rn = 1;
~~~

**Segurança ao investigar em produção:** use uma réplica de leitura ou um usuário somente leitura, sempre que existir. Antes de um \`UPDATE\`/\`DELETE\` corretivo, rode o mesmo \`WHERE\` em um \`SELECT\`, confira a contagem, use transação (\`BEGIN … COMMIT\`) e tenha aprovação conforme o processo da empresa.
`,
    example: {
      title: 'Correção de dados com segurança',
      body: `
~~~
BEGIN;
SELECT COUNT(*) FROM pedidos WHERE status = 'processando' AND atualizado_em < now() - interval '2 days';
-- 37 linhas: confere com o chamado
UPDATE pedidos SET status = 'erro_integracao'
WHERE status = 'processando' AND atualizado_em < now() - interval '2 days';
-- UPDATE 37
COMMIT;   -- ou ROLLBACK se o número não conferir
~~~
O número do UPDATE deve ser igual ao do SELECT. Registre a consulta e o resultado no chamado: isso permite auditoria e reversão.
`,
    },
    exercise: {
      prompt: 'Você precisa do **último login de cada usuário** em uma tabela `logins(usuario_id, data_hora, ip)` e também do IP desse login. Qual abordagem é correta?',
      options: [
        { t: '`SELECT usuario_id, MAX(data_hora), ip FROM logins GROUP BY usuario_id;`', ok: false, why: 'ip não está agregado nem no GROUP BY. O PostgreSQL rejeita a consulta; o MySQL em modo permissivo retorna um IP arbitrário, não necessariamente o do último login.' },
        { t: 'Usar ROW_NUMBER() OVER (PARTITION BY usuario_id ORDER BY data_hora DESC) e filtrar rn = 1.', ok: true, why: 'A função de janela ordena os logins de cada usuário e permite pegar a linha completa do mais recente, com o IP correto.' },
        { t: '`SELECT DISTINCT usuario_id, data_hora, ip FROM logins ORDER BY data_hora DESC;`', ok: false, why: 'DISTINCT remove apenas linhas idênticas; todos os logins continuam aparecendo.' },
        { t: '`SELECT usuario_id, MAX(data_hora), MAX(ip) FROM logins GROUP BY usuario_id;`', ok: false, why: 'MAX(ip) é o maior IP em ordem alfabética, sem relação com o último login.' },
      ],
      explain: 'O problema "linha inteira do máximo por grupo" é clássico. Alternativas válidas: subconsulta correlacionada comparando data_hora com o MAX do usuário (cuidado com empates) ou `DISTINCT ON (usuario_id) … ORDER BY usuario_id, data_hora DESC`, específico do PostgreSQL.',
    },
    summary: [
      'EXISTS responde "tem/não tem" sem multiplicar linhas.',
      'CTEs organizam investigações em etapas nomeadas.',
      'ROW_NUMBER() resolve o problema "registro mais recente por grupo".',
      'Correção de dados: SELECT antes, transação, contagem conferida e registro.',
    ],
    related: ['a6-l1', 'a7-l1'],
    docs: [{ label: 'PostgreSQL — WITH Queries (CTEs)', url: 'https://www.postgresql.org/docs/current/queries-with.html' }],
  },

  // ---------------- a7 ----------------
  {
    id: 'a7-l1', moduleId: 'a7', title: 'Índices, EXPLAIN e consultas lentas', minutes: 30,
    objective: 'Diagnosticar uma consulta lenta com EXPLAIN e decidir que mudança testar.',
    explanation: `
**Por que uma consulta fica lenta:** em geral, o banco lê muito mais dados do que precisa (varredura completa da tabela), faz ordenações grandes em disco, executa uma consulta por item (N+1) ou espera um lock.

**Índice:** uma estrutura (normalmente B-tree) que permite localizar linhas sem ler a tabela inteira, como o índice de um livro. Ajuda em \`WHERE\`, \`JOIN\` e \`ORDER BY\` nas colunas indexadas. Custa espaço e deixa \`INSERT\`/\`UPDATE\` um pouco mais lentos.

**EXPLAIN / EXPLAIN ANALYZE (PostgreSQL):**
- \`EXPLAIN\` mostra o **plano estimado**.
- \`EXPLAIN ANALYZE\` **executa** a consulta e mostra tempos e linhas reais. Atenção: com \`UPDATE\`/\`DELETE\`, ele altera os dados. Use em transação com ROLLBACK.

O que procurar:
- \`Seq Scan\` em tabela grande com filtro seletivo → candidato a índice.
- **Estimativa × real** muito diferentes (\`rows=10\` estimado, \`rows=500000\` real) → estatísticas desatualizadas (\`ANALYZE tabela\`).
- \`Sort\` com \`external merge Disk\` → ordenação não cabe na memória.
- \`Nested Loop\` com muitas iterações sobre uma tabela sem índice.

**Índices compostos:** a ordem importa. Um índice em \`(tenant_id, criado_em)\` atende \`WHERE tenant_id = 7 AND criado_em > ...\` e \`WHERE tenant_id = 7\`, mas não ajuda muito em \`WHERE criado_em > ...\` sozinho.

**Quando o índice não é usado:**
- Função sobre a coluna: \`WHERE lower(email) = ...\` não usa um índice em \`email\` (precisa de índice de expressão).
- \`LIKE '%texto'\` com curinga no início.
- Tipos diferentes na comparação (texto × número).
- Filtro pouco seletivo: quando a consulta retorna boa parte da tabela, ler tudo pode ser mais barato.

**N+1:** o ORM busca uma lista (1 consulta) e depois, para cada item, busca um relacionamento (N consultas). Os sintomas são centenas de consultas pequenas e iguais no log. A solução é carregar o relacionamento junto (JOIN/eager loading; no SQLAlchemy, \`selectinload\`/\`joinedload\`; no JPA, \`JOIN FETCH\` ou \`@EntityGraph\`).

**Método:** meça (tempo real) → EXPLAIN ANALYZE → hipótese (índice, reescrita, paginação, N+1) → teste em ambiente não produtivo → meça de novo → documente o antes e o depois.
`,
    example: {
      title: 'Seq Scan em uma tabela de 2 milhões de linhas',
      body: `
~~~
EXPLAIN ANALYZE
SELECT * FROM apontamentos
WHERE tenant_id = 12 AND data >= '2026-11-01'
ORDER BY data;

Sort  (actual time=11234..11301 rows=8420)
  ->  Seq Scan on apontamentos  (rows=8420)
        Filter: (tenant_id = 12 AND data >= '2026-11-01')
        Rows Removed by Filter: 2104331
Execution Time: 11320 ms

CREATE INDEX CONCURRENTLY ix_apont_tenant_data ON apontamentos (tenant_id, data);

Index Scan using ix_apont_tenant_data on apontamentos (rows=8420)
Execution Time: 38 ms
~~~
O banco descartava 2,1 milhões de linhas para retornar 8 mil. O índice composto na ordem do filtro elimina a varredura e entrega as linhas já ordenadas por data. \`CONCURRENTLY\` evita bloquear escritas durante a criação no PostgreSQL (é mais lento e não pode rodar dentro de transação).
`,
    },
    exercise: {
      prompt: 'Uma tela de listagem demora 20 s. No log de SQL, você vê **1 consulta** em `pedidos` seguida de **500 consultas** `SELECT * FROM clientes WHERE id = ?`, cada uma rápida. Qual é o diagnóstico e a correção mais adequados?',
      options: [
        { t: 'Falta índice em `clientes.id`.', ok: false, why: 'id normalmente é chave primária e já é indexado. Cada consulta é rápida; o problema é a quantidade.' },
        { t: 'Problema N+1: carregar os clientes junto com os pedidos (JOIN/eager loading) ou em uma única consulta com IN.', ok: true, why: '500 viagens ao banco somam latência de rede e processamento. Uma consulta com JOIN, ou com selectinload/JOIN FETCH, reduz isso a 1 ou 2 consultas.' },
        { t: 'Aumentar a memória do servidor de banco.', ok: false, why: 'O gargalo é o número de idas e voltas, não a memória.' },
        { t: 'Aumentar o timeout do proxy para 60 s.', ok: false, why: 'Isso evita o erro de timeout, mas a tela continua lenta.' },
      ],
      explain: 'Padrão "1 + N consultas iguais com ids diferentes" é a assinatura do N+1. Confirme ativando o log de SQL do ORM (`echo=True` no SQLAlchemy; `spring.jpa.show-sql` ou log do Hibernate no Spring). Também vale paginar a listagem: 500 itens em uma tela raramente é necessário.',
    },
    summary: [
      'EXPLAIN ANALYZE mostra onde o tempo é gasto (cuidado: ele executa a consulta).',
      'Seq Scan descartando muitas linhas → considere índice (ordem das colunas importa).',
      'Funções sobre a coluna e LIKE com % no início impedem o uso do índice comum.',
      'N+1: muitas consultas pequenas iguais; resolva com carregamento conjunto.',
    ],
    related: ['a7-l2', 'a6-l2', 'd2-l1'],
    docs: [
      { label: 'PostgreSQL — Using EXPLAIN', url: 'https://www.postgresql.org/docs/current/using-explain.html' },
      { label: 'PostgreSQL — Índices', url: 'https://www.postgresql.org/docs/current/indexes.html' },
    ],
  },
  {
    id: 'a7-l2', moduleId: 'a7', title: 'Incidentes de banco: conexões, locks e migrações', minutes: 25,
    objective: 'Reconhecer e investigar os incidentes de banco mais comuns em sistemas web.',
    explanation: `
**1. Conexões esgotadas.** Aplicações usam um **pool** de conexões (ex.: SQLAlchemy \`pool_size\`, HikariCP no Spring). Se as conexões não são devolvidas (sessão não fechada, transação longa) ou se há mais workers × pool do que o banco aceita (\`max_connections\`), surgem erros como \`QueuePool limit reached\`, \`too many connections\` ou \`Connection is not available, request timed out\`.
- Faça a conta: 4 workers Gunicorn × pool 10 × 3 instâncias = até 120 conexões, mais o overflow.
- Investigue: \`SELECT state, count(*) FROM pg_stat_activity GROUP BY state;\` — muitas sessões \`idle in transaction\` indicam transações abertas e esquecidas.

**2. Locks e bloqueios.** Uma transação que altera linhas bloqueia outras que tentam alterar as mesmas linhas. Um \`ALTER TABLE\` pode exigir um lock exclusivo e travar todas as consultas da tabela.
~~~
SELECT pid, state, wait_event_type, now() - query_start AS duracao, left(query, 60)
FROM pg_stat_activity WHERE state <> 'idle' ORDER BY duracao DESC;

SELECT pid, pg_blocking_pids(pid) AS bloqueado_por FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;
~~~
Encerrar uma sessão (\`pg_terminate_backend(pid)\`) desfaz a transação dela. É uma decisão que exige entender o que ela fazia e, em produção, alinhamento com o responsável.

**3. Deadlock.** Duas transações esperam uma pela outra; o banco aborta uma delas (\`deadlock detected\`). A correção costuma ser acessar as tabelas/linhas sempre na mesma ordem e manter as transações curtas.

**4. Migrações com problema (Alembic, Flyway, Liquibase).**
- **Versão divergente:** a tabela de controle (\`alembic_version\`, \`flyway_schema_history\`) diz uma versão, mas o schema real é outro (alguém alterou o banco à mão).
- **Múltiplas heads no Alembic:** duas branches criaram migrações a partir da mesma revisão → \`alembic heads\` mostra duas; resolva com \`alembic merge\`.
- **Checksum no Flyway:** uma migração já aplicada foi editada → \`Validate failed: checksum mismatch\`. Regra: nunca edite uma migração já aplicada; crie outra.
- **Migração lenta/bloqueante:** adicionar coluna com default em tabela grande, ou criar índice sem \`CONCURRENTLY\`, pode travar a produção.

**5. Disco cheio no servidor de banco.** Logs, WAL ou backups locais lotam o disco e o banco para de aceitar escritas. Verifique com \`df -h\`.
`,
    example: {
      title: 'Alembic com duas heads após merge de branches',
      body: `
~~~
$ alembic upgrade head
FAILED: Multiple head revisions are present for given argument 'head';
please specify a specific target revision, '<branchname>@head' to narrow to a branch,
or 'heads' for all heads

$ alembic heads
3f2a91c (head)
b81d004 (head)

$ alembic merge -m "merge heads" 3f2a91c b81d004
$ alembic upgrade head
~~~
Duas branches criaram migrações a partir da mesma revisão. A migração de merge une os dois caminhos. Antes de aplicar em produção, confirme que as duas migrações não alteram a mesma tabela de forma conflitante.
`,
    },
    exercise: {
      prompt: 'Às 15h, várias telas ficam "carregando" sem erro. `pg_stat_activity` mostra dezenas de consultas em `wait_event_type = Lock` e uma sessão `idle in transaction` há 40 minutos, aberta por um analista que rodou um UPDATE manual sem COMMIT. Qual a conduta mais adequada?',
      options: [
        { t: 'Reiniciar o servidor de banco imediatamente.', ok: false, why: 'Reiniciar derruba todas as conexões e sistemas que usam o banco. É uma medida desproporcional quando a sessão bloqueadora já foi identificada.' },
        { t: 'Contatar o responsável pela sessão para COMMIT/ROLLBACK; se não for possível e o impacto for alto, encerrar a sessão bloqueadora conforme o processo, registrando tudo.', ok: true, why: 'A causa está identificada: um lock mantido por uma transação aberta. Resolver na origem é o menos invasivo. Encerrar a sessão desfaz o UPDATE, então quem o executou precisa saber.' },
        { t: 'Criar índices nas tabelas afetadas.', ok: false, why: 'O problema é espera por lock, não plano de execução.' },
        { t: 'Aumentar o max_connections.', ok: false, why: 'Mais conexões apenas criariam mais sessões esperando o mesmo lock.' },
      ],
      explain: 'A evidência (Lock + idle in transaction antiga) aponta a causa com precisão. Ação preventiva para o registro do problema: definir `idle_in_transaction_session_timeout`, orientar sobre transações manuais curtas e usar processos de alteração de dados com revisão.',
    },
    summary: [
      'Pool esgotado: faça a conta de workers × pool × instâncias e procure transações abertas.',
      'pg_stat_activity e pg_blocking_pids revelam quem bloqueia quem.',
      'Nunca edite migração já aplicada; múltiplas heads no Alembic → merge.',
      'Prefira a ação menos invasiva que resolve a causa identificada.',
    ],
    related: ['a7-l1', 'a4-l1', 'a8-l1'],
    docs: [
      { label: 'PostgreSQL — pg_stat_activity', url: 'https://www.postgresql.org/docs/current/monitoring-stats.html' },
      { label: 'Alembic — documentação', url: 'https://alembic.sqlalchemy.org/en/latest/' },
    ],
  },

  // ---------------- a8 ----------------
  {
    id: 'a8-l1', moduleId: 'a8', title: 'Incidente, problema, prioridade e escalonamento', minutes: 20,
    objective: 'Classificar chamados, definir prioridade e saber quando e como escalar.',
    explanation: `
O ITIL é um conjunto de boas práticas de gerenciamento de serviços de TI. Em entrevistas, os conceitos abaixo aparecem com frequência:

- **Incidente:** interrupção ou degradação não planejada de um serviço. Objetivo: **restaurar o serviço o mais rápido possível**, mesmo com uma solução de contorno.
- **Problema:** a **causa** (conhecida ou não) de um ou mais incidentes. Objetivo: encontrar a causa raiz e evitar recorrência.
- **Requisição de serviço:** pedido padrão, sem falha (criar usuário, liberar acesso, instalar software).
- **Mudança:** alteração planejada (deploy, configuração), com avaliação de risco e possibilidade de rollback.
- **Erro conhecido / solução de contorno:** problema com causa identificada e um paliativo documentado (base de conhecimento).

**Prioridade = Impacto × Urgência.**
- Impacto: quantas pessoas/clientes e quão crítico é o processo afetado.
- Urgência: quão rápido o dano cresce (prazo fiscal, folha de pagamento, vendas paradas).
~~~
              Urgência alta   média   baixa
Impacto alto      P1          P2      P3
Impacto médio     P2          P3      P4
Impacto baixo     P3          P4      P4
~~~
**SLA** é o acordo de tempo (de resposta e de resolução) por prioridade. Registre os horários com precisão; o SLA depende deles.

**Escalonamento:**
- **Funcional (horizontal/técnico):** passar para quem tem a competência (N1 → N2 → N3/desenvolvimento, ou equipe de banco/rede).
- **Hierárquico (vertical):** acionar a gestão quando o impacto é alto, o SLA está em risco ou é preciso tomar decisões (ex.: comunicar clientes).

**Escalar bem = entregar contexto:** o que acontece, desde quando, quem é afetado, evidências (logs, prints, requisição), o que já foi testado e descartado, e a hipótese atual. Um escalonamento sem isso faz o próximo nível recomeçar do zero.

**Quando escalar:** quando a solução está fora do seu acesso ou conhecimento, quando o tempo-limite do seu nível acabou, ou imediatamente em casos de segurança (vazamento de dados, acesso indevido) ou de impacto amplo.
`,
    example: {
      title: 'Classificando três chamados',
      body: `
~~~
1. "Não consigo imprimir" — 1 usuário, tem impressora alternativa      → impacto baixo, urgência baixa → P4
2. "Ninguém consegue emitir nota fiscal" — empresa inteira, fim do mês → impacto alto, urgência alta  → P1
3. "Relatório gerencial lento" — 5 gestores, relatório semanal         → impacto médio, urgência baixa → P4/P3
~~~
O chamado 2 é tratado como incidente crítico: abrir uma sala/canal, comunicar a gestão, buscar mitigação imediata (ex.: emissão em contingência) e, depois, registrar um **problema** para investigar a causa raiz.
`,
    },
    exercise: {
      prompt: 'O mesmo erro de "sessão expirada" foi registrado em 14 chamados ao longo de 3 semanas. Em todos, o N1 orientou o usuário a sair e entrar de novo, e o chamado foi encerrado. O que deveria ser feito?',
      options: [
        { t: 'Continuar como está: a orientação resolve.', ok: false, why: 'Ela restaura o serviço (é uma boa solução de contorno), mas a recorrência indica uma causa não tratada que gera custo contínuo.' },
        { t: 'Abrir um registro de problema, relacionar os 14 incidentes, documentar a solução de contorno e investigar a causa raiz (ex.: expiração de token/refresh).', ok: true, why: 'Recorrência é o gatilho clássico da gestão de problemas. Relacionar os incidentes dá a dimensão do impacto e direciona a investigação.' },
        { t: 'Escalar cada novo chamado diretamente para o desenvolvimento como P1.', ok: false, why: 'Cada ocorrência tem impacto baixo e já tem contorno. Inflar a prioridade desorganiza a fila. O caminho é o registro de problema.' },
        { t: 'Desativar a expiração de sessões.', ok: false, why: 'Isso cria um risco de segurança, e a decisão não cabe ao suporte.' },
      ],
      explain: 'Incidente trata o sintoma; problema trata a causa. Em entrevistas, mostrar que você percebe padrões nos chamados e propõe melhorias é um diferencial — e isso se conecta com sua experiência de investigar e corrigir causas, em vez de só reiniciar.',
    },
    summary: [
      'Incidente = restaurar; problema = causa raiz; requisição = pedido padrão; mudança = alteração planejada.',
      'Prioridade = impacto × urgência.',
      'Escalonamento funcional (competência) × hierárquico (gestão).',
      'Escale com contexto: evidências, testes feitos, hipótese.',
    ],
    related: ['a8-l2', 'e3-l1'],
    docs: [{ label: 'ITIL 4 é mantido pela PeopleCert/Axelos (material oficial pago; resumos gratuitos variam em qualidade)', url: 'https://www.peoplecert.org/' }],
  },
  {
    id: 'a8-l2', moduleId: 'a8', title: 'Documentação de incidentes e comunicação', minutes: 20,
    objective: 'Escrever registros de chamado, comunicações de incidente e postmortems claros e úteis.',
    explanation: `
**Registro de chamado útil** (para você, para o próximo plantonista e para a auditoria):
~~~
Sintoma:       o que o usuário vê (mensagem exata, tela, horário)
Escopo:        quem/quantos, quais funcionalidades, desde quando
Ambiente:      produção/staging, versão, navegador/dispositivo
Evidências:    request id, trechos de log, consultas e resultados
Testes feitos: o que foi testado e o resultado (inclusive o que foi descartado)
Causa:         confirmada ou hipótese (deixe claro qual)
Solução:       o que foi feito, por quem, quando
Pendências:    problema aberto? melhoria sugerida?
~~~

**Comunicação durante incidente** (para usuários/gestão, sem jargão):
- O que está acontecendo e qual é o impacto.
- O que já está sendo feito.
- Contorno disponível, se houver.
- Quando será a próxima atualização (e cumpra o horário, mesmo sem novidades).
Evite prometer prazos de resolução que você não controla. "Próxima atualização às 15h30" é melhor que "resolvido em 10 minutos".

**Postmortem (revisão pós-incidente), sem culpados:**
1. Resumo e impacto (duração, usuários, perdas).
2. Linha do tempo com horários: detecção, ações, mitigação, resolução.
3. Causa raiz e fatores contribuintes (por que não foi detectado antes?).
4. O que funcionou e o que não funcionou.
5. Ações com responsável e prazo (ex.: "adicionar validação de variáveis obrigatórias na pipeline").

"Sem culpados" não significa sem responsabilidade: o foco é corrigir o processo que permitiu o erro, não punir a pessoa.

**Base de conhecimento:** após resolver algo que pode voltar, escreva um artigo curto: sintoma → causa → solução → como verificar. Isso reduz o tempo do próximo atendimento e é um ótimo exemplo para citar em entrevistas.
`,
    example: {
      title: 'Registro do incidente de staging (baseado na sua experiência)',
      body: `
~~~
Sintoma:     front-end de staging em branco após deploy; console com erro ao chamar a API (URL "undefined")
Escopo:      apenas staging; todas as telas; desde o deploy das 10h12
Evidências:  log da pipeline sem a variável de URL da API no passo de build;
             bundle gerado com valor indefinido
Causa:       variável de ambiente ausente na configuração da pipeline do ambiente de staging
Solução:     variável adicionada na configuração do ambiente; novo deploy; tela validada
Prevenção:   sugerida checagem de variáveis obrigatórias no início do build
~~~
Use detalhes que você lembra com segurança. Em entrevista, se não lembrar um horário ou nome exato, diga isso, em vez de inventar.
`,
    },
    exercise: {
      prompt: 'Durante um incidente P1, já se passaram 40 minutos e a causa ainda não foi encontrada. A gestão pede uma atualização. Qual mensagem é mais adequada?',
      options: [
        { t: '"Estamos verificando. Em breve normaliza."', ok: false, why: 'Não informa impacto, ações nem próximo contato, e "em breve" é uma promessa sem base.' },
        { t: '"Emissão de notas indisponível para todos desde 14h05. Equipe investigando a integração com o provedor; rollback do deploy das 13h50 em avaliação. Contorno: emissão em contingência. Próxima atualização às 15h00."', ok: true, why: 'Informa impacto, início, ações, contorno e o horário do próximo contato, sem prometer um prazo que não se controla.' },
        { t: 'Não enviar nada até ter a causa, para não passar informação incompleta.', ok: false, why: 'Silêncio em P1 gera mais pressão e mais chamados. Atualizações regulares fazem parte do tratamento.' },
        { t: 'Enviar o stack trace completo para a gestão.', ok: false, why: 'Detalhe técnico demais para o público; vai para o registro técnico, não para a comunicação gerencial.' },
      ],
      explain: 'Comunicação adaptada ao público é uma competência avaliada em vagas de suporte. Técnico no chamado; impacto e próximos passos na comunicação. Note também a mitigação proposta (rollback) antes da causa raiz.',
    },
    summary: [
      'Registro: sintoma, escopo, evidências, testes, causa (confirmada ou hipótese), solução.',
      'Comunicação: impacto, ações, contorno e horário da próxima atualização.',
      'Postmortem sem culpados, com ações, responsáveis e prazos.',
      'Base de conhecimento reduz o tempo de atendimentos futuros.',
    ],
    related: ['a8-l1', 'e1-l1', 'c5-l1'],
    docs: [],
  },
];

// ---------------- Banco de perguntas ----------------
// difficulty: 1 básico, 2 intermediário, 3 avançado/cenário
export const questions = [
  // a1
  { id: 'a1-q01', moduleId: 'a1', lessonId: 'a1-l1', difficulty: 1, prompt: 'Qual método HTTP **não** é idempotente?', options: ['GET', 'PUT', 'POST', 'DELETE'], answer: 2, explain: 'Repetir um POST pode criar recursos duplicados. GET, PUT e DELETE produzem o mesmo estado final se repetidos.' },
  { id: 'a1-q02', moduleId: 'a1', lessonId: 'a1-l1', difficulty: 2, prompt: 'Um cliente envia JSON válido, mas a API responde 415. O que verificar primeiro?', options: ['O token de autenticação', 'O cabeçalho Content-Type da requisição', 'Se a rota existe', 'O certificado TLS'], answer: 1, explain: '415 (Unsupported Media Type) indica que o servidor não aceita o formato declarado. Muitas vezes o Content-Type está ausente ou como text/plain.' },
  { id: 'a1-q03', moduleId: 'a1', lessonId: 'a1-l1', difficulty: 2, prompt: 'Após publicar uma correção, um usuário continua vendo a versão antiga da página, enquanto outros veem a nova. Qual cabeçalho/conceito é mais relevante investigar?', options: ['Authorization', 'Cache (Cache-Control/ETag) no navegador ou CDN', 'Content-Length', 'Host'], answer: 1, explain: 'Diferença entre usuários após deploy sugere resposta em cache. Verifique cabeçalhos de cache e se há CDN/proxy guardando a versão antiga.' },
  { id: 'a1-q04', moduleId: 'a1', lessonId: 'a1-l1', difficulty: 3, prompt: 'Em `curl -v`, você vê `> GET /api/v1/itens` e `< HTTP/1.1 301` com `Location: https://...`. O script que consome a API recebe corpo vazio. Qual a explicação?', options: ['A API está fora do ar', 'O servidor redireciona HTTP para HTTPS e o cliente não segue redirecionamentos', 'O token expirou', 'Falta índice no banco'], answer: 1, explain: '301 com Location indica redirecionamento. Clientes como curl sem -L não seguem automaticamente. A correção é usar a URL https diretamente.' },
  { id: 'a1-q05', moduleId: 'a1', lessonId: 'a1-l2', difficulty: 1, prompt: 'Todos os usuários passaram a ver alerta de segurança no sistema às 00h de hoje, sem nenhum deploy. Hipótese mais provável?', options: ['Senha do banco alterada', 'Certificado TLS expirado', 'DNS sem cache', 'Firewall do usuário'], answer: 1, explain: 'Alerta geral em horário "redondo", sem mudança, é a assinatura de um certificado que venceu.' },
  { id: 'a1-q06', moduleId: 'a1', lessonId: 'a1-l2', difficulty: 2, prompt: 'Apenas um computador mostra erro de certificado em vários sites diferentes, todos válidos em outras máquinas. O que verificar primeiro?', options: ['A data e a hora do computador', 'O DNS do servidor', 'O certificado de cada site', 'A versão do HTTP'], answer: 0, explain: 'Um só cliente com erro em muitos sites aponta para o cliente. Relógio errado invalida a checagem de validade dos certificados.' },
  { id: 'a1-q07', moduleId: 'a1', lessonId: 'a1-l2', difficulty: 3, prompt: 'Uma integração Java falha com `PKIX path building failed` só na rede da empresa; em casa funciona. Hipótese mais forte?', options: ['O servidor de destino caiu', 'Proxy corporativo com inspeção TLS e CA corporativa ausente no truststore do Java', 'Firewall bloqueando a porta 80', 'Erro 500 na API'], answer: 1, explain: 'A diferença por rede sugere algo no caminho. Inspeção TLS substitui o certificado por um emitido pela CA corporativa, que o Java não conhece.' },

  // a2
  { id: 'a2-q01', moduleId: 'a2', lessonId: 'a2-l1', difficulty: 1, prompt: 'Usuário logado tenta acessar o módulo financeiro e recebe 403. O que isso indica?', options: ['Não está autenticado', 'Está autenticado, mas sem permissão', 'A rota não existe', 'O servidor está sobrecarregado'], answer: 1, explain: '403 = identidade conhecida, acesso negado. Resolver envolve permissão/papel — com aprovação de quem pode conceder.' },
  { id: 'a2-q02', moduleId: 'a2', lessonId: 'a2-l1', difficulty: 2, prompt: 'Uma integração recebe 429 após rodar um script de migração em lote. O que fazer?', options: ['Aumentar o timeout', 'Respeitar o limite de taxa: espaçar chamadas e usar Retry-After/backoff', 'Trocar o token', 'Reiniciar a API'], answer: 1, explain: '429 = limite de requisições. A solução é reduzir o ritmo, respeitar Retry-After e usar backoff exponencial.' },
  { id: 'a2-q03', moduleId: 'a2', lessonId: 'a2-l1', difficulty: 2, prompt: 'Uma API em FastAPI retorna 422 ao criar um registro. Onde está a informação mais útil?', options: ['No log do Nginx', 'No corpo da resposta, que lista os campos com erro de validação', 'No log do sistema operacional', 'No DNS'], answer: 1, explain: 'O FastAPI devolve um JSON "detail" com localização e motivo de cada erro de validação.' },
  { id: 'a2-q04', moduleId: 'a2', lessonId: 'a2-l1', difficulty: 3, prompt: 'Usuário do tenant A acessa `/faturas/881` e recebe 404, mas a fatura 881 existe no banco (pertence ao tenant B). Como interpretar?', options: ['Bug: a API deveria retornar a fatura', 'Comportamento esperado: a API esconde recursos de outros tenants respondendo 404', 'Problema de DNS', 'Banco corrompido'], answer: 1, explain: 'Muitas APIs respondem 404 (e não 403) para não revelar que o recurso existe em outro tenant. É uma medida de isolamento.' },
  { id: 'a2-q05', moduleId: 'a2', lessonId: 'a2-l2', difficulty: 1, prompt: 'Qual componente normalmente gera um 504?', options: ['O banco de dados', 'O proxy/gateway, ao esgotar o tempo de espera pela aplicação', 'O navegador', 'O DNS'], answer: 1, explain: '504 Gateway Timeout: o intermediário esperou o upstream e desistiu. A aplicação está lenta ou travada.' },
  { id: 'a2-q06', moduleId: 'a2', lessonId: 'a2-l2', difficulty: 2, prompt: 'O log do Nginx mostra `connect() failed (111: Connection refused) while connecting to upstream`. Qual o status retornado ao usuário e o próximo passo?', options: ['500; ler o código da aplicação', '502; verificar se a aplicação está rodando e escutando na porta do proxy_pass', '404; verificar a rota', '401; renovar token'], answer: 1, explain: 'Connection refused = nada escutando naquele endereço/porta. O Nginx responde 502. Verifique o serviço (systemctl/docker ps) e a porta (ss -tlnp).' },
  { id: 'a2-q07', moduleId: 'a2', lessonId: 'a2-l2', difficulty: 2, prompt: 'Apenas a rota `/relatorios/anual` retorna 504; o resto do sistema funciona. Hipótese mais provável?', options: ['Servidor fora do ar', 'Consulta/processamento da rota demora mais que o timeout do proxy', 'Certificado expirado', 'Usuário sem permissão'], answer: 1, explain: 'Uma rota específica e pesada estourando o tempo indica lentidão nela. Analise a consulta (EXPLAIN) ou mova o processamento para uma tarefa assíncrona.' },
  { id: 'a2-q08', moduleId: 'a2', lessonId: 'a2-l2', difficulty: 3, prompt: 'Após escalar de 2 para 4 workers Gunicorn em um servidor de 1 GB de RAM, aparecem 502 intermitentes e o log do sistema mostra `Out of memory: Killed process`. O que ocorre?', options: ['Bug na aplicação gerando 500', 'O kernel mata workers por falta de memória; o Nginx recebe a conexão fechada e responde 502', 'DNS instável', 'Token expirado'], answer: 1, explain: 'O OOM killer encerra processos quando a memória acaba. Reduza workers, aumente a memória ou otimize o consumo. O 502 é consequência.' },

  // a3
  { id: 'a3-q01', moduleId: 'a3', lessonId: 'a3-l1', difficulty: 1, prompt: 'O payload de um JWT é:', options: ['Criptografado e ilegível sem a chave', 'Codificado em Base64URL e legível por quem tiver o token', 'Armazenado apenas no servidor', 'Um hash da senha'], answer: 1, explain: 'JWT assinado (JWS) garante integridade, não sigilo. Não coloque dados sensíveis no payload.' },
  { id: 'a3-q02', moduleId: 'a3', lessonId: 'a3-l1', difficulty: 2, prompt: 'Usuários são deslogados exatamente 15 minutos após o login, mesmo usando o sistema. O que investigar?', options: ['Permissões do papel', 'O tempo de expiração (exp) do access token e o fluxo de refresh', 'O certificado TLS', 'O índice da tabela de usuários'], answer: 1, explain: 'Tempo fixo e exato aponta para expiração do token. Se há refresh token, verifique por que a renovação não ocorre.' },
  { id: 'a3-q03', moduleId: 'a3', lessonId: 'a3-l1', difficulty: 2, prompt: 'Tokens gerados em staging funcionam em produção. Qual o risco e a provável causa?', options: ['Nenhum risco', 'Mesmo segredo de assinatura nos dois ambientes; alguém com acesso a staging pode forjar acesso à produção', 'Problema de cache do navegador', 'DNS compartilhado'], answer: 1, explain: 'Cada ambiente deve ter segredo próprio. Compartilhar o segredo permite que um token de um ambiente menos protegido seja aceito em produção.' },
  { id: 'a3-q04', moduleId: 'a3', lessonId: 'a3-l1', difficulty: 3, prompt: 'Um cliente relata ver pedidos de outra empresa na listagem. Qual é a conduta correta?', options: ['Pedir que o cliente limpe o cache', 'Tratar como incidente de segurança: preservar evidências, escalar imediatamente e verificar o filtro de tenant nas consultas', 'Responder em até 5 dias úteis', 'Reiniciar o servidor e encerrar'], answer: 1, explain: 'Vazamento entre tenants é grave (dados pessoais/LGPD). Escalar imediatamente e preservar evidências vem antes de qualquer tentativa de correção.' },
  { id: 'a3-q05', moduleId: 'a3', lessonId: 'a3-l1', difficulty: 2, prompt: 'Em um sistema com sessões guardadas em memória e 2 instâncias sem sticky session, qual sintoma é esperado?', options: ['Erros 404', 'Usuários deslogados aleatoriamente ao alternar entre instâncias', 'Certificado inválido', 'Consultas lentas'], answer: 1, explain: 'Cada instância conhece apenas as próprias sessões. Ao cair na outra instância, o usuário aparece como não autenticado. A solução é usar sessões compartilhadas (Redis/banco) ou tokens.' },
  { id: 'a3-q06', moduleId: 'a3', lessonId: 'a3-l1', difficulty: 3, prompt: 'Você precisa ver o conteúdo de um token de produção para investigar um 403. Qual é a prática mais segura?', options: ['Colar o token em um site decodificador público', 'Decodificar localmente (base64/script) e não compartilhar o token completo no chamado', 'Enviar o token por e-mail para o desenvolvedor', 'Salvar o token em um documento compartilhado'], answer: 1, explain: 'Um token válido é uma credencial: quem o tiver pode agir como o usuário até que expire. Decodifique localmente e registre apenas as claims relevantes.' },

  // a4
  { id: 'a4-q01', moduleId: 'a4', lessonId: 'a4-l1', difficulty: 1, prompt: 'Para que serve um request id (correlation id)?', options: ['Criptografar requisições', 'Seguir uma mesma requisição pelos logs de vários componentes', 'Autenticar usuários', 'Aumentar a velocidade da API'], answer: 1, explain: 'O identificador é propagado e registrado por proxy, aplicação e serviços, ligando todas as linhas de uma mesma requisição.' },
  { id: 'a4-q02', moduleId: 'a4', lessonId: 'a4-l1', difficulty: 2, prompt: 'O log mostra 3.000 erros "500" entre 14:02 e 14:10 e, às 14:01, "disk usage 100% on /var". Qual é a causa provável?', options: ['Bug introduzido nas rotas', 'Disco cheio impedindo escrita (logs, uploads, banco), gerando os 500 em cascata', 'Ataque de negação de serviço', 'Token expirado'], answer: 1, explain: 'A primeira anomalia no tempo é a candidata a causa. Os 500 vêm depois e são consequência.' },
  { id: 'a4-q03', moduleId: 'a4', lessonId: 'a4-l1', difficulty: 2, prompt: 'Qual comando mostra os logs do serviço `api` apenas entre 14h e 14h15 de hoje?', options: ['tail -f /var/log/api', 'journalctl -u api --since "14:00" --until "14:15"', 'grep 14h api.log', 'systemctl status api'], answer: 1, explain: 'journalctl filtra por unit (-u) e por janela de tempo (--since/--until).' },
  { id: 'a4-q04', moduleId: 'a4', lessonId: 'a4-l1', difficulty: 3, prompt: 'Um erro intermitente ocorre "algumas vezes por dia". O log tem nível INFO e não mostra nada. Qual é a melhor próxima ação?', options: ['Encerrar o chamado por falta de evidência', 'Aumentar o detalhamento do log no ponto suspeito (temporariamente, com cuidado com dados sensíveis) e registrar o request id para capturar a próxima ocorrência', 'Ativar DEBUG em toda a produção indefinidamente', 'Reiniciar o servidor diariamente'], answer: 1, explain: 'Instrumentação direcionada captura a próxima ocorrência sem inundar os logs ou expor dados. DEBUG geral pode degradar desempenho e registrar dados pessoais.' },
  { id: 'a4-q05', moduleId: 'a4', lessonId: 'a4-l2', difficulty: 1, prompt: 'Qual opção do curl mostra a requisição enviada, a conexão e o TLS?', options: ['-o', '-v', '-s', '-L'], answer: 1, explain: '-v (verbose) mostra o que foi enviado (>), recebido (<) e detalhes da conexão (*).' },
  { id: 'a4-q06', moduleId: 'a4', lessonId: 'a4-l2', difficulty: 2, prompt: 'Você quer testar diretamente o servidor 10.0.0.7 atrás de um balanceador, mantendo o nome do site (para o TLS e o Host funcionarem). Qual opção do curl usar?', options: ['-k', '--resolve app.exemplo.com:443:10.0.0.7', '-X GET', '-H "IP: 10.0.0.7"'], answer: 1, explain: '--resolve força o IP para aquele nome/porta, sem alterar o DNS da máquina, e mantém SNI e Host corretos.' },
  { id: 'a4-q07', moduleId: 'a4', lessonId: 'a4-l2', difficulty: 2, prompt: 'Qual comando mede rapidamente o status e o tempo total de uma requisição, sem imprimir o corpo?', options: ['curl -I URL', 'curl -s -o /dev/null -w "%{http_code} %{time_total}\\n" URL', 'curl -v URL', 'curl -L URL'], answer: 1, explain: '-s silencia, -o /dev/null descarta o corpo e -w imprime métricas como http_code e time_total.' },
  { id: 'a4-q08', moduleId: 'a4', lessonId: 'a4-l2', difficulty: 3, prompt: 'Você copiou uma requisição com "Copy as cURL" para anexar ao chamado. O que fazer antes de colar?', options: ['Nada, para preservar a evidência', 'Remover/mascarar cookies e o cabeçalho Authorization', 'Trocar o método para GET', 'Adicionar -k'], answer: 1, explain: 'A cópia inclui credenciais da sessão. Chamados são lidos por várias pessoas e ficam guardados: mascare os segredos.' },

  // a5
  { id: 'a5-q01', moduleId: 'a5', lessonId: 'a5-l1', difficulty: 1, prompt: 'Um INNER JOIN entre `pedidos` e `clientes` retorna menos pedidos do que existem. Por quê?', options: ['INNER JOIN remove duplicatas', 'Pedidos sem cliente correspondente são descartados', 'Falta ORDER BY', 'O banco limita o resultado'], answer: 1, explain: 'INNER retorna só as linhas com correspondência nos dois lados. Pedidos órfãos desaparecem sem aviso.' },
  { id: 'a5-q02', moduleId: 'a5', lessonId: 'a5-l1', difficulty: 2, prompt: '`LEFT JOIN pagamentos pg ON ... WHERE pg.status = \'aprovado\'` — qual o efeito?', options: ['Mantém todos os pedidos e só mostra pagamentos aprovados', 'Equivale na prática a um INNER JOIN: pedidos sem pagamento aprovado somem', 'Gera erro de sintaxe', 'Duplica os pedidos'], answer: 1, explain: 'Linhas sem correspondência têm pg.status NULL, e o WHERE as remove. Para manter todos os pedidos, mova a condição para o ON.' },
  { id: 'a5-q03', moduleId: 'a5', lessonId: 'a5-l1', difficulty: 2, prompt: 'Após um LEFT JOIN, `COUNT(*)` e `COUNT(pg.id)` dão resultados diferentes por grupo. Qual conta corretamente "quantos pagamentos"?', options: ['COUNT(*)', 'COUNT(pg.id)', 'Os dois são iguais', 'Nenhum dos dois'], answer: 1, explain: 'COUNT(*) conta também a linha sem correspondência (pg.id NULL). COUNT(pg.id) ignora NULL.' },
  { id: 'a5-q04', moduleId: 'a5', lessonId: 'a5-l1', difficulty: 3, prompt: 'Você precisa de todos os usuários e, se houver, o endereço principal (`enderecos.principal = true`). Qual condição está correta?', options: ['LEFT JOIN enderecos e ON e.usuario_id = u.id WHERE e.principal = true', 'LEFT JOIN enderecos e ON e.usuario_id = u.id AND e.principal = true', 'JOIN enderecos e ON e.usuario_id = u.id AND e.principal = true', 'RIGHT JOIN enderecos e ON e.principal = true'], answer: 1, explain: 'A condição sobre a tabela opcional fica no ON, preservando os usuários sem endereço principal.' },
  { id: 'a5-q05', moduleId: 'a5', lessonId: 'a5-l2', difficulty: 1, prompt: 'Qual consulta encontra pedidos **sem** pagamento?', options: ['SELECT p.id FROM pedidos p JOIN pagamentos pg ON pg.pedido_id = p.id', 'SELECT p.id FROM pedidos p WHERE NOT EXISTS (SELECT 1 FROM pagamentos pg WHERE pg.pedido_id = p.id)', 'SELECT p.id FROM pedidos p WHERE p.id IS NULL', 'SELECT DISTINCT pedido_id FROM pagamentos'], answer: 1, explain: 'NOT EXISTS é a forma mais clara de anti-join e lida bem com NULL.' },
  { id: 'a5-q06', moduleId: 'a5', lessonId: 'a5-l2', difficulty: 2, prompt: 'Um relatório soma `pedidos.total` após JOIN com `pedido_itens` e o valor fica ~3× maior. Causa?', options: ['Erro de arredondamento', 'Fan-out: cada pedido se repete uma vez por item, e o total é somado várias vezes', 'Índice corrompido', 'Fuso horário'], answer: 1, explain: 'Em um JOIN 1:N, as linhas do lado "1" se repetem. Some do lado N, ou agregue antes de juntar.' },
  { id: 'a5-q07', moduleId: 'a5', lessonId: 'a5-l2', difficulty: 3, prompt: '`WHERE id NOT IN (SELECT gerente_id FROM equipes)` retorna vazio. `SELECT COUNT(*) FROM equipes WHERE gerente_id IS NULL` retorna 2. O que fazer?', options: ['Adicionar DISTINCT', 'Reescrever com NOT EXISTS (ou filtrar NULL na subconsulta)', 'Criar índice', 'Usar UNION'], answer: 1, explain: 'NULL na lista faz NOT IN nunca ser verdadeiro. NOT EXISTS ou "WHERE gerente_id IS NOT NULL" na subconsulta resolvem.' },
  { id: 'a5-q08', moduleId: 'a5', lessonId: 'a5-l2', difficulty: 2, prompt: 'Qual sinal simples indica fan-out inesperado após um JOIN?', options: ['A consulta ficou mais rápida', 'O COUNT(*) após o JOIN é maior que o COUNT(*) da tabela principal com o mesmo filtro', 'Aparecem colunas NULL', 'O ORDER BY mudou'], answer: 1, explain: 'Comparar contagens antes e depois do JOIN é um hábito simples que evita conclusões erradas.' },

  // a6
  { id: 'a6-q01', moduleId: 'a6', lessonId: 'a6-l1', difficulty: 1, prompt: 'Qual cláusula filtra grupos após a agregação?', options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], answer: 1, explain: 'WHERE atua nas linhas antes do GROUP BY; HAVING atua nos grupos já agregados.' },
  { id: 'a6-q02', moduleId: 'a6', lessonId: 'a6-l1', difficulty: 2, prompt: 'Como saber quantos **clientes diferentes** tiveram erro hoje em `erros(cliente_id, ...)`?', options: ['COUNT(*)', 'COUNT(cliente_id)', 'COUNT(DISTINCT cliente_id)', 'SUM(cliente_id)'], answer: 2, explain: 'COUNT(DISTINCT) conta valores únicos — a medida de impacto por cliente.' },
  { id: 'a6-q03', moduleId: 'a6', lessonId: 'a6-l1', difficulty: 2, prompt: '`SELECT SUM(valor) FROM pagamentos WHERE pedido_id = 999` para um pedido sem pagamentos retorna:', options: ['0', 'NULL', 'Erro', 'Uma linha vazia sem colunas'], answer: 1, explain: 'SUM de nenhuma linha é NULL. Use COALESCE(SUM(valor), 0) quando precisar de zero.' },
  { id: 'a6-q04', moduleId: 'a6', lessonId: 'a6-l1', difficulty: 3, prompt: 'Você precisa de **e-mails duplicados ignorando maiúsculas/minúsculas**. Qual consulta?', options: ['SELECT email FROM usuarios GROUP BY email HAVING COUNT(*) > 1', 'SELECT lower(email), COUNT(*) FROM usuarios GROUP BY lower(email) HAVING COUNT(*) > 1', 'SELECT DISTINCT email FROM usuarios', 'SELECT email FROM usuarios WHERE COUNT(*) > 1'], answer: 1, explain: 'Agrupar pela expressão normalizada junta "Ana@x.com" e "ana@x.com". A primeira opção os trataria como diferentes.' },
  { id: 'a6-q05', moduleId: 'a6', lessonId: 'a6-l2', difficulty: 1, prompt: 'Qual a principal vantagem de uma CTE (WITH) em consultas investigativas?', options: ['Sempre executa mais rápido', 'Organiza a consulta em etapas nomeadas e legíveis', 'Cria uma tabela permanente', 'Ignora permissões'], answer: 1, explain: 'A legibilidade facilita revisar, depurar e documentar no chamado. O desempenho depende do banco e da consulta.' },
  { id: 'a6-q06', moduleId: 'a6', lessonId: 'a6-l2', difficulty: 2, prompt: 'Antes de executar um UPDATE corretivo em produção, qual sequência é mais segura?', options: ['Executar direto e verificar depois', 'Rodar o SELECT com o mesmo WHERE, conferir a contagem, executar em transação e só então COMMIT', 'Apagar e recriar os registros', 'Desativar as foreign keys'], answer: 1, explain: 'SELECT com o mesmo WHERE + transação permitem verificar e desfazer. Registre tudo e siga o processo de aprovação.' },
  { id: 'a6-q07', moduleId: 'a6', lessonId: 'a6-l2', difficulty: 3, prompt: 'Para obter o pedido mais recente de cada cliente com todas as colunas, qual técnica é adequada?', options: ['GROUP BY cliente_id com MAX(criado_em) e as demais colunas soltas', 'ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY criado_em DESC) e filtrar 1', 'DISTINCT cliente_id', 'ORDER BY criado_em LIMIT 1'], answer: 1, explain: 'Funções de janela numeram as linhas dentro de cada grupo. LIMIT 1 traria apenas um pedido no total.' },
  { id: 'a6-q08', moduleId: 'a6', lessonId: 'a6-l1', difficulty: 3, prompt: 'Por que `SELECT status AS s, COUNT(*) FROM pedidos WHERE s = \'pago\' GROUP BY status` falha no PostgreSQL?', options: ['Porque COUNT exige DISTINCT', 'Porque o WHERE é avaliado antes do SELECT e não conhece o alias "s"', 'Porque falta HAVING', 'Porque status é palavra reservada'], answer: 1, explain: 'Na ordem lógica, WHERE vem antes do SELECT. Use a coluna original no WHERE.' },

  // a7
  { id: 'a7-q01', moduleId: 'a7', lessonId: 'a7-l1', difficulty: 1, prompt: 'No EXPLAIN ANALYZE, `Seq Scan` com "Rows Removed by Filter: 2.000.000" para retornar 50 linhas sugere:', options: ['A consulta está ótima', 'Um índice adequado no filtro provavelmente ajudaria', 'O banco está sem memória', 'Falta ORDER BY'], answer: 1, explain: 'Ler 2 milhões de linhas para usar 50 indica falta de um caminho de acesso seletivo.' },
  { id: 'a7-q02', moduleId: 'a7', lessonId: 'a7-l1', difficulty: 2, prompt: 'Existe índice em `email`, mas `WHERE lower(email) = \'ana@x.com\'` não o usa. Solução?', options: ['Criar índice de expressão em lower(email) ou normalizar o dado ao gravar', 'Aumentar a memória', 'Usar LIKE', 'Remover o índice'], answer: 0, explain: 'Aplicar uma função na coluna impede o uso do índice comum. Um índice de expressão (ou uma coluna normalizada) resolve.' },
  { id: 'a7-q03', moduleId: 'a7', lessonId: 'a7-l1', difficulty: 2, prompt: 'Um índice composto em `(tenant_id, criado_em)` ajuda MAIS em qual consulta?', options: ['WHERE criado_em > \'2026-11-01\'', 'WHERE tenant_id = 5 AND criado_em > \'2026-11-01\'', 'WHERE status = \'pago\'', 'WHERE total > 100'], answer: 1, explain: 'Índices compostos funcionam a partir da primeira coluna. Filtrar por tenant_id e depois pelo intervalo de criado_em aproveita os dois níveis.' },
  { id: 'a7-q04', moduleId: 'a7', lessonId: 'a7-l1', difficulty: 3, prompt: 'Por que ter cuidado com `EXPLAIN ANALYZE DELETE FROM ...` em produção?', options: ['Porque não mostra tempos', 'Porque ele executa de fato o DELETE', 'Porque bloqueia o EXPLAIN', 'Não há nenhum cuidado necessário'], answer: 1, explain: 'ANALYZE executa a instrução. Para comandos de escrita, use uma transação com ROLLBACK, ou teste fora da produção.' },
  { id: 'a7-q05', moduleId: 'a7', lessonId: 'a7-l2', difficulty: 2, prompt: 'O erro `QueuePool limit of size 5 overflow 10 reached` aparece em horários de pico. O que investigar primeiro?', options: ['Certificado TLS', 'Conexões não devolvidas ao pool / transações longas e o dimensionamento workers × pool frente ao max_connections', 'DNS', 'Permissão do usuário'], answer: 1, explain: 'O pool esgota quando conexões ficam presas (sessões não fechadas, consultas longas) ou quando o dimensionamento não acompanha a carga.' },
  { id: 'a7-q06', moduleId: 'a7', lessonId: 'a7-l2', difficulty: 2, prompt: 'O Flyway falha com "checksum mismatch" na migração V3. O que aconteceu e qual a boa prática?', options: ['O banco está corrompido', 'O arquivo V3, já aplicado, foi editado; nunca altere migrações aplicadas — crie uma nova (V4)', 'Falta índice', 'O Flyway precisa ser reinstalado'], answer: 1, explain: 'O Flyway guarda o checksum de cada migração aplicada. Edição posterior gera divergência. Correções viram novas migrações; o "repair" só deve ser usado com entendimento do impacto.' },
  { id: 'a7-q07', moduleId: 'a7', lessonId: 'a7-l2', difficulty: 3, prompt: 'Muitas sessões aparecem como `idle in transaction` há horas no `pg_stat_activity`. Qual o risco?', options: ['Nenhum, estão ociosas', 'Mantêm locks e conexões ocupadas, podendo bloquear outras consultas e esgotar o pool', 'Apenas consomem disco', 'Aceleram as consultas'], answer: 1, explain: 'Uma transação aberta segura locks e conexões, e impede a limpeza (vacuum) de versões antigas de linhas. Defina timeouts e corrija o código que não finaliza transações.' },
  { id: 'a7-q08', moduleId: 'a7', lessonId: 'a7-l2', difficulty: 3, prompt: 'Uma migração vai criar um índice em uma tabela de 50 milhões de linhas no PostgreSQL em produção. Como reduzir o impacto?', options: ['CREATE INDEX normal no horário de pico', 'CREATE INDEX CONCURRENTLY, fora do pico, monitorando — sabendo que não pode rodar dentro de uma transação', 'Desligar o banco durante a criação', 'Criar sem nome'], answer: 1, explain: 'CONCURRENTLY evita bloquear escritas durante a criação. É mais lento e, por não poder rodar em transação, exige atenção em ferramentas de migração que envolvem tudo em transação.' },

  // a8
  { id: 'a8-q01', moduleId: 'a8', lessonId: 'a8-l1', difficulty: 1, prompt: 'Qual a principal diferença entre incidente e problema (ITIL)?', options: ['Incidente é grave e problema é leve', 'Incidente busca restaurar o serviço; problema busca a causa raiz e evitar recorrência', 'São sinônimos', 'Problema só existe em hardware'], answer: 1, explain: 'Gestão de incidentes restaura o serviço rapidamente; gestão de problemas investiga a causa raiz e evita novas ocorrências.' },
  { id: 'a8-q02', moduleId: 'a8', lessonId: 'a8-l1', difficulty: 1, prompt: 'Solicitação para criar o acesso de um novo funcionário é:', options: ['Incidente', 'Problema', 'Requisição de serviço', 'Mudança emergencial'], answer: 2, explain: 'É um pedido padrão, sem falha envolvida.' },
  { id: 'a8-q03', moduleId: 'a8', lessonId: 'a8-l1', difficulty: 2, prompt: 'O sistema de folha de pagamento está inacessível para o RH inteiro, no dia do fechamento. Qual prioridade?', options: ['P4', 'P3', 'P2', 'P1'], answer: 3, explain: 'Impacto alto (processo crítico, área inteira) e urgência alta (prazo de fechamento) → maior prioridade.' },
  { id: 'a8-q04', moduleId: 'a8', lessonId: 'a8-l1', difficulty: 2, prompt: 'Ao escalar um chamado para o N2, o que é mais importante incluir?', options: ['Apenas o nome do usuário', 'Sintoma, escopo, evidências, testes já feitos (inclusive os descartados) e a hipótese atual', 'Um pedido de urgência em letras maiúsculas', 'A senha do usuário para teste'], answer: 1, explain: 'Contexto evita que o próximo nível repita testes. Nunca peça ou registre senhas de usuários.' },
  { id: 'a8-q05', moduleId: 'a8', lessonId: 'a8-l2', difficulty: 2, prompt: 'Em uma comunicação de incidente para a gestão, o que NÃO deve faltar?', options: ['Stack trace completo', 'Impacto, ações em andamento e horário da próxima atualização', 'Nome de quem causou o problema', 'Promessa de resolução em minutos'], answer: 1, explain: 'A gestão precisa entender o impacto e saber quando receberá novidades. Detalhes técnicos vão para o registro técnico.' },
  { id: 'a8-q06', moduleId: 'a8', lessonId: 'a8-l2', difficulty: 2, prompt: 'Um postmortem "sem culpados" significa:', options: ['Ninguém é responsável por nada', 'O foco é entender e corrigir as falhas de processo e de sistema, não punir pessoas', 'Não registrar quem executou as ações', 'Não fazer reunião'], answer: 1, explain: 'Pessoas relatam com honestidade quando não temem punição. O resultado são ações concretas que evitam a repetição.' },
  { id: 'a8-q07', moduleId: 'a8', lessonId: 'a8-l2', difficulty: 3, prompt: 'No registro técnico, você ainda não confirmou a causa. Como escrever?', options: ['Escrever a hipótese como se fosse a causa', 'Marcar explicitamente como hipótese, com as evidências a favor e o que falta para confirmar', 'Deixar o campo de causa em branco sem comentários', 'Escrever "erro do usuário"'], answer: 1, explain: 'Diferenciar hipótese de fato evita que outros partam de uma conclusão errada.' },
  { id: 'a8-q08', moduleId: 'a8', lessonId: 'a8-l1', difficulty: 3, prompt: 'Durante um P1, a causa raiz ainda é desconhecida, mas um rollback do último deploy provavelmente restaura o serviço. O que fazer, em geral?', options: ['Esperar encontrar a causa raiz antes de qualquer ação', 'Propor e executar o rollback (conforme o processo de mudança) para restaurar o serviço, preservando logs para investigar depois', 'Apagar os logs para liberar espaço', 'Comunicar que não há o que fazer'], answer: 1, explain: 'Em incidentes, restaurar o serviço vem primeiro. A investigação da causa raiz continua depois, como gestão de problema.' },
];
