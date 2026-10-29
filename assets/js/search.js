/* Search for the static NRK Super Spill archive.
 * The header form submits  index.html?s=<term> ; this shows the matching games on the front page.
 * Everything runs in the browser against assets/data/posts.json (no server). */
(function () {
  var cur = document.currentScript;
  var src = cur ? cur.src : '';
  var ROOT = src ? src.replace(/assets\/js\/search\.js.*$/, '') : '';
  var VER = /[?&]v=(\w+)/.exec(src);

  function norm(s) {
    s = String(s || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    return s.replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  var params = new URLSearchParams(location.search);
  var raw = (params.get('s') || '').trim();

  // keep the typed term in the search box
  function fillBox() {
    var box = document.getElementById('search-input');
    if (box && raw) box.value = raw;
  }

  function render(posts) {
    var content = document.getElementById('content');
    if (!content) return;
    var terms = norm(raw).split(' ').filter(Boolean);
    var hits = posts.filter(function (p) {
      var hay = norm(p.title + ' ' + p.slug.replace(/-/g, ' '));
      return terms.every(function (t) { return hay.indexOf(t) >= 0; });
    });
    // titles that start with the term first, then alphabetical
    var first = terms[0] || '';
    hits.sort(function (a, b) {
      var sa = norm(a.title).indexOf(first) === 0 ? 0 : 1, sb = norm(b.title).indexOf(first) === 0 ? 0 : 1;
      return sa - sb || (a.title < b.title ? -1 : 1);
    });

    var cards = hits.map(function (p) {
      var thumb = (p.front_view && p.front_view.id) || (p.thumbnail && p.thumbnail.url) || '';
      return '<a href="' + ROOT + 'spill/' + esc(p.slug) + '/" style="display:block;color:inherit;text-decoration:none">' +
        '<div style="aspect-ratio:16/9;background:#222 center/cover no-repeat url(\'' + ROOT + esc(thumb) + '\');border-radius:6px"></div>' +
        '<div style="padding:6px 2px 12px;font-weight:bold;line-height:1.2">' + esc(p.title) + '</div></a>';
    }).join('');

    var box = document.createElement('div');
    box.id = 'search-results';
    box.style.cssText = 'max-width:1100px;margin:16px auto;padding:18px;background:#fff;color:#222;border-radius:8px';
    box.innerHTML =
      '<h2 style="margin:6px 0 14px">' + (hits.length ? 'S&oslash;keresultater for &laquo;' + esc(raw) + '&raquo; (' + hits.length + ')'
        : 'Ingen spill funnet for &laquo;' + esc(raw) + '&raquo;') + '</h2>' +
      (hits.length ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px">' + cards + '</div>'
        : '<p>Pr&oslash;v et annet s&oslash;keord, eller g&aring; til <a href="' + ROOT + 'index.html">forsiden</a>.</p>') +
      '<p style="margin-top:14px"><a href="' + ROOT + 'index.html">&larr; Tilbake til alle spill</a></p>';

    // hide the normal front page content and show the results instead
    Array.prototype.forEach.call(content.children, function (c) { c.style.display = 'none'; });
    content.insertBefore(box, content.firstChild);
    document.title = '«' + raw + '» – NRK Super Spill (arkiv)';
    try {
      var m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,follow'; document.head.appendChild(m);
    } catch (e) {}
  }

  function run() {
    fillBox();
    if (!raw) return;
    var x = new XMLHttpRequest();
    x.open('GET', ROOT + 'assets/data/posts.json' + (VER ? '?v=' + VER[1] : ''), true);
    x.onload = function () {
      try { var d = JSON.parse(x.responseText); render(d.posts || d); } catch (e) {}
    };
    x.send();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
