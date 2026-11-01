'use strict';
const { test, expect } = require('@playwright/test');

test('Perfil carga estilos compartidos y permite acceder al vocabulario desde Recursos', async ({ page }) => {
  await page.goto('/perfil.html');
  await expect(page.locator('link[href*="assets/perfil.css"]')).toHaveCount(1);
  await expect(page.locator('link[href*="assets/perfil-reading.css"]')).toHaveCount(1);
  await expect(page.locator('script[src*="assets/perfil.js"]')).toHaveCount(1);
  await expect(page.locator('main .hero-actions a[href="/mi-vocabulario.html"]')).toBeVisible();
  await expect(page.locator('#privateDashboard')).toBeHidden();
  await expect(page.locator('#ee-shared-header .ee-more-panel a[href="/mi-vocabulario.html"]')).toHaveCount(1);
});

test('Artículos con CSS propio adoptan la plantilla editorial unificada', async ({ page }) => {
  await page.goto('/leer.html?slug=present-perfect-vs-past-simple');
  await expect(page.locator('body.ee-unified-article')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('main h1').first()).toContainText('Present Perfect');
  await expect(page.locator('link[href*="article-unified.css"]')).toHaveCount(1);
  await expect(page.locator('#ee-shared-header')).toHaveCount(1);
  await expect(page.locator('#ee-shared-header .ee-more-panel a[href="/mi-vocabulario.html"]')).toHaveCount(1);
  const background = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  // Comprobar un fondo claro legible; no atarse a una tonalidad exacta del tema.
  const channels=background.match(/\d+/g).slice(0,3).map(Number);
  expect(channels.every(value=>value>=235)).toBe(true);
});

test('Artículos sin CSS propio tienen jerarquía, tablas legibles y ancho responsivo', async ({ page }) => {
  const html='<html lang="es"><head><title>Present and Past Tenses</title></head><body><main><h1>Present and Past Tenses</h1><table><tr><th>Tiempo</th><td>Present</td></tr></table></main></body></html>';
  await page.route('**/rest/v1/articulos?**', async route=>{
    const select=new URL(route.request().url()).searchParams.get('select')||'';
    const row={html,titulo:'Present and Past Tenses',descripcion:'Prueba de tabla'};
    await route.fulfill({status:200,json:[Object.fromEntries(Object.entries(row).filter(([key])=>select.split(',').includes(key)))],headers:{'access-control-allow-origin':'*'}});
  });
  await page.goto('/leer.html?slug=revision-present-past-tenses-20-respuestas-explicadas');
  await expect(page.locator('body.ee-unified-article')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('main h1').first()).toContainText('Present and Past Tenses');
  await expect(page.locator('main table')).toHaveCount(1);
  const width = await page.locator('main').evaluate(el => el.getBoundingClientRect().width);
  const viewport = page.viewportSize().width;
  expect(width).toBeLessThanOrEqual(viewport);
  await expect(page.locator('main table th').first()).toBeVisible();
});

test('El menú móvil despliega Recursos con acceso a Mi vocabulario', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Solo aplica al menú móvil');
  await page.goto('/perfil.html');
  const toggle = page.locator('#ee-shared-header .ee-nav-toggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#ee-shared-header .ee-nav')).toBeVisible();
  const resources=page.locator('#ee-shared-header .ee-more > summary');
  await resources.click();
  await expect(page.locator('#ee-shared-header .ee-more-panel a[href="/mi-vocabulario.html"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#ee-shared-header .ee-nav')).toBeHidden();
});
