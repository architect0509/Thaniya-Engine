/* Thaniya-SoundLab 설치 (install/install.js)
 * - 서비스 워커 등록 (오프라인 실행 + 새 버전 알림)
 * - index.html 의 설치 섹션 버튼 동작
 *
 * PC용 설치 파일(.exe / .dmg / .AppImage)을 만들었다면 install/downloads/ 에 넣고
 * 아래 DOWNLOADS 에 경로를 적어 주세요. 비워 두면 브라우저 앱 설치(PWA)로 동작해요.
 */
(function () {
  'use strict';

  var DOWNLOADS = {
    windows: { url: '', meta: 'Windows 10 · 11 (64비트)' },   // 예: 'install/downloads/Thaniya-SoundLab-Setup.exe'
    mac:     { url: '', meta: 'macOS 11 이상 · Apple 실리콘 · 인텔' },   // 예: 'install/downloads/Thaniya-SoundLab.dmg'
    linux:   { url: '', meta: '64비트 · AppImage (대부분의 배포판)' }    // 예: 'install/downloads/Thaniya-SoundLab.AppImage'
  };

  var here = document.currentScript ? document.currentScript.src : location.href;
  var SW_URL = new URL('../sw.js', here).href;

  // ───────── 환경 ─────────
  var ua = navigator.userAgent;
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var os = isIOS ? 'ios' : isAndroid ? 'android'
    : /Windows/i.test(ua) ? 'windows'
    : /Mac OS X|Macintosh/i.test(ua) ? 'mac'
    : /Linux|CrOS|X11/i.test(ua) ? 'linux' : '';
  var isMobile = os === 'ios' || os === 'android';
  var browser = /Edg\//.test(ua) ? 'edge' : /SamsungBrowser/.test(ua) ? 'samsung'
    : /Firefox|FxiOS/.test(ua) ? 'firefox' : /CriOS|Chrome\//.test(ua) ? 'chrome'
    : /Safari/.test(ua) ? 'safari' : 'other';
  var standalone = function () {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: window-controls-overlay)').matches
      || navigator.standalone === true;
  };

  // ───────── 서비스 워커 (오프라인 실행) ─────────
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(SW_URL).catch(function () {});
    });
  }

  // ───────── 새 버전 알림 (install/update/update-notifier.js) ─────────
  // 설치한 앱(PC · 휴대폰)에서만 떠요. 일반 웹페이지는 열 때마다 새 파일을 받으니 알림이 필요 없어요.
  // 새 버전 내기: install/update/changelog.json 에 추가 → node install/update/release.js → 배포
  if (window.UpdateNotifier && window.TSL_APP_VERSION) {
    window.UpdateNotifier.init({
      appName: 'Thaniya-SoundLab',
      currentVersion: window.TSL_APP_VERSION,
      versionUrl: new URL('update/version.json', here).href,
      siteUrl: new URL('../index.html', here).href,
      web: false
    });
  }

  // ───────── 설치 프롬프트 ─────────
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', function () { deferred = null; markInstalled(); });

  // ───────── 설치 섹션 (index.html 에만 있음) ─────────
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    var root = document.getElementById('install');
    if (!root) return;

    if (isMobile) root.classList.add('mobile-first');

    // PC 카드: 설치 파일이 있으면 다운로드 링크로
    var anyFile = false;
    ['windows', 'mac', 'linux'].forEach(function (k) {
      var card = root.querySelector('[data-os="' + k + '"]'); if (!card) return;
      var d = DOWNLOADS[k], btn = card.querySelector('.tsi-btn'), meta = card.querySelector('.tsi-meta');
      if (d.url) {
        anyFile = true;
        btn.setAttribute('href', new URL('../' + d.url.replace(/^\.?\//, ''), here).href);
        btn.setAttribute('download', '');
        btn.dataset.file = '1';
        meta.textContent = d.meta;
      }
    });
    var warn = document.getElementById('tsiWarn'); if (warn) warn.hidden = !anyFile;

    var mine = root.querySelector('[data-os="' + os + '"]');
    if (mine) mine.classList.add('mine');

    var hostEl = document.getElementById('tsiHost');
    if (hostEl && /^https?:$/.test(location.protocol)) hostEl.textContent = location.host;

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('.tsi-btn'); if (!btn) return;
      if (btn.dataset.file) return;          // 실제 설치 파일 다운로드는 그대로 진행
      e.preventDefault();
      if (btn.classList.contains('done')) return;
      install(btn.closest('[data-os]').dataset.os);
    });

    if (standalone()) markInstalled();
  });

  function markInstalled() {
    var card = document.querySelector('#install [data-os="' + os + '"]'); if (!card) return;
    var btn = card.querySelector('.tsi-btn'); if (!btn || btn.dataset.file) return;
    btn.classList.add('done');
    btn.innerHTML = '<svg class="i" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>이 기기에 설치됨';
  }

  function install(target) {
    // 지금 기기와 다른 OS 버튼 → 그 기기에서 열라고 안내
    if (target !== os) return openOther(target);
    if (deferred) {
      var p = deferred; deferred = null;
      p.prompt();
      p.userChoice.then(function (c) { if (c.outcome === 'accepted') markInstalled(); });
      return;
    }
    guide(target);
  }

  var NAMES = { windows: 'Windows', mac: 'Mac', linux: 'Linux', android: 'Android 휴대폰', ios: 'iPhone · iPad' };

  function openOther(target) {
    var mobile = target === 'android' || target === 'ios';
    modal(NAMES[target] + '에서 열어 주세요',
      '<p>' + (mobile ? '휴대폰' : '컴퓨터') + ' 설치는 그 기기의 브라우저에서 해야 해요. ' + NAMES[target] +
      '에서 아래 주소를 열고, 이 화면의 설치 버튼을 다시 눌러 주세요.</p>' + urlBox());
  }

  function guide(target) {
    if (!/^https?:$/.test(location.protocol)) {
      return modal('웹 주소로 열어야 설치돼요', '<p>지금은 파일(file://)로 열려 있어서 설치할 수 없어요. HTTPS로 배포된 주소에서 열어 주세요.</p>');
    }
    if (target === 'ios') {
      return modal('iPhone · iPad에 설치하기', '<ol>' +
        '<li><span>' + (browser === 'safari' ? 'Safari' : '브라우저') + ' 화면의 <b>공유 버튼</b>(네모에 위쪽 화살표)을 눌러요.</span></li>' +
        '<li><span>목록을 내려서 <b>홈 화면에 추가</b>를 골라요.</span></li>' +
        '<li><span>오른쪽 위 <b>추가</b>를 누르면 홈 화면에 아이콘이 생겨요.</span></li></ol>' +
        (browser !== 'safari' ? '<p>메뉴에 “홈 화면에 추가”가 없으면 Safari에서 이 주소를 열어 주세요.</p>' : ''));
    }
    if (target === 'android') {
      if (browser === 'samsung') return modal('Android에 설치하기', '<ol>' +
        '<li><span>아래쪽 <b>메뉴(≡)</b>를 눌러요.</span></li>' +
        '<li><span><b>현재 페이지 추가 → 홈 화면</b>을 골라요.</span></li></ol>');
      if (browser === 'firefox') return modal('Android에 설치하기', '<ol>' +
        '<li><span>오른쪽 위 <b>메뉴(⋮)</b>를 눌러요.</span></li>' +
        '<li><span><b>설치</b> 또는 <b>홈 화면에 추가</b>를 골라요.</span></li></ol>');
      return modal('Android에 설치하기', '<ol>' +
        '<li><span>Chrome 오른쪽 위 <b>메뉴(⋮)</b>를 눌러요.</span></li>' +
        '<li><span><b>앱 설치</b>를 골라요. 안 보이면 <b>홈 화면에 추가 → 설치</b>를 눌러요.</span></li></ol>' +
        '<p>이미 설치했다면 홈 화면이나 앱 목록에서 SoundLab 아이콘을 찾아 주세요.</p>');
    }
    // 컴퓨터
    if (browser === 'safari') return modal('Mac에 설치하기', '<ol>' +
      '<li><span>Safari 메뉴 막대에서 <b>파일 → Dock에 추가</b>를 골라요. (macOS Sonoma 이상)</span></li>' +
      '<li><span><b>추가</b>를 누르면 Dock과 응용 프로그램 폴더에 생겨요.</span></li></ol>');
    if (browser === 'firefox' || browser === 'other') return modal('이 브라우저는 앱 설치를 지원하지 않아요',
      '<p>Chrome이나 Edge에서 아래 주소를 열고 다시 눌러 주세요.</p>' + urlBox());
    return modal(NAMES[target] + '에 설치하기', '<ol>' +
      '<li><span>주소창 오른쪽 끝의 <b>설치 아이콘</b>(모니터에 아래 화살표)을 눌러요.</span></li>' +
      '<li><span>안 보이면 ' + (browser === 'edge'
        ? '오른쪽 위 <b>…</b> 메뉴 → <b>앱 → 이 사이트를 앱으로 설치</b>'
        : '오른쪽 위 <b>⋮</b> 메뉴 → <b>전송, 저장, 공유 → 페이지를 앱으로 설치</b>') + '를 골라요.</span></li></ol>' +
      '<p>이미 설치했다면 시작 메뉴나 바탕화면에서 Thaniya-SoundLab을 찾아 주세요.</p>');
  }

  function urlBox() {
    var u = location.origin + location.pathname;
    return '<div class="tsi-url"><input type="text" readonly value="' + u.replace(/"/g, '&quot;') + '"><button type="button" class="btn" data-copy>복사</button></div>';
  }

  var box;
  function modal(title, html) {
    if (!box) {
      box = document.createElement('div');
      box.className = 'tsi-modal';
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
      box.innerHTML = '<div class="tsi-dialog"><h3></h3><div class="tsi-body"></div><div class="tsi-close-row"><button type="button" class="btn btn-primary" data-close>확인</button></div></div>';
      document.body.appendChild(box);
      box.addEventListener('click', function (e) {
        if (e.target === box || e.target.closest('[data-close]')) close();
        var cp = e.target.closest('[data-copy]');
        if (cp) {
          var inp = box.querySelector('.tsi-url input');
          var done = function () { cp.textContent = '복사됨'; setTimeout(function () { cp.textContent = '복사'; }, 1500); };
          if (navigator.clipboard) navigator.clipboard.writeText(inp.value).then(done, function () { inp.select(); });
          else { inp.select(); try { document.execCommand('copy'); done(); } catch (_) {} }
        }
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }
    box.querySelector('h3').textContent = title;
    box.querySelector('.tsi-body').innerHTML = html;
    box.classList.add('open');
    box.querySelector('[data-close]').focus();
  }
  function close() { if (box) box.classList.remove('open'); }
})();
