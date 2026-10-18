const {test,expect}=require('@playwright/test');
const path=require('node:path');
const html=path.join(__dirname,'../newsletter.html');
const script=path.join(__dirname,'../assets/newsletter.js');
async function setup(page,{enabled=true,hash='',status=200}={}){
  const text=require('node:fs').readFileSync(html,'utf8');
  const body=text.slice(text.indexOf('<body'),text.indexOf('</body>')+7).replace(/\\{%[\\s\\S]*?%\\}/g,'');
  await page.route('https://jnfz92.github.io/newsletter.html**',route=>route.fulfill({
    status:200,contentType:'text/html',body:'<!doctype html><html>'+body+'</html>'
  }));
  await page.goto('https://jnfz92.github.io/newsletter.html'+hash);
  await page.route('https://wnluofonzteaqtlfshgy.supabase.co/functions/v1/newsletter',async route=>{
    const request=route.request(),data=request.method()==='POST'?
      JSON.parse(request.postData()||'{}'):{};
    if(request.method()==='GET')return route.fulfill({json:{enabled}});
    await page.evaluate(x=>window.__newsletterRequests.push(x),data);
    return route.fulfill({status,contentType:'application/json',
      body:JSON.stringify(status===200?{ok:true,message:'Comprueba tu correo'}:{error:'Servicio no disponible'})});
  });
  await page.evaluate(()=>{window.__newsletterRequests=[]});
  await page.addScriptTag({path:script});
}
test('newsletter sin proveedor no recoge emails',async ({page})=>{
  await setup(page,{enabled:false});
  await expect(page.locator('#newsletterPending')).toContainText('preparando');
  await expect(page.locator('#newsletterForm')).toBeHidden();
});
test('newsletter requiere consentimiento explícito para suscribirse',async ({page})=>{
  await setup(page);
  await expect(page.locator('#newsletterForm')).toBeVisible();
  await page.locator('#newsletterEmail').fill('persona@example.org');
  await page.locator('#newsletterSubmit').click();
  expect(await page.evaluate(()=>window.__newsletterRequests.length)).toBe(0);
  await page.locator('#newsletterConsent').check();
  await page.locator('#newsletterSubmit').click();
  await expect(page.locator('#newsletterStatus')).toContainText('Comprueba tu correo');
  const calls=await page.evaluate(()=>window.__newsletterRequests);
  expect(calls).toEqual([{action:'subscribe',email:'persona@example.org'}]);
});
test('confirmación siempre exige pulsar el botón',async ({page})=>{
  await setup(page,{hash:'#confirm=token-seguro'});
  await expect(page.locator('#newsletter-token-section')).toBeVisible();
  await expect(page.locator('#newsletter-subscription')).toBeHidden();
  expect(await page.evaluate(()=>window.__newsletterRequests.length)).toBe(0);
  await page.locator('#newsletterTokenButton').click();
  const calls=await page.evaluate(()=>window.__newsletterRequests);
  expect(calls).toEqual([{action:'confirm',token:'token-seguro'}]);
  await expect(page).toHaveURL('https://jnfz92.github.io/newsletter.html');
});
test('baja voluntaria siempre exige confirmación explícita',async ({page})=>{
  await setup(page,{hash:'#baja=12345678-1234-1234-1234-123456789abc.abcd1234'});
  await expect(page.locator('#newsletterTokenButton')).toHaveText('Darme de baja');
  expect(await page.evaluate(()=>window.__newsletterRequests.length)).toBe(0);
  await page.locator('#newsletterTokenButton').click();
  const calls=await page.evaluate(()=>window.__newsletterRequests);
  expect(calls).toEqual([{action:'unsubscribe',id:'12345678-1234-1234-1234-123456789abc',token:'abcd1234'}]);
});
