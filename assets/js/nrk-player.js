/*
 * NRK Super Spill (arkiv) - game player for the game pages (spill/<slug>/).
 * Reads window.NRK_GAME (written into each page by scripts/nrk_site_build.py):
 *   kind     "swf" (Flash, Ruffle) | "dcr" (Shockwave, DirPlayer) | "html5" (iframe)
 *   src      Flash/Shockwave: the game's ORIGINAL URL (served from our copy by sw.js); HTML5: path in the site
 *   w, h     stage size;  flashvars (swf);  ruffle {} extra Ruffle settings (data/ruffle_config.json)
 *   params {} / launch "" / dp ""  Shockwave embed parameters, Flashpoint launch command, DirPlayer build folder
 *   available  false = the page shows a notice; tryable = a "Prøv likevel" button still starts it
 * Keeps the restore's page UI: start button, loading bar, volume slider, fullscreen button.
 */
(function () {
  'use strict';
  var G = window.NRK_GAME;
  if (!G) return;
  var ROOT = window.__SITE_ROOT__ || '/';
  var stage = document.getElementById('game-stage');
  var start = document.getElementById('game-start');
  var tryBtn = document.getElementById('game-try');
  var fsBtn = document.getElementById('game-fs');
  var slider = document.getElementById('game-volume');
  var label = document.getElementById('game-volume-val');
  var helper = document.getElementById('game-helper');

  // ---- browser report to the local test server (scripts/nrk_site_server.py -> raw/site_client_log.jsonl): lets us
  // read Firefox-only problems. Only when the site runs on this machine - the live site has no /api/log.
  // Capped so a game that errors every frame cannot flood it.
  var sent = 0, LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  function report(kind, msg) {
    if (!LOCAL || sent >= 150) return;
    sent++;
    try {
      var b = JSON.stringify({game: G.slug || G.title, kind: kind, msg: String(msg).slice(0, 2000), ua: navigator.userAgent});
      if (navigator.sendBeacon) navigator.sendBeacon(ROOT + 'api/log', new Blob([b], {type: 'application/json'}));
      else fetch(ROOT + 'api/log', {method: 'POST', body: b, keepalive: true}).catch(function () {});
    } catch (e) {}
  }
  ['error', 'warn'].forEach(function (lvl) {
    var orig = console[lvl];
    console[lvl] = function () {
      try { report('console.' + lvl, Array.prototype.map.call(arguments, function (a) {
        return a && a.stack ? a.stack : (typeof a === 'object' ? JSON.stringify(a) : String(a)); }).join(' ')); } catch (e) {}
      return orig.apply(console, arguments);
    };
  });
  // DirPlayer logs '[Flash] Instance k fully ready' when a Flash sprite (Miniclip's intro, Flash menus) starts:
  // the loading screen must not cover it
  var flashShown = 0;
  (function () {
    var orig = console.log;
    console.log = function (m) {
      if (!flashShown && typeof m === 'string' && m.indexOf('[Flash] Instance') === 0 && m.indexOf('fully ready') > 0) flashShown = Date.now();
      return orig.apply(console, arguments);
    };
  })();
  window.addEventListener('error', function (e) { report('pageerror', (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || '')); });
  window.addEventListener('unhandledrejection', function (e) { report('rejection', e.reason && e.reason.stack || e.reason); });
  function envReport() {
    var gl = null, info = '';
    try {
      var c = document.createElement('canvas');
      gl = c.getContext('webgl2') || c.getContext('webgl');
      var d = gl && gl.getExtension('WEBGL_debug_renderer_info');
      info = gl ? ((gl instanceof WebGL2RenderingContext ? 'webgl2 ' : 'webgl1 ') + (d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '')) : 'no webgl';
    } catch (e) { info = 'webgl error ' + e; }
    report('start', G.kind + ' ' + G.src + ' | ' + info + ' | dp=' + (G.dp || '') + ' v=' + (G.dpv || ''));
  }

  // ---- service worker (games load from their original URL) ------------------------------------
  var swReady = ('serviceWorker' in navigator)
    ? navigator.serviceWorker.register(ROOT + 'sw.js', {scope: ROOT}).then(function () { return navigator.serviceWorker.ready; })
    : Promise.reject(new Error('no service worker'));
  swReady.catch(function () {});

  function withController(go) {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) { go(); return; }
    swReady.then(function () {
      if (navigator.serviceWorker.controller) { go(); return; }
      // first visit (or a hard reload, Ctrl+F5, which bypasses the worker): reload once, then start
      var n = 0; try { n = +(sessionStorage.getItem('nrk-sw-reload') || 0); } catch (e) {}
      if (n < 3) {
        try { sessionStorage.setItem('nrk-sw-reload', n + 1); } catch (e) {}
        location.hash = 'spill'; location.reload();
      } else {
        stage.innerHTML = '<div class="game-msg">Spillet kan ikke lastes: trykk F5 (ikke Ctrl+F5) og prøv igjen.</div>';
      }
    }, function () {
      stage.innerHTML = '<div class="game-msg">Denne nettleseren støtter ikke service workers, så spillene kan ikke lastes.</div>';
    });
  }

  // ---- volume / fullscreen (from the restore) ---------------------------------------------------
  var vol = 0.3;
  try { var sv = parseFloat(localStorage.getItem('spillVolume')); if (!isNaN(sv)) vol = Math.max(0, Math.min(1, sv)); } catch (e) {}
  if (slider) { slider.value = Math.round(vol * 100); label.textContent = Math.round(vol * 100) + '%'; }
  function applyVol() {
    var pl = stage.querySelector('ruffle-player');
    if (pl) { try { pl.volume = vol; } catch (e) {} }
    var fr = stage.querySelector('iframe');
    if (fr) { try { fr.contentWindow.__setSpillVolume(vol); } catch (e) {} }
  }
  if (slider) slider.addEventListener('input', function () {
    vol = slider.value / 100; label.textContent = slider.value + '%';
    try { localStorage.setItem('spillVolume', String(vol)); } catch (e) {}
    applyVol();
  });
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }
  // any fullscreen (our button, or DirPlayer fullscreening its own box) lifts the windowed canvas size pin
  function fsClass() { document.documentElement.classList.toggle('nrk-fs', !!fsEl()); }
  document.addEventListener('fullscreenchange', fsClass);
  document.addEventListener('webkitfullscreenchange', fsClass);
  if (fsBtn) fsBtn.addEventListener('click', function () {
    if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    var rq = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (rq) rq.call(stage);
  });

  // games that send help texts to the page (Stor og liten: ExternalInterface.call("outputHelperText", text))
  window.outputHelperText = function (t) {
    if (!helper) return;
    helper.innerHTML = String(t).replace(/\t+/g, '').trim();
    helper.style.display = t ? 'block' : 'none';
  };

  // ---- loading -----------------------------------------------------------------------------------
  function loader() {
    stage.innerHTML = '<div id="game-load" style="display:flex"><span class="lt"></span><div class="lb"><i></i></div><small>Laster spillet &hellip;</small></div>';
    stage.querySelector('.lt').textContent = G.title;
    return stage.querySelector('#game-load');
  }
  // On an HTTPS site the browser blocks fetch() of the games' original http:// addresses (mixed content) before the
  // service worker sees them; the https:// twin is served the same way. Only our preload is upgraded - Ruffle and
  // DirPlayer upgrade their own requests and keep the http:// address the game itself sees (sitelocks).
  function upgrade(url) {
    return location.protocol === 'https:' ? String(url).replace(/^http:\/\//i, 'https://') : url;
  }
  function preload(url, onp) {
    return fetch(upgrade(url)).then(function (r) {
      var tot = parseInt(r.headers.get('Content-Length') || '0', 10), enc = r.headers.get('Content-Encoding');
      if (!r.body || !r.body.getReader) return r.arrayBuffer();
      var rd = r.body.getReader(), got = 0;
      if (!tot || enc) onp(null);
      return (function pump() {
        return rd.read().then(function (x) {
          if (x.done) return;
          got += x.value.length;
          if (tot && !enc) onp(got / tot);
          return pump();
        });
      })();
    });
  }
  function script(src, cb) {
    var s = document.createElement('script'); s.src = src; s.onload = cb; document.head.appendChild(s);
  }

  // ---- Flash (Ruffle) ------------------------------------------------------------------------------
  function startSwf(ld) {
    var extra = {};
    for (var k in (G.ruffle || {})) if (k !== 'nrkNative') extra[k] = G.ruffle[k];
    window.RufflePlayer = window.RufflePlayer || {};
    window.RufflePlayer.config = Object.assign({
      publicPath: ROOT + 'ruffle/', polyfills: false, autoplay: 'on', unmuteOverlay: 'hidden', splashScreen: false,
      contextMenu: 'off', letterbox: 'on', logLevel: 'warn',
      openUrlMode: 'deny',          // links games open to their old portals do nothing
      allowScriptAccess: false,
      salign: '', forceAlign: true  // games that set noScale keep their size, centred (no forced scaling)
    }, extra);
    script(ROOT + 'ruffle/ruffle.js', function () {
      var p = window.RufflePlayer.newest().createPlayer();
      p.style.width = '100%'; p.style.height = '100%';
      stage.appendChild(p);
      function done() { if (ld && ld.parentNode) ld.parentNode.removeChild(ld); }
      p.addEventListener('loadedmetadata', function () { applyVol(); setTimeout(done, 400); });
      setTimeout(done, 9000);
      p.ruffle().load({url: G.src, base: G.src.slice(0, G.src.lastIndexOf('/') + 1), parameters: G.flashvars || ''});
    });
  }

  // ---- Shockwave (DirPlayer) -------------------------------------------------------------------
  // Shockwave movies show nothing until DirPlayer has fetched and started them: keep our loader up until the
  // movie leaves its first frame (Miniclip intros sit on a black frame 1 for a while), or 20 s after the canvas got
  // the movie's size, at most 60 s. No calls into DirPlayer until its canvas is sized (= movie running).
  // "nudge" Lingo (data/dcr_params.json) runs once if the movie still sits on the given frame after n.after ms.
  function geometry() {
    var s = stage.getBoundingClientRect(), c = stage.querySelector('canvas');
    var r = c ? c.getBoundingClientRect() : null;
    return 'stage ' + [s.x, s.y, s.width, s.height].map(Math.round) + ' | canvas ' +
      (r ? [r.x, r.y, r.width, r.height].map(Math.round) + ' px ' + c.width + 'x' + c.height : 'none') +
      ' | canvases ' + stage.querySelectorAll('canvas').length + ' | fullscreen ' + (fsEl() ? (fsEl().id || fsEl().className || fsEl().tagName) : 'no') +
      ' | window ' + innerWidth + 'x' + innerHeight;
  }
  // ---- Snow Riders rider position tuning (test tool): ?rider=x,y,z in the address shifts every rider's seat
  // (the game's player_N_base group, authored at (0,-50,58) in the scooter's frame: x right, y forward, z up).
  // Re-applied every second, because each race builds new riders.
  function riderTuning() {
    var m = /(?:^|[?&#])rider=(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)/.exec(location.search);
    if (!m) return false;
    var d = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
    var pos = 'vector(' + d[0] + ', ' + (-50 + d[1]) + ', ' + (58 + d[2]) + ')';
    var tag = document.createElement('div');
    tag.textContent = 'rider ' + d.join(', ') + '  (seat ' + pos + ')';
    tag.style.cssText = 'position:absolute;left:4px;top:4px;z-index:50;background:rgba(0,0,0,.6);color:#fff;font:12px monospace;padding:2px 6px;border-radius:4px;pointer-events:none';
    stage.appendChild(tag);
    setInterval(function () {
      var code = [];
      for (var i = 1; i <= 4; i++) {
        code.push('g = gGame.Get3D().group("player_' + i + '_base")', 'if not voidp(g) then g.transform.position = ' + pos);
      }
      try { window.__dpEval(code.join('\n')); } catch (e) {}
    }, 1000);
    return true;
  }

  function watchDcr(ld) {
    var t0 = Date.now(), tSized = null, first = null;
    var hide = setInterval(function () {
      var c = stage.querySelector('canvas');
      if (!tSized && c && c.width > 0 && !(c.width === 300 && c.height === 300)) tSized = Date.now();
      var f = null;
      if (tSized) {   // movie is running: from now on reading its frame is safe
        try { f = JSON.parse(window.__dpState()).current_frame; } catch (e) {}
        if (first == null && f != null) first = f;
      }
      if ((first != null && f !== first) || (tSized && flashShown && Date.now() - flashShown > 150) ||
          (tSized && Date.now() - tSized > 20000) || Date.now() - t0 > 60000) {
        clearInterval(hide);
        if (ld && ld.parentNode) ld.parentNode.removeChild(ld);
      }
    }, 250);
    setTimeout(function () { report('layout', geometry()); }, 15000);
    document.addEventListener('fullscreenchange', function () { setTimeout(function () { report('layout', geometry()); }, 800); });
    // nudge: from n.after ms on, run n.lingo every 500 ms while the movie still sits on n.frame (the intro script
    // resets the value when it starts, so once is not enough), for at most 30 s; logged once.
    // game fixes: Lingo re-run every n ms once the movie runs (dcr_params "repeat"; skipped while ?rider= tests)
    if (!riderTuning()) (G.repeat || []).forEach(function (r) {
      setInterval(function () {
        var st = null;
        try { st = JSON.parse(window.__dpState()); } catch (e) { return; }
        if (st && st.movie_loaded) { try { window.__dpEval(r.lingo); } catch (e) {} }
      }, r.every || 1000);
    });
    (G.nudge || []).forEach(function (n) {
      var tries = 0;
      setTimeout(function () {
        var iv = setInterval(function () {
          var st = null;
          try { st = JSON.parse(window.__dpState()); } catch (e) { return; }
          if (!st || !st.movie_loaded) return;                 // not running yet: keep waiting
          var f = st.current_frame;
          if (f !== n.frame || ++tries > 60) { clearInterval(iv); return; }
          if (tries === 1) report('nudge', n.lingo + ' (frame ' + f + ')');
          try { window.__dpEval(n.lingo); } catch (e) {}
        }, 500);
      }, n.after);
    });
  }

  function preloadAll(urls, ld) {
    var bar = ld.querySelector('i'), done = 0, frac = {};
    var show = function () {
      var s = 0; urls.forEach(function (u) { s += frac[u] || 0; });
      bar.style.width = Math.round(s / urls.length * 100) + '%';
    };
    return Promise.all(urls.map(function (u) {
      return preload(u, function (f) { frac[u] = f == null ? 0.5 : f; show(); })
        .catch(function () {}).then(function () { frac[u] = 1; show(); });
    }));
  }

  function startDcr(ld) {
    var P = Object.assign({}, G.params || {});
    if (G.dp) delete P.swStretchStyle;      // newer DirPlayer builds stretch "fill" movies to the page and render black
    var esc = function (v) { return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
    var attrs = Object.keys(P).map(function (a) { return ' ' + a + '="' + esc(P[a]) + '"'; }).join('');
    Array.prototype.slice.call(stage.children).forEach(function (c) { if (c !== ld) stage.removeChild(c); });
    if (ld) {
      ld.className = 'ind';
      ld.querySelector('i').style.width = '';      // the download's 100% would hide the moving "busy" bar
      ld.querySelector('small').textContent = 'Starter spillet …';
    }
    // fullscreen: DirPlayer fits the movie to its container, but our box and the polyfill's wrappers have fixed
    // pixel sizes - let them fill the screen so the game is scaled up (back to native size afterwards)
    if (!document.getElementById('dcr-fs-css')) {
      var css = document.createElement('style');
      css.id = 'dcr-fs-css';
      var sel = ['.dcr-box', '.dcr-box>div', '.dcr-box>div>div', '.dcr-box>div>div>div', '.dcr-box>div>div>div>div:first-child'];
      css.textContent = [':fullscreen', ':-webkit-full-screen'].map(function (fs) {
        return sel.map(function (s) { return '#game-stage' + fs + ' ' + s; }).join(',') +
          '{width:100%!important;height:100%!important;max-width:none!important}';
      }).join('\n');
      document.head.appendChild(css);
    }
    // windowed: show DirPlayer's canvas at the movie's own size. Some DirPlayer paths resize the canvas BACKING store
    // to device pixels (738x554 at 125% display scale) without setting its CSS size, and the browser then shows it at
    // that size - cropped, off-centre or seemingly black. The backing store stays hi-DPI (sharp).
    var cv = document.getElementById('dcr-canvas-css') || document.createElement('style');
    cv.id = 'dcr-canvas-css';
    cv.textContent = 'html:not(.nrk-fs) #game-stage .dcr-box canvas{width:' + G.w + 'px!important;height:' + G.h + 'px!important}';
    document.head.appendChild(cv);
    var box = document.createElement('div');
    box.className = 'dcr-box';
    box.style.cssText = 'width:' + G.w + 'px;height:' + G.h + 'px;margin:0 auto';
    if (G.launch) box.setAttribute('data-launch-command', G.launch);   // on the container: the polyfill replaces the embed
    // native size, no CSS scaling: a CSS scale puts DirPlayer's mouse position in the wrong place
    box.innerHTML = '<embed src="' + esc(G.src) + '" width="' + G.w + '" height="' + G.h + '" type="application/x-director"' + attrs + '>';
    stage.appendChild(box);
    // ?v= = the player build's date (set by nrk_site_build.py): a new DirPlayer build is never taken from the cache
    script(ROOT + (G.dp || 'dirplayer') + '/dirplayer-polyfill.js?v=' + (G.dpv || ''), function () { watchDcr(ld); });
  }

  // ---- HTML5 (iframe) -------------------------------------------------------------------------------
  function startHtml5() {
    stage.innerHTML = '';
    var f = document.createElement('iframe');
    f.src = ROOT + G.src; f.setAttribute('allowfullscreen', 'true'); f.setAttribute('allow', 'fullscreen; autoplay');
    f.style.cssText = 'width:100%;height:100%;border:0;background:#000';
    f.addEventListener('load', applyVol);
    stage.appendChild(f);
  }

  function go() {
    envReport();
    if (fsBtn) fsBtn.style.display = 'inline-flex';
    stage.className += ' running';
    if (G.kind === 'swf') {
      var ld = loader(), bar = ld.querySelector('i');
      preload(G.src, function (f) { if (f == null) ld.className = 'ind'; else bar.style.width = Math.round(f * 100) + '%'; })
        .catch(function () {}).then(function () { startSwf(ld); });
    } else if (G.kind === 'dcr') {
      var dl = loader();
      preloadAll(G.preload && G.preload.length ? G.preload : [G.src], dl).then(function () { startDcr(dl); });
    } else {
      startHtml5();
    }
    [600, 1500, 3000, 6000, 10000].forEach(function (t) { setTimeout(applyVol, t); });
  }
  function run(e) {
    if (e) e.preventDefault();
    try { sessionStorage.removeItem('nrk-sw-reload'); } catch (x) {}
    withController(go);
  }
  if (start) start.addEventListener('click', run);
  if (tryBtn) tryBtn.addEventListener('click', run);
  if (location.hash === '#spill' && (G.available || G.tryable)) {   // after the one-time reload for the worker
    history.replaceState(null, '', location.pathname + location.search);
    withController(go);
  }
})();
