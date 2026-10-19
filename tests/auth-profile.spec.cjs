'use strict';
const { test, expect } = require('@playwright/test');

// Pruebas de autenticacion aisladas: NUNCA crean cuentas ni tokens reales.
// Se interceptan todos los POST de Supabase Auth antes de abrir perfil.html.
async function interceptWrites(page, replies = {}) {
  const requests = [];
  await page.route('**/auth/v1/**', async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() !== 'POST') return route.continue();
    const body = (() => { try { return req.postDataJSON(); } catch { return null; } })();
    requests.push({ path, body, method: req.method() });
    const response = replies[path] || { status: 400, body: { msg: 'Blocked in tests' } };
    await route.fulfill({
      status: response.status || 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
      body: JSON.stringify(response.body || {})
    });
  });
  return requests;
}
test('dos paneles separados: acceso izquierda y registro derecha; apilados en movil', async ({ page }) => {
  await interceptWrites(page);
  await page.goto('/perfil.html');
  const login = page.locator('#accountPanel');
  const register = page.locator('#registrationPanel');
  await expect(login).toBeVisible();
  await expect(register).toBeVisible();
  await expect(page.locator('#authForm')).toBeVisible();
  await expect(page.locator('#registerForm')).toBeVisible();
  await expect(page.locator('#privateDashboard')).toBeHidden();
  const boxes = await Promise.all([login.boundingBox(), register.boundingBox()]);
  expect(boxes[0]).toBeTruthy();
  expect(boxes[1]).toBeTruthy();
  const wide = (page.viewportSize()?.width || 0) > 740;
  if (wide) {
    expect(boxes[0].x + boxes[0].width).toBeLessThanOrEqual(boxes[1].x + 22);
    expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(12);
  } else {
    expect(boxes[0].y + boxes[0].height).toBeLessThanOrEqual(boxes[1].y + 24);
  }
  await expect(page.locator('#authPass')).toHaveAttribute('autocomplete', 'current-password');
  await expect(page.locator('#registerPass')).toHaveAttribute('autocomplete', 'new-password');
  await expect(page.locator('#registerConfirm')).toHaveAttribute('autocomplete', 'new-password');
});
test('registro: contrasenas distintas se rechazan localmente y no llama a Supabase', async ({ page }) => {
  const calls = await interceptWrites(page);
  await page.goto('/perfil.html');
  await page.locator('#registerEmail').fill('prueba-e2e@example.invalid');
  await page.locator('#registerPass').fill('Password123!');
  await page.locator('#registerConfirm').fill('Diferente123!');
  await page.locator('#register').click();
  await expect(page.locator('#registerConfirm')).toHaveJSProperty('validationMessage', 'Las contraseñas no coinciden.');
  expect(calls.filter(c => c.path.endsWith('/signup'))).toHaveLength(0);
  await expect(page.locator('#registrationPanel')).toBeVisible();
});
test('registro confirmado por correo: solicitud simulada, password nunca se muestra ni persiste', async ({ page }) => {
  const calls = await interceptWrites(page, {
    '/auth/v1/signup': { status: 200, body: { user: { id: 'c9b3a40d-7907-4d4f-9d9c-5b6fa09415b6', email: 'prueba-e2e@example.invalid', aud: 'authenticated' }, session: null } }
  });
  await page.goto('/perfil.html');
  await page.locator('#registerEmail').fill('  PRUEBA-E2E@EXAMPLE.INVALID '.trim());
  await page.locator('#registerPass').fill('Password123!');
  await page.locator('#registerConfirm').fill('Password123!');
  await page.locator('#register').click();
  await expect(page.locator('#accountStatus')).toContainText(/confirmación|revisa tu correo/i);
  const attempts = calls.filter(c => c.path === '/auth/v1/signup');
  expect(attempts).toHaveLength(1);
  expect(attempts[0].body.email).toBe('prueba-e2e@example.invalid');
  expect(attempts[0].body.password).toBe('Password123!');
  await expect(page.locator('#registerPass')).toBeEmpty();
  await expect(page.locator('#registerConfirm')).toBeEmpty();
  await expect(page.locator('#privateDashboard')).toBeHidden();
  expect(await page.locator('body').innerText()).not.toContain('Password123!');
});
test('login erroneo: estado de error y boton reactivado sin filtrar contrasena', async ({ page }) => {
  const calls = await interceptWrites(page, {
    '/auth/v1/token': { status: 400, body: { error: 'invalid_credentials', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' } }
  });
  await page.goto('/perfil.html');
  await page.locator('#authEmail').fill('alguien@example.invalid');
  await page.locator('#authPass').fill('Password123!');
  await page.locator('#loginSubmit').click();
  await expect(page.locator('#accountStatus')).toContainText(/no se pudo iniciar sesión|contraseña incorrectos/i);
  await expect(page.locator('#loginSubmit')).toBeEnabled();
  await expect(page.locator('#authPass')).toBeEmpty();
  expect(calls.filter(c => c.path === '/auth/v1/token')).toHaveLength(1);
  await expect(page.locator('#privateDashboard')).toBeHidden();
});
test('enlace para recuperar la contrasena: envio simulado, sin crear cuenta', async ({ page }) => {
  const calls = await interceptWrites(page, {
    '/auth/v1/recover': { status: 200, body: {} }
  });
  await page.goto('/perfil.html');
  await page.locator('#forgotPassword').click();
  await expect(page.locator('#accountStatus')).toContainText(/escribe|indica tu correo/i);
  await page.locator('#authEmail').fill('olvido@example.invalid');
  await page.locator('#forgotPassword').click();
  await expect(page.locator('#accountStatus')).toContainText(/recibirás un enlace/i);
  expect(calls.filter(c => c.path === '/auth/v1/recover')).toHaveLength(1);
});
