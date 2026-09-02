/* ═══════════════════════════════════════════════════
   토목옹벽 — 옹벽 구조물 안전성 검토 시스템  MANMIN Ver-5.0
   Service Worker — 오프라인 캐시 + 버전 업데이트
   ENGINEER KIM MANMIN

   v5.0.0 (2026-09-03)
   ───────────────────────────────────────────────────
   [변경] 문서(HTML)까지 Cache-first 로 처리하던 v2.0 구조를 고쳤다.
          그 상태에서는 index.html 을 수정·배포해도 캐시명을 올리기 전에는
          사용자 화면에 영구히 반영되지 않는다(§11-2 ①②).
   ⛔ navigate 분기를 제거하지 말 것. 제거하면 배포가 화면에 반영되지 않는다.
   [변경] 캐시 삭제 범위를 자기 접두어(PREFIX)로 한정했다(§17-1).
          caches.keys() 는 origin 전체를 반환해, 종전 `k !== CACHE` 필터는
          같은 origin 의 나머지 38종 캐시를 전부 지웠다.
   [변경] 종전 캐시명 'retwall-v2.0' 은 접두어가 같아 PREFIX 필터로 지워지지만,
          ORPHAN 배열에도 명시해 둔다(§18-7).
   ⛔ cache.addAll 은 원자적이다. 목록 중 하나라도 404 면 설치가 통째로 실패해
      SW 가 아예 안 붙는다 → allSettled + 개별 catch 로 감쌌다(§11-3).
═══════════════════════════════════════════════════ */
const PREFIX = 'retwall-';
const CACHE  = 'retwall-v5.0.0';   /* 2026-09-03 v5.0 디자인 통일 */
const ORPHAN = ['retwall-v2.0'];
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/brand-icon.jpg',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png',
  './favicon.ico',
  './icons/favicon-32.png',
  './icons/favicon-16x16.png',
  './icons/icon-32x32.png',
  /* v5.0 — 로컬 폴백 폰트. CDN 차단·오프라인 시 한글 깨짐 방지 (§3-7) */
  './assets/fonts/manmin-fonts.css',
  './assets/fonts/NotoSansKR-var.woff2',
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=JetBrains+Mono:wght@400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

self.addEventListener('install', e => {
  console.log('[SW] Install:', CACHE);
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(
        ASSETS.map(u => c.add(u).catch(err => console.warn('[SW] precache skip:', u, err)))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  console.log('[SW] Activate:', CACHE);
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        /* ⛔ 자기 접두어(+ORPHAN)만 지운다. caches.keys() 는 origin 전체를 반환하므로
           manminkim-eng.github.io 를 39종이 공유하는 이 구조에서 무조건 지우면
           나머지 38종의 캐시를 통째로 날린다(§17-1 · §18-7). */
        keys.filter(k => k !== CACHE && (k.indexOf(PREFIX) === 0 || ORPHAN.indexOf(k) !== -1))
            .map(k => { console.log('[SW] 구버전 캐시 삭제:', k); return caches.delete(k); })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;

  /* ══ ⛔ 핵심 ══ HTML 문서는 Network-first.
     네트워크가 되면 항상 최신을 보여주고, 끊겼을 때만 캐시로 떨어진다. */
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  /* ══ 정적 자산: Cache-First + 백그라운드 갱신 ══ */
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        fetch(e.request).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'GET_VERSION' && e.ports[0]) {
    e.ports[0].postMessage({ version: CACHE });
  }
});

console.log('[SW] loaded:', CACHE);
