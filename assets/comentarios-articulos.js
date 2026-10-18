/* Hilos de comentarios de Easy English. Solo texto plano, ninguna escritura anónima. */
(()=>{
'use strict';
const host=document.querySelector('#comentarios[data-article-slug]');
if(!host)return;
const slug=host.dataset.articleSlug;
const get=id=>host.querySelector('#'+id);
const status=get('ee-comments-status'), list=get('ee-comments-list'), composer=get('ee-comments-composer');
const results=get('ee-comments-count');
let currentUser=null, comments=[], busy=false, activeReply=null;
const db=typeof eeDb==='undefined'?null:eeDb;
function el(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);
 return node;
}
function message(text,failed=false){
 status.textContent=text;
 status.dataset.error=String(failed);
}
function niceError(error){
 const m=error?.message||String(error||'Error desconocido');
 if(/Failed to fetch|NetworkError/i.test(m))return 'No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.';
 return m;
}
function form(parentId=null){
 const frm=el('form','ee-comment-form');
 const fieldId='ee-comment-text-'+(parentId===null?'root':String(parentId));
 const label=el('label','',parentId===null?'Escribe tu comentario':'Tu respuesta');
 label.setAttribute('for',fieldId);
 const field=el('textarea');field.id=fieldId;field.required=true;field.minLength=3;field.maxLength=2000;
 field.placeholder=parentId===null?'¿Qué te ha parecido este artículo?':'Escribe una respuesta respetuosa…';
 const limit=el('small','','De 3 a 2000 caracteres. Respeta a los demás usuarios.');
 const actions=el('div','ee-comment-form-actions');
 const send=el('button','','Publicar '+(parentId===null?'comentario':'respuesta'));
 send.type='submit';
 actions.append(send);
 if(parentId!==null){
  const cancel=el('button','ee-comment-action','Cancelar');
  cancel.type='button';
  cancel.addEventListener('click',()=>{frm.remove();activeReply=null;});
  actions.append(cancel);
 }
 frm.append(label,field,limit,actions);
 frm.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||!currentUser)return;
  const text=field.value.trim();
  if(text.length<3||text.length>2000){message('Escribe entre 3 y 2000 caracteres.',true);return;}
  busy=true;send.disabled=true;message('Publicando…');
  try{
   const {error}=await db.rpc('publicar_comentario_articulo',
     {p_slug:slug,p_padre_id:parentId,p_contenido:text});
   if(error)throw error;
   activeReply=null;
   await refresh();
   message('Tu '+(parentId===null?'comentario':'respuesta')+' se ha publicado correctamente.');
  }catch(err){message(niceError(err),true);}
  finally{busy=false;send.disabled=false;}
 });
 return frm;
}
function renderComposer(){
 composer.replaceChildren();
 if(!db){composer.append(el('p','ee-comment-auth','No se puede cargar el sistema de comentarios. Inténtalo de nuevo más tarde.'));return;}
 if(!currentUser){
  const msg=el('p','ee-comment-auth','Para comentar o responder, ');
  const a=el('a','','inicia sesión desde Mi perfil');
  a.href='/perfil.html';
  msg.append(a,'.');
  composer.append(msg);
 }else composer.append(form());
}
function commentElement(comment,depth,replyTo){
 const item=el('article','ee-comment');
 item.id='comentario-'+comment.id;
 item.dataset.depth=String(Math.min(depth,3));
 item.style.setProperty('--ee-depth',String(Math.min(depth,3)));
 const header=el('div','ee-comment-header');
 header.append(el('strong','ee-comment-author',comment.autor_alias||'Estudiante'));
 const date=el('time','ee-comment-date');
 const parsed=new Date(comment.creado_en);
 date.dateTime=comment.creado_en;
 date.textContent=Number.isFinite(parsed.getTime())?
  parsed.toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short'}):'';
 header.append(date);
 if(replyTo)header.append(el('span','ee-comment-replyto','↳ en respuesta a '+replyTo.autor_alias));
 item.append(header,el('p','ee-comment-body',comment.contenido||''));
 const actions=el('div','ee-comment-actions');
 if(!comment.eliminado&&currentUser){
  const reply=el('button','ee-comment-action','Responder');
  reply.type='button';reply.setAttribute('aria-label','Responder a '+(comment.autor_alias||'Estudiante'));
  reply.addEventListener('click',()=>{
   if(activeReply&&activeReply.isConnected)activeReply.remove();
   const field=form(comment.id);
   item.append(field);
   activeReply=field;
   field.querySelector('textarea').focus();
  });
  actions.append(reply);
 }
 if(comment.es_mio&&!comment.eliminado&&currentUser){
  const remove=el('button','ee-comment-action ee-delete','Eliminar');
  remove.type='button';
  remove.addEventListener('click',async()=>{
   if(busy||!confirm('¿Eliminar tu comentario? Las respuestas que tenga se conservarán.'))return;
   busy=true;remove.disabled=true;
   try{
    const {error}=await db.rpc('eliminar_comentario_articulo',{p_id:comment.id});
    if(error)throw error;
    await refresh();message('Comentario eliminado.');
   }catch(err){message(niceError(err),true);}
   finally{busy=false;remove.disabled=false;}
  });
  actions.append(remove);
 }
 if(actions.childNodes.length)item.append(actions);
 return item;
}
function renderThreads(){
 list.replaceChildren();
 results.textContent=comments.length+' comentario'+(comments.length===1?'':'s');
 if(!comments.length){list.append(el('p','ee-comment-empty','Todavía no hay comentarios. ¡Inicia la conversación!'));return;}
 const byId=new Map(comments.map(c=>[String(c.id),c]));
 const children=new Map();
 for(const c of comments){
  const parent=c.padre_id!==null&&byId.has(String(c.padre_id))?String(c.padre_id):'root';
  if(!children.has(parent))children.set(parent,[]);
  children.get(parent).push(c);
 }
 const seen=new Set();
 function walk(c,depth){
  if(seen.has(String(c.id)))return;
  seen.add(String(c.id));
  const parent=byId.get(String(c.padre_id));
  list.append(commentElement(c,depth,parent));
  for(const kid of children.get(String(c.id))||[])walk(kid,depth+1);
 }
 for(const c of children.get('root')||[])walk(c,0);
 // Protección ante hilos incompletos por límites de lectura.
 for(const c of comments)if(!seen.has(String(c.id)))walk(c,0);
}
async function refresh(){
 if(!db)return;
 const {data,error}=await db.rpc('listar_comentarios_articulo',{p_slug:slug});
 if(error)throw error;
 comments=Array.isArray(data)?data:[];
 renderThreads();
 renderComposer();
 if(location.hash.startsWith('#comentario-')){
  const target=document.getElementById(location.hash.slice(1));
  target?.scrollIntoView({block:'center'});
 }
}
async function boot(){
 if(!db){renderComposer();message('Comentarios no disponibles por el momento.',true);return;}
 try{
  const {data,error}=await db.auth.getUser();
  if(error)throw error;
  currentUser=data?.user||null;
  await refresh();
  message('');
  db.auth.onAuthStateChange((_event,session)=>{
   const next=session?.user||null;
   if(next?.id!==currentUser?.id){
    currentUser=next;
    refresh().catch(err=>message(niceError(err),true));
   }
  });
 }catch(err){renderComposer();message(niceError(err),true);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
