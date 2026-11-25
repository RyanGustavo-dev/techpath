import { html } from '../dom.js';
import { pageHead } from '../components.js';

export function guideView() {
  return {
    actions: {},
    render: () => html`
      ${pageHead('Como usar o TechPath', 'Um roteiro para quem já trabalhou com desenvolvimento e quer se preparar para suporte a aplicações, sistemas e infraestrutura.')}
      <section class="card">
        <h2>Primeira sessão</h2>
        <ol>
          <li>Em <a href="#/config">Configurações</a>, ajuste o tempo disponível e a meta de candidaturas. Use 90 minutos quando couber e reduza em dias apertados.</li>
          <li>Compare duas vagas que você realmente consideraria. Em <a href="#/entrevistas/requisitos">Requisitos de vagas</a>, registre os assuntos que aparecem, como SQL, Linux ou redes.</li>
          <li>Escolha um módulo em <a href="#/trilha">Minha Trilha</a>. Se já começou por <a href="#/modulo/d1">Python para automação de suporte</a>, marque <strong>Definir como meu foco</strong> para retomá-lo depois. Se estiver em dúvida, use o <a href="#/diagnostico">diagnóstico de Suporte a aplicações</a>.</li>
          <li>Use <strong>Continuar na trilha</strong> para chegar ao próximo passo do módulo. Em <a href="#/hoje">Estudar Hoje</a>, abra <strong>Ver sugestões do dia</strong> quando quiser encaixar revisões ou carreira na sessão.</li>
          <li>Separe hoje uma vaga aderente. Ajuste o resumo do currículo com uma experiência que você consegue defender em entrevista e registre o envio em <a href="#/entrevistas/candidaturas">Candidaturas</a>.</li>
        </ol>
      </section>
      <div class="grid-2">
        <section class="card">
          <h2>Primeira semana</h2>
          <ul>
            <li><strong>SQL.</strong> Faça o <a href="#/lab/lab-sql">laboratório de JOIN e GROUP BY</a>. Depois tente <a href="#/lab/drill-sql-reconcile">reconciliar os pagamentos</a> mantendo uma linha por pedido.</li>
            <li><strong>HTTP e logs.</strong> Resolva a <a href="#/lab/lab-http500">simulação de HTTP 500</a> e escreva a <a href="#/lab/drill-incident-update">atualização do incidente</a>.</li>
            <li><strong>Código em dois dias diferentes.</strong> Comece pelo <a href="#/lab/drill-log-report">relatório de erros em Python</a> e pelo <a href="#/lab/drill-debug-retry">teste de regressão de uma integração</a>.</li>
            <li><strong>Entrevista.</strong> Treine uma história sobre a consulta que você otimizou e outra sobre o incidente de staging. Anote o que você fez, como confirmou o resultado e o que faria diferente.</li>
          </ul>
        </section>
        <section class="card">
          <h2>Como estudar um assunto</h2>
          <ol>
            <li>Leia a lição e tente o exercício antes de comparar com a explicação.</li>
            <li>No laboratório, registre a hipótese, a evidência, o próximo passo e o resultado. Os laboratórios de computador trazem critérios para você conferir localmente.</li>
            <li>No teste de conclusão, escreva sua análise antes de abrir as alternativas quando houver um caso. A nota vem das alternativas. Compare seu texto com a referência.</li>
            <li>Volte às <a href="#/revisoes">Revisões</a> nos dias seguintes e use <a href="#/evolucao">Minha Evolução</a> para escolher o próximo ponto a praticar.</li>
          </ol>
        </section>
      </div>
      <section class="card">
        <h2>O que praticar nos próximos meses</h2>
        <ul>
          <li><strong>Semanas 2 a 4.</strong> Feche as lacunas de SQL, HTTP e logs. Use situações fictícias para praticar investigação e documentação até conseguir explicar seus passos em voz alta.</li>
          <li><strong>Semanas 5 a 8.</strong> Alterne suporte a aplicações com DNS, conectividade, Linux e monitoramento. Traga ao plano as competências que aparecerem nas vagas.</li>
          <li><strong>Semanas 9 a 13.</strong> Resolva casos mistos, simule entrevistas e volte aos assuntos em que a evidência ainda não sustenta sua hipótese. Mantenha candidaturas e programação em paralelo desde a primeira semana.</li>
        </ul>
        <p>Em um dia de 90 minutos, experimente 10 de revisão, 35 de estudo, 25 de prática e 20 de carreira. Em um dia curto, escolha uma revisão vencida e uma ação concreta. Exporte seu progresso em <a href="#/config">Configurações</a> semanalmente ou ao trocar de dispositivo.</p>
        <div class="row gap wrap"><a class="btn primary" href="#/hoje">Abrir plano de hoje</a><a class="btn" href="#/trilha">Ver minha trilha</a></div>
      </section>`,
  };
}
