// Offline support plus the daily reminder. The app shell is cached on
// install; pages load from the network first so updates arrive, and fall
// back to the cache when offline.
importScripts('affirmations.js');

const CACHE = 'padana-deepam-v3';
const META = 'padana-deepam-meta';
const SHELL = ['./', 'index.html', 'affirmations.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== META).map(k => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
    if (url.origin !== location.origin && !isFont) return;

    if (isFont) {
        e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
            return res;
        })));
        return;
    }
    e.respondWith(fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});

// Daily reminder: the browser wakes the worker roughly once a day
// (installed app, Chrome on Android). Show today's affirmation once per day.
async function remindOnce() {
    const day = String(self.dayNumber(new Date()));
    const meta = await caches.open(META);
    const last = await meta.match('last-reminder');
    if (last && (await last.text()) === day) return;
    const [ml] = self.QUOTES[self.quoteFor(Number(day))];
    await self.registration.showNotification('🪔 ഇന്നത്തെ ദീപം', {
        body: ml,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: 'daily-affirmation',
        lang: 'ml',
    });
    await meta.put('last-reminder', new Response(day));
}

self.addEventListener('periodicsync', e => {
    if (e.tag === 'daily-affirmation') e.waitUntil(remindOnce());
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const c of list) if ('focus' in c) return c.focus();
        return self.clients.openWindow('./');
    }));
});
