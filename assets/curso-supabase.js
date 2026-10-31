/* Easy English B2 · panel del curso: contenidos desde Supabase, progreso manual local. */
(() => {
  'use strict';
  const API = 'https://wnluofonzteaqtlfshgy.supabase.co/rest/v1/';
  const KEY = 'sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
  const STORAGE = 'easyenglish-b2-manual-completed-v1';
  const $ = id => document.getElementById(id);
  const container = $('courseUnits');
  if (!container) return;

  const ui = {
    status: $('courseStatus'), empty: $('courseNoResults'),
    fallback: $('courseFallback'), extras: $('courseExtras'),
    search: $('courseSearch'), resume: $('courseResume'),
    ring: $('courseProgressRing'), value: $('courseProgressValue'),
    copy: $('courseProgressCopy'), stored: $('courseStorageNote'),
    completedStat: $('courseCompletedStat'), count: $('courseUnitsStat'),
    grammar: $('courseGrammarStat'), vocabulary: $('courseVocabularyStat')
  };
  const state = { units: [], filter: 'all', query: '', completed: new Set(), storageOK: true };
  const path = slug => 'leer.html?slug=' + encodeURIComponent(slug);
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const elt = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const get = async route => {
    const response = await fetch(API + route, { headers: { apikey: KEY, Accept: 'application/json' } });
    if (!response.ok) throw Error('Supabase: ' + response.status);
    return response.json();
  };
  function readCompleted() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE) || '[]');
      return new Set(Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : []);
    } catch (_) {
      state.storageOK = false;
      return new Set();
    }
  }
  function saveCompleted() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify([...state.completed]));
    } catch (_) { state.storageOK = false; }
    ui.stored.textContent = state.storageOK
      ? 'Avance manual guardado solo en este navegador. No equivale a aprobar un examen.'
      : 'El navegador no permite guardar el avance; los cambios solo durarán hasta que cierres esta página.';
  }
  function parseDescription(raw) {
    const desc = String(raw || '');
    const parts = desc.split(/Práctica de examen:\s*/i);
    const topics = parts[0].replace(/^Temas:\s*/i, '').replace(/[. ]+$/, '');
    return {
      topics: topics.split(';').map(x => x.trim()).filter(Boolean),
      exam: parts[1] ? parts.slice(1).join(' ').trim().replace(/[. ]+$/, '') : ''
    };
  }
  function createCard(item) {
    const {unit, lessons, topics, exam} = item;
    const key = unit.slug;
    const done = state.completed.has(key);
    const details = elt('details', 'course-unit');
    details.id = 'unidad-' + String(unit.orden).padStart(2, '0');
    details.dataset.unitKey = key;
    details.dataset.group = unit.nivel === 'Vocabulary' ? 'vocabulary' : 'grammar';
    details.dataset.search = normalize([unit.titulo, unit.descripcion, ...lessons.map(x => x.titulo)].join(' '));

    const summary = elt('summary');
    const meta = elt('div', 'course-card-top');
    meta.append(elt('span', 'course-card-no', 'UNIDAD ' + String(unit.orden).padStart(2, '0')));
    const status = elt('span', 'course-card-status' + (done ? ' is-complete' : ''), done ? '✓ Estudiada' : '○ Por estudiar');
    status.dataset.status = '';
    meta.append(status);

    const top = elt('div', 'course-card-title');
    const title = String(unit.titulo || '').replace(/^\d+\.\s*/, '');
    top.append(elt('h4', '', title), elt('span', 'course-chevron', '⌄'));
    const preview = topics.slice(0, 3).join(' · ') || 'Lecciones y recursos de la unidad';
    const desc = elt('p', 'course-card-description', preview);
    const bottom = elt('div', 'course-card-bottom');
    bottom.append(elt('span', '', lessons.length + ' ' + (lessons.length === 1 ? 'lección disponible' : 'lecciones disponibles')));
    bottom.append(elt('strong', '', 'Ver contenido ↓'));
    summary.append(meta, top, desc, bottom);
    details.append(summary);

    const body = elt('div', 'course-card-body');
    body.append(elt('span', 'course-detail-heading', 'Lo que aprenderás'));
    const tags = elt('ul', 'course-topic-list');
    for (const topic of topics) tags.append(elt('li', '', topic));
    if (topics.length) body.append(tags);
    body.append(elt('span', 'course-detail-heading', 'Lecciones de esta unidad'));
    const list = elt('ul', 'course-lesson-list');
    for (const a of lessons) {
      const li = elt('li');
      const link = elt('a');
      link.href = path(a.slug);
      link.append(elt('span', '', '↗'), elt('span', '', (a.titulo || a.slug).replace(/\s*[·|–-]\s*Easy English\s*$/i, '')));
      li.append(link);
      list.append(li);
    }
    if (!lessons.length) body.append(elt('p', 'course-empty', 'Aún no hay lecciones disponibles en esta unidad.'));
    else body.append(list);

    if (exam) {
      const practice = elt('div', 'course-practice');
      practice.append(elt('span', 'course-detail-heading', 'Práctica sugerida del libro'));
      practice.append(elt('p', '', exam));
      body.append(practice);
    }
    const footer = elt('div', 'course-detail-footer');
    const complete = elt('button', 'course-complete', done ? '✓ Marcada como estudiada' : '✓ Marcar como estudiada');
    complete.type = 'button';
    complete.dataset.complete = '';
    complete.setAttribute('aria-pressed', String(done));
    complete.addEventListener('click', () => {
      if (state.completed.has(key)) state.completed.delete(key);
      else state.completed.add(key);
      saveCompleted();
      syncProgress();
      applyFilters();
    });
    footer.append(complete);

    if (item.activities.length) {
      const activityLink = elt('a', 'course-activity-link', '✎ Actividades de la unidad ↗');
      activityLink.href = 'actividades.html?unidad=' + encodeURIComponent(unit.id);
      footer.append(activityLink);
    }
    const examLink = elt('a', 'course-exam-link', 'Ver exámenes ↗');
    examLink.href = 'examenes.html';
    footer.append(examLink);
    body.append(footer);
    details.append(body);
    return details;
  }
  function renderGroups() {
    const frag = document.createDocumentFragment();
    for (const [key, label, span, symbol] of [
      ['Grammar', 'Grammar · Gramática', 'Unidades 01–24', 'G'],
      ['Vocabulary', 'Vocabulary · Vocabulario', 'Unidades 25–44', 'V']
    ]) {
      const subset = state.units.filter(item => item.unit.nivel === key);
      if (!subset.length) continue;
      const group = elt('section', 'course-group');
      group.dataset.track = key.toLowerCase();
      const heading = elt('div', 'course-group-header');
      const info = elt('div', 'course-group-title');
      info.append(elt('span', 'course-group-mark', symbol));
      const headingInner = elt('div');
      headingInner.append(elt('h3', '', label), elt('div', 'course-group-caption', span));
      info.append(headingInner);
      heading.append(info);
      const counter = elt('span', 'course-group-count', subset.length + ' unidades');
      counter.dataset.groupCount = '';
      heading.append(counter);
      group.append(heading);

      const grid = elt('div', 'course-grid');
      for (const item of subset) grid.append(createCard(item));
      group.append(grid);
      frag.append(group);
    }
    container.replaceChildren(frag);
  }
  function renderExtras(articles) {
    ui.extras.replaceChildren();
    if (!articles.length) return;
    const details = elt('details', 'course-extras');
    const summary = elt('summary', '', 'Biblioteca complementaria');
    summary.append(elt('span', '', '＋'));
    details.append(summary);
    details.append(elt('p', 'course-extras-summary', articles.length + ' recursos adicionales: Writing, Speaking, Reading, Listening, exámenes y fundamentos. No alteran las 44 unidades.'));
    const grid = elt('div', 'course-extras-grid');
    const sorted = [...articles].sort((a,b) => (a.titulo || '').localeCompare(b.titulo || '', 'es'));
    for (const a of sorted) {
      const link = elt('a', '', (a.titulo || a.slug) + ' ↗');
      link.href = path(a.slug);
      grid.append(link);
    }
    details.append(grid);
    ui.extras.append(details);
  }
  function syncProgress() {
    const total = state.units.length;
    const completed = state.units.filter(x => state.completed.has(x.unit.slug)).length;
    const percent = total ? Math.round(completed * 100 / total) : 0;
    ui.value.textContent = percent + '%';
    ui.ring.style.setProperty('--p', percent + '%');
    ui.ring.setAttribute('aria-valuenow', String(percent));
    ui.copy.replaceChildren();
    ui.copy.append(elt('strong', '', completed + ' de ' + total + ' unidades'), document.createTextNode(' marcadas como estudiadas.'));
    ui.completedStat.textContent = String(completed);
    ui.count.textContent = String(total);
    ui.grammar.textContent = String(state.units.filter(x => x.unit.nivel === 'Grammar').length);
    ui.vocabulary.textContent = String(state.units.filter(x => x.unit.nivel === 'Vocabulary').length);

    const next = state.units.find(x => !state.completed.has(x.unit.slug));
    if (next) {
      ui.resume.textContent = 'Continuar: unidad ' + next.unit.orden + ' →';
      ui.resume.href = '#unidad-' + String(next.unit.orden).padStart(2, '0');
      ui.resume.onclick = () => {
        const d = document.getElementById('unidad-' + String(next.unit.orden).padStart(2, '0'));
        if (d) {
          if (d.hidden) {
            state.filter = 'all';
            state.query = '';
            ui.search.value = '';
            for (const b of document.querySelectorAll('[data-course-filter]')) {
              b.setAttribute('aria-pressed', String(b.dataset.courseFilter === 'all'));
            }
            applyFilters();
          }
          d.open = true;
        }
      };
    } else {
      ui.resume.textContent = 'Ver todas las unidades ✓';
      ui.resume.href = '#courseCatalog';
      ui.resume.onclick = null;
    }

    for (const card of container.querySelectorAll('.course-unit')) {
      const done = state.completed.has(card.dataset.unitKey);
      const status = card.querySelector('[data-status]');
      if (status) {
        status.classList.toggle('is-complete', done);
        status.textContent = done ? '✓ Estudiada' : '○ Por estudiar';
      }
      const btn = card.querySelector('[data-complete]');
      if (btn) {
        btn.setAttribute('aria-pressed', String(done));
        btn.textContent = done ? '✓ Marcada como estudiada' : '✓ Marcar como estudiada';
      }
    }
  }
  function applyFilters() {
    let visible = 0;
    for (const group of container.querySelectorAll('.course-group')) {
      let count = 0;
      for (const card of group.querySelectorAll('.course-unit')) {
        const done = state.completed.has(card.dataset.unitKey);
        const track = card.dataset.group;
        const category = state.filter === 'all' ||
          state.filter === track ||
          (state.filter === 'done' && done) ||
          (state.filter === 'todo' && !done);
        const matches = !state.query || card.dataset.search.includes(state.query);
        card.hidden = !(category && matches);
        if (!card.hidden) { visible++; count++; }
      }
      group.hidden = count === 0;
      const counter = group.querySelector('[data-group-count]');
      if (counter) counter.textContent = count + ' ' + (count === 1 ? 'unidad' : 'unidades');
    }
    ui.empty.hidden = visible !== 0;
    ui.status.textContent = 'Mostrando ' + visible + ' de ' + state.units.length + ' unidades · El progreso se marca manualmente.';
  }
  async function load() {
    const [units, links, articles, activityResponse] = await Promise.all([
      get('unidades_curso?select=id,slug,titulo,descripcion,nivel,orden&publicado=eq.true&order=orden.asc&limit=200'),
      get('unidades_articulos?select=unidad_id,articulo_slug,orden&order=orden.asc&limit=1000'),
      get('articulos?select=slug,titulo,descripcion,nivel&order=titulo.asc&limit=1000'),
      get('actividades?select=id,slug,titulo,unidad_id&publicado=eq.true&limit=200').catch(() => [])
    ]);
    if (!Array.isArray(units) || !units.length) throw Error('No hay unidades disponibles');
    const activities = Array.isArray(activityResponse) ? activityResponse : [];
    const unitIds = new Set(units.map(u => u.id));
    const articleMap = new Map(articles.map(a => [a.slug,a]));
    const byUnit = new Map();
    for (const member of links) {
      if (!unitIds.has(member.unidad_id)) continue;
      const group = byUnit.get(member.unidad_id) || [];
      group.push(member);
      byUnit.set(member.unidad_id, group);
    }
    state.units = units.sort((a,b) => a.orden - b.orden).map(unit => {
      const lessons = (byUnit.get(unit.id) || []).sort((a,b) => a.orden - b.orden)
        .map(x => articleMap.get(x.articulo_slug)).filter(Boolean);
      const meta = parseDescription(unit.descripcion);
      return {unit, lessons, topics:meta.topics, exam:meta.exam, activities:activities.filter(a => a.unidad_id === unit.id)};
    });
    const linkedSlugs = new Set([...byUnit.values()].flat().map(x => x.articulo_slug));
    const extras = articles.filter(a => !linkedSlugs.has(a.slug));
    renderGroups();
    renderExtras(extras);
    syncProgress();
    applyFilters();
    ui.stored.textContent = state.storageOK
      ? 'Avance manual guardado solo en este navegador. No equivale a aprobar un examen.'
      : 'El progreso se mantendrá solo mientras tengas abierta esta página.';
  }
  document.querySelectorAll('[data-course-filter]').forEach(button => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.courseFilter;
      for (const b of document.querySelectorAll('[data-course-filter]')) {
        b.setAttribute('aria-pressed', String(b === button));
      }
      applyFilters();
    });
  });
  ui.search.addEventListener('input', () => { state.query = normalize(ui.search.value.trim()); applyFilters(); });
  window.addEventListener('storage', event => {
    if (event.key === STORAGE) { state.completed = readCompleted(); syncProgress(); applyFilters(); }
  });
  state.completed = readCompleted();
  load().catch(err => {
    console.warn('Curso Easy English: no se pudieron cargar los datos', err);
    ui.status.textContent = 'No se pudo cargar el curso. Comprueba tu conexión e inténtalo de nuevo.';
    ui.fallback.hidden = false;
    ui.empty.hidden = true;
  });
})();