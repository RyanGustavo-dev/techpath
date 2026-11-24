// Trilha C — Linux, infraestrutura e operações.

export const lessons = [
  {
    id: 'c1-l1', moduleId: 'c1', title: 'Arquivos, permissões, processos e disco', minutes: 30,
    objective: 'Resolver "Permission denied", processos descontrolados e disco cheio com segurança.',
    explanation: `
**Diretórios que importam em servidores:**
~~~
/etc      configurações (nginx, systemd, ssh)      /var/log   logs
/var/lib  dados de serviços (docker, postgres)     /opt, /srv aplicações e dados servidos
/home     usuários                                 /tmp       temporários (pode ser limpo no boot)
~~~

**Permissões:** cada arquivo tem dono (**u**ser), **g**rupo e **o**utros, com leitura (**r**=4), escrita (**w**=2) e execução (**x**=1).
~~~
$ ls -l /opt/app/run.sh
-rwxr-x---  1 deploy www-data  812 nov 24 10:02 run.sh
 │└┬┘└┬┘└┬┘     dono   grupo
 │ u  g  o      u=rwx(7) g=r-x(5) o=---(0)  → 750
~~~
- Em **diretórios**, \`x\` permite **entrar** (acessar) e \`r\` permite listar. Para ler \`/opt/app/config/app.env\`, o usuário precisa de \`x\` em **todos** os diretórios do caminho.
- \`chmod 640 arquivo\`, \`chown deploy:www-data arquivo\`, \`namei -l /caminho/completo\` (mostra as permissões de cada nível do caminho — ótimo para diagnóstico).
- **Nunca "resolva" com \`chmod 777\`**: qualquer usuário do sistema poderia alterar ou executar o arquivo. Descubra **qual usuário** o processo usa (\`ps -o user= -p PID\`) e dê a ele apenas o necessário.

**Processos:**
- \`ps aux --sort=-%mem | head\` — maiores consumidores de memória; \`top\`/\`htop\` — visão ao vivo.
- \`kill PID\` envia SIGTERM (15): pede um encerramento limpo. \`kill -9 PID\` envia SIGKILL: força o encerramento sem limpeza. Use apenas se o SIGTERM não funcionar.
- \`free -h\` — memória. A coluna **available** é a que importa; "buff/cache" é memória reutilizável.
- \`uptime\` — load average (1, 5 e 15 min). Compare com o número de CPUs (\`nproc\`).

**Disco cheio** ("No space left on device"):
- \`df -h\` — uso por sistema de arquivos. \`df -i\` — inodes (muitos arquivos pequenos também esgotam o disco).
- \`du -sh /var/* | sort -h\` — onde está o volume.
- Culpados frequentes: logs sem rotação, imagens/volumes Docker antigos, backups locais, core dumps.
- **Arquivo apagado que continua ocupando espaço:** se um processo ainda mantém o arquivo aberto, o espaço só é liberado quando o processo fecha o arquivo. Veja com \`lsof +L1\`. Para logs, prefira **truncar** (\`: > arquivo.log\`) ou configurar o logrotate, em vez de apagar o arquivo em uso.
`,
    example: {
      title: 'Serviço não lê o arquivo de configuração',
      body: `
~~~
$ journalctl -u app -n 5
PermissionError: [Errno 13] Permission denied: '/opt/app/config/app.env'
$ ps -o user= -p $(pgrep -f gunicorn | head -1)
app
$ namei -l /opt/app/config/app.env
drwxr-xr-x root   root   /
drwxr-xr-x root   root   opt
drwxr-x--- deploy deploy app        ← "app" não é dono nem do grupo deploy: sem x aqui
drwxr-xr-x deploy deploy config
-rw-r----- deploy deploy app.env
~~~
O processo roda como \`app\`, que não pode atravessar \`/opt/app\`. Solução mínima: colocar \`app\` no grupo adequado, ou ajustar o grupo do diretório e do arquivo (ex.: \`chgrp -R app /opt/app/config\` + permissões 750/640), em vez de abrir tudo para todos.
`,
    },
    exercise: {
      prompt: '`df -h` mostra `/` com 100% de uso. Você apaga `/var/log/app/app.log` (40 GB), mas o `df` continua em 100%. Por quê, e o que fazer?',
      options: [
        { t: 'O df está com cache; basta aguardar algumas horas.', ok: false, why: 'O df é preciso. O espaço não foi liberado de fato.' },
        { t: 'O processo da aplicação ainda mantém o arquivo aberto; o espaço só é liberado quando ele fecha o arquivo. Verifique com `lsof +L1` e reinicie o serviço ou faça-o reabrir os logs.', ok: true, why: 'No Linux, apagar remove o nome do arquivo, não os dados em uso. Enquanto houver um descritor aberto, os blocos continuam ocupados.' },
        { t: 'É preciso reiniciar o servidor inteiro obrigatoriamente.', ok: false, why: 'Basta o processo que mantém o arquivo fechá-lo. Reiniciar o servidor é desproporcional.' },
        { t: 'O arquivo foi para a lixeira.', ok: false, why: 'rm não usa lixeira.' },
      ],
      explain: 'A melhor prática seria truncar (`: > app.log`) em vez de apagar, e configurar o logrotate (com `copytruncate` ou sinalizando o serviço) para evitar a recorrência. No registro do incidente, a ação preventiva é a rotação de logs.',
    },
    summary: [
      'rwx = 4/2/1; em diretórios, x = atravessar.',
      'namei -l mostra as permissões de todo o caminho; nunca use 777 como solução.',
      'SIGTERM antes de SIGKILL; "available" no free -h.',
      'Disco cheio: df -h, df -i, du; arquivo apagado em uso → lsof +L1.',
    ],
    related: ['c2-l1', 'c6-l1'],
    docs: [],
  },
  {
    id: 'c2-l1', moduleId: 'c2', title: 'systemd e journalctl: serviço que não inicia', minutes: 25,
    objective: 'Investigar uma unit systemd em falha e ler seus logs com precisão.',
    explanation: `
**systemd** gerencia serviços (units) na maioria das distribuições Linux modernas.

**Comandos essenciais:**
~~~
systemctl status app            estado, PID, últimas linhas do log, código de saída
systemctl start|stop|restart app
systemctl enable app            iniciar automaticamente no boot (enable --now: habilita e inicia)
systemctl daemon-reload         recarregar após editar arquivos .service
systemctl list-units --failed   todas as units com falha
systemctl cat app               conteúdo efetivo da unit (inclui overrides)
~~~

**Unit típica de uma aplicação Python:**
~~~
[Unit]
Description=API Zarpa
After=network-online.target

[Service]
User=app
WorkingDirectory=/opt/app
EnvironmentFile=/opt/app/.env
ExecStart=/opt/app/venv/bin/gunicorn -w 3 -b 127.0.0.1:8000 app:app
Restart=on-failure

[Install]
WantedBy=multi-user.target
~~~

**journalctl:**
~~~
journalctl -u app -n 100 --no-pager     últimas 100 linhas
journalctl -u app -f                     acompanhar ao vivo
journalctl -u app --since "10 min ago"
journalctl -u app -b                     desde o último boot
journalctl -p err -b                     apenas erros do sistema desde o boot
~~~

**Roteiro para "serviço não inicia":**
1. \`systemctl status app\` → veja **Active**, **code=exited, status=N** e as últimas linhas.
2. \`journalctl -u app -n 50\` → a mensagem real costuma estar aqui (traceback, "address already in use", arquivo não encontrado).
3. Rode o **ExecStart manualmente**, como o mesmo usuário: \`sudo -u app /opt/app/venv/bin/gunicorn ...\` → mostra o erro direto no terminal.
4. Causas comuns: caminho errado no ExecStart, venv inexistente, **EnvironmentFile ausente**, permissão, porta ocupada (\`ss -tlnp | grep 8000\`), dependência (banco) indisponível.
5. Alterou o .service? \`systemctl daemon-reload\` antes de reiniciar.

**"start request repeated too quickly":** a unit falhou várias vezes seguidas e o systemd parou de tentar (start limit). Corrija a causa, depois rode \`systemctl reset-failed app\` e inicie novamente.

**status=203/EXEC** → o systemd não conseguiu executar o binário (caminho errado ou sem permissão de execução). **status=217/USER** → o usuário definido em User= não existe.
`,
    example: {
      title: 'Lendo um status de falha',
      body: `
~~~
$ systemctl status app
× app.service - API Zarpa
     Active: failed (Result: exit-code) since Mon 2026-11-24 09:14:02
    Process: 4121 ExecStart=/opt/app/venv/bin/gunicorn ... (code=exited, status=1/FAILURE)

$ journalctl -u app -n 8 --no-pager
gunicorn[4121]: [ERROR] Connection in use: ('127.0.0.1', 8000)
gunicorn[4121]: [ERROR] Retrying in 1 second.
gunicorn[4121]: [ERROR] Can't connect to ('127.0.0.1', 8000)

$ ss -tlnp | grep 8000
LISTEN 0 2048 127.0.0.1:8000  users:(("python",pid=3990))
~~~
Outro processo (PID 3990, talvez uma execução manual esquecida) ocupa a porta 8000. Identifique o que é antes de encerrá-lo (\`ps -fp 3990\`).
`,
    },
    exercise: {
      prompt: 'Após editar `/etc/systemd/system/app.service` para mudar a porta, você executa `systemctl restart app`, mas a aplicação continua na porta antiga. Por quê?',
      options: [
        { t: 'O systemd ignora alterações em arquivos de unit.', ok: false, why: 'Ele usa as alterações, mas apenas depois de recarregar a configuração.' },
        { t: 'Faltou `systemctl daemon-reload` para o systemd reler a definição da unit.', ok: true, why: 'O systemd mantém as definições em memória. daemon-reload relê os arquivos; geralmente ele até emite um aviso quando o arquivo mudou.' },
        { t: 'É necessário reiniciar o servidor.', ok: false, why: 'daemon-reload + restart resolvem sem reboot.' },
        { t: 'A porta antiga está em cache no DNS.', ok: false, why: 'DNS não guarda portas.' },
      ],
      explain: 'Confirme com `systemctl cat app` (a definição que está valendo) e `ss -tlnp` (a porta realmente em escuta). Se existir um override em `/etc/systemd/system/app.service.d/`, ele pode sobrescrever o que você alterou — o `systemctl cat` mostra isso.',
    },
    summary: [
      'status → journalctl -u → executar o ExecStart manualmente.',
      'daemon-reload depois de editar units.',
      '203/EXEC: binário/caminho; 217/USER: usuário inexistente.',
      'reset-failed após "start request repeated too quickly".',
    ],
    related: ['c2-l2', 'a4-l1', 'c3-l1'],
    docs: [
      { label: 'systemctl (systemd)', url: 'https://www.freedesktop.org/software/systemd/man/latest/systemctl.html' },
      { label: 'journalctl (systemd)', url: 'https://www.freedesktop.org/software/systemd/man/latest/journalctl.html' },
    ],
  },
  {
    id: 'c2-l2', moduleId: 'c2', title: 'SSH com chaves, Bash e automação segura', minutes: 25,
    objective: 'Acessar servidores com chaves, diagnosticar falhas de SSH e escrever scripts Bash robustos.',
    explanation: `
**Autenticação por chave:** você gera um par de chaves. A **pública** vai para o servidor (\`~/.ssh/authorized_keys\` do usuário); a **privada** nunca sai do cliente (ou do cofre de segredos da pipeline).
~~~
ssh-keygen -t ed25519 -C "deploy-pipeline"
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@servidor
ssh -i ~/.ssh/id_ed25519 deploy@servidor
~~~

**Falhas comuns:**
- **"Permission denied (publickey)":** chave errada, chave pública ausente no authorized_keys **do usuário correto**, ou permissões frouxas. O sshd recusa chaves se \`~/.ssh\` não for 700 e \`authorized_keys\` não for 600 (ou se a home for gravável por outros).
- **"Host key verification failed" / "REMOTE HOST IDENTIFICATION HAS CHANGED":** a chave do servidor mudou (reinstalação) — **ou** há um intermediário malicioso. Confirme com o responsável antes de remover a entrada antiga (\`ssh-keygen -R servidor\`). Em pipelines, registre a chave conhecida do servidor (known_hosts) em vez de desativar a verificação.
- **Timeout:** rede/firewall/porta (o SSH pode não estar na 22).
- \`ssh -v\` mostra quais chaves foram oferecidas e em que etapa falhou.

**Boas práticas:** desabilitar o login de root por senha, usar chaves com usuários específicos, aplicar o menor privilégio no sudo (o usuário de deploy só pode reiniciar o serviço dele) e rotacionar as chaves ao desligar pessoas ou integrações.

**Bash robusto para automação:**
~~~
#!/usr/bin/env bash
set -euo pipefail          # para no primeiro erro, variável indefinida é erro, falha em pipes
IFS=$'\\n\\t'

APP_DIR="/opt/app"
: "$DEPLOY_ENV"            # falha cedo se a variável não existir (com set -u)

log() { echo "[$(date '+%F %T')] $*"; }

log "Atualizando código em $APP_DIR"
cd "$APP_DIR"
git pull --ff-only
"$APP_DIR/venv/bin/pip" install -r requirements.txt
"$APP_DIR/venv/bin/alembic" upgrade head
sudo systemctl restart app
systemctl is-active --quiet app && log "OK" || { log "Serviço não subiu"; exit 1; }
~~~
- **Aspas em variáveis** ("$VAR") evitam quebra com espaços.
- Código de saída: \`0\` = sucesso. Pipelines e agendadores (cron) dependem disso.
- \`cron\`: \`crontab -e\`; o ambiente do cron é mínimo (PATH reduzido). Use caminhos absolutos e redirecione a saída para um log.
`,
    example: {
      title: 'Depurando "Permission denied (publickey)" na pipeline',
      body: `
~~~
$ ssh -v deploy@10.0.1.20
debug1: Offering public key: /root/.ssh/id_ed25519 ED25519 SHA256:Xk3...
debug1: Authentications that can continue: publickey
deploy@10.0.1.20: Permission denied (publickey).

# no servidor
$ ls -ld /home/deploy/.ssh /home/deploy/.ssh/authorized_keys
drwxrwxr-x deploy deploy /home/deploy/.ssh             ← 775: permissivo demais
-rw-rw-r-- deploy deploy /home/deploy/.ssh/authorized_keys
$ sudo tail /var/log/auth.log
Authentication refused: bad ownership or modes for directory /home/deploy/.ssh
~~~
A chave estava correta, mas o sshd recusou por segurança. \`chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys\` resolve. O log de autenticação do servidor (\`/var/log/auth.log\` ou \`journalctl -u ssh\`/\`sshd\`) diz o motivo exato.
`,
    },
    exercise: {
      prompt: 'Um script de backup no cron "funciona quando rodo manualmente, mas não pelo cron". O que é mais provável?',
      options: [
        { t: 'O cron não executa scripts Bash.', ok: false, why: 'O cron executa qualquer comando.' },
        { t: 'Diferenças de ambiente: PATH reduzido, variáveis ausentes, diretório de trabalho diferente ou outro usuário.', ok: true, why: 'O cron roda com um ambiente mínimo. Comandos sem caminho absoluto, variáveis definidas no .bashrc e caminhos relativos quebram.' },
        { t: 'O disco está cheio.', ok: false, why: 'Afetaria também a execução manual.' },
        { t: 'O cron precisa de internet.', ok: false, why: 'Não há relação.' },
      ],
      explain: 'Redirecione a saída (`>> /var/log/backup.log 2>&1`) para ver o erro. Use caminhos absolutos, defina as variáveis no próprio script (ou carregue um arquivo .env explicitamente) e faça `cd` para o diretório correto. Confira também se o crontab é do usuário certo.',
    },
    summary: [
      'Chave pública no servidor; privada protegida no cliente/cofre.',
      '~/.ssh 700, authorized_keys 600; ssh -v e auth.log explicam falhas.',
      'Host key mudou → confirme antes de remover; não desative a verificação.',
      'Bash: set -euo pipefail, aspas, exit codes; cron tem ambiente mínimo.',
    ],
    related: ['c2-l1', 'c5-l1', 'd1-l1'],
    docs: [{ label: 'OpenSSH — manuais', url: 'https://www.openssh.com/manual.html' }],
  },
  {
    id: 'c3-l1', moduleId: 'c3', title: 'Nginx como proxy reverso e a origem dos 502/504', minutes: 25,
    objective: 'Ler uma configuração de proxy reverso e interpretar o error.log do Nginx.',
    explanation: `
Um **proxy reverso** recebe as requisições dos clientes e as repassa para a aplicação (o **upstream**). O Nginx também costuma terminar o TLS, servir arquivos estáticos, aplicar limites e balancear entre instâncias.

~~~
server {
    listen 443 ssl;
    server_name app.exemplo.com;
    ssl_certificate     /etc/letsencrypt/live/app.exemplo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.exemplo.com/privkey.pem;

    location /static/ { root /opt/app; }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
~~~
- Os cabeçalhos \`X-Forwarded-*\` informam à aplicação o IP real do cliente e se a conexão original era HTTPS. Sem eles, a aplicação vê tudo como vindo de 127.0.0.1 e pode gerar links http:// ou entrar em loop de redirecionamento.
- \`fullchain.pem\` inclui o certificado intermediário (lembre da cadeia incompleta).

**Logs:**
- \`/var/log/nginx/access.log\` — cada requisição: IP, método, caminho, status, bytes, user agent (e o tempo, se configurado).
- \`/var/log/nginx/error.log\` — problemas do próprio Nginx e da comunicação com o upstream.

**Mensagens do error.log e significado:**
~~~
connect() failed (111: Connection refused) while connecting to upstream   → 502: app parada ou porta errada
upstream prematurely closed connection                                   → 502: app/worker morreu no meio da resposta
no live upstreams                                                         → 502: todas as instâncias marcadas como indisponíveis
upstream timed out (110: Connection timed out) while reading response     → 504: app lenta
connect() to unix:/run/app.sock failed (13: Permission denied)           → 502: Nginx sem permissão no socket
client intended to send too large body                                    → 413: aumente client_max_body_size se for legítimo
~~~

**Operação segura:** \`nginx -t\` testa a configuração **antes** de aplicar; \`systemctl reload nginx\` aplica sem derrubar as conexões. Um erro de sintaxe com \`restart\` deixa o site inteiro fora do ar.
`,
    example: {
      title: 'Upload falhando com 413',
      body: `
~~~
# usuário: "não consigo anexar PDF maior que 1 MB"
# access.log
10.0.3.15 - - [24/Nov/2026:11:02:13] "POST /anexos HTTP/1.1" 413 183
# error.log
client intended to send too large body: 5242880 bytes
~~~
O padrão do Nginx é \`client_max_body_size 1m\`. A requisição nem chegou à aplicação. Ajuste o valor de acordo com a regra de negócio (ex.: \`10m\`), rode \`nginx -t\` e \`reload\`. Verifique também se a aplicação tem limite próprio.
`,
    },
    exercise: {
      prompt: 'Após mudar o Gunicorn de `127.0.0.1:8000` para um socket Unix (`/run/app/app.sock`), o site passa a retornar 502. O error.log mostra `connect() to unix:/run/app/app.sock failed (13: Permission denied)`. Qual é a correção adequada?',
      options: [
        { t: '`chmod 777 /run/app/app.sock`', ok: false, why: 'Funciona, mas permite que qualquer usuário do sistema fale diretamente com a aplicação. Não é o menor privilégio.' },
        { t: 'Ajustar dono/grupo e permissões do socket e do diretório para que o usuário do Nginx (ex.: www-data) tenha acesso via grupo.', ok: true, why: 'Configurar o Gunicorn para criar o socket com o grupo do Nginx (ou usar um socket do systemd com SocketGroup) e garantir x no diretório resolve com o mínimo necessário.' },
        { t: 'Voltar para TCP sem entender o motivo.', ok: false, why: 'É um contorno válido em emergência, mas a causa é simples e está identificada no log.' },
        { t: 'Aumentar o proxy_read_timeout.', ok: false, why: 'O erro é de permissão, não de tempo.' },
      ],
      explain: 'O código 13 é EACCES (permissão negada). Lembre que o Nginx precisa de permissão no socket **e** de x em cada diretório do caminho (`namei -l /run/app/app.sock`). É a mesma lógica de permissões do módulo de Linux.',
    },
    summary: [
      'Proxy reverso: TLS, estáticos e repasse ao upstream com X-Forwarded-*.',
      'error.log diz por que um 502/504 aconteceu.',
      'Refused/closed/no live upstreams → 502; timed out → 504.',
      'nginx -t antes de reload.',
    ],
    related: ['a2-l2', 'c2-l1', 'c1-l1'],
    docs: [
      { label: 'Nginx — ngx_http_proxy_module', url: 'https://nginx.org/en/docs/http/ngx_http_proxy_module.html' },
      { label: 'Nginx — documentação', url: 'https://nginx.org/en/docs/' },
    ],
  },
  {
    id: 'c4-l1', moduleId: 'c4', title: 'Docker e Compose: contêiner que reinicia, rede e volumes', minutes: 30,
    objective: 'Diagnosticar contêineres em loop de reinício, falhas de rede entre serviços e perda de dados.',
    explanation: `
**Ciclo de vida:** o contêiner vive enquanto o **processo principal** (PID 1) estiver rodando. Se ele termina, o contêiner para; com uma política \`restart: always\`/\`unless-stopped\`, o Docker o reinicia — gerando um **loop de reinício** se o erro persistir.

**Comandos de diagnóstico:**
~~~
docker ps -a                                     estado, "Restarting (1) 5 seconds ago"
docker logs --tail 100 nome                      saída do processo principal
docker logs -f nome
docker inspect nome --format '{{.State.ExitCode}} {{.State.OOMKilled}}'
docker compose ps / docker compose logs -f api
docker exec -it nome sh                          entrar no contêiner (se ele estiver rodando)
docker stats                                     CPU/memória ao vivo
~~~

**Exit codes:**
- **0** → o processo terminou normalmente (ex.: um comando que roda e sai). Para um servidor, isso indica um comando de inicialização errado.
- **1** (ou outro valor baixo) → erro da aplicação: exceção, configuração ausente. Veja os logs.
- **137** = 128 + 9 (SIGKILL) → normalmente **falta de memória** (OOMKilled: true) ou \`docker kill\`.
- **143** = 128 + 15 (SIGTERM) → parada solicitada (docker stop).
- **127** → comando não encontrado (entrypoint/caminho errado).

**Rede no Compose:** os serviços de um mesmo arquivo Compose ficam em uma rede própria e se encontram **pelo nome do serviço**.
- Dentro do contêiner, \`localhost\` é **o próprio contêiner**. A API deve se conectar a \`db:5432\`, não a \`localhost:5432\`.
- \`ports: "5432:5432"\` publica a porta **no host**. A comunicação entre contêineres não precisa disso.
- \`depends_on\` controla a **ordem de inicialização**, não espera o banco estar **pronto**. Use \`healthcheck\` + \`depends_on: condition: service_healthy\`, ou lógica de retry na aplicação.

**Volumes:** os dados gravados na camada do contêiner **desaparecem** quando ele é recriado (\`docker compose down/up\` com nova imagem). Bancos devem usar **volume nomeado** ou bind mount. \`docker compose down -v\` **apaga os volumes**: cuidado em ambientes com dados.

**Variáveis:** \`environment:\` e \`env_file:\` no Compose. Um \`.env\` ao lado do compose.yaml é usado para **substituição de variáveis no próprio arquivo**, o que é diferente de passá-las ao contêiner.
`,
    example: {
      title: 'API em loop de reinício',
      body: `
~~~
$ docker compose ps
NAME    STATUS
api     Restarting (1) 4 seconds ago
db      Up 2 minutes (healthy)

$ docker compose logs --tail 5 api
api  | sqlalchemy.exc.OperationalError: connection to server at "localhost" (127.0.0.1),
api  |   port 5432 failed: Connection refused

$ docker compose exec db env | grep POSTGRES_DB   # banco ok
$ grep DATABASE_URL .env
DATABASE_URL=postgresql://app:senha@localhost:5432/app
~~~
O banco está saudável. A API tenta \`localhost\`, que dentro do contêiner dela é ela mesma. Corrija para \`@db:5432\` (o nome do serviço). Exit code 1 + loop de reinício = erro de inicialização da aplicação.
`,
    },
    exercise: {
      prompt: 'Um worker em contêiner reinicia a cada ~10 minutos. `docker inspect` mostra `ExitCode 137` e `OOMKilled true`. O compose define `mem_limit: 256m`. O que fazer?',
      options: [
        { t: 'Remover a política de restart para parar o loop.', ok: false, why: 'Esconde o sintoma: o worker simplesmente fica parado.' },
        { t: 'Investigar o consumo de memória (docker stats, padrão de crescimento) e decidir entre ajustar o limite e corrigir o consumo (lotes menores, vazamento).', ok: true, why: '137 + OOMKilled = o kernel matou o processo ao atingir o limite. Crescimento gradual até o limite sugere vazamento ou processamento de lotes grandes.' },
        { t: 'Mudar o exit code para 0.', ok: false, why: 'O exit code é um resultado, não uma configuração.' },
        { t: 'Trocar a imagem base do contêiner.', ok: false, why: 'Sem evidência de relação com a imagem.' },
      ],
      explain: 'Aumentar o limite é uma mitigação válida e rápida, desde que o host tenha memória. A causa raiz, se o consumo cresce sem parar, é provavelmente um vazamento ou o carregamento de dados demais em memória (ex.: exportação sem paginação).',
    },
    summary: [
      'Contêiner vive enquanto o PID 1 vive; restart policy gera loop se o erro persiste.',
      'Exit: 0 normal, 1 erro de app, 127 comando não encontrado, 137 SIGKILL/OOM, 143 SIGTERM.',
      'Entre serviços do Compose: use o nome do serviço, não localhost.',
      'depends_on não espera prontidão; volumes nomeados para dados; down -v apaga volumes.',
    ],
    related: ['c5-l1', 'c1-l1', 'a7-l2'],
    docs: [
      { label: 'Docker — docker container logs', url: 'https://docs.docker.com/reference/cli/docker/container/logs/' },
      { label: 'Docker Compose — documentação', url: 'https://docs.docker.com/compose/' },
    ],
  },
  {
    id: 'c5-l1', moduleId: 'c5', title: 'Pipelines, variáveis de ambiente e segredos', minutes: 25,
    objective: 'Diagnosticar falhas de pipeline e de configuração por ambiente, incluindo variáveis de build e de runtime.',
    explanation: `
**Pipeline de CI/CD** típica: checkout → instalar dependências → testes/lint → build (imagem/bundle) → publicar artefato → deploy (SSH, registry, cloud) → verificação (healthcheck/smoke test).

**Variável de build × variável de runtime** — fonte frequente de incidentes:
- **Back-end** (Flask, Spring): lê as variáveis **ao iniciar** (runtime). Alterar a variável e reiniciar o serviço basta.
- **Front-end SPA** (React com Vite/CRA): variáveis como \`VITE_API_URL\` são **embutidas no bundle no momento do build**. Se faltarem no build, o JavaScript publicado terá \`undefined\`. Alterar a variável no servidor depois **não adianta**: é preciso **gerar o build novamente** com a variável correta.

**Ambientes:** dev, staging e produção devem ter **variáveis e segredos separados**. Na maioria das ferramentas (Bitbucket Pipelines, GitHub Actions, GitLab CI), as variáveis podem ser do repositório, do workspace ou do **deployment/ambiente**. Uma variável criada em "production" não existe em "staging".

**Segredos:**
- Nunca no repositório (nem em commits antigos: o histórico guarda tudo). Se um segredo vazou, **revogue e gere outro**; apagar o commit não basta.
- Use variáveis **seguras/mascaradas** da ferramenta. Elas não aparecem nos logs, mas um \`echo\` ou um \`set -x\` mal colocado pode tentar expô-las.
- Chave SSH de deploy: a privada fica como segredo da pipeline; a pública fica no \`authorized_keys\` de um usuário de deploy com privilégios mínimos. Registre o known_hosts.

**Lendo uma falha de pipeline:**
1. Qual **etapa** falhou? (o log é dividido por steps)
2. A **primeira** mensagem de erro (como em qualquer log, as seguintes podem ser consequência).
3. O que mudou desde a última execução bem-sucedida? (commit, variável, imagem base, versão de dependência)
4. Reproduza localmente com a mesma imagem e as mesmas variáveis, se possível.

**Validação preventiva:** adicione no início do build uma checagem que falhe cedo se uma variável obrigatória estiver ausente. É melhor uma pipeline vermelha do que um site em branco no ar.
~~~
for v in VITE_API_URL VITE_TENANT_MODE; do
  if [ -z "$(printenv "$v")" ]; then echo "Variável obrigatória ausente: $v"; exit 1; fi
done
~~~
`,
    example: {
      title: 'Front-end em branco em staging',
      body: `
~~~
# console do navegador (staging)
GET https://staging.app.exemplo.com/undefined/api/clientes  404

# log da pipeline, deployment "staging"
+ npm run build
vite v5.x building for production...
✓ built in 21.4s            ← nenhum erro: o build "funcionou"

# configuração de deployments
production: VITE_API_URL=https://api.app.exemplo.com   ✓
staging:    (sem VITE_API_URL)                          ✗
~~~
O build não falhou porque a variável ausente vira \`undefined\`, e não um erro. A correção é adicionar a variável ao deployment de staging, **rodar a pipeline novamente** (novo build) e validar. A prevenção é a checagem de variáveis obrigatórias. Este é o tipo de caso que você já resolveu na prática.
`,
    },
    exercise: {
      prompt: 'Você adicionou `VITE_API_URL` nas variáveis do servidor de staging e reiniciou o Nginx, mas o front-end continua chamando `undefined`. Por quê?',
      options: [
        { t: 'O Nginx precisa de restart em vez de reload.', ok: false, why: 'O Nginx apenas serve os arquivos estáticos já gerados.' },
        { t: 'A variável é embutida no bundle no momento do build; é preciso gerar o build novamente com a variável disponível.', ok: true, why: 'Em SPAs, variáveis VITE_/REACT_APP_ viram texto dentro do JavaScript gerado. O arquivo publicado continua com undefined até um novo build.' },
        { t: 'O cache DNS do navegador.', ok: false, why: 'O valor undefined está dentro do JavaScript, não vem do DNS.' },
        { t: 'Falta a variável no banco de dados.', ok: false, why: 'Não há relação.' },
      ],
      explain: 'Distinguir build-time de runtime evita horas de tentativa e erro. Alternativa arquitetural: carregar a configuração em runtime (ex.: um config.json servido junto do front-end), para que mudar a URL não exija rebuild. Vale mencionar em entrevistas de DevOps/Cloud.',
    },
    summary: [
      'Identifique a etapa e o primeiro erro; compare com a última execução bem-sucedida.',
      'SPA: variáveis entram no build; mudar depois exige rebuild.',
      'Variáveis e segredos por ambiente; segredo vazado → revogar.',
      'Falhe cedo validando variáveis obrigatórias.',
    ],
    related: ['c4-l1', 'c2-l2', 'a8-l2'],
    docs: [{ label: 'Bitbucket Pipelines — variáveis e segredos', url: 'https://support.atlassian.com/bitbucket-cloud/docs/variables-and-secrets/' }],
  },
  {
    id: 'c6-l1', moduleId: 'c6', title: 'Métricas, logs, alertas e backups testados', minutes: 30,
    objective: 'Propor um monitoramento acionável e uma rotina de backup com restauração verificada.',
    explanation: `
**Três pilares de observabilidade:**
- **Métricas:** números ao longo do tempo (CPU, memória, latência, taxa de erros). Baratas e ótimas para **alertas** e tendências.
- **Logs:** eventos detalhados. Ótimos para entender **o porquê**.
- **Traces:** o caminho de uma requisição entre serviços, com o tempo gasto em cada um. Ótimos para descobrir **onde** está a lentidão em sistemas distribuídos.

**Sinais dourados (para serviços voltados ao usuário):**
1. **Latência** — tempo de resposta (use percentis: p95/p99, não só a média).
2. **Tráfego** — requisições por segundo.
3. **Erros** — taxa de 5xx (e 4xx anormais).
4. **Saturação** — quão "cheio" está o recurso (CPU, memória, conexões do pool, disco).

**Alertas úteis:**
- Alerte sobre **sintomas que afetam o usuário** (taxa de 5xx > 2% por 5 min; p95 > 2 s) e sobre **riscos iminentes** (disco > 85% e crescendo; certificado expira em < 14 dias).
- Cada alerta deve ter uma **ação** (um runbook): se ninguém sabe o que fazer quando ele dispara, ele vira ruído.
- Evite "fadiga de alertas": alertas demais fazem a equipe ignorar os importantes.
- **Monitoramento externo (sintético):** um check de fora que acessa \`/health\` mostra o que o usuário vê, inclusive falhas de DNS ou certificado.

**Healthcheck:** \`/health\` (ou \`/actuator/health\` no Spring) deve indicar se a aplicação consegue atender — às vezes incluindo a dependência do banco. Diferencie **liveness** (o processo está vivo?) de **readiness** (está pronto para receber tráfego?).

**Backups:**
- **RPO** (Recovery Point Objective): quanto dado se aceita perder (ex.: backup diário → até 24 h).
- **RTO** (Recovery Time Objective): em quanto tempo o serviço precisa voltar.
- **Regra 3-2-1:** 3 cópias, em 2 mídias/locais diferentes, sendo 1 fora do local (offsite).
- **Backup não testado não é backup.** Agende testes de **restauração** em um ambiente separado e verifique a integridade (contagem de registros, aplicação subindo).
- PostgreSQL: \`pg_dump\` (lógico, por banco) é simples e portátil; restaure com \`pg_restore\`/\`psql\`. Para bancos grandes e recuperação em um ponto no tempo, há backups físicos + WAL.
- Proteja os backups: criptografia, acesso restrito e cópias que um invasor (ou ransomware) não consiga apagar facilmente.
`,
    example: {
      title: 'Backup diário com verificação mínima',
      body: `
~~~
#!/usr/bin/env bash
set -euo pipefail
DATA=$(date +%F)
ARQ="/backups/app-$DATA.dump"
pg_dump -Fc -h localhost -U backup app > "$ARQ"
# verificação: o arquivo é legível e lista os objetos?
pg_restore --list "$ARQ" > /dev/null
# cópia para fora do servidor (exemplo com S3; requer AWS CLI e permissão mínima)
aws s3 cp "$ARQ" "s3://empresa-backups/app/$DATA.dump"
find /backups -name 'app-*.dump' -mtime +7 -delete   # retenção local de 7 dias
~~~
Isso verifica que o arquivo é válido, mas **não substitui** um teste periódico de restauração completo (por exemplo, mensal) em um banco separado, com conferência de dados.
`,
    },
    exercise: {
      prompt: 'Qual destes alertas é o **mais acionável** para uma API de pedidos?',
      options: [
        { t: 'CPU acima de 70% por 1 minuto.', ok: false, why: 'Picos de CPU podem ser normais e não indicam, por si, impacto ao usuário. Tende a gerar ruído.' },
        { t: 'Taxa de respostas 5xx acima de 2% por 5 minutos, com link para o runbook de investigação.', ok: true, why: 'Mede um sintoma que o usuário sente, tem janela para evitar falsos positivos e indica o que fazer.' },
        { t: 'Qualquer linha de log com a palavra "error".', ok: false, why: 'Gera um volume enorme de alertas, muitos irrelevantes. Logs servem para investigar; alertas precisam de critério.' },
        { t: 'Memória "usada" acima de 80%.', ok: false, why: 'No Linux, cache conta como memória usada. "available" baixa por um período é um sinal melhor.' },
      ],
      explain: 'Bons alertas medem sintomas ou riscos reais, têm duração mínima e uma ação associada. Métricas de recurso (CPU, memória) são melhores em painéis e para investigação, ou como alertas de saturação bem calibrados.',
    },
    summary: [
      'Métricas alertam, logs explicam, traces localizam.',
      'Sinais dourados: latência, tráfego, erros e saturação.',
      'Alerta bom = sintoma/risco + duração + ação (runbook).',
      'RPO/RTO, 3-2-1 e teste de restauração.',
    ],
    related: ['c2-l1', 'c7-l1', 'a8-l1'],
    docs: [{ label: 'PostgreSQL — Backup and Restore', url: 'https://www.postgresql.org/docs/current/backup.html' }],
  },
  {
    id: 'c7-l1', moduleId: 'c7', title: 'Cloud, responsabilidade compartilhada e IAM', minutes: 25,
    objective: 'Explicar os modelos de cloud e diagnosticar erros de permissão (AccessDenied) com o menor privilégio.',
    explanation: `
**Modelos de serviço:**
- **IaaS:** você gerencia o sistema operacional para cima (ex.: máquinas virtuais EC2).
- **PaaS:** o provedor gerencia o SO e o runtime; você entrega a aplicação (ex.: serviços gerenciados de aplicação e bancos gerenciados como RDS).
- **SaaS:** você usa o software pronto (ex.: Microsoft 365).

**Responsabilidade compartilhada:** o provedor protege a infraestrutura **da** nuvem; o cliente protege o que coloca **na** nuvem: dados, identidades, configurações (bucket público por engano é responsabilidade do cliente), patches do SO em IaaS.

**Regiões e zonas de disponibilidade:** uma região tem várias zonas (datacentros isolados). Distribuir em mais de uma zona aumenta a disponibilidade. A escolha da região também afeta latência, custo e requisitos legais (ex.: LGPD).

**IAM (AWS como exemplo):**
- **Usuários** (pessoas, preferencialmente com SSO), **grupos**, **funções/roles** (identidades assumidas temporariamente por serviços — ex.: uma instância EC2 com role para ler um bucket), **políticas** (documentos JSON com permissões).
- Por padrão, tudo é **negado**; uma política precisa **permitir** a ação. Um **Deny explícito** sempre vence um Allow.
- **Menor privilégio:** conceda apenas as ações e os recursos necessários.
~~~
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::zarpa-anexos-prod/uploads/*"
  }]
}
~~~
Note que \`s3:ListBucket\` se aplica ao **bucket** (\`arn:aws:s3:::zarpa-anexos-prod\`), e não aos objetos (\`/*\`). Esse é um erro clássico.

**Diagnóstico de AccessDenied:**
1. **Qual identidade** está fazendo a chamada? (\`aws sts get-caller-identity\`) — muitas vezes não é quem você imagina (outra role, credenciais antigas em variáveis de ambiente).
2. **Qual ação e qual recurso** exatamente? (a mensagem de erro e o CloudTrail mostram)
3. Há Allow para essa ação nesse recurso? Há **Deny** em outro lugar (política do bucket, SCP da organização)?
4. Criptografia: objetos com KMS também exigem permissão na chave.

**Credenciais:** nunca as coloque no código ou no repositório. Use roles para serviços e um cofre de segredos para as demais. Chaves de acesso vazadas no GitHub são exploradas em minutos: revogue imediatamente.

**Certificações:** a AWS oferece cursos digitais gratuitos de fundamentos no AWS Skill Builder, mas o exame (ex.: Cloud Practitioner) é pago. Confirme valores e condições atuais no site oficial — eles mudam.
`,
    example: {
      title: 'Upload falha com AccessDenied',
      body: `
~~~
botocore.exceptions.ClientError: An error occurred (AccessDenied) when calling the
PutObject operation: User: arn:aws:iam::1234:user/dev-ryan is not authorized to perform:
s3:PutObject on resource: "arn:aws:s3:::zarpa-anexos-prod/uploads/nf-881.pdf"
~~~
A mensagem informa a **identidade** (usuário pessoal dev-ryan, e não a role da aplicação), a **ação** e o **recurso**. A causa provável é que credenciais pessoais ficaram em variáveis de ambiente do servidor (\`AWS_ACCESS_KEY_ID\`) e têm precedência sobre a role da instância. Remova as credenciais estáticas e deixe a aplicação usar a role, em vez de dar mais permissões ao usuário pessoal.
`,
    },
    exercise: {
      prompt: 'Uma aplicação lista os arquivos de um bucket S3 e recebe AccessDenied em `ListObjectsV2`, embora a política permita `s3:ListBucket` em `arn:aws:s3:::meu-bucket/*`. Qual é o erro?',
      options: [
        { t: 'Falta s3:GetObject.', ok: false, why: 'GetObject é para ler objetos. Listar usa ListBucket.' },
        { t: 'ListBucket se aplica ao recurso do bucket (`arn:aws:s3:::meu-bucket`), sem `/*`.', ok: true, why: 'Ações de nível de bucket usam o ARN do bucket; ações em objetos usam bucket/*. A política está concedendo a permissão para o recurso errado.' },
        { t: 'O bucket precisa ser público.', ok: false, why: 'Tornar o bucket público expõe os dados, e não é necessário.' },
        { t: 'A região está errada.', ok: false, why: 'Região errada costuma gerar redirecionamento ou outro erro, não AccessDenied com uma política mal escrita.' },
      ],
      explain: 'Corrija com um statement para `arn:aws:s3:::meu-bucket` (ListBucket, opcionalmente com condição de prefixo) e outro para `arn:aws:s3:::meu-bucket/*` (Get/PutObject). O simulador de políticas do IAM ajuda a testar sem tentativa e erro em produção.',
    },
    summary: [
      'IaaS/PaaS/SaaS; o cliente é responsável pelo que coloca na nuvem.',
      'Negado por padrão; Deny explícito vence Allow; menor privilégio.',
      'AccessDenied: identidade → ação → recurso → Deny/KMS.',
      'Roles para serviços; nunca chaves no código.',
    ],
    related: ['c6-l1', 'b3-l1', 'c5-l1'],
    docs: [
      { label: 'AWS IAM — boas práticas', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html' },
      { label: 'AWS — modelo de responsabilidade compartilhada', url: 'https://aws.amazon.com/compliance/shared-responsibility-model/' },
    ],
  },
];

export const questions = [
  // c1
  { id: 'c1-q01', moduleId: 'c1', lessonId: 'c1-l1', difficulty: 1, prompt: 'Qual é a permissão numérica de `rwxr-x---`?', options: ['755', '750', '740', '640'], answer: 1, explain: 'rwx = 7, r-x = 5, --- = 0.' },
  { id: 'c1-q02', moduleId: 'c1', lessonId: 'c1-l1', difficulty: 2, prompt: 'Um processo recebe "Permission denied" ao ler `/srv/app/conf/app.ini`, que tem permissão 644. O que verificar?', options: ['Apenas o arquivo', 'A permissão x de cada diretório do caminho para o usuário do processo (namei -l)', 'O DNS', 'A memória'], answer: 1, explain: 'Para acessar um arquivo, é preciso atravessar (x) todos os diretórios do caminho.' },
  { id: 'c1-q03', moduleId: 'c1', lessonId: 'c1-l1', difficulty: 2, prompt: '`df -h` mostra 60% de uso, mas a aplicação diz "No space left on device". O que verificar?', options: ['Memória RAM', 'Inodes esgotados (df -i), por excesso de arquivos pequenos', 'Permissões', 'CPU'], answer: 1, explain: 'Cada arquivo consome um inode. Milhões de arquivos pequenos (sessões, cache) podem esgotá-los antes do espaço.' },
  { id: 'c1-q04', moduleId: 'c1', lessonId: 'c1-l1', difficulty: 2, prompt: 'Qual é a forma correta de pedir que um processo encerre de forma limpa?', options: ['kill -9 PID', 'kill PID (SIGTERM)', 'rm /proc/PID', 'reboot'], answer: 1, explain: 'SIGTERM permite que o processo finalize conexões e grave dados. SIGKILL é o último recurso.' },
  { id: 'c1-q05', moduleId: 'c1', lessonId: 'c1-l1', difficulty: 3, prompt: '`free -h` mostra used 6.8G de 8G, buff/cache 5G e available 5.5G. Há falta de memória?', options: ['Sim, 85% usado', 'Não necessariamente: "available" indica 5,5 GB disponíveis, e o cache é reutilizável', 'Sim, o cache está cheio', 'Impossível saber'], answer: 1, explain: 'O Linux usa memória livre como cache e a libera quando necessário. A métrica relevante é "available".' },
  { id: 'c1-q06', moduleId: 'c1', lessonId: 'c1-l1', difficulty: 3, prompt: 'Uma aplicação não consegue gravar uploads. Alguém sugere `chmod -R 777 /srv/app`. Qual a melhor alternativa?', options: ['Aceitar a sugestão', 'Identificar o usuário do processo e conceder escrita apenas no diretório de uploads, via dono/grupo', 'Rodar a aplicação como root', 'Desativar o SELinux/AppArmor permanentemente'], answer: 1, explain: 'Menor privilégio: só o necessário, só para quem precisa. 777 e root ampliam muito o estrago em caso de invasão.' },

  // c2
  { id: 'c2-q01', moduleId: 'c2', lessonId: 'c2-l1', difficulty: 1, prompt: 'Qual comando mostra as últimas 50 linhas do log do serviço `api`?', options: ['systemctl log api', 'journalctl -u api -n 50', 'tail api', 'cat /etc/api'], answer: 1, explain: 'journalctl -u filtra por unit; -n define a quantidade de linhas.' },
  { id: 'c2-q02', moduleId: 'c2', lessonId: 'c2-l1', difficulty: 2, prompt: '`systemctl status app` mostra `status=203/EXEC`. Qual é a causa provável?', options: ['Porta ocupada', 'O binário do ExecStart não existe ou não é executável', 'Falta de memória', 'Usuário sem senha'], answer: 1, explain: '203/EXEC indica falha ao executar o comando: caminho errado, venv ausente ou falta de permissão de execução.' },
  { id: 'c2-q03', moduleId: 'c2', lessonId: 'c2-l1', difficulty: 2, prompt: 'O serviço falhou várias vezes e agora aparece "start request repeated too quickly". O que fazer após corrigir a causa?', options: ['Reinstalar o systemd', 'systemctl reset-failed app e então systemctl start app', 'Esperar 24 horas', 'Reiniciar o servidor'], answer: 1, explain: 'O systemd aplica um limite de tentativas. reset-failed zera o contador.' },
  { id: 'c2-q04', moduleId: 'c2', lessonId: 'c2-l1', difficulty: 3, prompt: 'O serviço inicia manualmente com seu usuário, mas falha pelo systemd com KeyError: \'DATABASE_URL\'. Causa provável?', options: ['Bug do Python', 'A variável existe no seu shell, mas não no ambiente da unit (EnvironmentFile/Environment ausentes ou errados)', 'Falta de disco', 'Firewall'], answer: 1, explain: 'O systemd não carrega o .bashrc. As variáveis devem estar na unit ou em um EnvironmentFile legível pelo serviço.' },
  { id: 'c2-q05', moduleId: 'c2', lessonId: 'c2-l2', difficulty: 1, prompt: 'Qual arquivo do servidor recebe a chave pública para login por chave?', options: ['~/.ssh/id_ed25519', '~/.ssh/authorized_keys do usuário de destino', '/etc/hosts', '~/.bashrc'], answer: 1, explain: 'authorized_keys lista as chaves públicas aceitas para aquele usuário.' },
  { id: 'c2-q06', moduleId: 'c2', lessonId: 'c2-l2', difficulty: 2, prompt: 'A chave pública está correta no authorized_keys, mas o SSH recusa. O log diz "bad ownership or modes". Correção?', options: ['chmod 777 ~/.ssh', 'chmod 700 ~/.ssh e chmod 600 ~/.ssh/authorized_keys, com dono correto', 'Gerar nova chave', 'Desativar o sshd'], answer: 1, explain: 'O sshd exige permissões restritas para evitar que outros usuários adicionem chaves.' },
  { id: 'c2-q07', moduleId: 'c2', lessonId: 'c2-l2', difficulty: 2, prompt: 'Para que serve `set -euo pipefail` em um script Bash?', options: ['Acelerar o script', 'Fazer o script parar em erros, tratar variáveis indefinidas como erro e detectar falhas em pipes', 'Executar como root', 'Esconder a saída'], answer: 1, explain: 'Evita que o script continue depois de uma falha, o que pode causar efeitos colaterais perigosos em deploys.' },
  { id: 'c2-q08', moduleId: 'c2', lessonId: 'c2-l2', difficulty: 3, prompt: 'A pipeline começou a falhar com "REMOTE HOST IDENTIFICATION HAS CHANGED". Qual é a conduta adequada?', options: ['Adicionar StrictHostKeyChecking=no permanentemente', 'Confirmar com o responsável se o servidor foi recriado; se sim, atualizar o known_hosts com a nova chave verificada', 'Ignorar', 'Trocar a chave privada da pipeline'], answer: 1, explain: 'Uma chave de host diferente pode significar reinstalação ou ataque. Verifique antes de aceitar.' },

  // c3
  { id: 'c3-q01', moduleId: 'c3', lessonId: 'c3-l1', difficulty: 1, prompt: 'O que é o "upstream" na configuração de um proxy reverso?', options: ['O navegador do usuário', 'O servidor/aplicação para onde o proxy repassa as requisições', 'O DNS', 'O certificado'], answer: 1, explain: 'Upstream é o destino interno (ex.: Gunicorn em 127.0.0.1:8000).' },
  { id: 'c3-q02', moduleId: 'c3', lessonId: 'c3-l1', difficulty: 2, prompt: 'Qual comando testa a configuração do Nginx antes de aplicá-la?', options: ['nginx -s stop', 'nginx -t', 'systemctl restart nginx', 'curl localhost'], answer: 1, explain: 'nginx -t valida a sintaxe e os arquivos referenciados. Depois, use reload.' },
  { id: 'c3-q03', moduleId: 'c3', lessonId: 'c3-l1', difficulty: 2, prompt: 'O error.log mostra "upstream timed out (110) while reading response header". Qual status o usuário recebeu?', options: ['502', '504', '500', '404'], answer: 1, explain: 'Timeout ao esperar o upstream gera 504 Gateway Timeout.' },
  { id: 'c3-q04', moduleId: 'c3', lessonId: 'c3-l1', difficulty: 3, prompt: 'Atrás do Nginx com TLS, a aplicação gera links http:// e entra em loop de redirecionamento para HTTPS. O que falta?', options: ['Outro certificado', 'Repassar X-Forwarded-Proto e configurar a aplicação para confiar no proxy', 'Abrir a porta 80', 'Aumentar o timeout'], answer: 1, explain: 'Sem X-Forwarded-Proto, a aplicação acha que a conexão é HTTP (do proxy para ela) e redireciona sem parar.' },
  { id: 'c3-q05', moduleId: 'c3', lessonId: 'c3-l1', difficulty: 2, prompt: 'Uploads acima de 1 MB falham com 413 antes de chegar à aplicação. Qual diretiva ajustar?', options: ['proxy_read_timeout', 'client_max_body_size', 'worker_processes', 'server_name'], answer: 1, explain: 'O padrão de client_max_body_size é 1m.' },
  { id: 'c3-q06', moduleId: 'c3', lessonId: 'c3-l1', difficulty: 3, prompt: 'Por que usar `reload` em vez de `restart` no Nginx após alterar a configuração?', options: ['reload é mais lento', 'reload aplica a nova configuração sem derrubar as conexões existentes e mantém a antiga se a nova for inválida', 'restart não existe', 'Não há diferença'], answer: 1, explain: 'No reload, o processo master valida a nova configuração e troca os workers de forma graciosa.' },

  // c4
  { id: 'c4-q01', moduleId: 'c4', lessonId: 'c4-l1', difficulty: 1, prompt: 'Um contêiner com ExitCode 137 e OOMKilled: true indica:', options: ['Erro de sintaxe', 'O processo foi morto por exceder o limite de memória', 'Parada normal', 'Comando não encontrado'], answer: 1, explain: '137 = 128 + 9 (SIGKILL). Com OOMKilled, foi o limite de memória.' },
  { id: 'c4-q02', moduleId: 'c4', lessonId: 'c4-l1', difficulty: 2, prompt: 'No Compose, a API tenta conectar em `localhost:5432` e falha, embora o serviço `db` esteja rodando. Correção?', options: ['Publicar a porta 5432 no host', 'Usar `db:5432` (nome do serviço) na string de conexão', 'Reiniciar o Docker', 'Usar network_mode: none'], answer: 1, explain: 'localhost dentro do contêiner é o próprio contêiner. Os serviços se encontram pelo nome, via DNS interno do Docker.' },
  { id: 'c4-q03', moduleId: 'c4', lessonId: 'c4-l1', difficulty: 2, prompt: 'A API inicia antes do PostgreSQL estar pronto, mesmo com depends_on. Por quê?', options: ['depends_on está quebrado', 'depends_on só define a ordem de início; use healthcheck + condition: service_healthy ou retry na aplicação', 'Falta volume', 'Falta ports'], answer: 1, explain: 'Iniciar o contêiner do banco não significa que o banco já aceita conexões.' },
  { id: 'c4-q04', moduleId: 'c4', lessonId: 'c4-l1', difficulty: 2, prompt: 'Após `docker compose down` e `up`, os dados do banco sumiram. Causa provável?', options: ['Bug no PostgreSQL', 'Os dados estavam na camada do contêiner, sem volume nomeado (ou foi usado down -v)', 'Falta de memória', 'Rede'], answer: 1, explain: 'Sem volume, os dados vivem no contêiner e são perdidos quando ele é recriado. down -v remove os volumes.' },
  { id: 'c4-q05', moduleId: 'c4', lessonId: 'c4-l1', difficulty: 3, prompt: 'Um contêiner sai imediatamente com ExitCode 0 e entra em loop de reinício. O que isso sugere?', options: ['Falta de memória', 'O comando principal termina normalmente (ex.: script que roda e sai) em vez de manter um servidor em primeiro plano', 'Porta ocupada', 'Imagem corrompida'], answer: 1, explain: 'O contêiner vive enquanto o PID 1 vive. Um servidor que roda em background (daemon) ou um comando curto faz o contêiner terminar.' },
  { id: 'c4-q06', moduleId: 'c4', lessonId: 'c4-l1', difficulty: 3, prompt: 'Qual exit code indica "comando não encontrado" no entrypoint?', options: ['1', '127', '137', '143'], answer: 1, explain: '127 é o código do shell para comando inexistente: caminho ou nome errado no CMD/ENTRYPOINT.' },

  // c5
  { id: 'c5-q01', moduleId: 'c5', lessonId: 'c5-l1', difficulty: 1, prompt: 'Ao analisar uma pipeline com falha, onde concentrar a atenção primeiro?', options: ['Na última linha do log', 'Na etapa que falhou e na primeira mensagem de erro dela', 'No README', 'Nos commits de meses atrás'], answer: 1, explain: 'Como em qualquer log, a primeira falha costuma ser a causa; as demais, consequência.' },
  { id: 'c5-q02', moduleId: 'c5', lessonId: 'c5-l1', difficulty: 2, prompt: 'Uma senha de banco foi commitada no repositório há 2 meses. O que fazer?', options: ['Apagar o arquivo no próximo commit', 'Revogar/trocar a senha imediatamente e depois limpar o histórico, se necessário', 'Tornar o repositório privado', 'Nada, se ninguém percebeu'], answer: 1, explain: 'O histórico preserva o segredo, e cópias do repositório podem existir. Rotacionar a credencial é obrigatório.' },
  { id: 'c5-q03', moduleId: 'c5', lessonId: 'c5-l1', difficulty: 2, prompt: 'A variável existe no deployment "production" da pipeline, mas o build de staging fica com undefined. Por quê?', options: ['Bug da ferramenta', 'Variáveis de deployment/ambiente são separadas; staging precisa da própria variável', 'Cache do npm', 'Falta de memória'], answer: 1, explain: 'Cada ambiente tem o seu escopo de variáveis. Isso é intencional, para separar configurações e segredos.' },
  { id: 'c5-q04', moduleId: 'c5', lessonId: 'c5-l1', difficulty: 3, prompt: 'Qual é a melhor prevenção para "deploy de front-end com variável ausente"?', options: ['Revisar manualmente toda vez', 'Validar as variáveis obrigatórias no início do build e falhar cedo', 'Usar valores padrão de produção em todos os ambientes', 'Desativar a pipeline'], answer: 1, explain: 'Falhar cedo transforma um incidente silencioso em uma pipeline vermelha. Defaults de produção em staging podem causar efeitos perigosos (ex.: staging gravando em produção).' },
  { id: 'c5-q05', moduleId: 'c5', lessonId: 'c5-l1', difficulty: 2, prompt: 'Em um back-end Flask rodando em systemd, você muda uma variável no EnvironmentFile. O que é necessário para valer?', options: ['Gerar novo build do front-end', 'Reiniciar o serviço (o processo lê o ambiente ao iniciar)', 'Nada', 'Limpar o cache do navegador'], answer: 1, explain: 'Variáveis de ambiente são lidas quando o processo inicia; o back-end precisa ser reiniciado.' },
  { id: 'c5-q06', moduleId: 'c5', lessonId: 'c5-l1', difficulty: 3, prompt: 'A pipeline que funcionava ontem falha hoje em `pip install`, sem nenhum commit novo. Hipótese provável?', options: ['Bug no código', 'Uma dependência sem versão fixada publicou uma nova versão incompatível (ou a imagem base mudou)', 'Senha do Git expirou', 'DNS'], answer: 1, explain: 'Sem mudanças no código, o que mudou foi externo. Fixar versões (lock file) e a tag da imagem base torna o build reproduzível.' },

  // c6
  { id: 'c6-q01', moduleId: 'c6', lessonId: 'c6-l1', difficulty: 1, prompt: 'Qual pilar da observabilidade é mais indicado para disparar alertas?', options: ['Logs', 'Métricas', 'Traces', 'Documentação'], answer: 1, explain: 'Métricas são numéricas, agregáveis e baratas de avaliar continuamente.' },
  { id: 'c6-q02', moduleId: 'c6', lessonId: 'c6-l1', difficulty: 2, prompt: 'Por que usar p95 de latência em vez da média?', options: ['É mais fácil de calcular', 'A média esconde a cauda lenta que uma parte relevante dos usuários sente', 'O p95 é sempre menor', 'Não há diferença'], answer: 1, explain: 'Com 95% das requisições em 100 ms e 5% em 10 s, a média parece aceitável, mas muitos usuários têm experiência ruim.' },
  { id: 'c6-q03', moduleId: 'c6', lessonId: 'c6-l1', difficulty: 2, prompt: 'Backups diários às 2h. O banco corrompe às 18h. Qual é o RPO efetivo nesse cenário?', options: ['0 horas', 'Até ~16 horas de dados perdidos', '24 horas sempre', '2 horas'], answer: 1, explain: 'RPO é a perda máxima de dados; aqui, tudo entre 2h e 18h.' },
  { id: 'c6-q04', moduleId: 'c6', lessonId: 'c6-l1', difficulty: 3, prompt: 'O que comprova que um backup é útil?', options: ['O arquivo existe e tem um tamanho razoável', 'Um teste periódico de restauração em ambiente separado, com verificação dos dados', 'O log do cron sem erros', 'A cópia estar no mesmo servidor'], answer: 1, explain: 'Só a restauração testada prova que o backup funciona e quanto tempo leva (RTO).' },
  { id: 'c6-q05', moduleId: 'c6', lessonId: 'c6-l1', difficulty: 2, prompt: 'Qual é a diferença entre liveness e readiness?', options: ['São iguais', 'Liveness: o processo está vivo; readiness: está pronto para receber tráfego', 'Liveness mede latência', 'Readiness reinicia o contêiner'], answer: 1, explain: 'Uma aplicação viva pode não estar pronta (ainda carregando, sem banco). O balanceador deve usar readiness.' },
  { id: 'c6-q06', moduleId: 'c6', lessonId: 'c6-l1', difficulty: 3, prompt: 'Qual destes é o melhor alerta preventivo de disco?', options: ['Disco > 50%', 'Disco > 85% e com tendência de encher em menos de 24 h', 'Qualquer escrita em /var/log', 'Disco 100%'], answer: 1, explain: 'Combinar limite com tendência dá tempo para agir sem gerar ruído. Alertar em 100% é tarde demais.' },

  // c7
  { id: 'c7-q01', moduleId: 'c7', lessonId: 'c7-l1', difficulty: 1, prompt: 'No modelo de responsabilidade compartilhada, quem é responsável por um bucket deixado público por engano?', options: ['O provedor de nuvem', 'O cliente', 'Ninguém', 'O usuário final'], answer: 1, explain: 'Configurações, dados e identidades na nuvem são responsabilidade do cliente.' },
  { id: 'c7-q02', moduleId: 'c7', lessonId: 'c7-l1', difficulty: 2, prompt: 'Uma política tem Allow s3:* e outra tem Deny s3:DeleteObject para o mesmo usuário. O usuário consegue apagar objetos?', options: ['Sim, o Allow vence', 'Não, o Deny explícito sempre vence', 'Depende da ordem', 'Só em outra região'], answer: 1, explain: 'Na avaliação de políticas da AWS, um Deny explícito prevalece sobre qualquer Allow.' },
  { id: 'c7-q03', moduleId: 'c7', lessonId: 'c7-l1', difficulty: 2, prompt: 'Qual é a melhor forma de uma aplicação em uma instância EC2 acessar o S3?', options: ['Chaves de acesso no código', 'Uma role IAM associada à instância, com permissões mínimas', 'Usuário root da conta', 'Bucket público'], answer: 1, explain: 'Roles fornecem credenciais temporárias e rotacionadas automaticamente, sem segredos armazenados.' },
  { id: 'c7-q04', moduleId: 'c7', lessonId: 'c7-l1', difficulty: 3, prompt: 'Primeiro passo ao investigar um AccessDenied inesperado na AWS?', options: ['Dar AdministratorAccess temporariamente', 'Confirmar qual identidade está fazendo a chamada (sts get-caller-identity) e qual ação/recurso foi negado', 'Recriar o bucket', 'Trocar de região'], answer: 1, explain: 'Muitas vezes a identidade não é a esperada (credenciais antigas em variáveis). Ampliar permissões sem diagnóstico é arriscado.' },
  { id: 'c7-q05', moduleId: 'c7', lessonId: 'c7-l1', difficulty: 1, prompt: 'Uma VM em que você gerencia o sistema operacional e os patches é um exemplo de:', options: ['SaaS', 'PaaS', 'IaaS', 'FaaS'], answer: 2, explain: 'Em IaaS, o provedor entrega a infraestrutura virtual, e você gerencia do SO para cima.' },
  { id: 'c7-q06', moduleId: 'c7', lessonId: 'c7-l1', difficulty: 3, prompt: 'A política permite s3:GetObject em `bucket/*`, mas o download de um objeto criptografado com KMS falha com AccessDenied. O que falta?', options: ['s3:ListBucket', 'Permissão kms:Decrypt na chave KMS usada no objeto', 'Tornar o objeto público', 'Outra região'], answer: 1, explain: 'Com SSE-KMS, ler o objeto exige também permissão para usar a chave de criptografia.' },
];
