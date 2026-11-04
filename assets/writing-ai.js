/* Easy English · Corrector IA opcional: requiere sesión, clave y consentimiento. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),button=$('writingAiCheck');
 if(!button)return;
 const db=window.eeDb,ai=window.eeAI,status=$('writingAiStatus'),access=$('writingAiAccess'),
       result=$('writingAiResult'),consent=$('writingAiConsent'),setup=$('writingAiSetup');
 const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);if(cls)n.className=cls;return n};
 let user=null,busy=false;
 function clear(){result.replaceChildren();status.textContent=''}
 function ready(){button.disabled=busy||!user||!ai?.keyFor(user.id)||!consent.checked}
 async function refresh(){
   if(!db||!ai){access.textContent='El corrector no se encuentra disponible en este momento.';button.disabled=true;return}
   try{const {data,error}=await db.auth.getUser();user=error?null:data?.user;
     if(!user){access.textContent='Para usar IA, primero inicia sesión en Easy English.';setup.href='/login.html?next=%2Fwritings.html%23editor';setup.textContent='Iniciar sesión';}
     else if(!ai.keyFor(user.id)){access.textContent='Necesitas guardar una clave temporal de OpenAI (caduca en 30 minutos).';setup.href='/clave-openai.html?next=%2Fwritings.html%23editor';setup.textContent='🔑 Configurar clave de OpenAI';}
     else{access.textContent='✓ Clave temporal disponible. Selecciona la casilla de consentimiento para habilitar la corrección.';setup.href='/clave-openai.html?next=%2Fwritings.html%23editor';setup.textContent='Administrar clave temporal';}
   }catch{user=null;access.textContent='No se pudo verificar tu cuenta.'}
   ready();
 }
 function validScore(v){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(5,Math.round(n))):null}
 function render(data){
   result.replaceChildren();
   const root=el('div',undefined,'ee-writing-ai-result');
   const scores=data.scores||{},grid=el('div',undefined,'ee-writing-ai-score-grid');
   for(const [key,label] of [['content','Content'],['communicative','Communicative Achievement'],['organisation','Organisation'],['language','Language']]){
      const score=validScore(scores[key]);
      const card=el('div',undefined,'ee-writing-ai-score');
      card.append(el('small',label),el('strong',score===null?'Sin nota':score+' / 5'));
      grid.append(card);
   }
   root.append(el('h4','Evaluación orientativa (no nota oficial)'),grid);
   if(data.summary)root.append(el('p',String(data.summary).slice(0,900)));
   const corrections=Array.isArray(data.corrections)?data.corrections.slice(0,10):[];
   root.append(el('h4','Errores y explicaciones'));
   if(!corrections.length)root.append(el('p','No se han señalado errores específicos.'));
   for(const c of corrections){
     const item=el('div',undefined,'ee-writing-ai-correction');
     item.append(el('p','Original: '+String(c.original||'').slice(0,500)),
                 el('p','Corrección: '+String(c.corrected||'').slice(0,500)),
                 el('p','Por qué: '+String(c.why||'').slice(0,700)));
     root.append(item);
   }
   if(Array.isArray(data.nextSteps)&&data.nextSteps.length){
     root.append(el('h4','Qué practicar ahora'));
     const list=el('ul');for(const step of data.nextSteps.slice(0,7))list.append(el('li',String(step).slice(0,400)));root.append(list);
   }
   if(data.suggestedVersion){
     root.append(el('h4','Versión propuesta de la redacción'),el('pre',String(data.suggestedVersion).slice(0,16000)));
   }
   root.append(el('p','Esta corrección es una orientación de IA, no un resultado oficial Cambridge.'));
   result.append(root);
 }
 button.onclick=async()=>{
   if(busy)return;
   await refresh();
   if(!user||!ai.keyFor(user.id)||!consent.checked){status.textContent='Inicia sesión, configura la clave y acepta el envío de tu texto.';return}
   const text=$('wtexto').value.trim();
   if(text.length<20){status.textContent='Escribe al menos 20 caracteres para corregir el writing.';return}
   if(text.length>12000){status.textContent='El texto supera 12.000 caracteres.';return}
   busy=true;ready();clear();status.textContent='OpenAI está revisando tu writing…';
   try{
     const data=await ai.run(db,'writing',{writing:{type:$('wtipo').value,text}});
     render(data);status.textContent='Corrección finalizada. Revisa los errores y practica las recomendaciones.';
   }catch(error){status.textContent=error.message||'No se pudo obtener una corrección.'}
   finally{busy=false;await refresh()}
 };
 setup.addEventListener('click',event=>{
   if(!user)return;
   try{
     sessionStorage.setItem('ee:writing-login-draft:v1',JSON.stringify({
       time:Date.now(),type:$('wtipo').value,title:$('wtitulo').value,body:$('wtexto').value
     }));
   }catch(err){event.preventDefault();status.textContent='No se pudo conservar tu texto. Cópialo antes de ir a configurar la clave.'}
 });
 consent.onchange=ready;
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 window.addEventListener('pageshow',refresh);
 db?.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){user=null;consent.checked=false;clear()}if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(refresh,0)});
 refresh();
})();
