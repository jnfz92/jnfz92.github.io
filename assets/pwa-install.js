/* Instalación directa de Easy English como aplicación web, sin APK. */
(() => {
  'use strict';
  let deferredPrompt = null;
  const buttons = [...document.querySelectorAll('[data-install-pwa]')];
  const status = document.getElementById('pwaInstallStatus');
  function info(message){if(status)status.textContent=message}
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', {scope:'/'}).catch(() => {
        info('Puedes seguir usando Easy English desde el navegador.');
      });
    });
  }
  const standalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (standalone) {
    buttons.forEach(button => {button.textContent='✓ Easy English ya está instalada';button.disabled=true});
    info('Ya estás usando Easy English como aplicación.');
    return;
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    info('Puedes instalar Easy English directamente desde aquí.');
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt=null;
    buttons.forEach(button => {button.textContent='✓ Aplicación instalada';button.disabled=true});
    info('Easy English se ha añadido a tu dispositivo.');
  });
  buttons.forEach(button => button.addEventListener('click', async () => {
    if (deferredPrompt) {
      const prompt = deferredPrompt;
      deferredPrompt=null;
      await prompt.prompt();
      const choice=await prompt.userChoice;
      if(choice.outcome!=='accepted')info('Si lo prefieres, abre el menú de Chrome y pulsa «Instalar aplicación» o «Añadir a pantalla de inicio».');
    } else {
      info('En Android: abre esta web en Chrome, pulsa ⋮ y elige «Instalar aplicación» o «Añadir a pantalla de inicio». No necesitas descargar un APK.');
    }
  }));
})();
