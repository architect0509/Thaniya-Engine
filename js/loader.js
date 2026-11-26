/* Thaniya-SoundLab 로딩 화면 (loader.js)
 * - <head> 맨 위에서 불러오면 화면이 그려지기 전에 바로 덮어요
 * - 페이지를 다 불러오면(load) 부드럽게 사라지고, 다른 화면으로 넘어갈 때 다시 떠요
 * - data-wait="1"  : 스크립트 로더가 TSLoader.done() 을 부를 때까지 기다려요 (편집 · 마이페이지)
 * - data-theme="light" : 밝은 화면 (응애모드)
 * - 다른 스크립트에서: TSLoader.show('문구') · TSLoader.hide() · TSLoader.done()
 */
(function () {
  'use strict';
  if (window.TSLoader) return;
  var me = document.currentScript;
  var WAIT = !!(me && me.dataset.wait);
  var LIGHT = !!(me && me.dataset.theme === 'light');
  var BASE = me ? me.src : location.href;
  var LOGO = new URL('../Asset/icon.png', BASE).href;
  var TIPS = [
    '흥얼거리면 음표가 찍혀요',
    'L 키로 한 부분만 반복해서 들어요',
    'J 키로 반주와 비트를 얹어요',
    '만든 곡은 이 브라우저에 자동으로 저장돼요',
    '마이페이지에서 응애모드로 쉽게 작곡할 수 있어요',
    'Shift + L 로 곡 전체를 무한 반복해요'
  ];
  if (LIGHT) TIPS = ['칸을 톡 누르면 음이 생겨요', '아래 동그라미는 북 소리예요', '반복을 켜면 계속 돌아가요', '다 만들면 저장을 눌러요'];

  var css = '' +
    '#tslLoad{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;' +
    'background:' + (LIGHT ? '#f2f2f7' : '#0a0b0d') + ';color:' + (LIGHT ? '#1c1c1e' : '#e8eaee') + ';' +
    'font:500 14px/1.4 "Noto Sans KR",-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Segoe UI",system-ui,sans-serif;' +
    'transition:opacity .35s ease,visibility .35s;-webkit-user-select:none;user-select:none}' +
    '#tslLoad.off{opacity:0;visibility:hidden;pointer-events:none}' +
    '#tslLoad .tl-in{display:flex;flex-direction:column;align-items:center;gap:18px;opacity:0;animation:tlIn .4s ease .12s forwards}' +
    '#tslLoad .tl-logo{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;overflow:hidden;' +
    'background:' + (LIGHT ? '#fff' : '#16171b') + ';box-shadow:' + (LIGHT ? '0 8px 24px rgba(0,0,0,.08)' : '0 0 0 1px #24262b,0 10px 30px rgba(0,0,0,.5)') + '}' +
    '#tslLoad .tl-logo img{width:100%;height:100%;object-fit:cover}' +
    '#tslLoad .tl-eq{display:flex;align-items:flex-end;gap:5px;height:30px}' +
    '#tslLoad .tl-eq i{display:block;width:6px;height:100%;border-radius:3px;transform-origin:bottom;animation:tlEq 1s ease-in-out infinite;' +
    'background:' + (LIGHT ? '#007aff' : '#f2c230') + '}' +
    (LIGHT ? '#tslLoad .tl-eq i:nth-child(2){background:#34c759}#tslLoad .tl-eq i:nth-child(3){background:#ff9500}#tslLoad .tl-eq i:nth-child(4){background:#ff2d55}#tslLoad .tl-eq i:nth-child(5){background:#af52de}' : '') +
    '#tslLoad .tl-eq i:nth-child(2){animation-delay:-.8s}#tslLoad .tl-eq i:nth-child(3){animation-delay:-.6s}#tslLoad .tl-eq i:nth-child(4){animation-delay:-.4s}#tslLoad .tl-eq i:nth-child(5){animation-delay:-.2s}' +
    '#tslLoad .tl-msg{font-weight:700;letter-spacing:.02em}' +
    '#tslLoad .tl-tip{font-size:12.5px;opacity:.55;min-height:18px;text-align:center;padding:0 24px;transition:opacity .3s}' +
    '@keyframes tlIn{to{opacity:1}}' +
    '@keyframes tlEq{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}' +
    '@media (prefers-reduced-motion:reduce){#tslLoad .tl-eq i{animation-duration:3s}}';

  var st = document.createElement('style'); st.id = 'tslLoadCss'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  var box = document.createElement('div');
  box.id = 'tslLoad'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
  box.innerHTML = '<div class="tl-in"><div class="tl-logo"><img alt="" draggable="false"></div>' +
    '<div class="tl-eq"><i></i><i></i><i></i><i></i><i></i></div>' +
    '<div class="tl-msg">불러오는 중</div><div class="tl-tip"></div></div>';
  var img = box.querySelector('img');
  img.onerror = function () { img.remove(); };
  img.src = LOGO;
  var msgEl = box.querySelector('.tl-msg'), tipEl = box.querySelector('.tl-tip');
  (document.body || document.documentElement).appendChild(box);
  // body 가 생기면 그쪽으로 옮겨요 (스타일 · 쌓임 순서 안정)
  if (!document.body) document.addEventListener('DOMContentLoaded', function () { if (box.parentNode !== document.body) document.body.appendChild(box); });

  var tipT = 0, tipI = Math.floor(Math.random() * TIPS.length), safeT = 0;
  function tips(on) {
    clearInterval(tipT);
    if (!on) return;
    tipEl.textContent = TIPS[tipI % TIPS.length];
    tipT = setInterval(function () {
      tipI++; tipEl.style.opacity = '0';
      setTimeout(function () { tipEl.textContent = TIPS[tipI % TIPS.length]; tipEl.style.opacity = ''; }, 300);
    }, 2600);
  }
  function show(text, safeMs) {
    msgEl.textContent = text || '불러오는 중';
    box.classList.remove('off'); tips(true);
    clearTimeout(safeT);
    if (safeMs) safeT = setTimeout(hide, safeMs);
  }
  function hide() { clearTimeout(safeT); box.classList.add('off'); tips(false); }

  // 첫 화면: load + (필요하면) done() 둘 다 끝나면 닫아요
  var loaded = document.readyState === 'complete', ready = !WAIT;
  function check() { if (loaded && ready) hide(); }
  window.addEventListener('load', function () { loaded = true; check(); });
  show('불러오는 중', 15000);   // 무언가 실패해도 15초 뒤엔 반드시 닫아요

  // 다른 화면으로 넘어갈 때
  window.addEventListener('beforeunload', function () {
    setTimeout(function () { show('화면 여는 중', 5000); }, 0);   // 나가기 확인 창을 취소하면 5초 뒤 저절로 닫혀요
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) hide(); });   // 뒤로 가기로 돌아왔을 때
  ['pointerdown', 'keydown'].forEach(function (t) {   // 떠난 줄 알았는데 남아 있으면 (다운로드 · 취소) 바로 닫기
    window.addEventListener(t, function () { if (loaded && ready && !box.classList.contains('off') && box.dataset.busy !== '1') hide(); }, true);
  });

  window.TSLoader = {
    show: function (text) { box.dataset.busy = '1'; show(text, 30000); },
    hide: function () { box.dataset.busy = ''; hide(); },
    done: function () { ready = true; check(); },
    go: function (url) { show('화면 여는 중', 6000); setTimeout(function () { location.href = url; }, 30); }
  };
})();
