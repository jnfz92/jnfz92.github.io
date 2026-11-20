'use strict';
const {Before,After,Given,When,Then,setDefaultTimeout}=require('@cucumber/cucumber');
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const BASE=process.env.EASY_ENGLISH_URL||'https://jnfz92.github.io';
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
  this.authCalls=[];
  await this.page.route('**/auth/v1/**',async route=>{
    const req=route.request();
    if(req.method()!=='POST')return route.continue();
    const pathname=new URL(req.url()).pathname;
    let body={};
    try{body=req.postDataJSON()}catch{}
    this.authCalls.push({pathname,body});
    if(pathname.endsWith('/signup')){
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
        user:{id:'c9b3a40d-7907-4d4f-9d9c-5b6fa09415b6',email:body.email,aud:'authenticated'},session:null
      })});
    }
    return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({msg:'Blocked in isolated Cucumber test'})});
  });
  await this.page.goto(BASE+'/perfil.html');
});
When('completo el registro',async function(){
  await this.page.locator('#registerEmail').fill(this.testEmail);
  await this.page.locator('#registerPass').fill('Cucumber-Test-123!');
  await this.page.locator('#registerConfirm').fill('Cucumber-Test-123!');
  await this.page.locator('#register').click();
});
Then('recibo confirmación y no se exponen credenciales',async function(){
  await this.page.locator('#accountStatus').waitFor({state:'visible'});
  await this.page.waitForFunction(()=>/confirmación|revisa tu correo/i.test(document.querySelector('#accountStatus')?.textContent||''));
  const signup=this.authCalls.filter(x=>x.pathname.endsWith('/signup'));
  assert.equal(signup.length,1);
  assert.equal(signup[0].body.email,this.testEmail);
  assert.equal(signup[0].body.password,'Cucumber-Test-123!');
  await this.page.locator('#registerPass').waitFor();
  assert.equal(await this.page.locator('#registerPass').inputValue(),'');
  assert.equal(await this.page.locator('#registerConfirm').inputValue(),'');
  assert.equal((await this.page.locator('body').innerText()).includes('Cucumber-Test-123!'),false);
  assert.equal(await this.page.locator('#privateDashboard').isHidden(),true);
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
  await this.page.route('**/supabase.min.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await this.page.route('**/supabase-config.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:aulaFakeConfig}));
  await this.page.goto(BASE+'/aula-b2.html');
  await this.page.locator('#aulaStatus').waitFor();
  await this.page.waitForFunction(()=>/Tu aula está conectada/.test(document.querySelector('#aulaStatus')?.textContent||''));
});
When('entrega sus respuestas y reintenta por un error de conexión',async function(){
  await this.page.locator('#mockStart').click();
  await this.page.locator('#mockQuestions input[name="mock3"][value="2"]').check();
  await this.page.evaluate(()=>{window.__mockFailOnce=true});
  await this.page.locator('#mockForm button[type=submit]').click();
  await this.page.waitForFunction(()=>/No se pudo confirmar/.test(document.querySelector('#mockDraftStatus')?.textContent||''));
  this.attemptBefore=await this.page.evaluate(()=>JSON.parse(localStorage.getItem('ee-b2-mock-draft-v2:00000000-0000-4000-8000-000000000010')));
  await this.page.reload();
  await this.page.locator('#mockSaveRetry').waitFor({state:'visible'});
  await this.page.locator('#mockSaveRetry').click();
});
Then('la nota se guarda sin duplicar el intento',async function(){
  await this.page.locator('#mockResult').waitFor({state:'visible'});
  await this.page.waitForFunction(()=>/Resultado privado guardado/.test(document.querySelector('#mockResult')?.textContent||''));
  const writes=await this.page.evaluate(()=>window.__aulaWrites.filter(x=>x.table==='simulacros_b2'));
  assert.equal(writes.length,1);
  assert.equal(writes[0].payload.intento_id,this.attemptBefore.attemptId);
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
  const rows=table==='preguntas_falladas'?[
   {pregunta_id:101,veces_fallada:2,ultimo_fallo:'2026-11-19T10:00:00Z',proximo_repaso:null,preguntas:{id:101,orden:1,enunciado:'Choose the correct verb tense',opciones:['has gone','went'],fuente_url:'tenses-present',examen_id:2,examenes:{titulo:'Grammar test',lectura:null}}},
   {pregunta_id:102,veces_fallada:1,ultimo_fallo:'2026-11-19T09:00:00Z',proximo_repaso:null,preguntas:{id:102,orden:1,enunciado:'Choose the correct environment word',opciones:['pollution','chair'],fuente_url:'environment-vocabulary',examen_id:3,examenes:{titulo:'Vocabulary test',lectura:null}}}
  ]:[];
  const query={select(){return query},eq(){return query},order(){return query},limit(){return query},in(){return query},then(resolve,reject){return Promise.resolve({data:rows,error:null}).then(resolve,reject)},maybeSingle:async()=>({data:rows[0]||null,error:null}),insert:async payload=>{window.__repasoCalls.push({table,method:'insert',payload});return {data:payload,error:null}},upsert:async payload=>{window.__repasoCalls.push({table,method:'upsert',payload});return {data:payload,error:null}},delete(){return query}};
  return query;
 },
 rpc:async(name,args)=>{
  window.__repasoCalls.push({rpc:name,args});
  if(name==='entregar_repaso_fallos')return {data:{total:1,aciertos:1,correcciones:{'101':{correcta:true,respuesta_correcta:0,explicacion:'Respuesta correcta'}}},error:null};
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
