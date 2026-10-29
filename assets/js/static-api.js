/*
 * static-api.js -- offline replacement for the NRK Super "spill" WordPress JSON API.
 *
 * The original site fetched its game lists from  <site>/api/posts/?category=..&order_by=..  etc.
 * That backend is gone, so this shim intercepts those XHR calls (made by AngularJS $http) and
 * answers them from the static file  assets/data/posts.json  using the same query semantics.
 *
 * Must be loaded BEFORE angular / spill.combined.min.js.
 */
(function () {
  'use strict';

  // ---- where is the site root? (works on any sub-path, e.g. GitHub Pages /repo/) -------------
  var script = document.currentScript;
  var ROOT = script ? script.src.replace(/assets\/js\/static-api\.js.*$/, '') : location.href.replace(/[^\/]*$/, '');
  window.__SITE_ROOT__ = ROOT;
  var ROOT_PATH = ROOT.replace(/^https?:\/\/[^\/]+/, '');           // e.g.  /  or  /repo/

  var VER = script && /[?&]v=(\w+)/.exec(script.src);          // same build id as this script, so a new deploy never reuses old data
  var DATA_URL = ROOT + 'assets/data/posts.json' + (VER ? '?v=' + VER[1] : '');
  var NativeXHR = window.XMLHttpRequest;
  var dataPromise = null;

  function loadData() {
    if (!dataPromise) {
      dataPromise = new Promise(function (resolve, reject) {
        var x = new NativeXHR();
        x.open('GET', DATA_URL, true);
        x.onload = function () {
          try { resolve(JSON.parse(x.responseText)); } catch (e) { reject(e); }
        };
        x.onerror = reject;
        x.send();
      });
    }
    return dataPromise;
  }

  var commentCache = {};
  function loadComments(id) {
    if (!commentCache[id]) commentCache[id] = new Promise(function (resolve) {
      var x = new NativeXHR();
      x.open('GET', ROOT + 'assets/data/comments/' + id + '.json' + (VER ? '?v=' + VER[1] : ''), true);
      x.onload = function () { try { resolve(x.status === 200 ? JSON.parse(x.responseText) : null); } catch (e) { resolve(null); } };
      x.onerror = function () { resolve(null); };
      x.send();
    });
    return commentCache[id];
  }

  // post records keep site-relative urls; make them absolute-path urls for the current deployment
  function fixPost(p) {
    var c = JSON.parse(JSON.stringify(p));
    c.url = ROOT_PATH + p.url;
    if (c.front_view && c.front_view.id) c.front_view.id = ROOT_PATH + p.front_view.id;
    if (c.thumbnail && c.thumbnail.url) c.thumbnail.url = ROOT_PATH + p.thumbnail.url;
    return c;
  }

  function parseQuery(qs) {
    var out = {};
    (qs || '').replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      var k = decodeURIComponent((i < 0 ? kv : kv.slice(0, i)).replace(/\+/g, ' '));
      var v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
      out[k] = v;
    });
    return out;
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function queryPosts(all, q) {
    var list = all.slice();
    if (!q.posts) list = list.filter(function (p) { return p.available !== false; });   // NRK archive
    if (q.category) list = list.filter(function (p) { return (p.categories || []).some(function (c) { return c.slug === q.category || String(c.id) === q.category; }); });
    if (q.tag) list = list.filter(function (p) { return (p.tags || []).some(function (t) { return t.slug === q.tag; }); });
    // NOTE: the original app asked for meta.game.engine=html5 when no Flash plugin was found. Ruffle emulates Flash
    // for us, so that filter is deliberately ignored and every game is served.
    if (q.exclude_posts) { var ex = q.exclude_posts.split(','); list = list.filter(function (p) { return ex.indexOf(String(p.id)) < 0; }); }
    var curated = null;
    if (q.posts) {
      curated = q.posts.split(',').map(Number);
      list = list.filter(function (p) { return curated.indexOf(p.id) >= 0; });
    }
    var ob = (q.order_by || 'date');
    var desc = (q.order || 'DESC').toUpperCase() !== 'ASC';
    if (curated && (ob === 'date' || ob === 'menu_order date' || ob === 'menu_order' || !q.order_by)) {
      list.sort(function (a, b) { return curated.indexOf(a.id) - curated.indexOf(b.id); });
    } else if (ob === 'rand') {
      list = shuffle(list);
    } else {
      var key = function (p) {
        switch (ob) {
          case 'likes': return p.likes || 0;
          case 'comment_count': return parseInt(p.comment_count, 10) || 0;
          case 'menu_order date': case 'menu_order': return p.menu_order || 0;
          case 'title': return (p.title || '').toLowerCase();
          case 'author': return (p.title || '').toLowerCase();
          default: return p.date || '';
        }
      };
      list.sort(function (a, b) {
        var ka = key(a), kb = key(b);
        var c = ka < kb ? -1 : ka > kb ? 1 : 0;
        if (c === 0) c = (a.date || '') < (b.date || '') ? -1 : 1;
        return desc ? -c : c;
      });
    }
    var total = list.length;
    var off = parseInt(q.offset, 10) || 0;
    var lim = parseInt(q.limit, 10) || 10;
    var page = list.slice(off, off + lim).map(fixPost);
    return { status: 'ok', offset: off, count: page.length, count_total: total, posts: page, filter: q };
  }

  function route(url, method, all) {
    var u = url.replace(/^https?:\/\/[^\/]+/, '');
    var qi = u.indexOf('?');
    var path = qi < 0 ? u : u.slice(0, qi);
    var q = parseQuery(qi < 0 ? '' : u.slice(qi));
    var m;
    if ((m = /\/api\/posts\/(\d+)\/?$/.exec(path))) {
      var id = Number(m[1]);
      var p = all.filter(function (x) { return x.id === id; })[0];
      if (!p) return { status: 'error', error: 'not found' };
      return { status: 'ok', post: q.include === 'likes' ? { likes: p.likes || 0, id: p.id } : fixPost(p) };
    }
    if (/\/api\/posts\/?$/.test(path)) return queryPosts(all, q);
    if ((m = /\/api\/comments\/(\d+)\/?$/.exec(path))) {
      return { __comments: m[1], q: q };                      // resolved async in send()
    }
    if (/\/api\/search\/?$/.test(path)) {
      var term = (q.q || '').toLowerCase();
      var hits = all.filter(function (p) { return (p.title || '').toLowerCase().indexOf(term) >= 0; });
      var off = parseInt(q.offset, 10) || 0, lim = parseInt(q.limit, 10) || 10;
      var page = hits.slice(off, off + lim).map(fixPost);
      return { status: 'ok', offset: off, count: page.length, count_total: hits.length, posts: page };
    }
    if (/\/api\//.test(path)) return { status: 'ok' };          // likes, comment posts, anything else: accept silently
    return null;
  }

  // ---- minimal fake XMLHttpRequest for /api/ urls; everything else passes through ---------------
  function FakeXHR() {
    this.readyState = 0; this.status = 0; this.statusText = ''; this.responseText = ''; this.response = '';
    this.onreadystatechange = null; this.onload = null; this.onerror = null;
    this._headers = {};
  }
  FakeXHR.prototype.open = function (method, url) { this._method = method; this._url = url; this.readyState = 1; };
  FakeXHR.prototype.setRequestHeader = function () {};
  FakeXHR.prototype.getAllResponseHeaders = function () { return 'Content-Type: application/json\r\n'; };
  FakeXHR.prototype.getResponseHeader = function (h) { return /content-type/i.test(h) ? 'application/json' : null; };
  FakeXHR.prototype.abort = function () { this._aborted = true; };
  FakeXHR.prototype.overrideMimeType = function () {};
  FakeXHR.prototype.addEventListener = function (t, fn) { this['on' + t] = fn; };
  FakeXHR.prototype.send = function () {
    var self = this;
    loadData().then(function (data) {
      if (self._aborted) return;
      var res = route(self._url, self._method, data.posts);
      if (res && res.__comments) {                             // archived comments: assets/data/comments/<id>.json
        var cq = res.q, off = parseInt(cq.offset, 10) || 0, lim = parseInt(cq.limit, 10) || 10;
        loadComments(res.__comments).then(function (c) {
          var all = (c && c.comments) || [];
          var out = { status: 'ok', offset: off, count: 0, count_total: (c && c.count_total) || '0',
                      top_level_count: String(all.length), comments: all.slice(off, off + lim) };
          out.count = out.comments.length;
          finish(self, out);
        });
        return;
      }
      finish(self, res);
    }, function () {
      self.status = 0; self.readyState = 4;
      if (self.onreadystatechange) self.onreadystatechange();
      if (self.onerror) self.onerror();
    });
  };
  function finish(self, res) {
      if (self._aborted) return;
      self.status = res ? 200 : 404;
      self.statusText = res ? 'OK' : 'Not Found';
      self.responseText = self.response = JSON.stringify(res || { status: 'error' });
      self.readyState = 4;
      setTimeout(function () {
        if (self.onreadystatechange) self.onreadystatechange();
        if (self.onload) self.onload();
      }, 0);
  }

  function XHRProxy() {
    var real = new NativeXHR();
    var fake = new FakeXHR();
    var target = real;
    // Use a plain wrapper object so property reads/writes follow whichever backend is active.
    var w = {};
    ['open', 'send', 'setRequestHeader', 'getAllResponseHeaders', 'getResponseHeader', 'abort', 'overrideMimeType', 'addEventListener', 'removeEventListener'].forEach(function (m) {
      w[m] = function () {
        if (m === 'open') {
          var url = String(arguments[1]);
          target = /\/api\/(posts|comments|search|likes)/.test(url) && !/\.json(\?|$)/.test(url) ? fake : real;
          // route callbacks set on wrapper to the active backend
          target.onreadystatechange = w._orsc; target.onload = w._onload; target.onerror = w._onerror;
        }
        var fn = target[m];
        return fn ? fn.apply(target, arguments) : undefined;
      };
    });
    ['readyState', 'status', 'statusText', 'responseText', 'response', 'responseType', 'responseURL', 'timeout', 'withCredentials'].forEach(function (p) {
      Object.defineProperty(w, p, {
        get: function () { return target[p]; },
        set: function (v) { try { target[p] = v; } catch (e) {} }
      });
    });
    Object.defineProperty(w, 'onreadystatechange', { get: function () { return w._orsc; }, set: function (f) { w._orsc = f; target.onreadystatechange = f; real.onreadystatechange = f; fake.onreadystatechange = f; } });
    Object.defineProperty(w, 'onload', { get: function () { return w._onload; }, set: function (f) { w._onload = f; target.onload = f; real.onload = f; fake.onload = f; } });
    Object.defineProperty(w, 'onerror', { get: function () { return w._onerror; }, set: function (f) { w._onerror = f; target.onerror = f; real.onerror = f; fake.onerror = f; } });
    return w;
  }
  window.XMLHttpRequest = XHRProxy;
})();
