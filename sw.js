/* 渝江证券 · 离线缓存。由 tools/build-sw.py 生成，不要手改 sw.js，改 tools/sw.template.js。
 * 页面（HTML）：有缓存先给缓存，同时后台取新版，下次打开生效；没有缓存就走网络。
 * 美术（assets/，文件名带内容摘要）：缓存优先，永不过期。
 * 其他同源文件：先网络，失败回落缓存。 */
var VERSION = '7aab9e391f';
var CACHE = 'yjzq-' + VERSION;
var CORE = ["index.html", "manifest.webmanifest", "icon-32.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
var ASSETS = [
"assets/art/cycle-cold.417a9710.webp",
"assets/art/cycle-crash.2e91b88f.webp",
"assets/art/cycle-mania.fb6828fe.webp",
"assets/art/cycle-recover.d7ad984d.webp",
"assets/art/cycle-warm.fb397b9d.webp",
"assets/art/ending-broker.ffb73c12.webp",
"assets/art/ending-clean.6c222c40.webp",
"assets/art/ending-dismissed.9fc18b6b.webp",
"assets/art/ending-disposal.ed7c1a8c.webp",
"assets/art/ending-ib.d0411737.webp",
"assets/art/ending-merged.d4f8c5f2.webp",
"assets/art/ending-ordinary.8f8a208a.webp",
"assets/art/ending-prudent.58d865d1.webp",
"assets/art/ending-research.6d1e0309.webp",
"assets/art/ending-survivor.b859a29a.webp",
"assets/art/ending-talk.0f983400.webp",
"assets/art/hero-desktop.02f46c6a.webp",
"assets/art/hero-mobile.0f2acb92.webp",
"assets/art/portrait-he.c6b53fc5.webp",
"assets/art/portrait-luo.0683835d.webp",
"assets/art/portrait-qin.8cdacaef.webp",
"assets/art/portrait-ran.5c68a2bc.webp",
"assets/art/portrait-shen.0c9afb3a.webp",
"assets/art/portrait-xu.6bfe231c.webp",
"assets/art/portrait-zhou.f8e8fe0f.webp",
"assets/art/scene-boardroom.84fce8fc.webp",
"assets/art/scene-factory.3ad0df53.webp",
"assets/art/scene-hall-crash.822aabd1.webp",
"assets/art/scene-hall-mania.8b87cac4.webp",
"assets/art/scene-outage.3df2ec6e.webp",
"assets/art/scene-regulator.8dee278a.webp",
"assets/art/scene-tradingdesk.7a3c0202.webp",
"assets/art/scene-viproom.ff2e625f.webp",
"assets/employees/employee-01.13e76465.webp",
"assets/employees/employee-02.a50ea0f0.webp",
"assets/employees/employee-03.eab73650.webp",
"assets/employees/employee-04.29d1a285.webp",
"assets/employees/employee-05.5291b60a.webp",
"assets/employees/employee-06.7e3093c9.webp",
"assets/employees/employee-07.b3a50708.webp",
"assets/employees/employee-08.20fdf251.webp",
"assets/employees/employee-09.2f07c8b7.webp",
"assets/employees/employee-10.4d195d8e.webp",
"assets/employees/employee-11.f34ea3ec.webp",
"assets/employees/employee-12.c46d702f.webp",
"assets/employees/employee-13.d228e04a.webp",
"assets/employees/employee-14.854a89f3.webp",
"assets/employees/employee-15.7acbad6a.webp",
"assets/employees/employee-16.d0c3a101.webp",
"assets/employees/employee-17.4bc3b979.webp",
"assets/employees/employee-18.df4a6731.webp",
"assets/employees/employee-19.6e0f39ee.webp",
"assets/employees/employee-20.e03f0cf8.webp",
"assets/employees/employee-21.01f522ee.webp",
"assets/employees/employee-22.21a85826.webp",
"assets/employees/employee-23.43935df1.webp",
"assets/employees/employee-24.e01ccf8e.webp",
"assets/employees/employee-25.8cad7c2f.webp",
"assets/employees/employee-26.3d2cd9ce.webp",
"assets/employees/employee-27.d109dc6b.webp",
"assets/employees/employee-28.845ec484.webp",
"assets/employees/employee-29.8fdd6591.webp",
"assets/employees/employee-30.9ad3c24d.webp",
"assets/employees/employee-31.b90d39b4.webp",
"assets/employees/employee-32.daf16467.webp",
"assets/employees/employee-33.49c08261.webp",
"assets/employees/employee-34.caa2887c.webp",
"assets/employees/employee-35.abc50099.webp",
"assets/employees/employee-36.8571315d.webp",
"assets/employees/employee-37.1b04ab6f.webp",
"assets/employees/employee-38.17659de6.webp",
"assets/employees/employee-39.5fabfc52.webp",
"assets/employees/employee-40.f198f576.webp"
];

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
