/* Easy English B2 · progreso por cuenta para registrados, local para visitantes. */
(() => {
  'use strict';
  const API = 'https://wnluofonzteaqtlfshgy.supabase.co/rest/v1/';
  const KEY = 'sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
  const STORAGE = 'easyenglish-b2-manual-completed-v1';
  const STARTED_STORAGE = 'easyenglish-b2-manual-started-v1';
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
    grammar: $('courseGrammarStat'), vocabulary: $('courseVocabularyStat'), importLocal: $('courseImportLocal'), startedStat: $('courseStartedStat')
  };
  const state = { units: [], filter: 'all', query: '', completed: new Set(), started: new Set(), favorites: new Set(), favoritesReady:false, storageOK: true, user: null, syncReady: false, busy: new Set(), authRevision: 0 };
  const path = slug => '/leer.html?slug=' + encodeURIComponent(slug);
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
  function readStarted() {
    try {
      const parsed=JSON.parse(localStorage.getItem(STARTED_STORAGE)||'[]');
      return new Set(Array.isArray(parsed)?parsed.filter(x=>typeof x==='string'):[]);
    } catch (_) { state.storageOK=false; return new Set(); }
  }
  function loadLocalState() {
    state.completed=readCompleted();
    state.started=readStarted();
    for(const slug of state.completed)state.started.delete(slug);
  }
  function updateStorageNote(message) {
    ui.stored.textContent = message || (state.user
      ? (state.syncReady
        ? 'Avance sincronizado con tu cuenta. No equivale a aprobar un examen.'
        : 'No se ha podido sincronizar tu avance. Revisa tu conexión antes de marcar unidades.')
      : (state.storageOK
        ? 'Sin sesión: el avance se guarda en este navegador. Inicia sesión para sincronizarlo.'
        : 'Este navegador no permite guardar el avance.'));
    if (ui.importLocal) ui.importLocal.hidden = !(state.user && state.syncReady && (readCompleted().size || readStarted().size));
  }
  function saveLocal() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify([...state.completed]));
      localStorage.setItem(STARTED_STORAGE, JSON.stringify([...state.started]));
    } catch (_) { state.storageOK = false; }
    updateStorageNote();
  }
  function refreshProgress() {
    if (!state.units.length) return;
    syncProgress();
    applyFilters();
  }
  async function setUnitState(key, nextState) {
    if(state.busy.has(key)||(state.user&&!state.syncReady))return;
    const current=state.completed.has(key)?'completada':state.started.has(key)?'en_curso':'pendiente';
    if(current===nextState)return;
    const buttons=[...container.querySelectorAll('.course-unit')]
      .filter(card=>card.dataset.unitKey===key)
      .flatMap(card=>[...card.querySelectorAll('[data-complete],[data-start]')]);
    state.busy.add(key);buttons.forEach(b=>b.disabled=true);
    const owner=state.user?.id;
    try {
      if(owner) {
        const query=window.eeDb.from('progreso_curso');
        const result=nextState==='pendiente'
          ?await query.delete().eq('usuario_id',owner).eq('unidad_slug',key)
          :await query.upsert({
             usuario_id:owner,unidad_slug:key,estado:nextState,
             completada_en:nextState==='completada'?new Date().toISOString():null
           },{onConflict:'usuario_id,unidad_slug'});
        if(result.error)throw result.error;
        if(state.user?.id!==owner)return;
      }
      state.completed.delete(key);state.started.delete(key);
      if(nextState==='completada')state.completed.add(key);
      if(nextState==='en_curso')state.started.add(key);
      if(!owner)saveLocal();
      refreshProgress();
      updateStorageNote();
    } catch(error) {
      updateStorageNote('No se pudo guardar el cambio: '+error.message);
    } finally {
      state.busy.delete(key);
      buttons.forEach(b=>b.disabled=false);
    }
  }
  async function toggleCompleted(key) {
    await setUnitState(key,state.completed.has(key)?'pendiente':'completada');
  }
  async function toggleStarted(key) {
    await setUnitState(key,state.started.has(key)?'pendiente':'en_curso');
  }
  async function loadFavorites(owner,revision) {
    state.favoritesReady=false;
    refreshFavorites();
    try {
      const {data,error}=await window.eeDb.from('recursos_guardados')
        .select('referencia').eq('usuario_id',owner).eq('tipo','unidad');
      if(error)throw error;
      if(state.user?.id!==owner||revision!==state.authRevision)return;
      state.favorites=new Set((data||[]).map(row=>row.referencia));
      state.favoritesReady=true;
      refreshFavorites();
    }catch(error){
      if(state.user?.id===owner)updateStorageNote('El progreso funciona, pero no se pudieron cargar los favoritos: '+error.message);
    }
  }
  function refreshFavorites() {
    for(const card of container.querySelectorAll('.course-unit')){
      const button=card.querySelector('[data-favorite]');
      if(!button)continue;
      const saved=state.favorites.has(card.dataset.unitKey);
      button.disabled=!state.user||!state.favoritesReady;
      button.setAttribute('aria-pressed',String(saved));
      button.textContent=saved?'★ Unidad guardada':'☆ Guardar unidad';
      button.title=state.user?'Añadir o quitar esta unidad de tus favoritos':'Inicia sesión para guardar favoritos en tu cuenta';
    }
  }
  async function toggleFavorite(key) {
    if(!state.user||!state.favoritesReady)return;
    const owner=state.user.id;
    const saved=state.favorites.has(key);
    state.favoritesReady=false;refreshFavorites();
    try{
      const query=window.eeDb.from('recursos_guardados');
      const {error}=saved
        ?await query.delete().eq('usuario_id',owner).eq('tipo','unidad').eq('referencia',key)
        :await query.insert({usuario_id:owner,tipo:'unidad',referencia:key});
      if(error)throw error;
      if(state.user?.id!==owner)return;
      if(saved)state.favorites.delete(key);else state.favorites.add(key);
      updateStorageNote(saved?'Unidad retirada de tus favoritos.':'Unidad guardada en tu perfil.');
    }catch(error){updateStorageNote('No se pudo actualizar el favorito: '+error.message)}
    finally{if(state.user?.id===owner){state.favoritesReady=true;refreshFavorites()}}
  }
  async function syncAccount() {
    if (!window.eeDb) { updateStorageNote('No se ha podido iniciar la sincronización.'); return; }
    const revision = ++state.authRevision;
    try {
      const { data, error } = await window.eeDb.auth.getUser();
      if (error && error.name !== 'AuthSessionMissingError') throw error;
      if (revision !== state.authRevision) return;
      const nextUser = data?.user || null;
      const changed = state.user?.id !== nextUser?.id;
      state.user = nextUser;
      state.syncReady = !nextUser;
      if (!nextUser) {
        loadLocalState();
        state.favorites=new Set();
        state.favoritesReady=false;
        refreshProgress();refreshFavorites();
        updateStorageNote();
        return;
      }
      if (changed) { state.completed = new Set(); state.started = new Set(); state.favorites=new Set();state.favoritesReady=false;refreshProgress();refreshFavorites(); }
      const result = await window.eeDb.from('progreso_curso').select('unidad_slug,estado').eq('usuario_id', nextUser.id);
      if (result.error) throw result.error;
      if (revision !== state.authRevision) return;
      state.completed = new Set((result.data || []).filter(x => x.estado==='completada').map(x=>x.unidad_slug));
      state.started = new Set((result.data || []).filter(x => x.estado==='en_curso').map(x=>x.unidad_slug));
      state.syncReady = true;
      refreshProgress();
      updateStorageNote();
      void loadFavorites(nextUser.id,revision);
    } catch (error) {
      if (revision !== state.authRevision) return;
      state.syncReady = false;
      updateStorageNote('No se pudo consultar el progreso de la cuenta: ' + error.message);
    }
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
    const started = state.started.has(key);
    const details = elt('details', 'course-unit');
    details.id = 'unidad-' + String(unit.orden).padStart(2, '0');
    details.dataset.unitKey = key;
    // Recuerda únicamente la última unidad abierta en este navegador (sin datos personales).
    details.addEventListener('toggle',()=>{
      if(!details.open)return;
      try{localStorage.setItem('easyenglish-last-unit-v1',JSON.stringify({
        numero:Number(unit.orden),titulo:String(unit.titulo||'').slice(0,90),
        ruta:'/curso.html#unidad-'+String(unit.orden).padStart(2,'0')
      }))}catch(_){}
    });
    details.dataset.group = unit.nivel === 'Vocabulary' ? 'vocabulary' : 'grammar';
    details.dataset.search = normalize([unit.titulo, unit.descripcion, ...lessons.map(x => x.titulo)].join(' '));

    const summary = elt('summary');
    const meta = elt('div', 'course-card-top');
    meta.append(elt('span', 'course-card-no', 'UNIDAD ' + String(unit.orden).padStart(2, '0')));
    const status = elt('span', 'course-card-status' + (done?' is-complete':started?' is-started':''), done?'✓ Estudiada':started?'◉ En curso':'○ Por estudiar');
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
    complete.addEventListener('click', () => { void toggleCompleted(key); });
    footer.append(complete);
    const start = elt('button', 'course-complete course-start', started?'↶ Dejar pendiente':'◉ Marcar en curso');
    start.type='button';
    start.dataset.start='';
    start.setAttribute('aria-pressed',String(started));
    start.addEventListener('click',()=>{void toggleStarted(key)});
    footer.append(start);
    const favorite=elt('button','course-complete course-favorite','☆ Guardar unidad');
    favorite.type='button';favorite.dataset.favorite='';
    favorite.addEventListener('click',()=>{void toggleFavorite(key)});
    footer.append(favorite);

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
    const started = state.units.filter(x=>state.started.has(x.unit.slug)).length;
    ui.value.textContent = percent + '%';
    ui.ring.style.setProperty('--p', percent + '%');
    ui.ring.setAttribute('aria-valuenow', String(percent));
    ui.copy.replaceChildren();
    ui.copy.append(elt('strong', '', completed + ' de ' + total + ' unidades'), document.createTextNode(' estudiadas · '+started+' en curso.'));
    ui.completedStat.textContent = String(completed);
    if(ui.startedStat)ui.startedStat.textContent=String(started);
    ui.count.textContent = String(total);
    ui.grammar.textContent = String(state.units.filter(x => x.unit.nivel === 'Grammar').length);
    ui.vocabulary.textContent = String(state.units.filter(x => x.unit.nivel === 'Vocabulary').length);

    const next = state.units.find(x => state.started.has(x.unit.slug)) || state.units.find(x => !state.completed.has(x.unit.slug));
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
      const started = state.started.has(card.dataset.unitKey);
      const status = card.querySelector('[data-status]');
      if (status) {
        status.classList.toggle('is-complete',done);
        status.classList.toggle('is-started',started);
        status.textContent=done?'✓ Estudiada':started?'◉ En curso':'○ Por estudiar';
      }
      const btn = card.querySelector('[data-complete]');
      if (btn) {
        btn.disabled = state.busy.has(card.dataset.unitKey) || (state.user && !state.syncReady);
        btn.setAttribute('aria-pressed', String(done));
        btn.textContent = done ? '↶ Quitar completada' : '✓ Marcar como estudiada';
      }
      const start=card.querySelector('[data-start]');
      if(start) {
        start.disabled=done||state.busy.has(card.dataset.unitKey)||(state.user&&!state.syncReady);
        start.setAttribute('aria-pressed',String(started));
        start.textContent=started?'↶ Dejar pendiente':'◉ Marcar en curso';
      }
    }
  }
  function applyFilters() {
    let visible = 0;
    for (const group of container.querySelectorAll('.course-group')) {
      let count = 0;
      for (const card of group.querySelectorAll('.course-unit')) {
        const done = state.completed.has(card.dataset.unitKey);
        const started = state.started.has(card.dataset.unitKey);
        const track = card.dataset.group;
        const category = state.filter === 'all' ||
          state.filter === track ||
          (state.filter === 'done' && done) ||
          (state.filter === 'started' && started) ||
          (state.filter === 'todo' && !done && !started);
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
    refreshFavorites();
    renderExtras(extras);
    syncProgress();
    // El catálogo se crea de forma asíncrona: resolver aquí el enlace a la unidad.
    const deepLink = decodeURIComponent(location.hash.slice(1));
    if (/^unidad-\d{2}$/.test(deepLink)) {
      const target = document.getElementById(deepLink);
      if (target) {
        target.open = true;
        requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
      }
    }
    applyFilters();
    updateStorageNote();
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
    if ([STORAGE,STARTED_STORAGE].includes(event.key) && !state.user) { loadLocalState(); refreshProgress(); }
  });
  if (ui.importLocal) ui.importLocal.addEventListener('click', async () => {
    if (!state.user || !state.syncReady) return;
    const localDone = [...readCompleted()].filter(key=>state.units.some(item=>item.unit.slug===key));
    const localStarted = [...readStarted()].filter(key=>!localDone.includes(key)&&state.units.some(item=>item.unit.slug===key));
    const local = [
      ...localDone.filter(key=>!state.completed.has(key)).map(unidad_slug=>({unidad_slug,estado:'completada',completada_en:new Date().toISOString()})),
      ...localStarted.filter(key=>!state.completed.has(key)&&!state.started.has(key)).map(unidad_slug=>({unidad_slug,estado:'en_curso',completada_en:null}))
    ];
    if(!local.length) {
      localStorage.removeItem(STORAGE);
      localStorage.removeItem(STARTED_STORAGE);
      updateStorageNote('Las unidades de este navegador ya estaban sincronizadas con tu cuenta.');
      return;
    }
    const userId = state.user.id;
    ui.importLocal.disabled = true;
    try {
      const {error} = local.length ? await window.eeDb.from('progreso_curso')
        .upsert(local.map(record=>({usuario_id:userId,...record})),{onConflict:'usuario_id,unidad_slug'})
        :{error:null};
      if (error) throw error;
      if (state.user?.id !== userId) return;
      // El progreso local se conserva hasta confirmar que ha sido importado.
      localStorage.removeItem(STORAGE);
      localStorage.removeItem(STARTED_STORAGE);
      await syncAccount();
      updateStorageNote('Progreso de este navegador importado a tu cuenta.');
    } catch (error) {
      updateStorageNote('No se pudo importar el progreso local: ' + error.message);
    } finally { ui.importLocal.disabled = false; }
  });
  loadLocalState();
  if (window.eeDb) {
    window.eeDb.auth.onAuthStateChange(event => {
      if (['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event)) {
        setTimeout(() => { void syncAccount(); }, 0);
      }
    });
  }
  void syncAccount();
  load().catch(err => {
    console.warn('Curso Easy English: no se pudieron cargar los datos', err);
    ui.status.textContent = 'No se pudo cargar el curso. Comprueba tu conexión e inténtalo de nuevo.';
    ui.fallback.hidden = false;
    ui.empty.hidden = true;
  });
})();