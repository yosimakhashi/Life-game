// This app has been taken down. Installed copies pick up this worker the
// next time they open online: it deletes the app's own offline caches
// (not the other Life Game apps' caches) and unregisters itself.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('padana-deepam')).map(k => caches.delete(k)));
    await self.registration.unregister();
    const wins = await self.clients.matchAll({ type: 'window' });
    wins.forEach(w => w.navigate(w.url));
})()));
