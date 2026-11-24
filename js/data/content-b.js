// Trilha B — Redes e suporte corporativo.

export const lessons = [
  {
    id: 'b1-l1', moduleId: 'b1', title: 'Camadas como roteiro de diagnóstico', minutes: 20,
    objective: 'Usar os modelos OSI e TCP/IP para ordenar testes de conectividade de baixo para cima.',
    explanation: `
Os modelos de camadas não existem só para decorar. Eles servem como **roteiro**: cada camada depende da anterior. Se a de baixo falha, não adianta testar a de cima.

**TCP/IP (o que realmente roda) e equivalência aproximada no OSI:**
~~~
TCP/IP          OSI                      Exemplos                    Teste típico
Aplicação       7 Aplicação/6/5          HTTP, DNS, SMTP, SSH         curl, nslookup, navegador
Transporte      4 Transporte             TCP, UDP, portas             Test-NetConnection -Port, nc
Internet        3 Rede                   IP, ICMP, roteamento         ping, tracert, route print
Acesso à rede   2 Enlace / 1 Física      Ethernet, Wi-Fi, MAC, cabo   link, LEDs, ipconfig, arp -a
~~~

**Diagnóstico de baixo para cima:**
1. **Física/enlace:** cabo conectado? Wi-Fi associado? Placa habilitada? \`ipconfig\` mostra "Mídia desconectada"?
2. **Rede (IP):** a máquina tem IP válido, máscara e gateway? Consegue pingar o gateway? Um IP externo (ex.: 8.8.8.8)?
3. **Transporte:** a porta do serviço está acessível? (ping usa ICMP e **não** testa portas.)
4. **Aplicação:** o nome resolve (DNS)? O serviço responde corretamente (HTTP 200)?

**Por que isso economiza tempo:** "o sistema não abre" pode ser cabo, IP, rota, firewall, DNS ou a própria aplicação. Com 3 ou 4 testes ordenados, você descobre a camada e direciona o chamado (rede, servidor ou sistema).

**TCP × UDP:**
- **TCP:** orientado a conexão (handshake SYN, SYN-ACK, ACK), confiável, com ordem garantida. Usado por HTTP(S), SSH, bancos de dados e SMTP.
- **UDP:** sem conexão, sem garantia de entrega, menor overhead. Usado por DNS (consultas comuns), DHCP, VoIP e streaming.

**Encapsulamento:** cada camada adiciona o próprio cabeçalho (dados → segmento TCP → pacote IP → quadro Ethernet). O MAC é usado dentro da rede local; o IP, de ponta a ponta.
`,
    example: {
      title: '"O sistema não abre" em 4 testes',
      body: `
~~~
C:\\> ipconfig
   Endereço IPv4: 192.168.10.57   Máscara: 255.255.255.0   Gateway: 192.168.10.1   → IP ok
C:\\> ping 192.168.10.1          → respostas ok (rede local ok)
C:\\> ping 8.8.8.8               → respostas ok (saída para internet ok)
C:\\> nslookup sistema.empresa.com.br
   *** Tempo limite da solicitação esgotado       → falha na camada de aplicação: DNS
~~~
Rede e roteamento funcionam; o problema está na resolução de nomes. Você economiza o tempo de olhar cabo, switch ou servidor do sistema.
`,
    },
    exercise: {
      prompt: 'Um usuário não acessa o ERP. Ele pinga o servidor do ERP pelo IP com sucesso, mas o navegador mostra "conexão recusada" na porta 8443. Em qual camada está o problema e qual é o próximo teste?',
      options: [
        { t: 'Física: trocar o cabo de rede.', ok: false, why: 'Se o ping ao servidor funciona, as camadas física e de rede estão operando.' },
        { t: 'Transporte/aplicação: testar a porta (Test-NetConnection servidor -Port 8443) e verificar se o serviço está rodando nessa porta.', ok: true, why: '"Conexão recusada" significa que o pacote chegou e o host respondeu que não há nada escutando naquela porta (ou que um firewall rejeitou). O foco passa a ser o serviço.' },
        { t: 'DNS: limpar o cache com ipconfig /flushdns.', ok: false, why: 'O acesso já chegou ao IP do servidor; a resolução de nomes não é o problema aqui.' },
        { t: 'Rede: o gateway está errado.', ok: false, why: 'Com gateway errado, o ping a um servidor de outra rede falharia.' },
      ],
      explain: 'O ping prova as camadas 1–3; a recusa na porta aponta para a camada 4 ou acima. "Recusada" (resposta imediata, RST) e "tempo esgotado" (sem resposta, típico de firewall que descarta pacotes) são pistas diferentes: recusa → nada escutando ou rejeição explícita; timeout → bloqueio no caminho ou host sem resposta.',
    },
    summary: [
      'Teste de baixo para cima: link → IP → porta → aplicação.',
      'ping testa ICMP/IP, não portas.',
      'TCP é confiável e orientado a conexão; UDP é leve e sem conexão.',
      'Conexão recusada ≠ timeout.',
    ],
    related: ['b1-l2', 'b3-l1'],
    docs: [],
  },
  {
    id: 'b1-l2', moduleId: 'b1', title: 'IPv4, máscara, gateway e sub-redes', minutes: 30,
    objective: 'Calcular rede, broadcast e faixa de hosts e saber quando o tráfego vai ao gateway.',
    explanation: `
Um endereço IPv4 tem 32 bits, escritos em 4 octetos (192.168.10.57). A **máscara** indica quantos bits identificam a **rede**; o restante identifica o **host**.

**Notação CIDR:** \`/24\` = 24 bits de rede = \`255.255.255.0\`.
~~~
/24  255.255.255.0     256 endereços  254 hosts
/25  255.255.255.128   128 endereços  126 hosts
/26  255.255.255.192    64 endereços   62 hosts
/27  255.255.255.224    32 endereços   30 hosts
/28  255.255.255.240    16 endereços   14 hosts
/30  255.255.255.252     4 endereços    2 hosts
~~~
Hosts utilizáveis = endereços − 2 (o primeiro é o **endereço de rede**; o último, o **broadcast**).

**Cálculo rápido (sem binário):** o "tamanho do bloco" no octeto da máscara que não é 255 ou 0 é \`256 − valor\`.
Exemplo: \`192.168.10.70/26\` → máscara 255.255.255.**192** → bloco 64 → redes: .0, .64, .128, .192.
70 está no bloco **.64–.127** → rede 192.168.10.64, broadcast .127, hosts .65 a .126.

**Gateway (roteador padrão):** quando o destino está **fora da sua rede**, o computador entrega o pacote ao gateway. Por isso:
- O gateway **precisa estar na mesma rede** que o host.
- Máscara errada faz o host achar que um destino está "na rede local" (ou fora dela) quando não está.

**Faixas privadas (RFC 1918):** 10.0.0.0/8, 172.16.0.0/12 (172.16–172.31) e 192.168.0.0/16. Não são roteadas na internet; saem por NAT.
**Especiais:** 127.0.0.0/8 (loopback), 169.254.0.0/16 (APIPA: o host não obteve IP via DHCP).

**Roteamento:** cada roteador decide o próximo salto pela **tabela de rotas** (a rota mais específica vence). No Windows, \`route print\`; no Linux, \`ip route\`.
`,
    example: {
      title: 'Máscara errada, sintoma estranho',
      body: `
~~~
PC A: 192.168.1.20  máscara 255.255.0.0    gateway 192.168.1.1
PC B: 192.168.2.30  máscara 255.255.255.0  gateway 192.168.2.1
~~~
O PC A, com /16, acha que 192.168.2.30 está na **mesma rede** e tenta entregá-lo diretamente (ARP), sem passar pelo gateway. Como B está em outro segmento, ninguém responde ao ARP. Ao mesmo tempo, A acessa a internet normalmente (o tráfego externo vai ao gateway). O sintoma é "internet ok, mas não acesso a impressora da outra sala". A correção é ajustar a máscara do PC A (provavelmente uma configuração manual antiga).
`,
    },
    exercise: {
      prompt: 'Um host tem IP `10.20.5.130/25` e gateway `10.20.5.1`. Ele não acessa nada fora da rede local. Qual é o problema?',
      options: [
        { t: 'Nenhum: o gateway está correto.', ok: false, why: 'Com /25, os blocos são .0–.127 e .128–.255. O host (.130) está no bloco .128; o gateway (.1), no bloco .0.' },
        { t: 'O gateway está fora da sub-rede do host (10.20.5.128/25); o host não consegue alcançá-lo diretamente.', ok: true, why: 'O gateway precisa estar na mesma sub-rede. O correto seria algo como 10.20.5.129, ou o host deveria estar na faixa .1–.126.' },
        { t: 'O IP 10.20.5.130 é público.', ok: false, why: '10.0.0.0/8 é uma faixa privada.' },
        { t: 'Falta configurar DNS.', ok: false, why: 'Sem DNS, o acesso por IP continuaria funcionando. O sintoma descrito é de roteamento.' },
      ],
      explain: '/25 → bloco de 128. 130 está em 10.20.5.128–255 (rede .128, broadcast .255, hosts .129–.254). Verifique com o responsável qual é o desenho correto da rede antes de alterar: pode ser o IP do host que está errado, e não o gateway.',
    },
    summary: [
      'CIDR /n = n bits de rede; hosts = 2^(32−n) − 2.',
      'Tamanho do bloco = 256 − octeto da máscara.',
      'Gateway sempre na mesma sub-rede do host.',
      'Privadas: 10/8, 172.16/12, 192.168/16; APIPA 169.254/16.',
    ],
    related: ['b1-l1', 'b2-l2'],
    docs: [{ label: 'RFC 1918 — Endereços privados', url: 'https://www.rfc-editor.org/rfc/rfc1918' }],
  },
  {
    id: 'b2-l1', moduleId: 'b2', title: 'Diagnóstico de DNS', minutes: 25,
    objective: 'Compreender como identificar problemas de resolução de nomes.',
    explanation: `
**DNS traduz nomes em endereços.** Quando você acessa \`sistema.empresa.com.br\`, o computador precisa descobrir o IP antes de abrir qualquer conexão.

**Caminho da resolução (simplificado):**
1. **Arquivo hosts** (\`C:\\Windows\\System32\\drivers\\etc\\hosts\` ou \`/etc/hosts\`) — entradas manuais têm precedência.
2. **Cache local** do sistema operacional (e do navegador).
3. **Servidor DNS configurado** (recebido via DHCP ou fixo), que consulta outros servidores se precisar (recursão).
4. A resposta volta com um **TTL**: por quanto tempo pode ficar em cache.

**Registros comuns:**
- \`A\` (IPv4) e \`AAAA\` (IPv6): nome → IP.
- \`CNAME\`: apelido para outro nome.
- \`MX\`: servidores de e-mail do domínio.
- \`TXT\`: verificações e políticas (SPF, por exemplo).
- \`PTR\`: reverso (IP → nome).

**Comandos e quando usar:**
- \`nslookup google.com\` — pergunta ao DNS configurado qual é o IP. Mostra **qual servidor respondeu**. Se der timeout, o servidor DNS não responde; se der "Non-existent domain", o nome não existe **naquele servidor**.
- \`nslookup sistema.empresa.com.br 8.8.8.8\` — pergunta a **outro** servidor. Compare as respostas: um nome interno só existe no DNS interno.
- \`ipconfig /all\` — mostra quais servidores DNS a máquina usa, o sufixo DNS e se o IP veio por DHCP.
- \`ipconfig /displaydns\` — mostra o cache local.
- \`ipconfig /flushdns\` — limpa o cache local. Útil quando o registro mudou (ex.: migração de servidor) e a máquina guardou o IP antigo.
- Linux: \`dig nome\`, \`resolvectl status\`, \`cat /etc/resolv.conf\`.

**Padrões de sintoma:**
- Acessa por IP, mas não por nome → DNS (servidor, configuração, cache ou registro).
- Só nomes internos falham → a máquina está usando DNS externo (ex.: VPN desconectada ou DNS fixo 8.8.8.8 em uma máquina do domínio).
- Só um usuário vai para o "servidor antigo" → cache ou arquivo hosts.
- Todos falham depois de uma mudança → registro alterado/apagado ou TTL ainda propagando.
`,
    example: {
      title: 'Comparando servidores DNS',
      body: `
~~~
C:\\> ipconfig /all
   Servidores DNS . . . . . . : 8.8.8.8
C:\\> nslookup erp.interno.empresa.local
   Servidor:  dns.google   Address: 8.8.8.8
   *** dns.google não encontrou erp.interno.empresa.local: Non-existent domain
C:\\> nslookup erp.interno.empresa.local 192.168.0.10
   Servidor:  dc01.empresa.local
   Nome:      erp.interno.empresa.local   Address: 192.168.0.45
~~~
O nome existe no DNS interno (192.168.0.10, geralmente o controlador de domínio), mas a máquina está configurada com o 8.8.8.8, que não conhece nomes internos. A correção é voltar o DNS para automático (DHCP) ou para o servidor interno. Pergunte ao usuário se alguém alterou essa configuração — isso costuma acontecer em uma "dica para deixar a internet mais rápida".
`,
    },
    exercise: {
      multi: true,
      prompt: '**Incidente:** um computador consegue acessar um serviço pelo endereço IP (`http://192.168.0.45`), mas **não pelo domínio** (`http://erp.empresa.local`). Outros computadores da mesma sala acessam normalmente pelo nome. Quais são os próximos passos de investigação mais adequados? (selecione os que fazem sentido agora)',
      options: [
        { t: 'Executar `nslookup erp.empresa.local` e ver qual servidor respondeu e o que ele respondeu.', ok: true, why: 'Confirma se a falha é de resolução e mostra qual servidor DNS a máquina está consultando.' },
        { t: 'Verificar `ipconfig /all` para comparar os servidores DNS com os de uma máquina que funciona.', ok: true, why: 'Como só esta máquina falha, comparar a configuração com uma máquina boa é o caminho mais rápido.' },
        { t: 'Verificar o arquivo hosts em busca de uma entrada para esse nome.', ok: true, why: 'Uma entrada manual antiga no hosts tem precedência sobre o DNS e pode apontar para um IP errado.' },
        { t: 'Reiniciar o servidor do ERP.', ok: false, why: 'O serviço responde pelo IP e funciona para os demais. O problema está nesta máquina, não no servidor.' },
        { t: 'Trocar o cabo de rede.', ok: false, why: 'O acesso por IP funciona, então as camadas física e de rede estão ok.' },
        { t: 'Executar `ipconfig /flushdns` após verificar o cache, se houver uma resposta antiga em cache.', ok: true, why: 'Se o cache guarda um IP antigo ou uma resposta negativa, limpar resolve. Verifique antes (/displaydns) para entender a causa.' },
      ],
      explain: `
**Raciocínio:** acesso por IP funcionando prova que rede, rota, firewall e serviço estão ok. A diferença entre IP e nome é exatamente a **resolução de nomes**. Como só uma máquina falha, a causa é **local**.

**Hipóteses em ordem de probabilidade:**
1. DNS configurado manualmente com um servidor externo (não conhece nomes internos).
2. Entrada no arquivo hosts apontando para um IP antigo.
3. Cache local com resposta antiga ou negativa.
4. VPN ou software de segurança interceptando o DNS.
5. Sufixo DNS ausente (se o usuário digita só "erp", sem o domínio completo).

**Se todas as máquinas falhassem**, a hipótese mudaria para o servidor DNS ou o registro do nome — e o chamado iria para a equipe de infraestrutura.`,
    },
    summary: [
      'Ordem: hosts → cache → servidor DNS configurado.',
      'IP funciona e nome não → DNS. Uma máquina só → causa local.',
      'nslookup nome [servidor] compara respostas de servidores diferentes.',
      'ipconfig /all (configuração), /displaydns (cache), /flushdns (limpar).',
    ],
    related: ['b2-l2', 'b1-l1', 'b4-l1'],
    docs: [
      { label: 'Microsoft — nslookup', url: 'https://learn.microsoft.com/windows-server/administration/windows-commands/nslookup' },
      { label: 'Microsoft — ipconfig', url: 'https://learn.microsoft.com/windows-server/administration/windows-commands/ipconfig' },
    ],
  },
  {
    id: 'b2-l2', moduleId: 'b2', title: 'DHCP, APIPA e conflitos de IP', minutes: 20,
    objective: 'Reconhecer falhas de DHCP e conflitos de endereço e saber como resolvê-los.',
    explanation: `
**DHCP distribui configuração de rede automaticamente:** IP, máscara, gateway, servidores DNS e tempo de concessão (lease).

**Processo DORA:**
1. **Discover:** o cliente pergunta em broadcast: "há algum servidor DHCP?"
2. **Offer:** o servidor oferece um IP.
3. **Request:** o cliente pede aquele IP.
4. **Acknowledge:** o servidor confirma e registra a concessão.

Como o Discover é broadcast, ele não atravessa roteadores. Em redes com várias VLANs, o roteador/switch precisa de um **DHCP relay** (ip helper) para encaminhar os pedidos ao servidor.

**Sintomas e causas:**
- **IP 169.254.x.x (APIPA)** → o Windows não recebeu resposta do DHCP e se autoatribuiu um endereço. Causas: servidor DHCP fora, **escopo esgotado** (todos os IPs concedidos), cabo/porta/VLAN errados, relay mal configurado.
- **"Conflito de endereço IP"** → dois dispositivos com o mesmo IP. Normalmente um IP fixo foi configurado dentro da faixa do DHCP. A solução é reservar ou excluir esse IP do escopo.
- **Gateway ou DNS errados para todos** → opção do escopo configurada errada, ou um **DHCP não autorizado** (ex.: roteador doméstico ligado na rede da empresa distribuindo 192.168.0.x).

**Comandos (Windows):**
- \`ipconfig /release\` e \`ipconfig /renew\` — devolvem e pedem novamente a concessão.
- \`ipconfig /all\` — mostra "DHCP habilitado", servidor DHCP, concessão obtida/expira.

**Linux:** \`ip addr\`, \`journalctl -u NetworkManager\` (ou o serviço de rede da distribuição) e \`dhclient -v\` em sistemas que o utilizam.

**DHCP × DNS (pergunta frequente em entrevista):** DHCP **entrega a configuração** (inclusive quais servidores DNS usar); DNS **resolve nomes**. Um pode falhar sem o outro.
`,
    example: {
      title: 'Uma sala inteira com 169.254',
      body: `
~~~
C:\\> ipconfig
   Autoconfiguração IPv4: 169.254.23.118
   Máscara: 255.255.0.0
   Gateway padrão: (vazio)
~~~
Vários computadores da mesma sala estão assim; as outras salas funcionam. A causa provável está no que é **comum a essa sala**: switch da sala, VLAN da porta ou relay DHCP daquela VLAN — e não no servidor DHCP, que atende as outras. Escalar para a equipe de rede com essa delimitação ("só a VLAN da sala 3, desde 9h") acelera muito a solução.
`,
    },
    exercise: {
      prompt: 'Às 10h, novos notebooks que chegam ao escritório não obtêm IP (169.254.x.x), mas os computadores que já estavam ligados funcionam. O que é mais provável?',
      options: [
        { t: 'O servidor DNS caiu.', ok: false, why: 'DNS não atribui IP. O sintoma é de DHCP.' },
        { t: 'O escopo do DHCP está esgotado: as máquinas já ligadas mantêm a concessão, mas não há IPs livres para as novas.', ok: true, why: 'Quem tem concessão válida continua funcionando; só os novos pedidos falham. Verifique a ocupação do escopo, o tempo de lease e se há dispositivos desnecessários ocupando IPs (ex.: rede de visitantes misturada).' },
        { t: 'Os cabos dos notebooks estão com defeito.', ok: false, why: 'Seria improvável vários aparelhos falharem ao mesmo tempo da mesma forma; e no Wi-Fi não há cabo.' },
        { t: 'Os notebooks estão com DNS fixo.', ok: false, why: 'DNS fixo não impede a obtenção de IP.' },
      ],
      explain: 'O contraste entre "quem já tinha IP" e "quem está chegando" é a pista. Hipótese alternativa: o servidor DHCP parou, e as concessões antigas ainda não expiraram. A diferença aparece no console do DHCP ou no log do serviço. Correções: ampliar o escopo, reduzir o tempo de lease em redes de alta rotatividade ou separar a rede de visitantes.',
    },
    summary: [
      'DORA: Discover, Offer, Request, Acknowledge.',
      '169.254.x.x = APIPA = não recebeu DHCP.',
      'Conflito de IP → IP fixo dentro do escopo; use reservas/exclusões.',
      'DHCP entrega a configuração; DNS resolve nomes.',
    ],
    related: ['b2-l1', 'b1-l2'],
    docs: [],
  },
  {
    id: 'b3-l1', moduleId: 'b3', title: 'Portas, firewall, NAT, VPN e ferramentas', minutes: 30,
    objective: 'Isolar se uma falha é de rota, firewall ou serviço, usando as ferramentas certas.',
    explanation: `
**Portas** identificam o serviço em um host. Algumas portas comuns:
~~~
22 SSH   53 DNS   80 HTTP   443 HTTPS   3389 RDP   445 SMB (compartilhamento Windows)
25/587 SMTP   5432 PostgreSQL   3306 MySQL   1433 SQL Server   389/636 LDAP/LDAPS
~~~

**Ferramentas e o que cada uma prova:**
- \`ping host\` — ICMP. Prova que o host responde a ICMP (muitos servidores e firewalls bloqueiam ping, então **sem resposta não significa host fora**).
- \`tracert host\` (Windows) / \`traceroute host\` (Linux) — mostra os saltos até o destino. Útil para ver **onde** o caminho para. Asteriscos em saltos intermediários podem ser apenas roteadores que não respondem.
- \`Test-NetConnection host -Port 443\` (PowerShell) — testa **uma porta TCP**. \`TcpTestSucceeded: True\` prova rota + firewall + serviço escutando.
- \`nc -zv host 5432\` (Linux) — o mesmo teste de porta.
- \`netstat -ano\` (Windows) / \`ss -tlnp\` (Linux) — **no servidor**, mostra quais portas estão em escuta e por qual processo (PID).
- \`curl -v\` — teste de aplicação (HTTP), mostrando também DNS e TLS.

**Interpretação de teste de porta:**
- **Sucesso** → rede, firewall e serviço ok; se ainda há erro, o problema está na aplicação.
- **Recusado (imediato)** → host alcançado, nada escutando na porta, ou um firewall rejeitando ativamente.
- **Timeout** → pacotes descartados no caminho (firewall), rota inexistente ou host desligado.

**Firewall:** filtra o tráfego por origem, destino, porta e protocolo. Existe no host (Windows Defender Firewall, ufw/firewalld/iptables), na rede e na cloud (security groups). Uma regra precisa existir **em todos** os pontos do caminho.

**NAT:** traduz endereços privados para um IP público na saída para a internet (vários computadores compartilham um IP). **Port forwarding** (NAT de destino) direciona uma porta do IP público para um servidor interno. Consequência para o suporte: o servidor externo vê o IP público da empresa, não o IP do computador.

**VPN:** cria um túnel cifrado até a rede da empresa. Ao conectar, ela pode alterar **rotas** (quais redes passam pelo túnel) e **DNS** (servidores internos). Os problemas clássicos são: rede de casa com a mesma faixa da empresa (ex.: ambas 192.168.0.0/24, gerando conflito de rotas), DNS interno indisponível com a VPN desconectada e split tunnel mal configurado.
`,
    example: {
      title: 'Isolando a falha em 3 testes',
      body: `
~~~
PS> Test-NetConnection db01.empresa.local -Port 5432
ComputerName     : db01.empresa.local
RemoteAddress    : 10.0.5.20
PingSucceeded    : True
TcpTestSucceeded : False      ← host responde, porta não

# no servidor db01
$ ss -tlnp | grep 5432
LISTEN 0 244 127.0.0.1:5432  0.0.0.0:*  users:(("postgres",pid=812))
~~~
O PostgreSQL está escutando apenas em \`127.0.0.1\` (localhost), e não na interface de rede. Não é firewall: o serviço não aceita conexões externas. Ajuste \`listen_addresses\` no postgresql.conf e as regras do \`pg_hba.conf\`, seguindo as políticas de segurança. Expor um banco além da rede necessária é um risco.
`,
    },
    exercise: {
      prompt: 'Um funcionário em home office conectado à VPN não acessa `\\\\arquivos01\\compartilhado`. O `ping arquivos01` resolve para 192.168.0.30, mas não responde. A rede da casa dele é 192.168.0.0/24 — a mesma faixa da empresa. Hipótese mais forte?',
      options: [
        { t: 'O servidor de arquivos está desligado.', ok: false, why: 'Pode ser, mas existe uma explicação mais específica no próprio enunciado: a sobreposição de redes.' },
        { t: 'Conflito de faixas: o computador envia o tráfego para 192.168.0.30 pela rede local da casa, e não pelo túnel da VPN.', ok: true, why: 'Quando a rede local e a remota usam a mesma faixa, a rota local costuma prevalecer. Teste com `route print`/`tracert`. Soluções: mudar a faixa do roteador de casa ou ajustar as rotas da VPN.' },
        { t: 'Porta 3389 bloqueada.', ok: false, why: '3389 é RDP. Compartilhamento de arquivos usa SMB (445).' },
        { t: 'DNS errado.', ok: false, why: 'O nome resolveu para o IP correto; o problema está no caminho até ele.' },
      ],
      explain: '`tracert 192.168.0.30` mostraria o primeiro salto sendo o roteador de casa, e não o gateway da VPN. É um caso real e frequente em suporte a home office. Hipótese alternativa: a VPN não publica a rota dessa sub-rede (split tunnel). Sempre compare com outro usuário remoto que funciona.',
    },
    summary: [
      'ping não testa porta; use Test-NetConnection -Port ou nc -zv.',
      'Recusado = chegou, nada escutando; timeout = descartado/sem rota.',
      'No servidor: ss -tlnp / netstat -ano mostram portas em escuta e processos.',
      'VPN altera rotas e DNS; faixas sobrepostas causam falhas.',
    ],
    related: ['b1-l1', 'c7-l1', 'a2-l2'],
    docs: [{ label: 'Microsoft — Test-NetConnection', url: 'https://learn.microsoft.com/powershell/module/nettcpip/test-netconnection' }],
  },
  {
    id: 'b4-l1', moduleId: 'b4', title: 'Active Directory: domínio, usuários, grupos e GPO', minutes: 30,
    objective: 'Entender os conceitos de AD usados no suporte e diagnosticar acesso negado em pastas de rede.',
    explanation: `
**Active Directory Domain Services (AD DS)** é o serviço de diretório da Microsoft que centraliza identidades e políticas em redes Windows.

**Conceitos:**
- **Domínio:** limite administrativo e de autenticação (ex.: \`empresa.local\`). Computadores "ingressados no domínio" confiam nele para autenticar usuários.
- **Controlador de domínio (DC):** servidor que guarda o diretório e autentica (Kerberos). Também costuma ser o **DNS interno**. O AD depende muito de DNS: máquinas com DNS externo não encontram o domínio.
- **Unidade Organizacional (OU):** "pasta" para organizar objetos e aplicar políticas (ex.: OU Financeiro).
- **Grupos:** de **segurança** (para permissões) e de **distribuição** (para e-mail). Boa prática: dar permissão a **grupos**, não a usuários individuais.
- **GPO (Group Policy Object):** políticas aplicadas a usuários/computadores de uma OU (mapear unidades, restringir configurações, instalar software, políticas de senha). \`gpupdate /force\` reaplica; \`gpresult /r\` mostra quais GPOs foram aplicadas.

**Chamados frequentes:**
- **Conta bloqueada** por tentativas de senha erradas. Desbloquear resolve o sintoma; se o bloqueio voltar, procure a origem: senha antiga salva em um celular (e-mail), unidade mapeada ou serviço usando credenciais antigas.
- **Senha expirada:** o usuário precisa trocar; em VPN/home office, isso pode exigir procedimentos especiais.
- **"Relação de confiança entre esta estação de trabalho e o domínio falhou":** a senha da conta de computador ficou dessincronizada (ex.: restauração de imagem antiga). Reingressar no domínio (ou \`Reset-ComputerMachinePassword\`, com credencial adequada) resolve.
- **Novo grupo não "pegou":** o token de acesso é gerado no logon; após adicionar o usuário a um grupo, ele precisa **fazer logoff/logon** (ou renovar o ticket Kerberos).

**Permissões em pastas compartilhadas:** existem duas camadas: **permissões de compartilhamento** e **permissões NTFS**. A permissão efetiva é a **mais restritiva** entre elas. Por exemplo, compartilhamento "Leitura" + NTFS "Modificar" resulta em leitura pela rede.

**Segurança no suporte:** verifique a identidade antes de redefinir senhas, siga o fluxo de aprovação para conceder acessos (o dono do dado aprova) e nunca peça a senha do usuário.
`,
    example: {
      title: 'Ferramentas e comandos úteis',
      body: `
~~~
C:\\> whoami /groups             → grupos no token atual (se o grupo novo não aparece, faça logoff/logon)
C:\\> gpresult /r                → GPOs aplicadas ao usuário e ao computador
C:\\> nltest /dsgetdc:empresa.local   → localiza um controlador de domínio
PS> Get-ADUser ana.souza -Properties LockedOut,PasswordExpired,LastLogonDate
PS> Unlock-ADAccount ana.souza           (requer o módulo RSAT e permissão delegada)
~~~
Em muitas empresas, o N1 usa o console "Usuários e Computadores do Active Directory" com permissões delegadas apenas para desbloquear contas e redefinir senhas de determinadas OUs.
`,
    },
    exercise: {
      prompt: 'Ana foi adicionada hoje ao grupo **GG_Financeiro_Leitura**, que tem acesso à pasta `\\\\arquivos01\\financeiro`. Ela continua recebendo "Acesso negado". O que fazer primeiro?',
      options: [
        { t: 'Dar permissão diretamente ao usuário da Ana na pasta.', ok: false, why: 'Contorna o modelo baseado em grupos e cria exceções difíceis de auditar. Além disso, a causa provável é outra.' },
        { t: 'Pedir que Ana faça logoff e logon (ou confirmar com `whoami /groups`) para que o novo grupo entre no token de acesso.', ok: true, why: 'O token com os grupos é gerado no logon. Sem um novo logon, a associação ao grupo ainda não vale para o acesso.' },
        { t: 'Reiniciar o servidor de arquivos.', ok: false, why: 'Impacta todos os usuários e não atualiza o token da Ana.' },
        { t: 'Desativar o firewall do computador da Ana.', ok: false, why: '"Acesso negado" é uma resposta de autorização, não de bloqueio de rede.' },
      ],
      explain: 'Se o problema continuar após o novo logon, verifique: replicação entre controladores de domínio (a alteração pode ainda não ter chegado ao DC que a autenticou), permissões de compartilhamento × NTFS (a mais restritiva vale) e se o grupo realmente tem a permissão na pasta.',
    },
    summary: [
      'AD centraliza identidades; DC autentica e geralmente faz DNS interno.',
      'Permissões a grupos; políticas por OU com GPO.',
      'Grupo novo exige novo logon (token).',
      'Compartilhamento × NTFS: vale a mais restritiva.',
    ],
    related: ['b4-l2', 'b2-l1'],
    docs: [{ label: 'Microsoft — Visão geral do AD DS', url: 'https://learn.microsoft.com/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview' }],
  },
  {
    id: 'b4-l2', moduleId: 'b4', title: 'Microsoft 365 e suporte ao usuário corporativo', minutes: 20,
    objective: 'Resolver chamados comuns de Microsoft 365 (contas, licenças, MFA, Outlook, Teams) com segurança.',
    explanation: `
O **Microsoft 365** reúne serviços em nuvem (Exchange Online, Teams, SharePoint, OneDrive, apps do Office). As identidades ficam no **Microsoft Entra ID** (antes chamado de Azure AD), muitas vezes sincronizado com o AD local (Entra Connect).

**Conceitos para chamados:**
- **Licença:** define quais serviços o usuário tem. Sem licença do Exchange, não há caixa de e-mail; sem licença dos apps, o Office entra em modo de funcionalidade reduzida.
- **Contas sincronizadas × somente em nuvem:** se a conta vem do AD local, a troca de senha e alguns atributos são feitos **no AD**, não no portal.
- **MFA:** segundo fator (aplicativo autenticador, SMS, chave). Chamados comuns: celular trocado, aplicativo não recebe notificação. Para redefinir métodos de MFA, **verifique a identidade** por um canal confiável — esse é um alvo frequente de engenharia social.
- **Acesso condicional:** políticas que exigem MFA, dispositivo gerenciado ou localização. Explicam por que "no celular funciona e no computador pessoal não".

**Diagnósticos frequentes:**
- **Outlook pedindo senha repetidamente:** credenciais antigas no Gerenciador de Credenciais do Windows, perfil corrompido ou MFA pendente. Teste no **Outlook na web**: se funcionar lá, o problema é local (cliente/perfil), e não da conta.
- **E-mail não chega:** verifique a quarentena, as regras da caixa e o rastreamento de mensagens (centro de administração do Exchange). Pergunte remetente, horário e assunto.
- **Teams sem áudio/vídeo:** permissões do dispositivo, driver, dispositivo selecionado nas configurações do Teams.
- **OneDrive não sincroniza:** caminho muito longo, caracteres inválidos, espaço, conta errada conectada.

**Princípio útil:** **web × cliente**. Se o serviço funciona no navegador (outlook.office.com, teams.microsoft.com), a conta e o serviço estão ok, e o problema está na instalação local.

**Status do serviço:** antes de investigar muitas reclamações simultâneas, verifique a **Integridade do serviço** no centro de administração: pode ser um incidente da própria Microsoft.

**Honestidade em entrevista:** se você não tem experiência formal com M365, diga isso e explique como raciocinaria (web × cliente, licença, identidade, status do serviço). Esse raciocínio vale mais do que fingir que conhece o painel.
`,
    example: {
      title: 'Outlook pedindo senha em loop',
      body: `
~~~
1. Outlook na web funciona com a mesma conta?         → sim: conta e serviço ok
2. Gerenciador de Credenciais do Windows:
   remover credenciais "MicrosoftOffice..." antigas
3. Fechar Outlook, abrir, autenticar com MFA
4. Persistiu? Criar novo perfil do Outlook (Painel de Controle → Email → Perfis)
5. Registrar a causa encontrada no chamado
~~~
Cada passo vai do menos invasivo ao mais invasivo, e o teste na web separa o problema de conta do problema de cliente.
`,
    },
    exercise: {
      prompt: 'Uma pessoa liga dizendo ser o diretor financeiro, que está viajando, trocou de celular e precisa **urgentemente** que o MFA seja redefinido para acessar o e-mail. O número de onde liga não está no cadastro. O que fazer?',
      options: [
        { t: 'Redefinir imediatamente, pois é um diretor e é urgente.', ok: false, why: 'Urgência e autoridade são técnicas clássicas de engenharia social. Redefinir o MFA de um executivo para um desconhecido pode entregar acesso ao e-mail financeiro.' },
        { t: 'Seguir o procedimento de verificação de identidade (retornar a ligação para um contato cadastrado, validar com o gestor ou usar outro canal confiável) antes de redefinir.', ok: true, why: 'A verificação por um canal independente protege o usuário e a empresa. Um diretor legítimo entende o procedimento.' },
        { t: 'Pedir a senha atual dele por telefone para confirmar a identidade.', ok: false, why: 'O suporte nunca deve pedir senhas. Isso ensina usuários a entregá-las a quem se apresentar como suporte.' },
        { t: 'Desativar o MFA da conta temporariamente.', ok: false, why: 'Reduz a proteção justamente de uma conta de alto valor.' },
      ],
      explain: 'Em suporte, segurança faz parte do atendimento. Registre a tentativa no chamado e, se houver indícios de fraude, informe a equipe de segurança. Essa situação é ótima para responder perguntas comportamentais: mostra que você segue processos sob pressão.',
    },
    summary: [
      'Identidade no Entra ID; contas sincronizadas mudam senha no AD local.',
      'Teste web × cliente para separar problema de conta e de instalação.',
      'Redefinição de MFA exige verificação de identidade.',
      'Verifique a integridade do serviço antes de investigar falhas em massa.',
    ],
    related: ['b4-l1', 'a8-l1'],
    docs: [{ label: 'Microsoft Learn — Microsoft 365', url: 'https://learn.microsoft.com/microsoft-365/' }],
  },
];

export const questions = [
  // b1
  { id: 'b1-q01', moduleId: 'b1', lessonId: 'b1-l1', difficulty: 1, prompt: 'O `ping` testa principalmente qual camada?', options: ['Aplicação', 'Transporte (portas)', 'Rede (IP/ICMP)', 'Física'], answer: 2, explain: 'ping usa ICMP sobre IP. Não testa portas TCP nem aplicações.' },
  { id: 'b1-q02', moduleId: 'b1', lessonId: 'b1-l1', difficulty: 2, prompt: 'Um teste de porta retorna "timeout" em vez de "conexão recusada". O que isso sugere?', options: ['O serviço está rodando normalmente', 'Pacotes provavelmente descartados no caminho (firewall) ou host inalcançável', 'Erro de DNS', 'Certificado expirado'], answer: 1, explain: 'Recusa é uma resposta (o host foi alcançado). Timeout é ausência de resposta, típica de descarte por firewall ou falta de rota.' },
  { id: 'b1-q03', moduleId: 'b1', lessonId: 'b1-l1', difficulty: 2, prompt: 'Qual protocolo de transporte é usado em consultas DNS comuns?', options: ['TCP sempre', 'UDP (com TCP para respostas grandes/transferências)', 'ICMP', 'Nenhum'], answer: 1, explain: 'Consultas comuns usam UDP/53. TCP/53 é usado em respostas grandes e em transferências de zona.' },
  { id: 'b1-q04', moduleId: 'b1', lessonId: 'b1-l2', difficulty: 1, prompt: 'Quantos hosts utilizáveis existem em uma rede /26?', options: ['64', '62', '30', '126'], answer: 1, explain: '/26 → 2^(32−26) = 64 endereços − rede − broadcast = 62 hosts.' },
  { id: 'b1-q05', moduleId: 'b1', lessonId: 'b1-l2', difficulty: 2, prompt: 'Qual é o endereço de broadcast de 172.16.4.77/27?', options: ['172.16.4.95', '172.16.4.63', '172.16.4.127', '172.16.4.255'], answer: 0, explain: '/27 → bloco 32 → faixas .64–.95. Broadcast = .95. Rede = .64.' },
  { id: 'b1-q06', moduleId: 'b1', lessonId: 'b1-l2', difficulty: 2, prompt: 'Qual destes endereços é privado (RFC 1918)?', options: ['172.32.10.5', '172.20.10.5', '192.169.1.1', '11.0.0.1'], answer: 1, explain: '172.16.0.0/12 cobre 172.16.0.0 a 172.31.255.255. 172.32 está fora dessa faixa.' },
  { id: 'b1-q07', moduleId: 'b1', lessonId: 'b1-l2', difficulty: 3, prompt: 'Um PC com 192.168.1.20/16 não acessa 192.168.2.30 (que está em outro segmento, atrás do roteador), mas acessa a internet. Por quê?', options: ['DNS errado', 'Com /16 ele considera 192.168.2.30 local e tenta entregar diretamente, sem usar o gateway', 'Cabo com defeito', 'Firewall do roteador'], answer: 1, explain: 'A máscara define o que é "local". Com a máscara mais ampla, o tráfego para o outro segmento não vai ao gateway.' },
  { id: 'b1-q08', moduleId: 'b1', lessonId: 'b1-l2', difficulty: 3, prompt: 'Na tabela de rotas há 10.0.0.0/8 via A e 10.1.2.0/24 via B. Para onde vai um pacote para 10.1.2.9?', options: ['Via A', 'Via B (a rota mais específica vence)', 'Descartado', 'Para a rota padrão'], answer: 1, explain: 'O roteamento escolhe o prefixo mais longo que corresponde ao destino (longest prefix match).' },

  // b2
  { id: 'b2-q01', moduleId: 'b2', lessonId: 'b2-l1', difficulty: 1, prompt: 'Um usuário acessa um sistema pelo IP, mas não pelo nome. Qual a área mais provável do problema?', options: ['Cabo de rede', 'Resolução de nomes (DNS)', 'Gateway', 'Firewall do servidor'], answer: 1, explain: 'Se o IP funciona, a conectividade está ok. A diferença está na tradução do nome para o IP.' },
  { id: 'b2-q02', moduleId: 'b2', lessonId: 'b2-l1', difficulty: 2, prompt: 'Após a migração de um servidor para um novo IP, só um usuário continua caindo no servidor antigo. O que verificar?', options: ['O escopo DHCP', 'Cache DNS local (ipconfig /displaydns, /flushdns) e arquivo hosts', 'A máscara do servidor', 'O certificado'], answer: 1, explain: 'Um usuário isolado com resposta antiga aponta para cache local ou entrada fixa no hosts.' },
  { id: 'b2-q03', moduleId: 'b2', lessonId: 'b2-l1', difficulty: 2, prompt: 'Qual registro DNS indica os servidores de e-mail de um domínio?', options: ['A', 'CNAME', 'MX', 'PTR'], answer: 2, explain: 'MX (Mail Exchanger) lista os servidores que recebem e-mail do domínio, com prioridade.' },
  { id: 'b2-q04', moduleId: 'b2', lessonId: 'b2-l1', difficulty: 3, prompt: '`nslookup erp.empresa.local` falha, mas `nslookup erp.empresa.local 192.168.0.10` funciona. Conclusão?', options: ['O registro não existe', 'A máquina está consultando um servidor DNS que não conhece a zona interna', 'O servidor do ERP caiu', 'O cache precisa ser limpo no servidor'], answer: 1, explain: 'Perguntar diretamente ao DNS interno prova que o registro existe. O problema é qual servidor a máquina usa por padrão.' },
  { id: 'b2-q05', moduleId: 'b2', lessonId: 'b2-l2', difficulty: 1, prompt: 'Um computador mostra IP 169.254.10.20. O que isso indica?', options: ['IP público', 'Não obteve resposta do DHCP (APIPA)', 'Conflito de DNS', 'IP de loopback'], answer: 1, explain: '169.254.0.0/16 é autoconfigurado pelo próprio sistema quando não recebe resposta do DHCP.' },
  { id: 'b2-q06', moduleId: 'b2', lessonId: 'b2-l2', difficulty: 2, prompt: 'Qual é a diferença entre DHCP e DNS?', options: ['São o mesmo serviço', 'DHCP entrega a configuração de rede (IP, gateway, DNS); DNS traduz nomes em IPs', 'DNS entrega IPs aos computadores', 'DHCP traduz nomes'], answer: 1, explain: 'O DHCP informa inclusive quais servidores DNS usar, mas não resolve nomes.' },
  { id: 'b2-q07', moduleId: 'b2', lessonId: 'b2-l2', difficulty: 3, prompt: 'De repente, vários computadores recebem IP 192.168.0.x e gateway 192.168.0.1, quando a rede da empresa é 10.10.0.0/16. Hipótese mais provável?', options: ['Escopo DHCP esgotado', 'DHCP não autorizado na rede (ex.: roteador doméstico conectado)', 'DNS fora', 'Cabo cruzado'], answer: 1, explain: 'Endereços de outra faixa vindos "do nada" indicam outro servidor DHCP respondendo — geralmente um roteador ligado por engano.' },
  { id: 'b2-q08', moduleId: 'b2', lessonId: 'b2-l2', difficulty: 2, prompt: 'Uma impressora com IP fixo gera "conflito de IP" com notebooks. Melhor solução?', options: ['Reiniciar a impressora diariamente', 'Usar um IP fora do escopo DHCP ou criar uma reserva/exclusão para ele', 'Desligar o DHCP', 'Trocar a máscara dos notebooks'], answer: 1, explain: 'IPs fixos devem ficar fora da faixa distribuída, ou ser reservados no DHCP.' },

  // b3
  { id: 'b3-q01', moduleId: 'b3', lessonId: 'b3-l1', difficulty: 1, prompt: 'Qual comando testa se a porta 443 de um servidor está acessível a partir do Windows?', options: ['ping servidor', 'Test-NetConnection servidor -Port 443', 'ipconfig /all', 'nslookup servidor'], answer: 1, explain: 'Test-NetConnection com -Port faz uma tentativa de conexão TCP na porta indicada.' },
  { id: 'b3-q02', moduleId: 'b3', lessonId: 'b3-l1', difficulty: 2, prompt: 'Um servidor não responde ao ping, mas o site nele funciona. Como interpretar?', options: ['O servidor está com defeito', 'O ICMP provavelmente está bloqueado por firewall; isso não indica indisponibilidade', 'O DNS está errado', 'A porta 80 está fechada'], answer: 1, explain: 'Bloquear ICMP é comum. Teste a porta do serviço para avaliar a disponibilidade.' },
  { id: 'b3-q03', moduleId: 'b3', lessonId: 'b3-l1', difficulty: 2, prompt: 'No servidor, `ss -tlnp` mostra `127.0.0.1:8080` para a aplicação. Clientes da rede recebem "conexão recusada". Por quê?', options: ['Firewall', 'A aplicação escuta apenas em localhost; precisa escutar em 0.0.0.0 ou no IP da interface', 'DNS', 'Falta de memória'], answer: 1, explain: 'Endereço de bind 127.0.0.1 aceita apenas conexões locais.' },
  { id: 'b3-q04', moduleId: 'b3', lessonId: 'b3-l1', difficulty: 2, prompt: 'Qual porta é usada pelo compartilhamento de arquivos do Windows (SMB)?', options: ['22', '445', '3389', '53'], answer: 1, explain: 'SMB usa TCP 445. RDP usa 3389; SSH, 22; DNS, 53.' },
  { id: 'b3-q05', moduleId: 'b3', lessonId: 'b3-l1', difficulty: 3, prompt: 'Um parceiro diz que suas requisições chegam do IP 200.150.x.x, mas seu computador tem 10.0.3.15. Por quê?', options: ['Erro no log do parceiro', 'NAT: a saída para a internet usa o IP público da empresa', 'O DNS mudou o IP', 'VPN desconectada'], answer: 1, explain: 'O NAT traduz o IP privado para o público na saída. Liberações por IP (whitelist) devem usar o IP público.' },
  { id: 'b3-q06', moduleId: 'b3', lessonId: 'b3-l1', difficulty: 3, prompt: 'Depois de conectar à VPN, o usuário perde o acesso à impressora de casa. Explicação provável?', options: ['A impressora queimou', 'A VPN em full tunnel envia todo o tráfego (ou essa faixa) pelo túnel, inclusive o destinado à rede local', 'DHCP esgotado', 'Driver desatualizado'], answer: 1, explain: 'Full tunnel ou rotas que cobrem a faixa local desviam o tráfego. Às vezes é proposital, por política de segurança.' },
  { id: 'b3-q07', moduleId: 'b3', lessonId: 'b3-l1', difficulty: 2, prompt: 'No `tracert`, os saltos 4 e 5 mostram `* * *`, mas o destino responde no salto 8. Conclusão?', options: ['A rota está quebrada nos saltos 4 e 5', 'Os roteadores 4 e 5 provavelmente não respondem a esse tipo de pacote; o caminho funciona', 'DNS errado', 'O destino está fora'], answer: 1, explain: 'Asteriscos intermediários com destino alcançado indicam apenas que esses saltos não respondem ao tracert.' },

  // b4
  { id: 'b4-q01', moduleId: 'b4', lessonId: 'b4-l1', difficulty: 1, prompt: 'Qual é a boa prática para conceder acesso a uma pasta de rede?', options: ['Adicionar cada usuário diretamente na pasta', 'Conceder ao grupo de segurança e adicionar os usuários ao grupo', 'Dar Controle Total a "Todos"', 'Compartilhar a senha de um usuário genérico'], answer: 1, explain: 'Permissões por grupo são mais fáceis de auditar e manter.' },
  { id: 'b4-q02', moduleId: 'b4', lessonId: 'b4-l1', difficulty: 2, prompt: 'Compartilhamento com "Leitura" para Todos e NTFS com "Modificar" para o grupo. O que o usuário consegue fazer pela rede?', options: ['Modificar', 'Apenas ler', 'Nada', 'Controle total'], answer: 1, explain: 'Pela rede, vale a permissão mais restritiva entre compartilhamento e NTFS.' },
  { id: 'b4-q03', moduleId: 'b4', lessonId: 'b4-l1', difficulty: 2, prompt: 'A conta de um usuário volta a ficar bloqueada poucos minutos depois de desbloqueada. Causa provável?', options: ['Bug do AD', 'Algum dispositivo ou serviço tentando autenticar com a senha antiga (celular, unidade mapeada, tarefa)', 'Licença expirada', 'DNS'], answer: 1, explain: 'Bloqueios repetidos geralmente vêm de credenciais antigas salvas. Os eventos de bloqueio no DC indicam a origem.' },
  { id: 'b4-q04', moduleId: 'b4', lessonId: 'b4-l1', difficulty: 3, prompt: 'O erro "A relação de confiança entre esta estação de trabalho e o domínio primário falhou" aparece após restaurar uma imagem antiga. O que ocorreu?', options: ['Senha do usuário expirada', 'A senha da conta de computador ficou dessincronizada com o domínio', 'Falta de licença', 'Problema de DHCP'], answer: 1, explain: 'Computadores também têm conta e senha no domínio. Uma imagem antiga tem a senha antiga. Reingressar ou redefinir a senha da máquina resolve.' },
  { id: 'b4-q05', moduleId: 'b4', lessonId: 'b4-l1', difficulty: 2, prompt: 'Qual comando mostra quais GPOs foram aplicadas a um usuário/computador?', options: ['gpupdate', 'gpresult /r', 'ipconfig', 'netstat'], answer: 1, explain: 'gpresult /r lista as GPOs aplicadas e filtradas. gpupdate /force reaplica as políticas.' },
  { id: 'b4-q06', moduleId: 'b4', lessonId: 'b4-l2', difficulty: 1, prompt: 'O Outlook do computador pede senha sem parar, mas o Outlook na web funciona. Onde está o problema?', options: ['Na conta do usuário', 'No cliente/perfil local (credenciais salvas, perfil)', 'No servidor Exchange', 'Na licença'], answer: 1, explain: 'Funcionar na web prova que conta, licença e serviço estão ok.' },
  { id: 'b4-q07', moduleId: 'b4', lessonId: 'b4-l2', difficulty: 2, prompt: 'Muitos usuários relatam ao mesmo tempo que o Teams não conecta. Qual é a primeira verificação útil?', options: ['Reinstalar o Teams em todos', 'Verificar a integridade do serviço no centro de administração (incidente do provedor)', 'Trocar as senhas', 'Formatar os computadores'], answer: 1, explain: 'Falhas simultâneas e generalizadas podem ser incidentes do próprio serviço.' },
  { id: 'b4-q08', moduleId: 'b4', lessonId: 'b4-l2', difficulty: 3, prompt: 'Em uma conta sincronizada do AD local para o Entra ID, onde a senha deve ser redefinida (sem recursos de writeback)?', options: ['Apenas no portal do Microsoft 365', 'No AD local; a sincronização leva a alteração para a nuvem', 'No Outlook', 'No celular do usuário'], answer: 1, explain: 'A origem da identidade é o AD local. Sem writeback, alterações feitas na nuvem não voltam.' },
];
