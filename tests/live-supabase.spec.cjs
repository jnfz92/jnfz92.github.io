const { test, expect } = require('@playwright/test');

test('Supabase público carga el catálogo real de artículos',async ({page})=>{
  await page.goto('/articulos.html');
  await expect.poll(async()=>page.locator('.blog .grid .card').count(),{timeout:20000}).toBeGreaterThanOrEqual(60);
  await expect(page.locator('.blog .grid a[href*="leer.html?slug="]').first()).toBeVisible();
  await expect(page.locator('.blog .grid a[href*="leer.html?slug=como-usar-tiempos-verbales-carta-email-writing-b1-b2"]')).toHaveCount(1);
});

test('el artículo real se abre desde Supabase y conserva la cabecera',async ({page})=>{
  await page.goto('/leer.html?slug=como-escribir-email-b2-first-fce');
  await expect(page.locator('main h1').first()).toContainText(/escribir.*email/i,{timeout:20000});
  await expect(page.locator('#ee-shared-header')).toHaveCount(1);
  await expect(page.getByText('No se pudo cargar este artículo desde Supabase')).toHaveCount(0);
});

test('sugerencias carga el listado público desde Supabase',async ({page})=>{
  await page.goto('/sugerencias.html');
  const status=page.locator('#suggestionListStatus');
  await expect(status).not.toHaveText('Cargando sugerencias…',{timeout:20000});
  await expect(status).toHaveAttribute('data-error','false');
  await expect.poll(()=>page.locator('.suggestion-item, .suggestion-empty').count()).toBeGreaterThan(0);
});

test('catálogo de exámenes, curso y actividades se sirven sin errores HTTP',async ({request})=>{
  for(const path of ['examenes.html','curso.html','actividades.html','practicar.html']){
    const r=await request.get('/'+path);
    expect(r.status(),path).toBe(200);
  }
});

test('los comentarios públicos se cargan dentro del artículo real',async ({page})=>{
  test.skip(process.env.GITHUB_EVENT_NAME==='pull_request','Disponible al publicarse en GitHub Pages');
  await page.goto('/leer.html?slug=50-verbos-irregulares-en-ingles');
  await expect(page.locator('#comentarios')).toBeVisible({timeout:25000});
  await expect(page.locator('#ee-comments-count')).toContainText('comentarios',{timeout:20000});
  await expect(page.locator('#ee-comments-composer')).toContainText('inicia sesión',{timeout:20000});
  await expect(page.locator('#ee-comments-status')).not.toHaveAttribute('data-error','true');
});
