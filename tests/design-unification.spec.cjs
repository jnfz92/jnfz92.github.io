'use strict';
const { test, expect } = require('@playwright/test');

test('Perfil carga código modular y mantiene vocabulario dentro del perfil, nunca en el menú', async ({ page }) => {
  await page.goto('/perfil.html');
  await expect(page.locator('link[href*="assets/perfil.css"]')).toHaveCount(1);
  await expect(page.locator('link[href*="assets/perfil-reading.css"]')).toHaveCount(1);
  await expect(page.locator('script[src*="assets/perfil.js"]')).toHaveCount(1);
  await expect(page.locator('main .hero-actions a[href="/mi-vocabulario.html"]')).toBeVisible();
  await expect(page.locator('#privateDashboard')).toBeHidden();
  await expect(page.locator('#ee-shared-header a[href="/mi-vocabulario.html"]')).toHaveCount(0);
});

test('Artículos con CSS propio adoptan la plantilla editorial unificada', async ({ page }) => {
  await page.goto('/leer.html?slug=present-perfect-vs-past-simple');
  await expect(page.locator('body.ee-unified-article')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('main h1').first()).toContainText('Present Perfect');
  await expect(page.locator('link[href*="article-unified.css"]')).toHaveCount(1);
  await expect(page.locator('#ee-shared-header')).toHaveCount(1);
  await expect(page.locator('#ee-shared-header a[href="/mi-vocabulario.html"]')).toHaveCount(0);
  const background = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(background).toBe('rgb(245, 247, 241)');
});

test('Artículos sin CSS propio tienen jerarquía, tablas legibles y ancho responsivo', async ({ page }) => {
  await page.goto('/leer.html?slug=revision-present-past-tenses-20-respuestas-explicadas');
  await expect(page.locator('body.ee-unified-article')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('main h1').first()).toContainText('Present and Past Tenses');
  await expect(page.locator('main table')).toHaveCount(1);
  const width = await page.locator('main').evaluate(el => el.getBoundingClientRect().width);
  const viewport = page.viewportSize().width;
  expect(width).toBeLessThanOrEqual(viewport);
  await expect(page.locator('main table th').first()).toBeVisible();
});

test('El menú móvil se despliega y no incorpora Mi vocabulario', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Solo aplica al menú móvil');
  await page.goto('/perfil.html');
  const toggle = page.locator('#ee-shared-header .ee-nav-toggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#ee-shared-header .ee-nav')).toBeVisible();
  await expect(page.locator('#ee-shared-header a[href="/mi-vocabulario.html"]')).toHaveCount(0);
});
