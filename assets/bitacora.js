/* Bitácora privada del alumno. Supabase Auth + RLS. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const root = $('bitacoraPanel');
  if (!root || !window.eeDb) return;
  const db = window.eeDb;
  const formatDate = value => new Intl.DateTimeFormat('es-ES', {dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let owner = null, categories = [], notes = [], editing = null, loading = false, revision = 0;
  let notesPage=1; const NOTES_PAGE_SIZE=6;
  const status = (message, error = false) => { $('bitacoraStatus').textContent = message; $('bitacoraStatus').classList.toggle('is-error',error); };
  function optionList() {
    const select = $('bitacoraCategory');
    const selected = select.value;
    select.replaceChildren(new Option('Sin categoría', ''));
    categories.forEach(c => select.add(new Option(c.nombre,c.id)));
    select.value = categories.some(c => c.id === selected) ? selected : '';
    const filter = $('bitacoraFilter'), previous = filter.value;
    filter.replaceChildren(new Option('Todas las categorías','all'),new Option('Sin categoría','none'));
    categories.forEach(c => filter.add(new Option(c.nombre,c.id)));
    filter.value = previous === 'all' || previous === 'none' || categories.some(c=>c.id===previous) ? previous : 'all';
    const list = $('bitacoraCategories');
    list.replaceChildren();
    categories.forEach(c => {
      const item = document.createElement('span'); item.className='bitacora-chip';
      const name = document.createElement('span'); name.textContent=c.nombre;
      const del = document.createElement('button');del.type='button';del.textContent='×';del.title='Eliminar categoría '+c.nombre;del.setAttribute('aria-label','Eliminar categoría '+c.nombre);
      del.onclick=()=>removeCategory(c);
      item.append(name,del);list.append(item);
    });
  }
  function clearEditor() {
    editing=null; $('bitacoraContent').value='';$('bitacoraCategory').value='';
    $('bitacoraSave').textContent='Guardar anotación';$('bitacoraCancelEdit').hidden=true;
  }
  function render() {
    const q=normalize($('bitacoraSearch').value.trim()), filter=$('bitacoraFilter').value;
    const shown=notes.filter(n=>(filter==='all'||(filter==='none'&&!n.categoria_id)||n.categoria_id===filter)
      &&(!q||normalize(n.contenido+' '+(categories.find(c=>c.id===n.categoria_id)?.nombre||'')).includes(q)));
    $('bitacoraCount').textContent=shown.length+' anotación'+(shown.length===1?'':'es');
    const list=$('bitacoraHistory');list.replaceChildren();
    if(!shown.length) {
      const empty=document.createElement('p');empty.className='muted';
      empty.textContent=notes.length?'No hay anotaciones que coincidan con los filtros.':'Todavía no has escrito ninguna duda. Crea tu primera anotación.';
      list.append(empty);const oldNav=$('bitacoraPagination');if(oldNav)oldNav.hidden=true;return;
    }
    const pageCount=Math.max(1,Math.ceil(shown.length/NOTES_PAGE_SIZE));
    notesPage=Math.min(notesPage,pageCount);
    shown.slice((notesPage-1)*NOTES_PAGE_SIZE,notesPage*NOTES_PAGE_SIZE).forEach(n=>{
      const article=document.createElement('article');article.className='bitacora-note';
      const header=document.createElement('div');header.className='bitacora-note-top';
      const tag=document.createElement('strong');tag.className='bitacora-note-tag';
      tag.textContent=categories.find(c=>c.id===n.categoria_id)?.nombre||'Sin categoría';
      const time=document.createElement('time');time.dateTime=n.creado_en;time.textContent=formatDate(n.creado_en);
      header.append(tag,time);
      const content=document.createElement('p');content.className='bitacora-note-content';content.textContent=n.contenido;
      const footer=document.createElement('div');footer.className='bitacora-note-actions';
      if(n.actualizado_en && new Date(n.actualizado_en).getTime()-new Date(n.creado_en).getTime()>1000) {
        const revised=document.createElement('small');revised.textContent='Editada: '+formatDate(n.actualizado_en);footer.append(revised);
      }
      const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='Editar';
      edit.onclick=()=>{editing=n.id;$('bitacoraContent').value=n.contenido;$('bitacoraCategory').value=n.categoria_id||'';$('bitacoraSave').textContent='Guardar cambios';$('bitacoraCancelEdit').hidden=false;$('bitacoraContent').focus();root.scrollIntoView({block:'start',behavior:'smooth'});};
      const del=document.createElement('button');del.type='button';del.className='secondary';del.textContent='Eliminar';
      del.onclick=()=>removeNote(n);
      footer.append(edit,del);article.append(header,content,footer);list.append(article);
    });
    let nav=$('bitacoraPagination');
    if(!nav){nav=document.createElement('nav');nav.id='bitacoraPagination';nav.className='profile-list-pagination';nav.setAttribute('aria-label','Páginas de anotaciones');list.after(nav)}
    nav.replaceChildren();nav.hidden=pageCount<=1;
    if(pageCount>1){
      const prev=document.createElement('button');prev.type='button';prev.textContent='← Anterior';prev.disabled=notesPage===1;
      const next=document.createElement('button');next.type='button';next.textContent='Siguiente →';next.disabled=notesPage===pageCount;
      const info=document.createElement('span');info.textContent='Página '+notesPage+' de '+pageCount;
      prev.onclick=()=>{notesPage--;render()};next.onclick=()=>{notesPage++;render()};
      nav.append(prev,info,next);
    }
  }
  async function refresh() {
    if(!owner)return;
    const id=owner, seq=++revision;
    status('Cargando tu bitácora…');
    const [a,b]=await Promise.all([
      db.from('bitacora_categorias').select('id,nombre').eq('usuario_id',id).order('nombre'),
      db.from('bitacora_anotaciones').select('id,categoria_id,contenido,creado_en,actualizado_en').eq('usuario_id',id).order('creado_en',{ascending:false})
    ]);
    if(owner!==id||revision!==seq)return;
    if(a.error||b.error){status('No se pudo cargar la bitácora: '+(a.error||b.error).message,true);return;}
    categories=a.data||[]; notes=b.data||[];optionList();render();status('');
  }
  async function removeNote(n) {
    if(loading||!owner||!confirm('¿Eliminar definitivamente esta anotación?'))return;
    const id=owner;loading=true;
    try {
      const {error}=await db.from('bitacora_anotaciones').delete().eq('usuario_id',id).eq('id',n.id);
      if(error)throw error;
      if(owner===id){if(editing===n.id)clearEditor();await refresh();}
    } catch(e){status('No se pudo eliminar: '+e.message,true);}
    finally{loading=false;}
  }
  async function removeCategory(c) {
    if(loading||!owner)return;
    if(notes.some(n=>n.categoria_id===c.id)){status('Esta categoría tiene anotaciones. Cámbialas a otra categoría antes de eliminarla.',true);return;}
    if(!confirm('¿Eliminar la categoría '+c.nombre+'?'))return;
    const id=owner;loading=true;
    try{
      const {error}=await db.from('bitacora_categorias').delete().eq('id',c.id).eq('usuario_id',id);
      if(error)throw error;
      if(owner===id)await refresh();
    }catch(e){status('No se pudo eliminar la categoría: '+e.message,true);}
    finally{loading=false;}
  }
  $('bitacoraCategoryForm').addEventListener('submit',async event=>{
    event.preventDefault();const name=$('bitacoraNewCategory').value.trim();
    if(!owner||loading||!name)return;
    if(categories.some(c=>normalize(c.nombre)===normalize(name))){status('Esta categoría ya existe.',true);return;}
    const id=owner;loading=true;
    try{
      const {data,error}=await db.from('bitacora_categorias').insert({usuario_id:id,nombre:name}).select('id,nombre').single();
      if(error)throw error;
      if(owner===id){categories.push(data);categories.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));optionList();$('bitacoraCategory').value=data.id;$('bitacoraNewCategory').value='';render();status('Categoría creada.');}
    }catch(e){status('No se pudo crear la categoría: '+e.message,true);}
    finally{loading=false;}
  });
  $('bitacoraNoteForm').addEventListener('submit',async event=>{
    event.preventDefault();const content=$('bitacoraContent').value.trim(),cat=$('bitacoraCategory').value||null;
    if(!owner||loading||!content)return;
    const id=owner;loading=true;$('bitacoraSave').disabled=true;
    try{
      const payload={contenido:content,categoria_id:cat};
      let request;
      if(editing)request=db.from('bitacora_anotaciones').update({...payload,actualizado_en:new Date().toISOString()}).eq('id',editing).eq('usuario_id',id);
      else request=db.from('bitacora_anotaciones').insert({...payload,usuario_id:id});
      const {error}=await request;
      if(error)throw error;
      if(owner===id){clearEditor();await refresh();status('Anotación guardada correctamente.');}
    }catch(e){status('No se pudo guardar: '+e.message,true);}
    finally{loading=false;$('bitacoraSave').disabled=false;}
  });
  $('bitacoraCancelEdit').onclick=clearEditor;
  $('bitacoraSearch').oninput=()=>{notesPage=1;render()};
  $('bitacoraFilter').onchange=()=>{notesPage=1;render()};
  async function syncOwner(){
    const seq=++revision;
    const {data,error}=await db.auth.getUser();
    if(seq!==revision)return;
    const next=error?null:data.user?.id||null;
    if(next===owner && next!==null)return;
    owner=next;categories=[];notes=[];clearEditor();optionList();render();
    if(next)await refresh();
    else status('');
  }
  db.auth.onAuthStateChange(event=>{
    if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED','TOKEN_REFRESHED'].includes(event))
      Promise.resolve().then(syncOwner);
  });
  void syncOwner();
})();
