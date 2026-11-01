'use strict';
const {test,expect}=require('@playwright/test');

test('Inicio recupera la última unidad sin mostrar datos privados',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('easyenglish-last-unit-v1',JSON.stringify({
      numero:7,titulo:'Comparativos B2',ruta:'/curso.html#unidad-07'
    }));
  });
  await page.goto('/index.html');
  await expect(page.locator('#continueUnitLink')).toHaveAttribute('href','/curso.html#unidad-07');
  await expect(page.locator('#continueDescription')).toContainText('Comparativos B2');
  await expect(page.locator('#ee-shared-header')).toHaveCount(1);
});

test('En todas las páginas se puede saltar al contenido con teclado',async({page})=>{
  for(const path of ['/index.html','/curso.html','/aula-b2.html','/perfil.html']){
    await page.goto(path);
    const skip=page.locator('.ee-skip-link');
    await expect(skip).toHaveCount(1);
    await expect(skip).toHaveAttribute('href','#contenido-principal');
    await expect(page.locator('main#contenido-principal')).toHaveCount(1);
  }
});

test('El lector conserva el mismo nodo de cabecera mientras carga una lección',async({page})=>{
  let release;
  const gate=new Promise(resolve=>release=resolve);
  await page.route('**/rest/v1/articulos?**',async route=>{
    const params=new URL(route.request().url()).searchParams;
    if(params.get('slug')){
      await gate;
      const item={titulo:'Lección B2 accesible',descripcion:'Una prueba de lección B2',
        html:'<!doctype html><html lang="es"><head><title>Lección B2</title></head><body><main><h1>Lección B2 accesible</h1><p>English practice</p><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="Primera"><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="Segunda"></main></body></html>'};
      return route.fulfill({status:200,json:[item],headers:{'access-control-allow-origin':'*'}})
    }
    return route.fulfill({status:200,json:[],headers:{'access-control-allow-origin':'*'}})
  });
  await page.goto('/leer.html?slug=test-lesson-b2',{waitUntil:'domcontentloaded'});
  await expect(page.locator('body > #ee-shared-header')).toHaveCount(1);
  await page.evaluate(()=>document.getElementById('ee-shared-header').dataset.preserve='yes');
  release();
  await expect(page.locator('main h1')).toContainText('Lección B2 accesible');
  await expect(page.locator('#ee-shared-header')).toHaveAttribute('data-preserve','yes');
  await expect(page.locator('main#contenido-principal')).toHaveCount(1);
  await expect(page.locator('main img').nth(1)).toHaveAttribute('loading','lazy');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',/leer\.html\?slug=test-lesson-b2/);
  await expect(page.locator('#ee-primary-navigation')).toHaveCount(1);
  await expect(page.locator('.ee-more-panel a[href="/articulos.html"]')).toHaveAttribute('aria-current','page');
});
