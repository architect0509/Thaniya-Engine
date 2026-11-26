/* ═══ Update Notifier — 새 버전 알림 양식 (Meow-PDF v1.3.3 에서 떼어 낸 독립 버전) ═══
   [SoundLab] 설정은 install/install.js 에서 해요. 바꾼 곳: 창 컨트롤 오버레이(window-controls-overlay) 모드도 설치한 앱으로 인식.
   · 사이트의 version.json 을 읽어 지금 버전보다 새 버전이 있으면
     오른쪽 아래 작은 창(새 버전이 있어요! · 자세히 보기 · 업데이트 · 닫기)을 띄워요.
   · 데스크톱 앱(Electron): 브리지(window.appUpdater)가 있으면 앱이 내려받고 → 진행률 표시 → ‘다시 시작해서 설치’.
     자동 업데이트가 안 되는 운영체제(서명 안 한 macOS 등)는 다운로드 페이지를 열어요.
   · 홈 화면에 설치한 웹앱(PWA): 서비스 워커를 새로 받고 다시 열어요.
   · 일반 웹페이지: 기본으로는 아무것도 안 해요 (web: true 로 켜면 ‘새로고침’ 방식으로 알려요).
   · 업데이트한 뒤 처음 켜면 ‘vX 버전으로 업데이트했어요’ 를 한 번 알려요.
   · 의존성 없음. update-notifier.css 와 함께 넣으세요.

   사용법:
     <link rel="stylesheet" href="update-notifier.css">
     <script src="update-notifier.js"></script>
     <script>
       UpdateNotifier.init({
         appName: 'My App',
         currentVersion: 'v1.0.0',                          // 지금 버전
         versionUrl: 'https://example.com/version.json',     // 최신 버전 정보
         siteUrl: 'https://example.com/',                    // 다운로드 주소를 못 찾을 때 열 곳
       });
     </script>
*/
(function (global) {
  'use strict';

  /* ── 기본 설정 ── */
  const DEF = {
    appName: 'App',
    currentVersion: '0.0.0',
    versionUrl: '/version.json',
    siteUrl: '/',
    bridge: null,                // 데스크톱 브리지. 비우면 window.appUpdater 를 찾아요
    web: false,                  // 일반 웹페이지에서도 알릴지 (true 면 ‘업데이트’ = 새로고침)
    firstCheckDelay: 2500,       // 켠 뒤 첫 확인까지 (ms)
    checkEvery: 6 * 3600e3,      // 데스크톱: 다시 확인하는 간격 (ms)
    pwaRecheck: 30 * 60e3,       // PWA/웹: 화면으로 돌아왔을 때 다시 확인할 최소 간격 (ms)
    cacheFor: 10 * 60e3,         // 이 시간 안에는 version.json 을 다시 받지 않아요 (force 제외)
    lang: null,                  // version.json 의 items 가 언어별일 때 고를 언어 (기본: <html lang> → 'ko')
    github: null,                // { repo: 'owner/name', assets: { win: 'X-Setup.exe', mac: 'X.dmg', linux: 'X.AppImage' } }
                                 //  → 설치 파일이 릴리스에 실제로 올라온 뒤에만 알려요 (선택)
    storageKey: 'updNotifier',   // localStorage 키 앞부분
    mount: null,                 // 작은 창을 넣을 곳 (기본: 오른쪽 아래 #updStack 자동 생성)
    text: {},                    // 문구 바꾸기 (아래 TXT 참고)
    onNewVersion: null,          // (info, news) => {}  새 버전을 처음 찾았을 때 (앱의 알림함 등에 넣을 때 사용)
    onUpdated: null,             // (version, notes) => {}  업데이트 후 처음 켰을 때
    toast: null,                 // (msg) => {}  앱에 토스트가 있으면 그걸 써요
  };

  const TXT = {
    title: '새 버전이 있어요!',
    current: '지금 버전',
    more: '자세히 보기',
    update: '업데이트',
    later: '나중에',
    close: '닫기',
    ok: '확인',
    checking: '확인 중…',
    downloading: '내려받는 중…',
    restart: '다시 시작해서 설치',
    reload: '새로고침',
    detailsTitle: '새 버전',
    detailsDesc: '지금 쓰는 버전: {cur} · 새 버전에서 바뀐 내용이에요.',
    noNotes: '바뀐 내용을 불러오지 못했어요.',
    notesTitle: '{ver} 업데이트 내용',
    updated: '{ver} 버전으로 업데이트했어요.',
    checkFail: '새 버전을 확인하지 못했어요. 인터넷 연결을 확인해 주세요.',
    openedDownload: '다운로드 페이지를 열었어요. 새 설치 파일을 실행하면 업데이트돼요.',
    notReady: '새 설치 파일을 준비하고 있어요. 잠시 뒤 다시 시도해 주세요.',
    autoFail: '자동 업데이트를 하지 못해 다운로드 페이지를 열었어요.',
    downloaded: '새 버전을 내려받았어요. 다시 시작하면 설치돼요.',
    // 설정 패널
    secTitle: '프로그램 업데이트',
    installed: '설치한 {app} {cur}',
    stChecking: '새 버전을 확인하고 있어요…',
    stNew: '{ver} 새 버전이 있어요.',
    stPreparing: '{ver} 새 버전의 설치 파일을 준비하고 있어요. 잠시 뒤 다시 확인해 주세요.',
    stLatest: '최신 버전을 쓰고 있어요.',
    recheck: '다시 확인',
    isLatest: '최신 버전이에요',
  };

  /* ── 도구 ── */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
  const verNum = v => String(v || '').replace(/^v/i, '').split(/[.\-+]/).map(n => parseInt(n, 10) || 0);
  function verCmp(a, b) {
    const A = verNum(a), B = verNum(b);
    for (let i = 0; i < Math.max(A.length, B.length); i++) { const d = (A[i] || 0) - (B[i] || 0); if (d) return d > 0 ? 1 : -1; }
    return 0;
  }
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 무시 */ } },
  };
  const ICON = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  };

  /* ── 상태 ── */
  let C = null, T = TXT, DESK = null, PWA = false, MODE = 'off';
  const U = { info: null, at: 0, busy: false, err: '', st: null, winOff: false, ready: true, dlUrl: '' };

  const cur = () => C.currentVersion;
  const lang = () => C.lang || (document.documentElement.lang || 'ko').slice(0, 2);
  const newVer = () => (U.info && U.info.version) || '';
  const newerRaw = () => !!(newVer() && verCmp(newVer(), cur()) > 0);
  const newer = () => newerRaw() && U.ready !== false;
  const os = () => { const p = DESK && DESK.platform; return p === 'win32' ? 'win' : p === 'darwin' ? 'mac' : 'linux'; };
  const dlUrl = () => { if (U.dlUrl) return U.dlUrl; const d = U.info && U.info.download; return (d && (d[os()] || d.page)) || C.siteUrl; };
  const items = h => { const it = h && h.items; if (Array.isArray(it)) return it; return (it && (it[lang()] || it.ko || it.en || Object.values(it)[0])) || []; };
  function news() {
    const H = U.info && Array.isArray(U.info.history) ? U.info.history : [];
    return H.filter(h => h && verCmp(h.v, cur()) > 0).sort((a, b) => verCmp(b.v, a.v));
  }
  const openExt = url => { try { if (DESK && DESK.openExternal) return DESK.openExternal(url); } catch (e) { /* 무시 */ } window.open(url, '_blank', 'noopener'); };

  /* ── 토스트 ── */
  function toast(msg) {
    if (typeof C.toast === 'function') { try { return C.toast(msg); } catch (e) { /* 무시 */ } }
    let t = document.getElementById('updToast');
    if (!t) { t = document.createElement('div'); t.id = 'updToast'; t.className = 'upd-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 3200);
  }

  /* ── 모달 (자세히 보기) ── */
  function modal({ title, html, buttons }) {
    return new Promise(res => {
      const bg = document.createElement('div'); bg.className = 'upd-modal-bg';
      bg.innerHTML = `<div class="upd-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <button type="button" class="updx" data-m="x" title="${esc(T.close)}" aria-label="${esc(T.close)}">${ICON.x}</button>
        <h3>${esc(title)}</h3><div class="upd-modal-body">${html}</div>
        <div class="updbtns">${buttons.map((b, i) => `<button type="button" class="sb${b.ok ? ' pri' : ''}" data-m="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
      const done = v => { document.removeEventListener('keydown', key); bg.remove(); res(v); };
      const key = e => { if (e.key === 'Escape') done(null); };
      bg.addEventListener('click', e => {
        if (e.target === bg) return done(null);
        const b = e.target.closest('[data-m]'); if (!b) return;
        done(b.dataset.m === 'x' ? null : buttons[+b.dataset.m].value);
      });
      document.addEventListener('keydown', key);
      document.body.appendChild(bg);
      const p = bg.querySelector('.sb.pri'); if (p) p.focus();
    });
  }

  /* ── GitHub 릴리스에 이 운영체제의 설치 파일이 실제로 올라왔는지 (선택) ── */
  async function ghReady(ver) {
    const g = C.github; if (!g || !g.repo) return null;
    try {
      const r = await fetch(`https://api.github.com/repos/${g.repo}/releases/latest`, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
      if (!r.ok) return null;
      const j = await r.json(), name = g.assets && g.assets[os()];
      const a = (j.assets || []).find(x => x && x.name === name && (!x.state || x.state === 'uploaded'));
      return { ok: !!a && verCmp(j.tag_name, ver) >= 0, url: a ? a.browser_download_url : '' };
    } catch (e) { return null; }   // 확인하지 못하면 그냥 알려요
  }

  /* ── 새 버전 확인 ── */
  async function check(force) {
    if (MODE === 'off') return null;
    if (!force && U.info && Date.now() - U.at < C.cacheFor) return U.info;
    if (U.busy) return U.info;
    U.busy = true; U.err = ''; ui();
    try {
      const sep = C.versionUrl.includes('?') ? '&' : '?';
      const r = await fetch(C.versionUrl + sep + 't=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); if (!j || !j.version) throw new Error('bad version.json');
      U.info = j; U.at = Date.now(); U.ready = true; U.dlUrl = '';
      if (DESK && verCmp(j.version, cur()) > 0) { const g = await ghReady(j.version); if (g) { U.ready = g.ok; U.dlUrl = g.url || ''; } }
    } catch (e) { U.err = T.checkFail; }
    U.busy = false; ui();
    return U.info;
  }

  /* 새 버전을 처음 찾았을 때 한 번만 onNewVersion 을 불러요 (버전마다 한 번) */
  function notifyOnce() {
    const v = newVer(); if (!v) return;
    let done = []; try { done = JSON.parse(store.get(C.storageKey + 'Notified') || '[]'); } catch (e) { done = []; }
    if (!Array.isArray(done)) done = [];
    if (done.includes(v)) return;
    done.push(v); store.set(C.storageKey + 'Notified', JSON.stringify(done.slice(-20)));
    if (typeof C.onNewVersion === 'function') { try { C.onNewVersion(U.info, news()); } catch (e) { /* 무시 */ } }
  }

  /* ── 업데이트 실행 ── */
  async function pwaUpdate() {   // 서비스 워커를 새로 받고 다시 열어요 (페이지가 인터넷 우선이면 새 버전이 열려요)
    U.st = { state: 'checking' }; ui();
    try { const r = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (r) await Promise.race([r.update(), new Promise(res => setTimeout(res, 4000))]); } catch (e) { /* 무시 */ }
    location.reload();
  }
  async function go() {
    if (MODE === 'pwa' || MODE === 'web') return pwaUpdate();
    if (!DESK) return;
    const s = U.st && U.st.state;
    if (s === 'ready') { try { DESK.install(); } catch (e) { openExt(dlUrl()); } return; }
    if (s === 'checking' || s === 'downloading') return;
    if (DESK.autoUpdate !== false && typeof DESK.start === 'function') {
      U.st = { state: 'checking' }; ui();
      let r = null; try { r = await DESK.start(); } catch (e) { r = { state: 'error' }; }
      if (r && (r.state === 'error' || r.state === 'none')) return onStatus(r);
      if (r && r.state && r.state !== 'checking') U.st = r;
      if (U.st && U.st.state === 'external') { U.st = null; toast(T.openedDownload); }
      ui();
    } else { openExt(dlUrl()); toast(T.openedDownload); }
  }
  /* 데스크톱 앱이 보내 주는 상태: checking · downloading(percent) · ready · none · error */
  function onStatus(st) {
    U.st = st && st.state ? st : null;
    const s = U.st && U.st.state;
    if (s === 'none') { U.st = null; toast(T.notReady); }
    else if (s === 'error') { U.st = null; openExt(dlUrl()); toast(T.autoFail); }
    else if (s === 'ready') toast(T.downloaded);
    ui();
  }
  function btnLabel() {
    const s = U.st && U.st.state;
    if (s === 'checking') return T.checking;
    if (s === 'downloading') return `${T.downloading} ${Math.round(U.st.percent || 0)}%`;
    if (s === 'ready') return T.restart;
    return MODE === 'web' ? T.reload : T.update;
  }

  /* ── 오른쪽 아래 작은 창 ── */
  function stack() {
    if (C.mount) return C.mount;
    let s = document.getElementById('updStack');
    if (!s) { s = document.createElement('div'); s.id = 'updStack'; document.body.appendChild(s); }
    return s;
  }
  function win() {
    let w = document.getElementById('updWin');
    const show = MODE !== 'off' && newer() && !U.winOff;
    if (!show) { if (w) w.hidden = true; return; }
    if (!w) {
      w = document.createElement('div'); w.id = 'updWin'; w.className = 'updwin';
      w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', T.title);
      stack().appendChild(w);
      w.addEventListener('click', e => {
        const a = e.target.closest('[data-u]'); if (!a) return;
        if (a.dataset.u === 'close') { U.winOff = true; win(); }
        else if (a.dataset.u === 'more') details();
        else if (a.dataset.u === 'go') go();
      });
    }
    const s = U.st && U.st.state, pct = s === 'downloading' ? Math.round(U.st.percent || 0) : null;
    w.innerHTML = `<button type="button" class="updx" data-u="close" title="${esc(T.close)}" aria-label="${esc(T.close)}">${ICON.x}</button>
      <div class="updh"><span class="updic">${ICON.download}</span><div><b>${esc(T.title)}</b><small>${esc(newVer())} · ${esc(T.current)} ${esc(cur())}</small></div></div>
      ${pct != null ? `<div class="updprog" aria-hidden="true"><i style="width:${pct}%"></i></div>` : ''}
      <div class="updbtns"><button type="button" class="sb" data-u="more">${esc(T.more)}</button><button type="button" class="sb pri" data-u="go"${s === 'checking' || s === 'downloading' ? ' disabled' : ''}>${esc(btnLabel())}</button></div>`;
    w.hidden = false;
  }

  /* ── 자세히 보기: 지금 버전 이후에 바뀐 내용 ── */
  function listHtml(list) {
    if (!list.length) return `<p class="upd-desc">${esc(T.noNotes)}</p>`;
    return list.map(h => `<div class="updv"><div class="updvh"><b>${esc(h.v)}</b><small>${esc(h.d || '')}</small></div><ul>${items(h).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
  }
  async function details() {
    if (!U.info) await check(true);
    const ready = U.st && U.st.state === 'ready';
    const v = await modal({
      title: T.detailsTitle + ' ' + newVer(),
      html: `<p class="upd-desc">${fmt(esc(T.detailsDesc), { cur: `<b>${esc(cur())}</b>` })}</p><div class="updlist">${listHtml(news())}</div>`,
      buttons: [{ label: T.later, value: null }, { label: ready ? T.restart : btnLabel(), value: 'go', ok: true }],
    });
    if (v === 'go') go();
  }
  /* 특정 버전의 바뀐 내용 (업데이트 후 알림에서 사용) */
  function notes(ver) {
    const H = U.info && Array.isArray(U.info.history) ? U.info.history : [];
    const h = H.find(x => x.v === ver);
    return modal({
      title: fmt(T.notesTitle, { ver }),
      html: `<div class="updlist">${h ? listHtml([h]) : `<p class="upd-desc">${esc(T.noNotes)}</p>`}</div>`,
      buttons: [{ label: T.ok, value: null, ok: true }],
    });
  }

  /* ── 설정 패널 (선택): UpdateNotifier.renderSettings(el) 로 원하는 곳에 넣어요 ── */
  const panels = new Set();
  function panelHtml() {
    const s = U.st && U.st.state, nw = newer();
    let st, btn;
    if (U.busy && !U.info) { st = esc(T.stChecking); btn = `<button class="sb" disabled>${esc(T.checking)}</button>`; }
    else if (nw) { st = fmt(esc(T.stNew), { ver: `<b>${esc(newVer())}</b>` }); btn = `<button class="sb pri" data-p="go"${s === 'checking' || s === 'downloading' ? ' disabled' : ''}>${esc(btnLabel())}</button><button class="sb" data-p="more">${esc(T.more)}</button>`; }
    else if (U.info && newerRaw()) { st = fmt(esc(T.stPreparing), { ver: `<b>${esc(newVer())}</b>` }); btn = `<button class="sb" data-p="chk">${esc(T.recheck)}</button>`; }
    else if (U.info) { st = esc(T.stLatest); btn = `<button class="sb" data-p="chk" title="${esc(T.recheck)}">${ICON.check}<span>${esc(T.isLatest)}</span></button>`; }
    else { st = esc(U.err || T.checkFail); btn = `<button class="sb" data-p="chk">${esc(T.recheck)}</button>`; }
    return `<div class="upd-panel"><h3>${esc(T.secTitle)}</h3><p class="upd-desc">${fmt(esc(T.installed), { app: esc(C.appName), cur: `<b>${esc(cur())}</b>` })} · <span>${st}</span></p><div class="updbtns upd-panel-btns">${btn}</div></div>`;
  }
  function renderSettings(el) {
    if (!el) return;
    panels.add(el);
    if (!el._updWired) {
      el._updWired = true;
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-p]'); if (!b) return;
        if (b.dataset.p === 'go') go(); else if (b.dataset.p === 'more') details(); else if (b.dataset.p === 'chk') check(true);
      });
    }
    el.innerHTML = panelHtml();
    if (!U.info && !U.busy) check(true);
  }

  function ui() {
    if (!C) return;
    win();
    panels.forEach(el => { if (el.isConnected) el.innerHTML = panelHtml(); else panels.delete(el); });
  }

  /* ── 업데이트한 뒤 처음 켰을 때 한 번 알려요 ── */
  function afterUpdate() {
    const k = C.storageKey + 'LastVer', pv = store.get(k);
    store.set(k, cur());
    if (!pv || verCmp(cur(), pv) <= 0) return;
    setTimeout(() => toast(fmt(T.updated, { ver: cur() })), 1800);
    if (typeof C.onUpdated === 'function') { try { C.onUpdated(cur(), () => notes(cur())); } catch (e) { /* 무시 */ } }
  }

  /* ── 시작 ── */
  function init(opts) {
    C = Object.assign({}, DEF, opts || {});
    T = Object.assign({}, TXT, C.text || {});
    DESK = C.bridge || (() => { try { return global.appUpdater && global.appUpdater.isDesktop ? global.appUpdater : null; } catch (e) { return null; } })();
    PWA = !DESK && (() => { try { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: minimal-ui)').matches || matchMedia('(display-mode: window-controls-overlay)').matches || navigator.standalone === true; } catch (e) { return false; } })();
    MODE = DESK ? 'desktop' : PWA ? 'pwa' : C.web ? 'web' : 'off';
    document.documentElement.classList.add('upd-' + MODE);

    afterUpdate();
    if (MODE === 'off') return api;

    const run = async () => {
      if (navigator.onLine === false) return;
      lastRun = Date.now();
      await check(true);
      if (newer()) { notifyOnce(); U.winOff = false; win(); }
    };
    let lastRun = 0;
    setTimeout(run, C.firstCheckDelay);

    if (DESK) {
      try { if (typeof DESK.onStatus === 'function') DESK.onStatus(onStatus); } catch (e) { /* 무시 */ }
      if (C.checkEvery) setInterval(run, C.checkEvery);
    } else {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - lastRun > C.pwaRecheck) run(); });
      global.addEventListener('online', () => { if (Date.now() - lastRun > 5 * 60e3) run(); });
    }
    return api;
  }

  const api = {
    init,
    check: () => check(true),              // 지금 다시 확인
    update: () => go(),                    // ‘업데이트’ 버튼과 같아요
    showDetails: () => details(),          // 자세히 보기 창
    showNotes: ver => notes(ver || cur()), // 특정 버전의 바뀐 내용
    renderSettings,                        // 설정 패널 넣기
    hasUpdate: () => newer(),
    getInfo: () => U.info,
    getNews: () => news(),
    getMode: () => MODE,                   // 'desktop' · 'pwa' · 'web' · 'off'
    compare: verCmp,
  };
  global.UpdateNotifier = api;
})(window);
