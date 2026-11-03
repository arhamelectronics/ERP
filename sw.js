/* Arham ERP service worker: lets the portal install as an app and open fast.
   App files are shown at once from the saved copy and refreshed in the background,
   so the next opening has the newest files. A new version is also announced by the
   "Update" bar (version.json), which clears the saved copy. Business data from
   Google Apps Script is never stored here. */
const CACHE = "arham-erp-v30";
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
  const fetchFresh = function () { return fetch(event.request, { cache: "no-cache" }).then(function (res) {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(event.request, copy); });
    }
    return res;
  }); };
  // Files with ?v= in the address never change, so a saved copy is exact. The page itself
  // (index.html) is shown from the saved copy at once and refreshed for the next opening;
  // a new index.html asks for new ?v= files, which come from the network the first time.
  event.respondWith(
    caches.match(event.request).then(function (hit) {
      if (hit) { if (!url.search) event.waitUntil(fetchFresh().catch(function () {})); return hit; }
      return fetchFresh().catch(function () {
        return caches.match(event.request, { ignoreSearch: true }).then(function (old) { return old || caches.match("index.html"); });
      });
    })
  );
});
