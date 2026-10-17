'use strict';
(()=>{
  const api='https://wnluofonzteaqtlfshgy.supabase.co/rest/v1/';
  const key='sb_publishable_Ef-AXAapcwaPExEFS6kmug_tKLaulM8';
  const voterStorageKey='easyenglish.sugerencias.votante.v1';
  const form=document.getElementById('suggestionForm');
  if(!form)return;
  const title=document.getElementById('suggestionTitle');
  const description=document.getElementById('suggestionDescription');
  const submit=form.querySelector('button[type="submit"]');
  const formStatus=document.getElementById('suggestionFormStatus');
  const listStatus=document.getElementById('suggestionListStatus');
  const list=document.getElementById('suggestionList');

  function getVoterId(){
    let id=localStorage.getItem(voterStorageKey);
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||'')){
      id=typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'
        ?crypto.randomUUID()
        :'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
          const r=Math.random()*16|0;
          return (c==='x'?r:(r&3|8)).toString(16);
        });
      localStorage.setItem(voterStorageKey,id);
    }
    return id;
  }

  async function rpc(name,body){
    const response=await fetch(api+'rpc/'+name,{
      method:'POST',
      headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify(body)
    });
    const raw=await response.text();
    let result;
    try{result=raw?JSON.parse(raw):null}catch{result=raw}
    if(!response.ok){
      const message=result&&typeof result==='object'
        ?result.message||result.details||result.hint
        :result;
      throw new Error(message||'Error de Supabase ('+response.status+')');
    }
    return result;
  }

  function setStatus(element,message,error=false){
    element.textContent=message;
    element.dataset.error=String(error);
  }

  function voteButton(label,count,vote,current){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=label+' · '+Number(count||0);
    button.setAttribute('aria-pressed',String(Number(current)===vote));
    button.disabled=Number(current)===vote;
    return button;
  }

  function render(items){
    list.replaceChildren();
    if(!items.length){
      const empty=document.createElement('p');
      empty.className='suggestion-empty';
      empty.textContent='Todavía no hay sugerencias publicadas. ¡Puedes proponer la primera!';
      list.append(empty);
      return;
    }
    for(const item of items){
      const card=document.createElement('article');
      card.className='suggestion-item';
      const heading=document.createElement('h3');
      heading.textContent=item.titulo;
      const body=document.createElement('p');
      body.textContent=item.descripcion;
      const votes=document.createElement('div');
      votes.className='suggestion-votes';
      const like=voteButton('👍 Me gusta',item.me_gusta,1,item.mi_voto);
      const dislike=voteButton('👎 No me gusta',item.no_me_gusta,-1,item.mi_voto);
      like.addEventListener('click',()=>castVote(item.id,1,like,dislike));
      dislike.addEventListener('click',()=>castVote(item.id,-1,like,dislike));
      votes.append(like,dislike);
      card.append(heading,body,votes);
      list.append(card);
    }
  }

  async function load(){
    setStatus(listStatus,'Cargando sugerencias…');
    const rows=await rpc('listar_sugerencias',{p_votante_id:getVoterId()});
    if(!Array.isArray(rows))throw new Error('La respuesta de sugerencias no tiene el formato esperado.');
    render(rows);
    setStatus(listStatus,'');
  }

  async function castVote(id,vote,like,dislike){
    like.disabled=true;
    dislike.disabled=true;
    try{
      await rpc('votar_sugerencia',{
        p_sugerencia_id:id,
        p_votante_id:getVoterId(),
        p_voto:vote
      });
      await load();
    }catch(error){
      setStatus(listStatus,'No se pudo guardar el voto: '+error.message,true);
      like.disabled=false;
      dislike.disabled=false;
    }
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    submit.disabled=true;
    setStatus(formStatus,'Enviando sugerencia…');
    try{
      await rpc('enviar_sugerencia',{
        p_titulo:title.value.trim(),
        p_descripcion:description.value.trim()
      });
      form.reset();
      setStatus(formStatus,'Gracias. La sugerencia queda pendiente de revisión antes de publicarse.');
    }catch(error){
      setStatus(formStatus,'No se pudo enviar la sugerencia: '+error.message,true);
    }finally{
      submit.disabled=false;
    }
  });

  load().catch(error=>setStatus(listStatus,'No se pudieron cargar las sugerencias: '+error.message,true));
})();
