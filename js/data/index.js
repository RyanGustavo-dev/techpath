// Ponto único de montagem do catálogo educacional.
import { tracks, modules } from './tracks.js';
import * as A from './content-a.js';
import * as B from './content-b.js';
import * as C from './content-c.js';
import * as DE from './content-de.js';
import { labs } from './labs.js';
import { flashcards } from './flashcards.js';
import { interviews, roles } from './interviews.js';
import { buildCatalog } from '../core/catalog.js';

// Requisitos de vagas: ao cadastrar quantas vagas pediram cada item, a recomendação dá mais peso aos módulos ligados.
export const skills = [
  { id: 'sql', label: 'SQL / consultas', modules: ['a5', 'a6', 'a7'] },
  { id: 'http-api', label: 'APIs REST / HTTP', modules: ['a1', 'a2', 'a4'] },
  { id: 'auth', label: 'Autenticação / SSO / JWT', modules: ['a3'] },
  { id: 'itil', label: 'ITIL / chamados / SLA', modules: ['a8'] },
  { id: 'logs', label: 'Análise de logs', modules: ['a4', 'c2'] },
  { id: 'redes', label: 'Redes TCP/IP', modules: ['b1', 'b3'] },
  { id: 'dns-dhcp', label: 'DNS / DHCP', modules: ['b2'] },
  { id: 'ad', label: 'Active Directory', modules: ['b4'] },
  { id: 'm365', label: 'Microsoft 365', modules: ['b4'] },
  { id: 'linux', label: 'Linux', modules: ['c1', 'c2'] },
  { id: 'nginx', label: 'Nginx / servidores web', modules: ['c3'] },
  { id: 'docker', label: 'Docker / contêineres', modules: ['c4'] },
  { id: 'cicd', label: 'CI/CD / pipelines', modules: ['c5'] },
  { id: 'monitor', label: 'Monitoramento / observabilidade', modules: ['c6'] },
  { id: 'cloud', label: 'Cloud (AWS/Azure)', modules: ['c7'] },
  { id: 'python', label: 'Python / scripts', modules: ['d1'] },
  { id: 'java', label: 'Java / Spring Boot', modules: ['d2'] },
  { id: 'git', label: 'Git / testes', modules: ['d3'] },
];

export const appTypes = [
  { id: 'apps', label: 'Suporte a aplicações' },
  { id: 'tech', label: 'Suporte técnico N1/N2' },
  { id: 'infra', label: 'Infraestrutura / operações' },
  { id: 'cloud', label: 'Cloud Support' },
  { id: 'backend', label: 'Back-End Júnior' },
  { id: 'outro', label: 'Outro' },
];

export const catalog = buildCatalog({
  tracks,
  modules,
  lessons: [...A.lessons, ...B.lessons, ...C.lessons, ...DE.lessons],
  questions: [...A.questions, ...B.questions, ...C.questions, ...DE.questions],
  flashcards,
  labs,
  interviews,
});

export { roles };
