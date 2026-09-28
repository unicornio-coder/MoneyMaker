// Service worker de MoneyMaker: recibe avisos push y abre la app al tocarlos. No cachea páginas.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let datos = { titulo: 'MoneyMaker', cuerpo: '', url: '/app' };
  try {
    datos = Object.assign(datos, e.data ? e.data.json() : {});
  } catch {}
  e.waitUntil(self.registration.showNotification(datos.titulo, { body: datos.cuerpo, icon: '/icon-192.png', badge: '/icon-192.png', tag: datos.etiqueta || 'moneymaker', data: { url: datos.url }, renotify: false }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/app';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) if ('focus' in c) return c.navigate ? c.navigate(url).then(() => c.focus()) : c.focus();
      return self.clients.openWindow(url);
    }),
  );
});
