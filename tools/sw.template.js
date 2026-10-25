/* 渝江证券 · 离线缓存。由 tools/build-sw.py 生成，不要手改 sw.js，改 tools/sw.template.js。
 * 页面（HTML）：有缓存先给缓存，同时后台取新版，下次打开生效；没有缓存就走网络。
 * 美术（assets/，文件名带内容摘要）：缓存优先，永不过期。
 * 其他同源文件：先网络，失败回落缓存。 */
var VERSION = '__VERSION__';
var CACHE = 'yjzq-' + VERSION;
var CORE = __CORE__;
var ASSETS = __ASSETS__;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE.concat(ASSETS)); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { if (k.indexOf('yjzq-') === 0 && k !== CACHE) return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function pageKey(url) {
  var u = new URL(url); u.search = ''; u.hash = '';
  if (/\/$/.test(u.pathname)) u.pathname += 'index.html';
  return u.href;
}
function store(key, res) {
  if (res && res.ok && !res.redirected && res.type === 'basic') {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(key, copy); });
  }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    var key = pageKey(req.url);
    var net = fetch(req).then(function (res) { return store(key, res); });
    e.waitUntil(net.then(function () {}, function () {}));
    e.respondWith(caches.match(key).then(function (hit) {
      return hit || net.catch(function () { return caches.match(pageKey(self.registration.scope)); });
    }));
    return;
  }

  if (url.pathname.indexOf('/assets/') !== -1) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { return store(req, res); });
    }));
    return;
  }

  e.respondWith(fetch(req).then(function (res) { return store(req, res); })
    .catch(function () { return caches.match(req); }));
});
