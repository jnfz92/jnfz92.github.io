const {Before,After,Given,When,Then,setDefaultTimeout}=require('@cucumber/cucumber');
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
setDefaultTimeout(35000);
const BASE=process.env.EASY_ENGLISH_URL||'https://jnfz92.github.io';
Before({tags:'@publico'},async function(){
 this.browser=await chromium.launch({headless:true});
 this.page=await this.browser.newPage({viewport:{width:1280,height:800}});
});
After(async function(){await this.page?.close();await this.browser?.close()});
Given('que abro la página {string}',async function(path){this.response=await this.page.goto(BASE+path,{waitUntil:'domcontentloaded'})});
Then('la página responde con HTTP 200',function(){assert.equal(this.response.status(),200)});
Given('que navego a {string}',async function(path){this.response=await this.page.goto(BASE+path,{waitUntil:'domcontentloaded'})});
Then('aparece al menos un enlace a un artículo de lectura',async function(){
 await this.page.locator('a[href*="leer.html?slug="]').first().waitFor({timeout:20000});
 assert.ok(await this.page.locator('a[href*="leer.html?slug="]').count()>0);
});
Then('el artículo muestra un título principal',async function(){
 await this.page.locator('main h1').first().waitFor({timeout:20000});
 assert.ok((await this.page.locator('main h1').first().innerText()).trim().length>5);
});
Then('encuentro el selector de exámenes',async function(){
 await this.page.locator('#examlist').waitFor({state:'attached'});
 await this.page.locator('#load').waitFor({state:'attached'});
});
Then('existe un formulario de autenticación del perfil',async function(){
 assert.ok(await this.page.locator('input[type="email"]').count()>0);
 assert.ok(await this.page.locator('input[type="password"]').count()>0);
});
