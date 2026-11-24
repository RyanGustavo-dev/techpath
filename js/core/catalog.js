// Monta índices a partir dos dados educacionais e valida a integridade (ids únicos, referências).

export function buildCatalog({ tracks, modules, lessons, questions, flashcards, labs, interviews }) {
  const index = (arr, label) => {
    const m = new Map();
    for (const x of arr) {
      if (!x.id) throw new Error(`${label} sem id`);
      if (m.has(x.id)) throw new Error(`${label} com id duplicado: ${x.id}`);
      m.set(x.id, x);
    }
    return m;
  };
  const cat = {
    tracks, modules, lessons, questions, flashcards, labs, interviews,
    trackById: index(tracks, 'Trilha'),
    moduleById: index(modules, 'Módulo'),
    lessonById: index(lessons, 'Lição'),
    questionById: index(questions, 'Pergunta'),
    cardById: index(flashcards, 'Flashcard'),
    labById: index(labs, 'Laboratório'),
    interviewById: index(interviews, 'Pergunta de entrevista'),
    lessonsByModule: new Map(),
    questionsByModule: new Map(),
    questionsByLesson: new Map(),
    cardsByModule: new Map(),
    modulesByTrack: new Map(),
    dependents: new Map(),
  };
  const push = (map, k, v) => { if (!map.has(k)) map.set(k, []); map.get(k).push(v); };
  for (const m of modules) {
    if (!cat.trackById.has(m.track)) throw new Error(`Módulo ${m.id}: trilha inexistente ${m.track}`);
    push(cat.modulesByTrack, m.track, m);
    for (const p of m.prereqs || []) push(cat.dependents, p, m.id);
  }
  for (const m of modules) for (const p of m.prereqs || []) {
    if (!cat.moduleById.has(p)) throw new Error(`Módulo ${m.id}: pré-requisito inexistente ${p}`);
  }
  for (const l of lessons) {
    if (!cat.moduleById.has(l.moduleId)) throw new Error(`Lição ${l.id}: módulo inexistente`);
    push(cat.lessonsByModule, l.moduleId, l);
  }
  for (const q of questions) {
    if (!cat.moduleById.has(q.moduleId)) throw new Error(`Pergunta ${q.id}: módulo inexistente`);
    if (!Array.isArray(q.options) || q.answer < 0 || q.answer >= q.options.length) throw new Error(`Pergunta ${q.id}: resposta inválida`);
    push(cat.questionsByModule, q.moduleId, q);
    if (q.lessonId) {
      if (!cat.lessonById.has(q.lessonId)) throw new Error(`Pergunta ${q.id}: lição inexistente ${q.lessonId}`);
      push(cat.questionsByLesson, q.lessonId, q);
    }
  }
  for (const c of flashcards) {
    if (!cat.moduleById.has(c.moduleId)) throw new Error(`Flashcard ${c.id}: módulo inexistente`);
    push(cat.cardsByModule, c.moduleId, c);
  }
  return cat;
}
