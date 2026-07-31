/* 鹿7铭 · 人生工作台 Service Worker
 * 策略：HTML 文档 network-first（保证更新生效），静态资源 cache-first（离线可用）
 */
const CACHE = "life-workbench-v7"; // v7: 首页小鹿图标重绘
const SHELL = "./life.html";
const ASSETS = [
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

function normalize(req) {
  try {
    const url = new URL(req.url);
    if (url.pathname === "/" || url.pathname === "/app/" || url.pathname.endsWith("/life.html")) {
      return new Request(SHELL, { mode: "same-origin" });
    }
    return new Request(url.origin + url.pathname, { mode: req.mode, credentials: req.credentials });
  } catch (e) {
    return req;
  }
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        ASSETS.map((u) =>
          fetch(new Request(u, { cache: "no-cache" }))
            .then((res) => c.put(normalize(new Request(u)), res))
            .catch(() => {})
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const isNavigate = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  const target = normalize(req);

  // HTML 文档：network-first → 保证用户始终拿到最新版本
  if (isNavigate) {
    e.respondWith(
      fetch(req, { cache: "reload" }).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(target, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(SHELL, { ignoreSearch: true }).then((shell) => shell || new Response("离线模式暂不可用", { status: 503 })))
    );
    return;
  }

  // 静态资源：cache-first → 离线可用 + 速度快
  e.respondWith(
    caches.match(target, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(target, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});

self.addEventListener("error", (e) => { console.error("[SW] error", e); });
self.addEventListener("unhandledrejection", (e) => { console.error("[SW] unhandledrejection", e.reason); });

// 收到页面"立即更新"指令后，跳过等待、立即激活新版本
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
