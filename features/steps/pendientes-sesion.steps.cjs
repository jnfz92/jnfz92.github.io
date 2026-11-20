'use strict';
const {Before,After,Given,When,Then,setDefaultTimeout}=require('@cucumber/cucumber');
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const BASE=process.env.EASY_ENGLISH_URL||'https://jnfz92.github.io';
async function loadMessagesAs(page,url,config){
  await page.goto(url);
  await page.addScriptTag({content:config});
  await page.addScriptTag({url:BASE+'/assets/messages.js'});
  await page.locator('#composer').waitFor({state:'visible'});
}

setDefaultTimeout(45000);

Before({tags:'@cucumber-aislado'},async function(){
  this.browser=await chromium.launch({headless:true});
  this.page=await this.browser.newPage({viewport:{width:1280,height:900}});
});
After({tags:'@cucumber-aislado'},async function(){
  await this.page?.close();
  await this.browser?.close();
});

Given('que dispongo de una dirección de pruebas no usada',async function(){
  this.testEmail='cucumber-'+Date.now()+'@example.invalid';
  await this.page.route('**/supabase.min.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await this.page.route('**/supabase-config.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:`window.eeDb={auth:{getSession:async()=>({data:{session:null},error:null}),signUp:async({email,password})=>{window.__signup={email,password};return {data:{user:{id:'c9b3a40d-7907-4d4f-9d9c-5b6fa09415b6',email},session:null},error:null}}}};`}));
  await this.page.route('**/functions/v1/email-bienvenida',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({sent:true})}));
  await this.page.goto(BASE+'/registro.html');
});
When('completo el registro',async function(){
  await this.page.locator('#registerEmail').fill(this.testEmail);
  await this.page.locator('#registerPassword').fill('Cucumber-Test-123!');
  await this.page.locator('#registerConfirmation').fill('Cucumber-Test-123!');
  await this.page.locator('#registerSubmit').click();
});
Then('recibo confirmación y no se exponen credenciales',async function(){
  await this.page.locator('#loginStatus').waitFor({state:'visible'});
  await this.page.waitForFunction(()=>/email de bienvenida|confirmar tu cuenta/i.test(document.querySelector('#loginStatus')?.textContent||''));
  const signup=await this.page.evaluate(()=>window.__signup);
  assert.equal(signup.email,this.testEmail);
  assert.equal(signup.password,'Cucumber-Test-123!');
  assert.equal(await this.page.locator('#registerPassword').inputValue(),'');
  assert.equal(await this.page.locator('#registerConfirmation').inputValue(),'');
  assert.equal((await this.page.locator('body').innerText()).includes('Cucumber-Test-123!'),false);
});

const aulaFakeConfig = String.raw`window.__aulaWrites=[];window.__aulaRows={};
window.eeDb={
 auth:{getUser:async()=>({data:{user:{id:'00000000-0000-4000-8000-000000000010',app_metadata:{}}},error:null})},
 from(table){
  function data(){return table==='unidades_curso'?[{slug:'test-b2-grammar',orden:1,titulo:'Grammar inicial',nivel:'Grammar',publicado:true},{slug:'test-b2-reading',orden:2,titulo:'Reading B2',nivel:'Reading',publicado:true}]:(window.__aulaRows[table]||[])}
  const query={
   select(){return query},eq(){return query},order(){return query},limit(){return query},in(){return query},
   maybeSingle:async()=>({data:data()[0]||null,error:null}),
   then(resolve,reject){return Promise.resolve({data:data(),error:null}).then(resolve,reject)},
   insert:async payload=>{window.__aulaWrites.push({table,method:'insert',payload});(window.__aulaRows[table] ||= []).push(payload);return {data:payload,error:null}},
   upsert:async (payload,opts)=>{window.__aulaWrites.push({table,method:'upsert',payload,opts});if(table==='simulacros_b2'&&window.__mockFailOnce){window.__mockFailOnce=false;return {data:null,error:{message:'Sin conexión de prueba'}}}window.__aulaRows[table]=[payload];return {data:payload,error:null}},
   delete(){return query},single:async()=>({data:data()[0]||null,error:null})
  };return query
 }
};`;

Given('que hay un examen publicado y el usuario de pruebas tiene sesión',async function(){
  await this.page.route('**/aula-b2.html*',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="es"><body><button id="mockStart">Empezar</button><p id="mockDraftStatus"></p><p id="mockTimer"></p><form id="mockForm" hidden><div id="mockQuestions"></div><button type="submit">Entregar</button></form><button id="mockSaveRetry" hidden>Reintentar guardado</button><button id="mockDiscard" hidden>Descartar</button><div id="mockResult"></div><div id="mockHistory"></div></body></html>'}));
  await this.page.goto(BASE+'/aula-b2.html');
  await this.page.evaluate(()=>{
    window.__aulaWrites=[];window.__aulaRows=[];
    const rows=window.__aulaRows;
    const query={select(){return query},eq(){return query},order(){return query},limit(){return query},then(resolve,reject){return Promise.resolve({data:rows,error:null}).then(resolve,reject)},upsert:async(payload,opts)=>{window.__aulaWrites.push({payload,opts});if(window.__mockFailOnce){window.__mockFailOnce=false;return {data:null,error:{message:'Sin conexión de prueba'}}}const existing=rows.find(x=>x.usuario_id===payload.usuario_id&&x.intento_id===payload.intento_id);if(!existing)rows.push(payload);return {data:payload,error:null}}};
    window.EEAula={
      user:{id:'00000000-0000-4000-8000-000000000010'},db:{from:()=>query},
      $:id=>document.getElementById(id),check:()=>true,
      elt:(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el},
      makeQuestions:(target,bank,prefix)=>{target.replaceChildren();bank.forEach((q,i)=>{const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=q.q;field.append(legend);q.a.forEach((choice,j)=>{const label=document.createElement('label'),input=document.createElement('input');input.type='radio';input.name=prefix+i;input.value=String(j);label.append(input,document.createTextNode(choice));field.append(label)});target.append(field)})},
      feedback:(bank,answers,where)=>{const p=document.createElement('p');p.textContent='Correcciones disponibles';where.append(p)}
    };
  });
  await this.page.addScriptTag({url:BASE+'/assets/aula-simulacro.js'});
  await this.page.evaluate(()=>window.dispatchEvent(new Event('ee-aula-ready')));
  await this.page.locator('#mockStart').waitFor({state:'visible'});
});
When('entrega sus respuestas y reintenta por un error de conexión',async function(){
  await this.page.locator('#mockStart').click();
  await this.page.locator('#mockQuestions input[name="mock3"][value="2"]').check();
  await this.page.evaluate(()=>{window.__mockFailOnce=true});
  await this.page.locator('#mockForm button[type=submit]').click();
  await this.page.waitForFunction(()=>/No se pudo confirmar el guardado/.test(document.querySelector('#mockDraftStatus')?.textContent||''));
  this.attemptBefore=await this.page.evaluate(()=>JSON.parse(localStorage.getItem('ee-b2-mock-draft-v2:00000000-0000-4000-8000-000000000010')));
  await this.page.locator('#mockSaveRetry').click();
});
Then('la nota se guarda sin duplicar el intento',async function(){
  await this.page.locator('#mockResult').waitFor({state:'visible'});
  await this.page.waitForFunction(()=>/Resultado privado guardado/.test(document.querySelector('#mockResult')?.textContent||''));
  const state=await this.page.evaluate(()=>({writes:window.__aulaWrites,rows:window.__aulaRows}));
  assert.equal(state.writes.length,2);
  assert.equal(state.writes[0].payload.intento_id,this.attemptBefore.attemptId);
  assert.equal(state.writes[1].payload.intento_id,this.attemptBefore.attemptId);
  assert.equal(state.rows.length,1);
  assert.equal(state.rows[0].intento_id,this.attemptBefore.attemptId);
  assert.equal(await this.page.evaluate(()=>localStorage.getItem('ee-b2-mock-draft-v2:00000000-0000-4000-8000-000000000010')),null);
});

Given('que el alumno ha publicado un comentario de pruebas',async function(){
  await this.page.setContent('<!doctype html><html lang="es"><body><section id="comentarios" data-article-slug="cucumber-test"><h2>Comentarios</h2><div id="ee-comments-composer"></div><p id="ee-comments-count"></p><p id="ee-comments-status" role="status"></p><div id="ee-comments-list"></div></section></body></html>');
  await this.page.evaluate(()=>{
    window.__commentData=[
      {id:1,padre_id:null,autor_alias:'@otra',contenido:'Comentario inicial',creado_en:'2026-10-17T11:00:00Z',es_mio:false,eliminado:false},
      {id:2,padre_id:1,autor_alias:'Estudiante',contenido:'Comentario propio',creado_en:'2026-10-17T11:01:00Z',es_mio:true,eliminado:false},
      {id:3,padre_id:2,autor_alias:'@tercera',contenido:'Respuesta ajena que debe conservarse',creado_en:'2026-10-17T11:02:00Z',es_mio:false,eliminado:false}
    ];
    window.eeDb={
      auth:{getUser:async()=>({data:{user:{id:'user-test'}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
      rpc:async(name,args)=>{
        if(name==='listar_comentarios_articulo')return {data:window.__commentData,error:null};
        if(name==='eliminar_comentario_articulo'){
          const c=window.__commentData.find(x=>x.id===args.p_id);
          if(!c||!c.es_mio)return {data:false,error:{message:'No autorizado'}};
          c.eliminado=true;c.contenido='[Comentario eliminado]';return {data:true,error:null};
        }
        return {data:null,error:{message:'RPC inesperada: '+name}};
      }
    };
  });
  await this.page.addScriptTag({url:BASE+'/assets/comentarios-articulos.js'});
  await this.page.locator('#comentario-2').waitFor();
  this.page.once('dialog',dialog=>dialog.accept());
});
When('solicita eliminarlo',async function(){
  await this.page.locator('#comentario-2').getByRole('button',{name:'Eliminar'}).click();
  await this.page.locator('#ee-comments-status').waitFor();
});
Then('el comentario se oculta sin eliminar las respuestas ajenas',async function(){
  await this.page.waitForFunction(()=>document.querySelector('#comentario-2 .ee-comment-body')?.textContent==='[Comentario eliminado]');
  assert.equal(await this.page.locator('#comentario-3').innerText().then(t=>t.includes('Respuesta ajena que debe conservarse')),true);
  assert.equal(await this.page.locator('#comentario-3').count(),1);
});

Given('que el alumno ha votado una sugerencia',async function(){
  this.vote=null;this.voteCalls=[];
  await this.page.route('**/rest/v1/rpc/**',async route=>{
    const name=new URL(route.request().url()).pathname.split('/').pop();
    let body={};try{body=route.request().postDataJSON()}catch{}
    if(name==='listar_sugerencias'){
      return route.fulfill({status:200,json:[{id:7,titulo:'Mejorar biblioteca',descripcion:'Añadir filtros por nivel.',me_gusta:4+(this.vote===1?1:0),no_me_gusta:1+(this.vote===-1?1:0),mi_voto:this.vote}]});
    }
    if(name==='votar_sugerencia'){this.voteCalls.push(body);this.vote=body.p_voto;return route.fulfill({status:200,json:[]});}
    if(name==='enviar_sugerencia')return route.fulfill({status:200,json:8});
    return route.fulfill({status:404,json:{message:'RPC no permitida en pruebas'}});
  });
  await this.page.goto(BASE+'/sugerencias.html');
  await this.page.getByRole('heading',{name:'Mejorar biblioteca'}).waitFor();
});
When('modifica su voto',async function(){
  await this.page.locator('.suggestion-votes button').nth(1).click();
  await this.page.locator('.suggestion-votes button[aria-pressed="true"]').waitFor();
});
Then('se aplica su última elección una única vez',async function(){
  assert.equal(this.voteCalls.length,1);
  assert.equal(this.voteCalls[0].p_sugerencia_id,7);
  assert.equal(this.voteCalls[0].p_voto,-1);
  await this.page.locator('.suggestion-votes button').nth(1).waitFor();
  assert.equal(await this.page.locator('.suggestion-votes button').nth(1).getAttribute('aria-pressed'),'true');
});


const repasoFakeConfig = String.raw`window.__repasoCalls=[];
window.eeDb={
 auth:{
  getUser:async()=>({data:{user:{id:'user-cucumber',user_metadata:{review_default_topics:['Tiempos verbales']}}},error:null}),
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
 },
 from(table){
  const rows=table==='preguntas_falladas'?(window.__pendingRows||(window.__pendingRows=[
   {pregunta_id:101,veces_fallada:2,ultimo_fallo:'2026-11-19T10:00:00Z',proximo_repaso:null,preguntas:{id:101,orden:1,enunciado:'Choose the correct verb tense',opciones:['has gone','went'],fuente_url:'tenses-present',examen_id:2,examenes:{titulo:'Grammar test',lectura:null}}},
   {pregunta_id:102,veces_fallada:1,ultimo_fallo:'2026-11-19T09:00:00Z',proximo_repaso:null,preguntas:{id:102,orden:1,enunciado:'Choose the correct environment word',opciones:['pollution','chair'],fuente_url:'environment-vocabulary',examen_id:3,examenes:{titulo:'Vocabulary test',lectura:null}}}
  ])):[];
  const query={select(){return query},eq(){return query},order(){return query},limit(){return query},in(){return query},then(resolve,reject){return Promise.resolve({data:rows,error:null}).then(resolve,reject)},maybeSingle:async()=>({data:rows[0]||null,error:null}),insert:async payload=>{window.__repasoCalls.push({table,method:'insert',payload});return {data:payload,error:null}},upsert:async payload=>{window.__repasoCalls.push({table,method:'upsert',payload});return {data:payload,error:null}},delete(){return query}};
  return query;
 },
 rpc:async(name,args)=>{
  window.__repasoCalls.push({rpc:name,args});
  if(name==='entregar_repaso_fallos'){window.__pendingRows=[];return {data:{total:1,aciertos:1,correcciones:{'101':{correcta:true,respuesta_correcta:0,explicacion:'Respuesta correcta'}}},error:null};}
  return {data:null,error:{message:'RPC inesperada: '+name}};
 }
};`;

async function openRepasoIsolated(page){
  await page.route('**/supabase.min.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.route('**/supabase-config.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:repasoFakeConfig}));
  await page.route('**/assets/practicar-app.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.goto(BASE+'/examenes.html#cuaderno-fallos');
  await page.locator('#reviewStart').waitFor();
  await page.waitForFunction(()=>document.querySelector('#reviewPrivateContent')?.hidden===false);
  await page.waitForFunction(()=>document.querySelector('#reviewTopic')?.querySelectorAll('input').length>0);
}

Given('que el alumno ha iniciado sesión en una cuenta de pruebas',async function(){
  await openRepasoIsolated(this.page);
});
When('pide un examen de un tema pendiente',async function(){
  await this.page.locator('#reviewStart').click();
  await this.page.locator('#reviewForm .review-question').first().waitFor();
});
Then('recibe únicamente preguntas falladas de ese tema',async function(){
  const questions=await this.page.locator('#reviewForm .review-question legend').allTextContents();
  assert.deepEqual(questions,['1. Choose the correct verb tense']);
  const selected=await this.page.locator('#reviewTopic input:checked').evaluateAll(nodes=>nodes.map(n=>n.value));
  assert.deepEqual(selected,['Tiempos verbales']);
});

When('entrega un repaso de errores',async function(){
  await this.page.locator('#reviewStart').click();
  await this.page.locator('#reviewForm input[name="repaso-classic-101"][value="0"]').check();
  await this.page.locator('#reviewSubmit').click();
  await this.page.locator('#reviewSummary').waitFor({state:'visible'});
});
Then('la calificación histórica permanece intacta',async function(){
  await this.page.waitForFunction(()=>/1 \/ 1/.test(document.querySelector('#reviewSummary')?.textContent||''));
  const calls=await this.page.evaluate(()=>window.__repasoCalls);
  assert.equal(calls.filter(x=>x.rpc==='entregar_repaso_fallos').length,1);
  assert.equal(calls.some(x=>x.table==='resultados'&&['insert','upsert','update','delete'].includes(x.method)),false);
});


Given('que hay dos usuarios de pruebas',async function(){
  this.sender='00000000-0000-4000-8000-000000000021';
  this.recipient='00000000-0000-4000-8000-000000000022';
  this.outsider='00000000-0000-4000-8000-000000000023';
  this.messageConfig=String.raw`(()=>{
    const sender='00000000-0000-4000-8000-000000000021',recipient='00000000-0000-4000-8000-000000000022';
    const initial={messages:[],requests:[{id:1,remitente:sender,destinatario:recipient,mensaje_inicial:'Solicitud aceptada',estado:'aceptada',creado_en:'2026-11-20T10:00:00Z'}]};
    const read=()=>{try{return JSON.parse(localStorage.getItem('cucumber-private-messages')||'null')||initial}catch{return initial}};
    const save=data=>localStorage.setItem('cucumber-private-messages',JSON.stringify(data));
    const me=new URLSearchParams(location.search).get('as')||sender;
    window.eeDb={auth:{getUser:async()=>({data:{user:{id:me}},error:null})},
      from(table){
        const query={ids:[],select(){return query},order(){return query},limit(){return query},in(_field,ids){query.ids=ids;return query},
          then(resolve,reject){const data=read();let rows=[];
            if(table==='mensajes_privados')rows=data.messages.filter(x=>x.remitente===me||x.destinatario===me);
            if(table==='solicitudes_mensaje')rows=data.requests.filter(x=>x.remitente===me||x.destinatario===me);
            if(table==='perfiles_publicos')rows=[{usuario_id:sender,alias:'emisor'},{usuario_id:recipient,alias:'destinatario'}].filter(x=>query.ids.includes(x.usuario_id));
            return Promise.resolve({data:rows,error:null}).then(resolve,reject)},
          insert:async payload=>{const data=read();data.messages.push({...payload,id:data.messages.length+1,creado_en:new Date().toISOString()});save(data);return {data:payload,error:null}}
        };return query
      }
    };
  })();`;
  await this.page.route('**/mensajes.html*',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="es"><body><p id="msgStatus"></p><div id="requests"></div><button id="reload" type="button">Actualizar</button><div id="contacts"></div><h2 id="chatTitle"></h2><div id="thread"></div><form id="composer"><textarea id="messageText" required></textarea><button id="sendMessage" type="submit">Enviar</button></form></body></html>'}));
  await loadMessagesAs(this.page,BASE+'/mensajes.html?as='+this.sender+'&con='+this.recipient,this.messageConfig);
});

When('uno crea un mensaje privado',async function(){
  await this.page.locator('#messageText').fill('Mensaje privado de Cucumber');
  await this.page.locator('#sendMessage').click();
  await this.page.waitForFunction(()=>document.querySelector('#thread')?.textContent.includes('Mensaje privado de Cucumber'));
});
Then('únicamente el destinatario autorizado puede leerlo',async function(){
  await loadMessagesAs(this.page,BASE+'/mensajes.html?as='+this.recipient+'&con='+this.sender,this.messageConfig);
  await this.page.waitForFunction(()=>document.querySelector('#thread')?.textContent.includes('Mensaje privado de Cucumber'));
  assert.equal(await this.page.locator('#thread').innerText().then(t=>t.includes('Mensaje privado de Cucumber')),true);
  await loadMessagesAs(this.page,BASE+'/mensajes.html?as='+this.outsider+'&con='+this.sender,this.messageConfig);
  assert.equal(await this.page.locator('#thread').innerText().then(t=>t.includes('Mensaje privado de Cucumber')),false);
});



Given('que el alumno tiene actividades de selección y respuesta abierta',async function(){
  const config=String.raw`window.__activityCalls=[];
  window.eeDb={
    auth:{getUser:async()=>({data:{user:{id:'user-activity-cucumber'}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
    from(table){
      const query={select(){return query},eq(){return query},order(){return query},limit(){return query},then(resolve,reject){
        let data=[];
        if(table==='actividades')data=[{id:91,slug:'cucumber-modalidades',titulo:'Actividad de prueba',descripcion:'Selección y respuesta abierta',destreza:'grammar',unidad_id:null,orden:1}];
        if(table==='actividad_preguntas')data=[
          {id:201,orden:1,tipo:'seleccion',enunciado:'Choose the correct answer',configuracion:{opciones:['wrong','right']}},
          {id:202,orden:2,tipo:'texto_corto',enunciado:'Write a short answer',configuracion:{}}
        ];
        return Promise.resolve({data,error:null}).then(resolve,reject)
      }};
      return query
    },
    rpc:async(name,args)=>{
      window.__activityCalls.push({name,args});
      if(name==='entregar_actividad')return {data:{aciertos:1,evaluables:1,pendientes_revision:1,detalle:{
        '201':{estado:'correcta',solucion:1,explicacion:'Respuesta correcta'},
        '202':{estado:'revision',solucion:null,explicacion:'Pendiente de revisión'}
      }},error:null};
      return {data:null,error:{message:'RPC inesperada: '+name}}
    }
  };`;
  await this.page.route('**/supabase.min.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await this.page.route('**/supabase-config.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:config}));
  await this.page.goto(BASE+'/actividades.html');
  await this.page.getByRole('button',{name:'Empezar →'}).waitFor();
});
When('completa y entrega ambas modalidades',async function(){
  await this.page.getByRole('button',{name:'Empezar →'}).click();
  await this.page.locator('#activity-q-201 input[name="act-201"][value="1"]').check();
  await this.page.locator('#activity-q-202 input[name="act-202"]').fill('A clear open answer');
  await this.page.locator('#activitySubmit').click();
  await this.page.locator('#activitySummary').waitFor({state:'visible'});
});
Then('las respuestas se corrigen y se guarda el progreso',async function(){
  await this.page.waitForFunction(()=>document.querySelector('#activitySessionStatus')?.textContent.includes('Intento registrado'));
  const call=await this.page.evaluate(()=>window.__activityCalls.find(x=>x.name==='entregar_actividad'));
  assert.ok(call);
  assert.equal(call.args.p_actividad_id,91);
  assert.equal(call.args.p_respuestas['201'],1);
  assert.equal(call.args.p_respuestas['202'],'A clear open answer');
  assert.ok(call.args.p_intento_id);
  assert.match(await this.page.locator('#activitySummary').innerText(),/1 de 1 autocorregibles correctas/);
  assert.match(await this.page.locator('#activitySummary').innerText(),/pendiente\(s\) de revisión/);
});


Given('que el alumno tiene preguntas falladas',async function(){
  await openRepasoIsolated(this.page);
});
When('supera una tanda de repaso',async function(){
  await this.page.locator('#reviewStart').click();
  await this.page.locator('#reviewForm input[name="repaso-classic-101"][value="0"]').check();
  await this.page.locator('#reviewSubmit').click();
  await this.page.locator('#reviewSummary').waitFor({state:'visible'});
  await this.page.waitForFunction(()=>/1 \/ 1/.test(document.querySelector('#reviewSummary')?.textContent||''));
});
Then('las preguntas acertadas dejan de estar pendientes',async function(){
  await this.page.waitForFunction(()=>document.querySelector('#reviewStats')?.textContent.includes('0Errores pendientes'));
  assert.equal(await this.page.locator('#reviewStats .review-stat strong').first().innerText(),'0');
  assert.match(await this.page.locator('#reviewStatus').innerText(),/No tienes errores pendientes/);
});


function profileFakeConfig(){
 return String.raw`(()=>{
  const user={id:'00000000-0000-4000-8000-000000000031',email:'cucumber-profile@example.invalid',user_metadata:{},app_metadata:{}};
  const mode=new URLSearchParams(location.hash.slice(1)).get('cucumberMode')||'login';
  let session=mode==='dashboard'?{user}:(()=>{try{return JSON.parse(localStorage.getItem('cucumber-profile-session')||'null')}catch{return null}})(),listener=null;
  const now=Date.now();
  const tables={
    resultados:[
      {id:1,usuario_id:user.id,examen_id:11,aciertos:8,total:10,nota:80,fecha:new Date(now-86400000).toISOString(),respuestas:{}},
      {id:2,usuario_id:user.id,examen_id:11,aciertos:9,total:10,nota:90,fecha:new Date(now-3600000).toISOString(),respuestas:{}}
    ],
    examenes:[{id:11,titulo:'Examen de prueba',fecha:new Date(now).toISOString()}],
    actividad_intentos:[{id:1,usuario_id:user.id,actividad_id:21,aciertos:3,evaluables:3,pendientes_revision:0,fecha:new Date(now-1800000).toISOString()}],
    actividades:[{id:21,titulo:'Actividad de prueba',slug:'actividad-prueba'}]
  };
  window.eeDb={
    auth:{
      getSession:async()=>({data:{session},error:null}),
      getUser:async()=>({data:{user:session?.user||null},error:null}),
      onAuthStateChange:cb=>{listener=cb;return {data:{subscription:{unsubscribe(){listener=null}}}}},
      signInWithPassword:async({email,password})=>{if(email!==user.email||password!=='Cucumber-Login-123!')return {data:{user:null},error:{message:'Invalid login credentials'}};session={user};localStorage.setItem('cucumber-profile-session',JSON.stringify(session));listener?.('SIGNED_IN',session);return {data:{user,session},error:null}},
      signOut:async()=>{session=null;localStorage.removeItem('cucumber-profile-session');listener?.('SIGNED_OUT',null);return {error:null}}
    },
    from(table){
      const query={filters:[],select(){return query},eq(field,value){query.filters.push([field,value]);return query},gte(field,value){query.filters.push([field,value]);return query},in(field,values){query.filters.push([field,values]);return query},order(){return query},limit(){return query},range(){return query},
        rows(){let rows=tables[table]||[];for(const [field,value] of query.filters){rows=rows.filter(row=>Array.isArray(value)?value.includes(row[field]):row[field]===value)}return rows},
        then(resolve,reject){const rows=query.rows();return Promise.resolve({data:rows,error:null,count:rows.length}).then(resolve,reject)},
        maybeSingle:async()=>({data:query.rows()[0]||null,error:null}),
        single:async()=>({data:query.rows()[0]||null,error:null}),
        upsert:async()=>({data:null,error:null}),insert:async()=>({data:null,error:null}),delete(){return query}
      };return query
    },
    rpc:async(name)=>name==='racha_actual'?{data:[{racha:2,mejor_racha:3,dias_total:5,hoy_completado:true}],error:null}:{data:[],error:null}
  };
 })();`;
}

Given('que existe un usuario de pruebas',async function(){
  await this.page.route('**/supabase.min.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await this.page.route('**/supabase-config.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:profileFakeConfig()}));
  await this.page.route('**/functions/v1/email-bienvenida',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({sent:true})}));
  await this.page.goto(BASE+'/login.html?next=%2Fperfil.html');
});
When('inicia sesión y después la cierra',async function(){
  await this.page.locator('#loginEmail').fill('cucumber-profile@example.invalid');
  await this.page.locator('#loginPassword').fill('Cucumber-Login-123!');
  await this.page.locator('#loginSubmit').click();
  await this.page.waitForURL('**/perfil.html');
  await this.page.locator('#privateDashboard').waitFor({state:'visible'});
  await this.page.locator('#signout').click();
  await this.page.waitForFunction(()=>document.querySelector('#privateDashboard')?.hidden===true);
});
Then('desaparecen las estadísticas privadas',async function(){
  assert.equal(await this.page.locator('#privateDashboard').isHidden(),true);
  assert.equal(await this.page.locator('#authLayout').isVisible(),true);
  assert.equal(await this.page.locator('#signout').isHidden(),true);
});

Given('que el alumno tiene exámenes y actividad guardados',async function(){
  await this.page.route('**/supabase.min.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await this.page.route('**/supabase-config.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:profileFakeConfig()}));
  await this.page.goto(BASE+'/perfil.html#cucumberMode=dashboard');
  await this.page.locator('#privateDashboard').waitFor({state:'visible'});
});
When('consulta su perfil',async function(){
  await this.page.waitForFunction(()=>document.querySelector('#examCount')?.textContent==='2'&&document.querySelector('#learningActivities')?.textContent==='1');
});
Then('los gráficos coinciden con sus resultados reales',async function(){
  assert.equal(await this.page.locator('#examCount').innerText(),'2');
  assert.equal(await this.page.locator('#bestScore').innerText(),'90.0%');
  assert.equal(await this.page.locator('#averageScore').innerText(),'85.0%');
  assert.equal(await this.page.locator('#learningActivities').textContent(),'1');
  assert.equal(await this.page.locator('#learningStrengths .skill-trend-bar').count(),2);
  assert.match(await this.page.locator('#learningStrengths').innerText(),/17 respuestas correctas de 20/);
});


Given('que el alumno ha completado un examen en una cuenta de pruebas',async function(){
  const config=String.raw`window.__examCalls=[];
  window.eeDb={
    auth:{getUser:async()=>({data:{user:{id:'user-exam-cucumber'}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
    from(table){
      const query={filters:[],select(){return query},eq(field,value){query.filters.push([field,value]);return query},order(){return query},limit(){return query},
        rows(){let rows=[];if(table==='examenes')rows=[{id:31,titulo:'Examen PDF de prueba',fecha:'2026-11-20',nivel:'B2',publicado:true,lectura:null}];if(table==='preguntas')rows=[
          {id:301,examen_id:31,orden:1,enunciado:'Choose the correct answer',opciones:['First option','Second option'],fuente_url:'tenses-present'},
          {id:302,examen_id:31,orden:2,enunciado:'Choose another answer',opciones:['Third option','Fourth option'],fuente_url:'conditionals'}
        ];return rows.filter(row=>query.filters.every(([field,value])=>row[field]===value))},
        then(resolve,reject){const data=query.rows();return Promise.resolve({data,error:null}).then(resolve,reject)},
        maybeSingle:async()=>({data:query.rows()[0]||null,error:null})
      };return query
    },
    rpc:async(name,args)=>{
      window.__examCalls.push({name,args});
      if(name==='entregar_examen_idempotente')return {data:{resultado_id:'resultado-cucumber-pdf'},error:null};
      if(name==='ver_correccion')return {data:[
        {pregunta_id:301,respuesta_correcta:0,explicacion:'La primera opción es correcta.'},
        {pregunta_id:302,respuesta_correcta:1,explicacion:'La cuarta opción es correcta.'}
      ],error:null};
      return {data:null,error:{message:'RPC inesperada: '+name}};
    }
  };`;
  await this.page.route('**/supabase.min.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await this.page.route('**/supabase-config.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:config}));
  await this.page.goto(BASE+'/examenes.html');
  await this.page.locator('#examPicker').waitFor({state:'visible'});
  await this.page.waitForFunction(()=>[...document.querySelectorAll('#examlist option')].some(option=>option.textContent.includes('Examen PDF de prueba')));
  await this.page.locator('#examlist').selectOption('31');
  await this.page.locator('#load').click();
  await this.page.locator('#exam input[name="question-301"][value="0"]').waitFor();
  await this.page.locator('#exam input[name="question-301"][value="1"]').check();
  await this.page.locator('#exam input[name="question-302"][value="1"]').check();
  await this.page.locator('#exam button[type="submit"]').click();
  await this.page.locator('.exam-report-pdf-button').waitFor({state:'visible'});
});
When('exporta el informe a PDF',async function(){
  this.pdfPopup=this.page.waitForEvent('popup');
  await this.page.locator('.exam-report-pdf-button').click();
  this.pdfPage=await this.pdfPopup;
  await this.pdfPage.waitForFunction(()=>document.body?.textContent.includes('Tu informe personalizado'));
});
Then('el PDF contiene resultados y no crea páginas vacías',async function(){
  const body=await this.pdfPage.locator('body').innerText();
  assert.match(body,/Tu informe personalizado/);
  assert.match(body,/50,0%|50.0%|Nota: 5,0/);
  assert.match(body,/La primera opción es correcta/);
  assert.ok(await this.pdfPage.locator('.exam-report-chart').count()>0);
  assert.equal(await this.pdfPage.locator('.exam-report-error').evaluateAll(nodes=>nodes.every(node=>node.textContent.trim().length>0)),true);
  assert.equal(await this.pdfPage.locator('button,a').count(),0);
  const pdfBuffer=await this.pdfPage.pdf({format:'A4',printBackground:true});
  const pdfSource=pdfBuffer.toString('latin1');
  assert.ok(pdfSource.startsWith('%PDF-'),'La exportación no ha generado un PDF válido.');
  const pageCount=(pdfSource.match(/\\/Type\\s*\\/Page\\b/g)||[]).length;
  assert.ok(pageCount>=1&&pageCount<=2,'El informe ha generado un número inesperado de páginas: '+pageCount);
});
