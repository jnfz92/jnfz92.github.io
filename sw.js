/* Easy English · caché ligero de páginas y recursos públicos.
 * No se interceptan solicitudes a Supabase ni contenidos privados. */
const CACHE = 'easy-english-public-v2';
const SHELL = ['/', '/index.html', '/curso.html', '/articulos.html', '/first-certificate.html', '/favicon.svg',
  '/assets/site.css', '/assets/navigation.css', '/assets/navigation.js','/assets/first-certificate.css'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.allSettled(
    SHELL.map(path => cache.add(path))
  )).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('easy-english-public-') && key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension:')) return;
  const url = new URL(request.url);
  // No guardar ni servir desde caché páginas de cuentas, exámenes o progreso privado.
  const privateRoutes = new Set([
    '/perfil.html','/aula-b2.html','/examenes.html','/practicar.html','/repasar-leidos.html',
    '/categorias-repaso.html','/mi-vocabulario.html','/comunidad.html','/mensajes.html',
    '/historial-bitacora.html','/constancia-b2.html','/administracion.html',
    '/clave-openai.html','/login.html','/registro.html'
  ]);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/auth/') || url.pathname.startsWith('/dashboard/') || privateRoutes.has(url.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/')) || Response.error()));
    return;
  }
  if (/\.(?:css|js|svg|png|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return response;
    })));
  }
});
