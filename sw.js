// NRK Super Spill (arkiv) - service worker.
// Games load from their ORIGINAL address (http://www.miniclip.com/..., http://cache.armorgames.com/...) so their
// sitelocks see their home domain; this worker answers those requests with our archived copy in swf/<host>/<path>
// or html5/<host>/<path> next to the site. It is OFFLINE on purpose: a file we do not have gets a 404, never the
// live site (today's sites answer old URLs with HTML front pages that hang games).
// Built by scripts/nrk_site_build.py from site_src/sw.js.
const ROOT = new URL("./", self.location).pathname;              // site root, e.g. "/" or "/spill-arkiv/"
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.origin === self.location.origin || !u.protocol.startsWith("http")) return;
  e.respondWith((async () => {
    const path = u.pathname.endsWith("/") ? u.pathname + "index.html" : u.pathname;
    for (const base of ["swf/", "html5/"]) {
      try {
        const r = await fetch(ROOT + base + u.host + path);
        // new Response: no own url, so the game keeps seeing its original URL
        if (r.ok) return new Response(r.body, {status: 200, headers: r.headers});
      } catch (err) {}
    }
    return new Response("", {status: 404, statusText: "not archived"});
  })());
});
