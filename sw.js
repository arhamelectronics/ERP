/* Arham ERP service worker: lets the portal install as an app and open fast.
   App files always come from the network first (checked again, not taken from
   the browser's short-term cache), so a new version shows up straight away.
   The saved copy is used only when the phone is offline. Business data from
   Google Apps Script is never stored here. */
const CACHE = "arham-erp-v8";
const SHELL = ["./", "index.html", "app.js", "styles.css", "manifest.webmanifest", "icon-192.png", "icon-512.png", "brand-mark.png", "login-banner.jpg"];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).catch(function () {}));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener("message", function (event) {
  if (event.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", function (event) {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;   // API calls go straight to Google
  if (/version\.json$/.test(url.pathname)) return;                                     // always live
  event.respondWith(
    fetch(event.request, { cache: "no-cache" }).then(function (res) {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(event.request, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(event.request, { ignoreSearch: true }).then(function (hit) { return hit || caches.match("index.html"); });
    })
  );
});
