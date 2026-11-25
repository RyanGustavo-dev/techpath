// Atividades pequenas com dados fictícios e verificações que o aluno pode reproduzir.
const drills = [
  {
    id: 'drill-log-report', title: 'Python: resumir erros de uma integração', modules: ['d1'], minutes: 20,
    objective: 'Agrupar falhas por operação e distinguir uma tentativa de um incidente.',
    intro: `Salve as linhas abaixo em \`eventos.jsonl\` e escreva um script com a biblioteca padrão do Python.
~~~
{"operacao":"A12","status":503}
{"operacao":"A12","status":200}
{"operacao":"B22","status":504}
linha inválida
{"operacao":"B22","status":504}
{"operacao":"C32","status":204}
~~~`,
    steps: [
      'Leia o arquivo linha a linha. Conte entradas inválidas e mantenha a última tentativa válida por operação.',
      'Ao final, imprima a quantidade de tentativas 5xx, os IDs que terminaram em 5xx e as entradas inválidas. A saída esperada é **3 tentativas 5xx, B22 e 1 entrada inválida**.',
      'Para repetir a sessão, adicione um sucesso para B22 e uma nova falha D41. Escreva um teste para a nova saída antes de modificar o script.',
    ],
    criteria: ['Uma falha recuperada não consta da lista final.', 'Uma linha inválida não interrompe a leitura.', 'Consigo explicar a diferença entre tentativas e operações afetadas.'],
  },
  {
    id: 'drill-config-check', title: 'Python: validar configuração de staging', modules: ['d1'], minutes: 20,
    objective: 'Escrever um verificador que detecta configuração incompleta antes de rodar uma pipeline.',
    intro: `Use um arquivo JSON de exemplo com as chaves \`API_URL\`, \`DB_HOST\` e \`REQUEST_TIMEOUT\`. O script deve aceitar o caminho como argumento. Use hostnames fictícios e escreva testes sem rede.`,
    steps: [
      'Rejeite chave ausente, texto em branco e timeout fora do intervalo de 1 a 30 segundos. Liste todos os erros na mesma execução.',
      'Retorne 0 para configuração válida e 1 para inválida. Teste estes JSONs: `{"API_URL":"https://example.com","DB_HOST":"db","REQUEST_TIMEOUT":5}` (0) e `{"API_URL":"","REQUEST_TIMEOUT":60}` (1 com três erros).',
      'Para repetir, trate JSON malformado e o caso em que REQUEST_TIMEOUT é texto. Confirme que a saída identifica os campos sem imprimir valores de configuração.',
    ],
    criteria: ['Tenho pelo menos dois casos de teste.', 'O código de saída distingue sucesso de configuração inválida.', 'A saída identifica erros sem copiar valores.'],
  },
  {
    id: 'drill-java-validation', title: 'Java: validar um filtro de API', modules: ['d2'], minutes: 25,
    objective: 'Transformar requisitos de uma API em código e testes pequenos, usando um projeto Java existente.',
    intro: `Crie uma função pura que aceite um texto de status e um limite de registros. Use Java e os testes que você já tem disponíveis. Caso não tenha um projeto configurado, execute a função com JShell e confira os exemplos manualmente.`,
    steps: [
      'Aceite OPEN ou CLOSED ignorando espaços nas pontas e caixa. Limite deve estar entre 1 e 100. Retorne o status normalizado e o limite, ou lance um erro com o campo rejeitado.',
      'Verifique `(" open ", 1)` → OPEN, `("CLOSED", 100)` → CLOSED e rejeite `("other", 15)`, `(null, 1)` e `("OPEN", 101)`.',
      'Para repetir, simule a integração com um controlador Spring. Mapeie erro de validação para 400 e escreva um teste que confirme que a consulta ao serviço não foi chamada.',
    ],
    criteria: ['Testei entradas válidas, inválidas e os limites.', 'Sei explicar em qual camada colocaria a validação.', 'A saída identifica o campo inválido.'],
  },
  {
    id: 'drill-debug-retry', title: 'Testes: encontrar um erro em tentativas de integração', modules: ['d3'], minutes: 20,
    objective: 'Reproduzir uma divergência de regra, corrigi-la e deixar um teste de regressão.',
    intro: `Uma função retorna FAILED se qualquer tentativa anterior falhou. A regra desejada é o estado da última tentativa: 200 ou 204 significa DELIVERED, demais códigos significam FAILED e lista vazia significa PENDING. Escreva a função em Java ou Python.`,
    steps: [
      'Escreva o teste `[503, 200] → DELIVERED`. Faça a implementação provisória falhar nesse caso usando a regra antiga.',
      'Corrija a função. Valide também `[200, 504] → FAILED`, `[] → PENDING` e `[204] → DELIVERED`.',
      'Para repetir, modele tentativas fora de ordem com timestamps e escreva um teste que prova que a ordem de chegada pode divergir da ordem cronológica.',
    ],
    criteria: ['Vi pelo menos um teste falhar antes da correção e passar depois.', 'A função distingue vazio de falha.', 'Registrei como explicaria o bug em uma revisão de código.'],
  },
  {
    id: 'drill-sql-reconcile', title: 'SQL: reconciliar pagamentos sem duplicar valores', modules: ['a5', 'a6'], minutes: 25,
    objective: 'Investigar a granularidade do relatório e demonstrar que o total fecha após a correção.',
    prep: 'Carregue as tabelas e os dados do laboratório de JOIN e GROUP BY. Use o banco local de treinamento.',
    intro: 'Um relatório por pedido apresenta o total previsto e o total efetivamente pago. O pedido 10 possui três pagamentos do mesmo valor. Um pagamento também referencia um cliente inexistente por meio do pedido 14.',
    steps: [
      'Parta da tabela pedidos, agregue pagamentos por pedido e exiba o valor pago para todos os pedidos, incluindo zero para os sem correspondência.',
      'Confira as somas: pedido 10 → 300, 11 → 120, 12 → 0, 13 → 0, 14 → 50 e 15 → 60. O total pago deve ser 530.',
      'Faça uma segunda consulta que mostre pedidos sem cliente e registre por que esse filtro deve ficar separado da reconciliação.',
    ],
    criteria: ['Retornei seis linhas, uma por pedido.', 'Somei corretamente os três pagamentos iguais.', 'Identifiquei o pedido 14 sem ocultar seu pagamento.'],
  },
  {
    id: 'drill-incident-update', title: 'Suporte: comunicar um incidente ainda em investigação', modules: ['a4', 'a8'], minutes: 20,
    objective: 'Produzir uma atualização de incidente que separe impacto observado e hipótese.',
    intro: `Cenário fictício. Às 10:02 saiu uma nova versão do gateway. Às 10:04, duas filiais reportaram que a exportação de faturas falhava. O gateway registrou 18 respostas 504 em cinco minutos. Outros endpoints seguem respondendo. Ainda não há contagem de usuários únicos.`,
    where: 'browser',
    steps: [
      'Nas anotações, escreva um comunicado de até quatro linhas com início, escopo conhecido, ação em curso e horário da próxima atualização.',
      'Escreva duas hipóteses que cabem nos dados, como aumento no tempo do upstream ou alteração de roteamento. Para cada uma, liste uma evidência que ajudaria a descartá-la.',

    ],
    reference: 'Desde 10:04, duas filiais relataram falha na exportação. Verificamos 18 respostas 504 na operação, com contagem de usuários em apuração. Estamos comparando gateway e aplicação por ID de requisição. Próxima atualização às 10:25.',
    criteria: ['Distingui respostas 504 de usuários afetados.', 'Registrei a mudança como hipótese a investigar.', 'Indiquei um próximo horário de atualização.'],
  },
];

export const practiceDrills = drills.map(({ intro, steps, prep, ...drill }) => ({
  where: 'computer', ...drill, repeatable: drill.modules.some((id) => id.startsWith('d')),
  prereqText: prep || (drill.where === 'browser' ? 'Use os dados fictícios abaixo.' : 'Use um projeto ou uma pasta local de teste.'),
  stages: [], practiceOnly: true, offline: { intro, steps },
}));
