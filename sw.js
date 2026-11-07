/* ==========================================================
   SERVICE WORKER - AULA VIRTUAL (PWA)
   ========================================================== */

const VERSION = "v1";
const ARCHIVOS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icono-192.png",
  "./icono-512.png"
];

// 1. EVENTO INSTALL: Se ejecuta la primera vez que se instala la app y guarda los archivos en caché
self.addEventListener("install", function (evento) {
  evento.waitUntil(
    caches.open(VERSION).then(function (cache) {
      console.log("Archivos guardados en caché con éxito");
      return cache.addAll(ARCHIVOS);
    })
  );
  self.skipWaiting();
});

// 2. EVENTO ACTIVATE: Limpia las cachés viejas si actualizás la versión de la app
self.addEventListener("activate", function (evento) {
  evento.waitUntil(
    caches.keys().then(function (nombresCaches) {
      return Promise.all(
        nombresCaches.map(function (nombreCache) {
          if (nombreCache !== VERSION) {
            console.log("Borrando caché antigua:", nombreCache);
            return caches.delete(nombreCache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. EVENTO FETCH: Intercepta las peticiones y responde con la caché si no hay internet
self.addEventListener("fetch", function (evento) {
  evento.respondWith(
    caches.match(evento.request).then(function (respuestaEnCache) {
      // Si está en la caché, la devuelve; si no, va a la red a buscarla
      return respuestaEnCache || fetch(evento.request);
    })
  );
});