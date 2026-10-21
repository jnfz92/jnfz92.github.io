const { test, expect } = require('@playwright/test');

const WEBSITE = process.env.EE_PRACTICAR_URL || 'https://jnfz92.github.io/practicar.html';
const fakeSupabase = String.raw`
(() => {
  const question = {id:301, orden:1, enunciado:'Choose the correct answer: I ___ English.',
    opciones:['study','studies','studying'], fuente_url:null, examen_id:17,
    examenes:{titulo:'Examen de prueba',lectura:null}};
  const state = {user:null, listeners:[], calls:[]};
  window.__e2e = {
    state,
    signIn(){state.user={id:'playwright-test-user',email:'playwright@example.test'};state.listeners.forEach(f=>f('SIGNED_IN',{session:{user:state.user}}));},
    signOut(){state.user=null;state.listeners.forEach(f=>f('SIGNED_OUT',{session:null}));}
  };
  function query(table){
    let rowId=null;
    const q={
      select(){return this;},
      eq(key,value){if(key==='id')rowId=value;return this;},
      order(){return this;},
      limit(){return Promise.resolve(values());},
      maybeSingle(){return Promise.resolve({data:{lectura:null},error:null});},
      then(resolve,reject){return Promise.resolve(values()).then(resolve,reject);}
    };
    function values(){
      state.calls.push(table);
      if(table==='examenes')return {data:[{id:17,titulo:'Examen de prueba',nivel:'B1',fecha:'2026-10-21'}],error:null};
      if(table==='preguntas')return {data:[question],error:null};
      if(table==='resultados')return {data:[],error:null};
      if(table==='preguntas_falladas')return {data:[{
        pregunta_id:301,veces_fallada:3,ultimo_fallo:'2026-10-19T10:00:00Z',
        proximo_repaso:'2026-10-19T10:00:00Z',preguntas:question
      }],error:null};
      if(table==='actividad_fallos')return {data:[],error:null};
      return {data:[],error:null};
    }
    return q;
  }
  window.supabase={createClient(){return {
    auth:{
      getUser:async()=>({data:{user:state.user},error:null}),
      onAuthStateChange(fn){
        state.listeners.push(fn);setTimeout(()=>fn('INITIAL_SESSION',{session:state.user?{user:state.user}:null}),0);
        return {data:{subscription:{unsubscribe(){}}}};
      },
      signInWithPassword:async()=>{window.__e2e.signIn();return {error:null};},
      signOut:async()=>{window.__e2e.signOut();return {error:null};},
      signUp:async()=>({data:{session:null},error:null})
    },
    from:query,
    rpc:async(name,args)=>{
      state.calls.push('rpc:'+name);
      if(name==='entregar_examen')return {data:{resultado_id:'10000000-0000-4000-8000-000000000001'},error:null};
      if(name==='ver_correccion')return {data:[{pregunta_id:301,respuesta_correcta:0,explicacion:'La forma correcta es study.'}],error:null};
      if(name==='entregar_repaso_fallos')return {data:{
        aciertos:1,total:1,correcciones:{'301':{respuesta_correcta:0,explicacion:'Study es correcto.',correcta:true}}
      },error:null};
      if(name==='entregar_repaso_actividades')return {data:{aciertos:0,total:0,correcciones:{}},error:null};
      return {data:null,error:{message:'Unexpected mock RPC '+name}};
    }
  };}};
})();
`;

test.beforeEach(async ({ page }) => {
  await page.route(/supabase\.min\.js/, route =>
    route.fulfill({status:200, contentType:'application/javascript',body:fakeSupabase}));
});

test('invitado: muestra acceso, pero oculta exámenes, fallos e historial', async ({ page }, testInfo) => {
  const jsErrors=[];
  page.on('pageerror', e=>jsErrors.push(e.message));
  await page.goto(WEBSITE + '?e2e=guest#cuaderno-fallos', {waitUntil:'domcontentloaded'});
  await expect(page.locator('#login')).toBeVisible();
  await expect(page.locator('#examsLoginHint')).toBeVisible();
  await expect(page.locator('#reviewLoginHint')).toBeVisible();
  await expect(page.locator('#examPicker')).toBeHidden();
  await expect(page.locator('#reviewPrivateContent')).toBeHidden();
  await expect(page.locator('#examHistoryPanel')).toBeHidden();
  await expect(page.locator('#cuaderno-fallos')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Elige tu próximo reto'})).toBeHidden();
  await page.screenshot({path:testInfo.outputPath('invitado.png'),fullPage:true});
  expect(jsErrors).toEqual([]);
});

test('usuario: iniciar sesión, elegir examen, corregir, repasar fallos, salir', async ({ page }, testInfo) => {
  const jsErrors=[];
  page.on('pageerror', e=>jsErrors.push(e.message));
  await page.goto(WEBSITE + '?e2e=auth', {waitUntil:'domcontentloaded'});
  await page.locator('#email').fill('playwright@example.test');
  await page.locator('#password').fill('test-password');
  await page.locator('#login button').first().click();

  await expect(page.locator('#connected')).toBeVisible();
  await expect(page.locator('#examPicker')).toBeVisible();
  await expect(page.locator('#examHistoryPanel')).toBeVisible();
  await expect(page.locator('#reviewPrivateContent')).toBeVisible();
  await expect(page.locator('#examsLoginHint')).toBeHidden();
  await expect(page.locator('#reviewLoginHint')).toBeHidden();

  await expect(page.locator('#examCards .exam-choice')).toHaveCount(1);
  await page.locator('#load').click();
  await expect(page.locator('#exam fieldset')).toHaveCount(1);
  await page.locator('#exam input[type=radio][value="0"]').check();
  await page.locator('#exam button[type=submit]').click();
  await expect(page.locator('#scoreSummary')).toBeVisible();

  await page.locator('#reviewStart').click();
  await expect(page.locator('#reviewForm fieldset')).toHaveCount(1);
  await page.locator('#reviewForm input[type=radio][value="0"]').check();
  await page.locator('#reviewSubmit').click();
  await expect(page.locator('#reviewSummary')).toBeVisible();
  await expect(page.locator('#reviewPrivateContent')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('usuario-con-repaso.png'),fullPage:true});

  await page.locator('#logout').click();
  await expect(page.locator('#examPicker')).toBeHidden();
  await expect(page.locator('#examHistoryPanel')).toBeHidden();
  await expect(page.locator('#reviewPrivateContent')).toBeHidden();
  await expect(page.locator('#reviewLoginHint')).toBeVisible();
  await expect(page.locator('#exam fieldset')).toHaveCount(0);
  expect(jsErrors).toEqual([]);
});

test('acceso directo a examen no permite iniciar sin sesión', async ({ page })=>{
  await page.goto(WEBSITE+'?examen=17&e2e=guest', {waitUntil:'domcontentloaded'});
  await expect(page.locator('#examPicker')).toBeHidden();
  await expect(page.locator('#exam fieldset')).toHaveCount(0);
  const result=await page.evaluate(()=>window.__e2e.state.calls);
  expect(result).not.toContain('preguntas');
});

test('diseño adaptable: sin desbordamiento horizontal', async ({page},testInfo)=>{
  await page.goto(WEBSITE+'?e2e=mobile', {waitUntil:'domcontentloaded'});
  await expect(page.locator('.exam-hero')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('vista-general.png'),fullPage:true});
  const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.width+2);
  const button=page.locator('#ee-shared-header .ee-nav-toggle');
  if(await button.isVisible()){
    await button.click();
    await expect(page.locator('#ee-shared-header')).toHaveClass(/ee-menu-open/);
    await button.click();
    await expect(page.locator('#ee-shared-header')).not.toHaveClass(/ee-menu-open/);
  }
});
