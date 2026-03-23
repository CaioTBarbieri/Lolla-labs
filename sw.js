const CACHE_NAME = "lollalabs-v2";
const APP_ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "./img/icon-192.png",
    "./img/icon-512.png",
    "./img/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }

    const requestUrl = new URL(event.request.url);
    const isSameOrigin = requestUrl.origin === self.location.origin;
    const isAppAsset =
        isSameOrigin &&
        (APP_ASSETS.includes(requestUrl.pathname) ||
            APP_ASSETS.includes(`.${requestUrl.pathname}`) ||
            requestUrl.pathname === "/" ||
            requestUrl.pathname.endsWith("/index.html"));

    if (isAppAsset) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
}
