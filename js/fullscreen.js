/* Thaniya-SoundLab 전체화면 공용 스크립트 (index.html · mypage.html · edit.html 이 같이 씀)
 *
 * 브라우저는 '페이지를 옮기면' 전체화면을 반드시 끝내요 (보안 규칙이라 코드로 막을 수 없어요).
 * 그래서 전체화면을 켜 둔 채로 다른 페이지로 오면, 새 페이지에서 화면을 '한 번 터치/클릭'하는 순간
 * 자동으로 다시 전체화면으로 들어가게 해서 이어지는 것처럼 보이게 해요.
 */
(function () {
  'use strict';
  var KEY = 'tsl-fullscreen';
  var de = document.documentElement;
  var reqFn = de.requestFullscreen || de.webkitRequestFullscreen;
  var exitFn = document.exitFullscreen || document.webkitExitFullscreen;
  // Thaniya Engine 창 안(?engine=1 로 iframe 에 들어감)에서는 전체화면을 쓰지 않아요 — 버튼 숨김 · 자동 복귀 끔
  var EMBED = (function () { try { return /[?&]engine(=|&|$)/.test(location.search) && window.parent !== window; } catch (e) { return true; } })();
  if (EMBED) { try { sessionStorage.removeItem(KEY); } catch (e) {} }
  var canFs = !!reqFn && !EMBED;
  var isFs = function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); };

  var want = {
    get: function () { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } },
    set: function (v) { try { if (v) sessionStorage.setItem(KEY, '1'); else sessionStorage.removeItem(KEY); } catch (e) {} }
  };

  // 페이지를 떠나는 중에 생기는 '전체화면 끝남'은 사용자가 끈 게 아니므로 기억을 지우지 않음
  var leaving = false;
  window.addEventListener('beforeunload', function () { leaving = true; });
  window.addEventListener('pagehide', function () { leaving = true; });
  window.addEventListener('pageshow', function () { leaving = false; });

  var ICON_IN = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var ICON_OUT = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

  var buttons = [], listeners = [];

  function paint() {
    var on = isFs();
    buttons.forEach(function (b) {
      var o = b.opts;
      b.el.innerHTML = on ? (o.iconOut || ICON_OUT) : (o.iconIn || ICON_IN);
      b.el.title = on ? '전체화면 끝내기 (Esc)' : '전체화면';
      b.el.setAttribute('aria-label', b.el.title);
      b.el.classList.toggle('on', on);
    });
  }
  function fire() { paint(); listeners.forEach(function (f) { try { f(isFs()); } catch (e) {} }); }

  function enter() {
    if (!canFs) return Promise.reject(new Error('unsupported'));
    var r;
    try { r = reqFn.call(de); } catch (e) { return Promise.reject(e); }
    return r && r.then ? r : Promise.resolve();
  }
  function exit() {
    if (!exitFn) return Promise.resolve();
    var r; try { r = exitFn.call(document); } catch (e) { return Promise.reject(e); }
    return r && r.then ? r : Promise.resolve();
  }

  // 사용자가 버튼으로 켜고 끔 (기억해 두었다가 다음 페이지에서 이어감)
  function toggle(notify) {
    notify = notify || function (m) { try { alert(m); } catch (e) {} };
    if (!canFs) { notify('이 브라우저는 전체화면을 지원하지 않아요 (iPhone은 공유 메뉴의 \'홈 화면에 추가\'로 앱처럼 열 수 있어요)'); return; }
    if (isFs()) { want.set(false); exit().catch(function () {}); }
    else { want.set(true); enter().catch(function () { want.set(false); notify('전체화면으로 바꿀 수 없어요'); }); }
  }

  function bind(el, opts) {
    if (!el) return;
    if (EMBED) { el.hidden = true; el.style.display = 'none'; return; }
    opts = opts || {};
    buttons.push({ el: el, opts: opts });
    el.addEventListener('click', function (e) { e.preventDefault(); toggle(opts.notify); });
    paint();
  }

  function onChange(f) { listeners.push(f); }

  var onFsChange = function () {
    fire();
    if (!isFs()) {
      // 페이지를 떠나는 중이면 기억 유지, 사용자가 Esc 등으로 직접 끈 거면 기억 삭제
      setTimeout(function () { if (!leaving && !isFs()) want.set(false); }, 150);
    }
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  // ── 다른 페이지에서 넘어왔을 때: 첫 터치/클릭에 전체화면 복귀
  var hint = null;
  function hideHint() { if (hint) { hint.remove(); hint = null; } }
  function showHint() {
    if (hint || !document.body) return;
    hint = document.createElement('div');
    hint.textContent = '화면을 한 번 터치하면 전체화면이 이어져요';
    hint.setAttribute('style', 'position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483000;max-width:88vw;padding:9px 14px;border-radius:999px;background:rgba(20,21,24,.94);color:#e8eaee;border:1px solid rgba(242,194,48,.55);font:600 12.5px system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.45);pointer-events:none;white-space:nowrap');
    document.body.appendChild(hint);
    setTimeout(hideHint, 4500);
  }
  if (canFs && want.get() && !isFs()) {
    var evs = ['pointerup', 'touchend', 'click', 'keydown'];
    var off = function () { evs.forEach(function (n) { window.removeEventListener(n, tryBack, true); }); };
    var tryBack = function (e) {
      if (!want.get()) { off(); hideHint(); return; }
      if (isFs()) { off(); hideHint(); return; }
      if (e.type === 'keydown' && (e.key === 'Escape' || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta')) return;
      enter().then(function () { off(); hideHint(); }).catch(function () {});
    };
    evs.forEach(function (n) { window.addEventListener(n, tryBack, true); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showHint); else showHint();
  }

  window.TSFS = { embedded: EMBED, canFs: canFs, isFs: isFs, toggle: toggle, bind: bind, onChange: onChange, icons: { enter: ICON_IN, exit: ICON_OUT } };
  window.dispatchEvent(new Event('tsl-fs-ready'));
})();
