'use strict';
const {test,expect}=require('@playwright/test');
const userId='00000000-0000-4000-8000-000000000010';
const fakeConfig="window.__aulaWrites=[];window.__aulaRows={};\nwindow.eeDb={\n auth:{getUser:async()=>({data:{user:{id:'00000000-0000-4000-8000-000000000010',app_metadata:{}}},error:null})},\n from(table){\n  function data(){return table==='unidades_curso'?[{slug:'test-b2-grammar',orden:1,titulo:'Grammar inicial',nivel:'Grammar',publicado:true},{slug:'test-b2-reading',orden:2,titulo:'Reading B2',nivel:'Reading',publicado:true}]:(window.__aulaRows[table]||[])}\n  const query={\n   select(){return query},eq(){return query},order(){return query},limit(){return query},in(){return query},\n   maybeSingle:async()=>({data:data()[0]||null,error:null}),\n   then(resolve,reject){return Promise.resolve({data:data(),error:null}).then(resolve,reject)},\n   insert:async payload=>{window.__aulaWrites.push({table,method:'insert',payload});(window.__aulaRows[table] ||= []).push(payload);return {data:payload,error:null}},\n   upsert:async payload=>{window.__aulaWrites.push({table,method:'upsert',payload});window.__aulaRows[table]=[payload];return {data:payload,error:null}},\n   delete(){return query},single:async()=>({data:data()[0]||null,error:null})\n  };return query\n }\n};";
test.beforeEach(async({page})=>{
 await page.route('**/supabase.min.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
 await page.route('**/supabase-config.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:fakeConfig}));
});
test('Diagnóstico, plan y sesión guardan en tablas privadas con la cuenta activa',async({page})=>{
 await page.goto('/aula-b2.html');
 await expect(page.locator('#aulaStatus')).toContainText('Tu aula está conectada');
 await page.locator('#startDiagnostic').click();
 await expect(page.locator('#diagnosticForm')).toBeVisible();
 for(let i=0;i<12;i++)await page.locator('input[name="diag'+i+'"][value="0"]').check();
 await page.locator('#diagnosticForm button[type="submit"]').click();
 await expect(page.locator('#diagnosticResult')).toContainText('Último diagnóstico:');
 await page.locator('#planPriority').selectOption('reading');
 await page.locator('#planMinutes').selectOption('45');
 await page.locator('#planForm button[type="submit"]').click();
 await expect(page.locator('#planStatus')).toContainText('guardado');
 await page.locator('#todayTasks input[type="checkbox"]').first().check();
 await expect(page.locator('#todayProgress')).toContainText('1 de');
 const writes=await page.evaluate(()=>window.__aulaWrites);
 expect(writes.find(w=>w.table==='diagnosticos_b2')).toMatchObject({method:'insert',payload:{usuario_id:userId,total:12}});
 expect(writes.find(w=>w.table==='planes_estudio_b2')).toMatchObject({method:'upsert',payload:{usuario_id:userId,prioridad:'reading',minutos_dia:45}});
 expect(writes.find(w=>w.table==='sesiones_estudio_b2')).toMatchObject({method:'insert',payload:{usuario_id:userId,tarea:'unidad'}});
});
test('No expone administración a un alumno ordinario',async({page})=>{
 await page.goto('/aula-b2.html');
 await expect(page.locator('#aulaStatus')).toContainText('Tu aula está conectada');
 await expect(page.locator('#adminLink')).toBeHidden();
});