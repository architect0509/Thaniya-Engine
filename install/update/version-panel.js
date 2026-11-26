/* 설정 › 버전 정보 (install/update/version-panel.js)
 * edit.html 설정 창의 <section data-pg="version"> 안 #tslVer 를 채워요.
 *  · 앱 카드 (이름 · 지금 버전 · 사이트)
 *  · 튜토리얼 다시 보기 · Thaniya.co.kr
 *  · 프로그램 업데이트 (Update Notifier 의 설정 패널)
 *  · 업데이트 내역 — changelog.json 을 1.0.x 처럼 묶어서 접었다 펼 수 있게
 * changelog.json 의 각 버전에 "title"(짧은 요약)을 적으면 묶음 줄에 · 로 이어 보여 줘요.
 */
(function () {
  'use strict';
  var here = document.currentScript ? document.currentScript.src : location.href;
  var CHANGELOG = new URL('changelog.json', here).href;
  var ICON = new URL('../../Asset/icon.png', here).href;
  var SITE = 'https://thaniya.co.kr/';

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var num = function (v) { return String(v || '').replace(/^v/i, '').split('.').map(function (n) { return parseInt(n, 10) || 0; }); };
  var cmp = function (a, b) { var A = num(a), B = num(b); for (var i = 0; i < Math.max(A.length, B.length); i++) { var d = (A[i] || 0) - (B[i] || 0); if (d) return d > 0 ? 1 : -1; } return 0; };
  var series = function (v) { var n = num(v); return n[0] + '.' + (n[1] || 0) + '.x'; };
  var items = function (h) { var it = h && h.items; if (Array.isArray(it)) return it; return (it && (it.ko || it.en || Object.values(it)[0])) || []; };

  var I = {
    chev: '<svg class="tvChev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    book: '<svg class="i" viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z"/></svg>',
    globe: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/></svg>',
    ext: '<svg class="i tvExt" viewBox="0 0 24 24"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    dl: '<svg class="i" viewBox="0 0 24 24"><path d="M12 4v11"/><path d="M7 10.5l5 5 5-5"/><path d="M5 20h14"/></svg>'
  };

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function () {
    var box = document.getElementById('tslVer'); if (!box) return;
    var cur = window.TSL_APP_VERSION || '';

    box.innerHTML =
      '<div class="smRow tvHero" data-q="버전 정보 version 앱 정보 about thaniya soundlab">' +
        '<div class="tvLogo"><img src="' + esc(ICON) + '" alt=""></div>' +
        '<div class="tvMeta"><div class="tvName">Thaniya-SoundLab' + (cur ? '<span class="tvBadge">' + esc(cur) + '</span>' : '') + '</div>' +
        '<p>브라우저에서 바로 쓰는 작곡 스튜디오 · <a href="' + SITE + '" target="_blank" rel="noopener noreferrer">thaniya.co.kr</a></p></div>' +
      '</div>' +
      '<div class="smRow tvLinks" data-q="튜토리얼 다시 보기 사용법 tutorial 사이트 홈페이지 thaniya">' +
        '<button type="button" class="tvBtn" id="tvTut">' + I.book + '튜토리얼 다시 보기</button>' +
        '<a class="tvBtn" href="' + SITE + '" target="_blank" rel="noopener noreferrer">' + I.globe + 'Thaniya.co.kr' + I.ext + '</a>' +
      '</div>' +
      '<div class="smRow tvUpd" data-q="업데이트 새 버전 확인 update 최신"><div id="tvUpd"></div></div>' +
      '<div class="tvHistWrap"><h3 class="tvH3">업데이트 내역</h3><div class="tvHist" id="tvHist"><p class="tvEmpty">불러오는 중…</p></div></div>';

    // 튜토리얼: 설정 창 왼쪽 아래 '튜토리얼' 단추와 같아요
    document.getElementById('tvTut').onclick = function () { var b = document.getElementById('smTut'); if (b) b.click(); };

    // 왼쪽 아래 앱 카드에 버전 표시 + 누르면 버전 정보로
    var app = document.querySelector('#setM .smApp');
    if (app) {
      var sub = app.querySelector('span'); if (sub && cur) sub.textContent = '작곡을 간단하게 · ' + cur;
      app.style.cursor = 'pointer'; app.title = '버전 정보';
      app.addEventListener('click', function () { var nb = document.querySelector('#setM .smNav [data-pg="version"]'); if (nb) nb.click(); });
    }

    // 프로그램 업데이트
    var upd = document.getElementById('tvUpd');
    var UN = window.UpdateNotifier;
    if (UN && UN.getMode && UN.getMode() !== 'off') {
      UN.renderSettings(upd);
    } else {
      upd.innerHTML = '<div class="upd-panel"><h3>프로그램 업데이트</h3><p class="upd-desc">웹 브라우저로 쓰고 있어서 열 때마다 <b>최신 버전</b>이 열려요. ' +
        '앱으로 설치하면 새 버전이 나왔을 때 알려 드려요.</p><div class="updbtns upd-panel-btns">' +
        '<a class="sb" href="' + esc(new URL('../../index.html#install', here).href) + '">' + I.dl + '<span>앱으로 설치하기</span></a></div></div>';
    }

    // 업데이트 내역
    var hist = document.getElementById('tvHist');
    fetch(CHANGELOG, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { return j.history; })
      .catch(function () { var info = UN && UN.getInfo && UN.getInfo(); return info && info.history; })
      .then(function (H) { renderHistory(hist, Array.isArray(H) ? H : [], cur); });
  });

  function renderHistory(el, H, cur) {
    H = H.filter(function (h) { return h && h.v; }).sort(function (a, b) { return cmp(b.v, a.v); });
    if (!H.length) { el.innerHTML = '<p class="tvEmpty">업데이트 내역을 불러오지 못했어요.</p>'; return; }

    var groups = [], byKey = {};
    H.forEach(function (h) {
      var k = series(h.v);
      if (!byKey[k]) { byKey[k] = { key: k, list: [] }; groups.push(byKey[k]); }
      byKey[k].list.push(h);
    });

    var curInList = H.some(function (h) { return cmp(h.v, cur) === 0; });
    el.innerHTML = groups.map(function (g, gi) {
      var hasCur = g.list.some(function (h) { return cmp(h.v, cur) === 0; });
      var hasNew = cur && g.list.some(function (h) { return cmp(h.v, cur) > 0; });
      var titles = [];
      g.list.slice().reverse().forEach(function (h) { if (h.title) String(h.title).split(/\s*·\s*/).forEach(function (t) { if (t && titles.indexOf(t) < 0) titles.push(t); }); });
      var openG = hasCur || hasNew || (!curInList && gi === 0);
      return '<details class="tvGroup"' + (openG ? ' open' : '') + ' data-q="' + esc(g.key + ' ' + titles.join(' ')) + '">' +
        '<summary>' + I.chev + '<b class="tvSer">' + esc(g.key) + '</b>' +
          (titles.length ? '<span class="tvSum">' + esc(titles.join(' · ')) + '</span>' : '<span class="tvSum"></span>') +
          (hasNew ? '<span class="tvTag new">새 버전</span>' : '') + (hasCur ? '<span class="tvTag">현재 버전</span>' : '') +
        '</summary><div class="tvVers">' +
        g.list.map(function (h, i) {
          var c = cmp(h.v, cur), isCur = cur && c === 0, isNew = cur && c > 0;
          var openV = isCur || isNew || (!curInList && gi === 0 && i === 0);
          return '<details class="tvVer' + (isCur ? ' cur' : '') + '"' + (openV ? ' open' : '') + '>' +
            '<summary>' + I.chev + '<b>' + esc(h.v) + '</b><small>' + esc(h.d || '') + '</small>' +
              (isNew ? '<span class="tvTag new">새 버전</span>' : '') + (isCur ? '<span class="tvTag">현재 버전</span>' : '') +
            '</summary><ul>' + items(h).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>';
        }).join('') + '</div></details>';
    }).join('');
  }
})();
