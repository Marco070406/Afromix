/* AfroMix — service worker (application installable)
 *
 * - Pages : réseau d'abord ; hors connexion, page /offline.html.
 * - /_next/static (fichiers versionnés, immuables) : cache d'abord.
 * - Icônes, images et logo du site : cache, puis mise à jour en arrière-plan.
 * - Jamais mis en cache : l'API (données, sessions), l'audio et les uploads.
 *
 * Changer CACHE_VERSION invalide les anciens caches au déploiement suivant.
 */
const CACHE_VERSION = "afromix-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isNeverCached(url, request) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/uploads/") ||
    request.headers.has("range") ||
    request.destination === "audio" ||
    request.destination === "video"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isNeverCached(url, request)) return;

  // Pages : toujours le réseau ; page hors ligne en secours
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Fichiers de build versionnés : jamais modifiés une fois publiés
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Icônes, images et logo : réponse immédiate depuis le cache, rafraîchie en arrière-plan
  if (/^\/(icons|images|brand)\//.test(url.pathname) || url.pathname === "/favicon.ico") {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
  }
});
