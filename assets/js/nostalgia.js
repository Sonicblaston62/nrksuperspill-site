/* NRK Super Spill archive - small extras that run in the browser only (nothing is sent anywhere):
 *  - heart button on game pages + "Min liste" (favourites, saved in this browser's localStorage)
 *  - "Min liste" section on the front page
 *  - "Arkiv fra 2016" banner on the front page (can be closed) and a fan-archive note in the footer */
(function () {
  var cur = document.currentScript;
  var src = cur ? cur.src : '';
  var ROOT = src ? src.replace(/assets\/js\/nostalgia\.js.*$/, '') : '';
  var VER = /[?&]v=(\w+)/.exec(src);
  var KEY = 'spillFavs', BANNER_KEY = 'spillBannerClosed';

  function favs() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function setFavs(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var postsP = null;
  function posts() {
    if (!postsP) postsP = new Promise(function (res, rej) {
      var x = new XMLHttpRequest();
      x.open('GET', ROOT + 'assets/data/posts.json' + (VER ? '?v=' + VER[1] : ''), true);
      x.onload = function () { try { var d = JSON.parse(x.responseText); res(d.posts || d); } catch (e) { rej(e); } };
      x.onerror = rej; x.send();
    });
    return postsP;
  }

  var css = document.createElement('style');
  css.textContent =
    '#fan-banner{max-width:1150px;margin:10px auto 0;padding:10px 44px 10px 16px;background:#fff8d6;border:2px solid #e0c36a;border-radius:10px;color:#4a3d00;font-size:15px;line-height:1.4;position:relative}' +
    '#fan-banner b{color:#8a5a00}#fan-banner button{position:absolute;right:8px;top:6px;border:0;background:none;font-size:24px;line-height:1;color:#8a5a00;cursor:pointer}' +
    '#mine-fav{max-width:1180px;margin:0 auto;padding:6px 14px 10px}#mine-fav h3{color:#de006f;margin:10px 0}' +
    '#mine-fav .mf{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}' +
    '#mine-fav a{display:block;color:inherit;text-decoration:none}#mine-fav .mi{display:block;aspect-ratio:16/9;background:#222 center/cover no-repeat;border-radius:6px}' +
    '#mine-fav .mt{display:block;padding:5px 2px;font-weight:bold;line-height:1.2;color:#de006f}#mine-fav .more{display:inline-block;margin-top:8px;font-weight:bold}' +
    '.fan-note{clear:both;padding:10px 16px 18px;font-size:13px;opacity:.85;color:inherit;text-align:center}';
  document.head.appendChild(css);

  // ---------------------------------------------------------------- heart button on game pages
  function addHeart() {
    var post = document.querySelector('.single.post[data-slug]');
    var h1 = post && post.querySelector('h1');
    if (!h1) return;
    var slug = post.getAttribute('data-slug');
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'fav-btn';
    var svg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 2.7 4.5 6.3 4.5c2 0 3.5 1 4.5 2.5.3.4.6.8 1.2 0 1-1.5 2.5-2.5 4.5-2.5 3.6 0 5.4 3.8 3.9 7.3C19.5 16.4 12 21 12 21z"/></svg>';
    function paint() {
      var on = favs().indexOf(slug) >= 0;
      b.className = 'fav-btn' + (on ? ' on' : '');
      b.innerHTML = svg + (on ? 'I Min liste' : 'Legg til i Min liste');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    b.addEventListener('click', function () {
      var a = favs(), i = a.indexOf(slug);
      if (i >= 0) a.splice(i, 1); else a.unshift(slug);
      setFavs(a); paint();
    });
    paint();
    h1.parentNode.appendChild(b);
  }

  // ---------------------------------------------------------------- front page extras
  function isHome() { return !/\/(spill|alle-spill)\//.test(location.pathname) && !!document.querySelector('.post_grid'); }

  function addBanner() {
    var d = document.getElementById('fan-banner');   // the notice is part of the page HTML; this only wires up the close button
    if (!d) return;
    try { if (localStorage.getItem(BANNER_KEY)) { d.parentNode.removeChild(d); return; } } catch (e) {}
    var btn = d.querySelector('button');
    if (btn) btn.addEventListener('click', function () {
      try { localStorage.setItem(BANNER_KEY, '1'); } catch (e) {}
      d.parentNode.removeChild(d);
    });
  }

  function addMine() {
    var heads = document.querySelectorAll('h3.title'), h = null, i;
    for (i = 0; i < heads.length; i++) if (/spilte sist/i.test(heads[i].textContent)) { h = heads[i]; break; }
    if (!h) return;
    var line = h.closest('.line') || h.parentNode;
    var box = document.createElement('div');
    box.id = 'mine-fav'; box.style.display = 'none';
    line.parentNode.insertBefore(box, line.nextSibling);
    function render() {
      var a = favs();
      if (!a.length) { box.style.display = 'none'; return; }
      posts().then(function (list) {
        var by = {}; list.forEach(function (p) { by[p.slug] = p; });
        var items = a.filter(function (s) { return by[s]; }).slice(0, 8).map(function (s) {
          var p = by[s];
          return '<a href="' + ROOT + 'spill/' + esc(s) + '/"><span class="mi" style="background-image:url(' + ROOT + esc(p.front_view.id) + ')"></span><span class="mt">' + esc(p.title) + '</span></a>';
        });
        if (!items.length) { box.style.display = 'none'; return; }
        box.innerHTML = '<h3 class="title">Min liste &#9829;</h3><div class="mf">' + items.join('') + '</div>' +
          (a.length > 8 ? '<a class="more" href="' + ROOT + 'alle-spill/#favoritter">Se alle (' + a.length + ') &rarr;</a>' : '');
        box.style.display = 'block';
      });
    }
    render();
    window.addEventListener('storage', render);
  }

  function addFooterNote() {
    var f = document.querySelector('footer');
    if (!f) return;
    var d = document.createElement('div');
    d.className = 'fan-note';
    d.innerHTML = 'Uoffisiell fan-gjenskaping av NRK Super Spill. Ikke tilknyttet NRK. Spillene tilh&oslash;rer sine opprinnelige utviklere. ' +
      '<span style="opacity:.8">(Unofficial fan archive, not affiliated with NRK. Games belong to their original authors.)</span>';
    f.appendChild(d);
  }

  function init() {
    addHeart();
    if (isHome()) { addBanner(); addMine(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
