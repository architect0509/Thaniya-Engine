/* Thaniya-SoundLab · 기능 가이드 (guide.js)
 * 기능마다 '시범 영상'(작은 화면 + 움직이는 마우스)으로 쓰는 법을 보여 주는 창.
 * - window.openGuide(id) : 가이드 열기 (id 없으면 목록 첫 번째)
 * - 기능 창(반주 · 스텝 · 다듬기 · MIDI 도구 · 세기/오토메이션 레인 · 믹서 · 내보내기)에 「사용법」 버튼을 달고, 처음 열 때 한 번 '시범 보기' 말풍선을 띄워요
 * - 편집 화면(edit.html)과 마이페이지(mypage.html) 둘 다에서 동작 (앱 함수가 있으면 「직접 해 보기」로 바로 열어 줘요)
 */
(function () {
  'use strict';
  var $id = function (id) { return document.getElementById(id); };
  var IS_MP = !!$id('mpGrid') && !$id('rollWrap');   // 편집 화면에도 마이페이지 마크업이 들어 있어서 보드 유무로 구분
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var seen = (function () { try { return JSON.parse(localStorage.getItem('hc-guideSeen') || '{}'); } catch (e) { return {}; } })();
  function markSeen(id) { seen[id] = 1; try { localStorage.setItem('hc-guideSeen', JSON.stringify(seen)); } catch (e) {} }

  // ───────── 아이콘 (가이드 전용 · 앱 아이콘과 같은 선 스타일) ─────────
  var IC = {
    acc: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    step: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M7 5v8M12 5v8M17 5v8"/>',
    nt: '<path d="M6 15V9a6 6 0 0 1 12 0v6"/><path d="M6 15h4v4H6zM14 15h4v4h-4z"/>',
    vel: '<path d="M5 20V12M10 20V7M15 20v-9M20 20V5"/>',
    loop: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
    midi: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M7 6v7M12 6v7M17 6v7"/><circle cx="19" cy="3" r="1.2" fill="currentColor"/>',
    mp: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M12 18v-6M9 15l3 3 3-3"/>',
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
    redo: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    try: '<path d="M5 12h13M13 6l6 6-6 6"/>',
    book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z"/>',
    q: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    chk: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    mix: '<path d="M6 3.5v17M12 3.5v17M18 3.5v17"/><rect x="3.8" y="13" width="4.4" height="3.2" rx="1" fill="currentColor"/><rect x="9.8" y="6.5" width="4.4" height="3.2" rx="1" fill="currentColor"/><rect x="15.8" y="10.5" width="4.4" height="3.2" rx="1" fill="currentColor"/>',
    auto: '<path d="M3 18c3 0 4-9 7-9s3 6 6 6 3-8 5-10"/><circle cx="10" cy="9" r="1.6" fill="currentColor"/><circle cx="16" cy="15" r="1.6" fill="currentColor"/><path d="M3 21h18" opacity=".5"/>',
    mt: '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M3 12l9 4.5 9-4.5"/><path d="M3 16.5L12 21l9-4.5"/>',
    stem: '<rect x="3" y="4" width="18" height="4" rx="1.2"/><rect x="3" y="10" width="13" height="4" rx="1.2"/><rect x="3" y="16" width="16" height="4" rx="1.2"/>'
  };
  var svg = function (k, cls) { return '<svg class="' + (cls || 'gi') + '" viewBox="0 0 24 24">' + (IC[k] || '') + '</svg>'; };

  // ───────── 시범 화면 조각 (작은 편집 화면) ─────────
  // 보드: 32칸(2마디) × 14줄 · 노트는 --s(시작 칸) --l(길이) --r(줄)
  var NAMES = ['솔5', '파5', '미5', '레5', '도5', '시4', '라4', '솔4', '파4', '미4', '레4', '도4', '시3', '라3'];
  function note(s, l, r, extra) { return '<i class="gm-n' + (extra ? ' ' + extra : '') + '" style="--s:' + s + ';--l:' + l + ';--r:' + r + '"></i>'; }
  function keysCol() { var h = ''; for (var i = 0; i < NAMES.length; i++) h += '<span class="' + (/#/.test(NAMES[i]) ? 'bk' : '') + (NAMES[i][0] === '도' ? ' c' : '') + '">' + NAMES[i] + '</span>'; return h; }
  function editor(o) {
    o = o || {};
    var tracks = (o.tracks || [['피아노', '#4a9eff', 1]]).map(function (t) { return '<div class="gm-trk' + (t[2] ? ' on' : '') + '"><i style="background:' + t[1] + '"></i>' + t[0] + '</div>'; }).join('');
    return '<div class="gm">' +
      '<div class="gm-top"><span class="gm-logo"></span><b class="gm-title">' + (o.title || '새 곡') + '</b><span class="sp"></span>' +
      '<span class="gm-pill" data-k="acc">' + svg('acc') + '반주</span><span class="gm-pill" data-k="nt">' + svg('nt') + '다듬기</span><span class="gm-pill" data-k="mt">' + svg('mt') + 'MIDI 도구</span><span class="gm-pill" data-k="mix">' + svg('mix') + '믹서</span><span class="gm-pill" data-k="step">' + svg('step') + '스텝</span><span class="gm-ic" data-k="exp" title="내보내기">' + svg('mp') + '</span></div>' +
      '<div class="gm-body"><div class="gm-tracks"><div class="gm-th">트랙</div><div class="gm-tl">' + tracks + '</div></div>' +
      '<div class="gm-roll' + (o.vel ? ' velOn' : '') + '">' +
      '<div class="gm-corner"><span class="gm-velBtn">' + svg('vel') + '</span></div>' +
      '<div class="gm-ruler"><span style="left:0">1</span><span style="left:50%">2</span><div class="gm-band"></div><div class="gm-marks"></div></div>' +
      '<div class="gm-keys">' + keysCol() + '</div>' +
      '<div class="gm-grid"><div class="gm-notes">' + (o.notes || '') + '</div><div class="gm-ph"></div><div class="gm-lasso"></div></div>' +
      '<div class="gm-velH">세기</div><div class="gm-vel"></div>' +
      '</div></div>' +
      '<div class="gm-trans"><span class="gm-tb">⏮</span><span class="gm-tb" data-k="stop">■</span><span class="gm-tb play" data-k="play">' + svg('play') + '</span><span class="gm-tb rec">●</span>' +
      '<span class="gm-pos">1.1.1</span><span class="gm-bpm">BPM <b>100</b></span>' +
      '<span class="gm-tb" data-k="loop">' + svg('loop') + '</span><span class="gm-tb" data-k="midi">' + svg('midi') + '</span><span class="gm-tb gm-midiRec" data-k="mrec">● MIDI</span><span class="sp"></span>' +
      '<span class="gm-meter"><i></i></span></div>' +
      (o.extra || '') + '<div class="gm-toast"></div></div>';
  }
  var MELODY = [[0, 2, 11], [2, 2, 10], [4, 2, 9], [6, 2, 8], [8, 4, 7], [12, 4, 9], [16, 2, 6], [18, 2, 7], [20, 4, 8], [24, 4, 9], [28, 4, 11]];
  var melody = function (cls) { return MELODY.map(function (m) { return note(m[0], m[1], m[2], cls); }).join(''); };

  // ───────── 가이드 목록 ─────────
  var G = [
    {
      id: 'acc', name: '반주 · 비트', icon: 'acc', hue: ['#f2c230', '#b9781a'], keys: ['J'], badge: '',
      line: '멜로디에 어울리는 반주를 자동으로',
      desc: '내가 만든 멜로디를 분석해 어울리는 <b>코드 반주와 드럼 비트를 자동으로 만들어</b>, 클릭 몇 번으로 곡에 더할 수 있도록 하는 기능이다.',
      steps: [
        ['반주 창 열기', '상단의 「반주」 버튼을 누르거나 <kbd>J</kbd> 키를 누른다.'],
        ['코드 확인하기', '「추천 반주」 탭은 멜로디에 맞는 코드를 마디마다 자동으로 붙여 준다. 코드 칩을 누르면 다른 코드로 바꿀 수 있다.'],
        ['스타일 고르기', '발라드 · 팝 · 밴드 · 로파이 같은 스타일 카드를 누르면 바로 미리 들을 수 있다.'],
        ['구간 정하기', '「곡 전체」 또는 「직접 지정」으로 반주가 들어갈 마디를 정한다.'],
        ['반주 추가', '「반주 추가」를 누르면 반주와 드럼이 새 트랙으로 들어간다.']
      ],
      tips: ['「비트」 탭에서는 칸을 눌러 드럼 패턴을 직접 만들 수 있다.', '「샘플 반주」 탭은 유명한 코드 진행을 골라 바로 쓸 수 있다.', '마음에 안 들면 Ctrl+Z 한 번으로 되돌린다.'],
      scene: function () {
        return editor({ notes: melody(), extra:
          '<div class="gm-modal gm-acc"><div class="gm-mh"><span class="gm-tab on">추천 반주</span><span class="gm-tab">샘플 반주</span><span class="gm-tab">비트</span><span class="sp"></span><span class="gm-x">' + svg('x') + '</span></div>' +
          '<div class="gm-rg"><span class="cap">구간</span><span class="gm-seg"><b class="on" data-k="song">곡 전체</b><b data-k="custom">직접 지정</b></span><em class="gm-rgi">1~2마디 · 2마디</em></div>' +
          '<div class="gm-sec">코드 진행</div><div class="gm-chords"><b>C</b><b>Am</b><b>F</b><b>G</b></div>' +
          '<div class="gm-sec">스타일</div><div class="gm-styles">' +
          [['발라드', '#25458a'], ['팝 피아노', '#5a2f80'], ['밴드', '#8a4220'], ['로파이', '#2f5a5a']].map(function (s, i) { return '<b data-i="' + i + '" style="--c:' + s[1] + '"><i class="eq"><s></s><s></s><s></s></i>' + s[0] + '</b>'; }).join('') +
          '</div><div class="gm-mf"><span class="sp"></span><span class="gm-btn">취소</span><span class="gm-btn pri" data-k="add">반주 추가</span></div></div>' });
      },
      script: [
        { cap: '상단의 「반주」 버튼을 눌러 반주 창을 연다', step: 0, click: '[data-k=acc]', fx: function (s) { s.q('.gm-acc').classList.add('show'); } },
        { wait: 500 },
        { cap: '멜로디를 분석해 마디마다 어울리는 코드가 자동으로 붙는다', step: 1, move: '.gm-chords', fx: function (s) { s.qa('.gm-chords b').forEach(function (b, i) { setTimeout(function () { b.classList.add('on'); }, i * 260); }); }, hold: 1300 },
        { cap: '코드 칩을 누르면 다른 코드로 바꿀 수 있다', step: 1, click: '.gm-chords b:nth-child(4)', fx: function (s) { var b = s.q('.gm-chords b:nth-child(4)'); b.textContent = 'Em'; b.classList.add('flash'); }, hold: 900 },
        { cap: '스타일 카드를 누르면 바로 미리 들을 수 있다', step: 2, click: '.gm-styles b[data-i="1"]', fx: function (s) { pickCard(s, 1); }, hold: 1100 },
        { cap: '분위기가 다른 스타일도 눌러 비교해 본다', step: 2, click: '.gm-styles b[data-i="3"]', fx: function (s) { pickCard(s, 3); }, hold: 1100 },
        { cap: '「직접 지정」을 고르면 보드에서 시작~끝 마디를 끌어서 정한다', step: 3, click: '[data-k=custom]', fx: function (s) { seg(s, 'custom'); s.q('.gm-rgi').textContent = '1~1마디 · 1마디'; }, hold: 900 },
        { cap: '이번에는 곡 전체에 넣는다', step: 3, click: '[data-k=song]', fx: function (s) { seg(s, 'song'); s.q('.gm-rgi').textContent = '1~2마디 · 2마디'; }, hold: 600 },
        { cap: '「반주 추가」를 누르면 반주와 드럼이 새 트랙으로 들어간다', step: 4, click: '[data-k=add]', fx: function (s) {
          s.q('.gm-acc').classList.remove('show');
          addTrack(s, '로파이 · 건반', '#2fb39a'); addTrack(s, '로파이 · 드럼', '#ff7a59');
          var h = ''; [[0, 'C'], [8, 'Am'], [16, 'F'], [24, 'Em']].forEach(function (c, i) { [12, 10, 8].forEach(function (r) { h += note(c[0], 8, r + 1, 'acc pop d' + i); }); });
          s.q('.gm-notes').insertAdjacentHTML('beforeend', h);
          toast(s, '반주 트랙 2개를 추가했어요');
        }, hold: 2200 }
      ],
      open: function () { clickReal('accBtn'); }
    },
    {
      id: 'step', name: '스텝 입력', icon: 'step', hue: ['#6ea8ff', '#3a5bd9'], keys: ['K'],
      line: '건반을 눌러 한 음씩 정확하게',
      desc: '실시간으로 연주하지 않아도 <b>건반을 하나씩 눌러 정확한 박자에 음을 차례로 찍어 나갈 수 있도록</b> 하는 기능이다.',
      steps: [
        ['스텝 입력 열기', '상단의 「스텝」 버튼을 누르거나 <kbd>K</kbd> 키를 누른다.'],
        ['음 길이 고르기', '「음 길이」에서 1/16 · 1/8 · 1/4 · 1/2 · 1 중 하나를 고른다.'],
        ['건반 누르기', '화면 건반(또는 컴퓨터 키보드 · MIDI 건반)을 누르면 지금 칸에 음이 들어가고 커서가 음 길이만큼 다음 칸으로 넘어간다.'],
        ['화음 넣기', '여러 건반을 함께 누른 채 「보드에 넣기」(<kbd>Space</kbd>)를 누르면 화음으로 들어간다.'],
        ['쉼표 · 지우기', '「쉼표」로 한 칸 비우고, 「지우기」(<kbd>Backspace</kbd>)로 마지막 음을 지운다.']
      ],
      tips: ['- / + 키로 옥타브를 바꾼다.', '모바일에서는 손 도구로 보드를 끌어 화면만 옮길 수 있다.'],
      scene: function () {
        var kb = ''; ['도', '레', '미', '파', '솔', '라', '시', '도'].forEach(function (n, i) { kb += '<b data-i="' + i + '"><em>' + n + '</em></b>'; });
        var bk = ''; [0, 1, 3, 4, 5].forEach(function (i) { bk += '<i style="--x:' + i + '"></i>'; });
        return editor({ notes: '', extra:
          '<div class="gm-step"><div class="gm-sh"><span class="ttl">' + svg('step') + '스텝 입력</span><span class="gm-len"><span class="cap">음 길이</span><b data-l="1">1/16</b><b data-l="2">1/8</b><b class="on" data-l="4">1/4</b><b data-l="8">1/2</b></span><span class="sp"></span><span class="gm-btn" data-k="rest">쉼표</span><span class="gm-btn" data-k="back">지우기</span><span class="gm-btn pri" data-k="put">보드에 넣기</span></div>' +
          '<div class="gm-kb">' + kb + '<div class="gm-bks">' + bk + '</div></div></div>' });
      },
      script: [
        { cap: '상단의 「스텝」 버튼을 눌러 스텝 입력을 연다', step: 0, click: '[data-k=step]', fx: function (s) { s.q('.gm-step').classList.add('show'); s.cur = 0; cursor(s); }, hold: 500 },
        { cap: '먼저 음 길이를 고른다 — 여기서는 1/8', step: 1, click: '.gm-len b[data-l="2"]', fx: function (s) { lenPick(s, 2); }, hold: 500 },
        { cap: '건반을 누르면 지금 칸에 음이 들어가고, 다음 칸으로 넘어간다', step: 2, click: '.gm-kb b[data-i="0"]', fx: function (s) { press(s, 0); stepPut(s, [6]); } },
        { step: 2, click: '.gm-kb b[data-i="1"]', fx: function (s) { press(s, 1); stepPut(s, [5]); } },
        { step: 2, click: '.gm-kb b[data-i="2"]', fx: function (s) { press(s, 2); stepPut(s, [4]); } },
        { step: 2, click: '.gm-kb b[data-i="4"]', fx: function (s) { press(s, 4); stepPut(s, [2]); }, hold: 500 },
        { cap: '1/4로 바꾸고 화음: 도 · 미 · 솔을 함께 누른 채 「보드에 넣기」', step: 3, click: '.gm-len b[data-l="4"]', fx: function (s) { lenPick(s, 4); } },
        { step: 3, move: '.gm-kb b[data-i="0"]', fx: function (s) { s.qa('.gm-kb b').forEach(function (b) { b.classList.remove('dn'); }); [0, 2, 4].forEach(function (i) { s.q('.gm-kb b[data-i="' + i + '"]').classList.add('dn'); }); }, hold: 600 },
        { step: 3, click: '[data-k=put]', fx: function (s) { stepPut(s, [6, 4, 2]); s.qa('.gm-kb b').forEach(function (b) { b.classList.remove('dn'); }); }, hold: 700 },
        { cap: '「쉼표」는 지금 길이만큼 비우고 다음 칸으로 넘어간다', step: 4, click: '[data-k=rest]', fx: function (s) { s.cur += s.len; cursor(s); }, hold: 500 },
        { step: 4, click: '.gm-kb b[data-i="5"]', fx: function (s) { press(s, 5); stepPut(s, [1]); }, hold: 500 },
        { cap: '잘못 넣었으면 「지우기」로 마지막 음을 지운다', step: 4, click: '[data-k=back]', fx: function (s) { var ns = s.qa('.gm-n'); if (ns.length) ns[ns.length - 1].remove(); s.cur -= s.len; cursor(s); }, hold: 1600 }
      ],
      open: function () { clickReal('stepBtn'); }
    },
    {
      id: 'nt', name: '다듬기', icon: 'nt', hue: ['#c38bff', '#7b3fe0'], keys: ['U'], badge: 'NEW',
      line: '박자 맞추기 · 사람 손 느낌',
      desc: '박자에서 조금씩 어긋난 노트를 <b>격자에 딱 맞추거나(퀀타이즈)</b>, 반대로 기계처럼 딱딱한 노트에 <b>사람이 연주한 듯한 자연스러움을 더할 수 있도록(휴머나이즈)</b> 하는 기능이다.',
      steps: [
        ['노트 고르기', '선택 도구로 노트를 끌어서 고른다. 고르지 않으면 지금 트랙 전체가 대상이다.'],
        ['다듬기 열기', '상단의 「다듬기」 버튼을 누르거나 <kbd>U</kbd> 키를 누른다.'],
        ['격자와 강도', '맞출 격자(1/8, 셋잇단 등)를 고르고 강도를 올리면 보드에서 노트가 바로 움직인다.'],
        ['스윙 더하기', '스윙을 올리면 짝수 번째 칸이 살짝 뒤로 밀려 출렁이는 리듬이 된다.'],
        ['적용하기', '「적용」(<kbd>Enter</kbd>)을 누르면 확정된다. 「취소」하면 원래대로 돌아간다.']
      ],
      tips: ['「들어보기」(Space)로 적용 전에 소리를 확인한다.', '휴머나이즈 탭의 「화음은 같이 움직이기」를 켜면 화음이 흩어지지 않는다.', '강도를 60~80%로 두면 원래 느낌을 살리면서 정리된다.'],
      scene: function () {
        var off = [[0.6, 2, 11], [2.7, 1.6, 10], [3.6, 2.2, 9], [6.5, 1.8, 8], [8.4, 3.4, 7], [11.4, 4.3, 9], [16.7, 1.7, 6], [17.6, 2.3, 7], [20.5, 3.1, 8], [24.6, 3.5, 9], [27.5, 4, 11]];
        return editor({ notes: off.map(function (m) { return note(m[0], m[1], m[2] - 5, 'q'); }).join(''), extra:
          '<div class="gm-nt"><div class="gm-mh"><span class="gm-tab on" data-k="tq">퀀타이즈</span><span class="gm-tab" data-k="th">휴머나이즈</span><span class="sp"></span><span class="gm-x">' + svg('x') + '</span></div>' +
          '<div class="gm-row"><span class="lb">격자</span><span class="gm-sel" data-k="grid">1/16 ▾</span><span class="gm-dd"><b>1/4</b><b data-k="g8">1/8</b><b>1/16</b><b>1/8 셋잇단</b></span></div>' +
          '<div class="gm-row"><span class="lb">강도</span><span class="gm-sl" data-k="str"><i></i><b></b></span><em data-v="str">0%</em></div>' +
          '<div class="gm-row"><span class="lb">스윙</span><span class="gm-sl" data-k="sw"><i></i><b></b></span><em data-v="sw">없음</em></div>' +
          '<div class="gm-mf"><span class="gm-btn">' + svg('play') + '들어보기</span><span class="gm-info">이 트랙 전체 11개</span><span class="gm-btn">취소</span><span class="gm-btn pri" data-k="ok">적용</span></div></div>' });
      },
      script: [
        { cap: '선택 도구로 다듬을 노트를 끌어서 고른다', step: 0, drag: { from: [140, 62], to: [628, 172] }, on: function (s, p, a, b) { lasso(s, a, b, p); }, end: function (s) { lassoEnd(s); s.qa('.gm-n').forEach(function (n) { n.classList.add('sel'); }); }, hold: 500 },
        { cap: '상단의 「다듬기」 버튼을 누른다', step: 1, click: '[data-k=nt]', fx: function (s) { s.q('.gm-nt').classList.add('show'); setSl(s, 'str', 0); setSl(s, 'sw', 0); }, hold: 500 },
        { cap: '격자를 1/8로 고른다', step: 2, click: '[data-k=grid]', fx: function (s) { s.q('.gm-dd').classList.add('show'); }, hold: 300 },
        { step: 2, click: '[data-k=g8]', fx: function (s) { s.q('.gm-dd').classList.remove('show'); s.q('[data-k=grid]').textContent = '1/8 ▾'; }, hold: 300 },
        { cap: '강도를 올리면 노트가 격자 쪽으로 움직인다 — 보드에서 바로 확인', step: 2, drag: { from: '[data-k=str] b', to: '[data-k=str] .end' }, on: function (s, p) { setSl(s, 'str', p); quant(s, p, 0); }, hold: 600 },
        { cap: '스윙을 조금 올리면 출렁이는 리듬이 된다', step: 3, drag: { from: '[data-k=sw] b', to: '[data-k=sw] .mid' }, on: function (s, p) { setSl(s, 'sw', p * 0.5); quant(s, 1, p * 0.5); }, hold: 600 },
        { step: 3, drag: { from: '[data-k=sw] b', to: '[data-k=sw] .start' }, on: function (s, p) { setSl(s, 'sw', 0.5 - p * 0.5); quant(s, 1, 0.5 - p * 0.5); }, hold: 300 },
        { cap: '「적용」을 누르면 확정! (Ctrl+Z로 되돌리기 가능)', step: 4, click: '[data-k=ok]', fx: function (s) { s.q('.gm-nt').classList.remove('show'); s.qa('.gm-n').forEach(function (n) { n.classList.remove('sel'); }); toast(s, '퀀타이즈 — 노트 11개를 다듬었어요'); }, hold: 2000 }
      ],
      open: function () { clickReal('ntBtn'); }
    },
    {
      id: 'vel', name: '세기 레인', icon: 'vel', hue: ['#4fd18b', '#16936a'], keys: ['V'], badge: 'NEW',
      line: '셈여림을 막대로 그리기',
      desc: '노트마다 얼마나 세게 연주할지(벨로시티)를 <b>막대 높이로 보고, 마우스로 그려서 셈여림을 표현할 수 있도록</b> 하는 기능이다.',
      steps: [
        ['레인 열기', '건반 위 코너의 막대 버튼을 누르거나 <kbd>V</kbd> 키를 누르면 보드 아래에 세기 레인이 열린다.'],
        ['막대 끌기', '막대를 위로 끌면 세게, 아래로 끌면 여리게 연주된다.'],
        ['칠하듯 바꾸기', '누른 채 옆으로 지나가면 지나간 노트의 세기가 모두 그 높이로 바뀐다.'],
        ['점점 세게 (Shift)', '<kbd>Shift</kbd>를 누른 채 끌면 직선을 따라 점점 세게 / 점점 여리게 만들 수 있다.'],
        ['고른 노트만', '노트를 골라 두면 고른 노트만 바뀐다. 보드의 노트 진하기로도 세기가 보인다.']
      ],
      tips: ['막대 위에 마우스를 올리면 세기 값(0~127)이 보인다.', '「다듬기 → 휴머나이즈」로 세기를 자연스럽게 흩을 수도 있다.'],
      scene: function () { return editor({ notes: melody('v') }); },
      script: [
        { cap: '건반 위 코너의 막대 버튼을 누르면 세기 레인이 열린다', step: 0, click: '.gm-velBtn', fx: function (s) { s.q('.gm-roll').classList.add('velOn'); velBars(s); }, hold: 700 },
        { cap: '막대를 아래로 끌면 그 음이 여려진다', step: 1, drag: { from: function (s) { return velPt(s, 4, 0.98); }, to: function (s) { return velPt(s, 4, 0.3); } }, on: function (s, p, a, b) { velSetAt(s, b); }, hold: 500 },
        { cap: '누른 채 옆으로 지나가면 칠하듯 한꺼번에 바뀐다', step: 2, drag: { from: function (s) { return velPt(s, 5, 0.55); }, to: function (s) { return velPt(s, 8, 0.55); } }, on: function (s, p, a, b) { velPaint(s, a, b); }, hold: 500 },
        { cap: 'Shift를 누른 채 끌면 점점 세게 — 크레셴도!', step: 3, key: 'Shift', drag: { from: function (s) { return velPt(s, 0, 0.12); }, to: function (s) { return velPt(s, 10, 1); } }, on: function (s, p, a, b) { velLine(s, a, b); }, end: function (s) { velLineEnd(s); }, hold: 700 },
        { step: 3, keyUp: true, cap: '보드의 노트 진하기에도 세기가 그대로 보인다', fx: function (s) { s.q('.gm-grid').classList.add('glow'); }, hold: 2200 }
      ],
      open: function () { var b = $id('velBtn'); if (b && !b.classList.contains('on')) b.click(); }
    },
    {
      id: 'mt', name: 'MIDI 도구', icon: 'mt', hue: ['#5ee0c0', '#1f9f86'], keys: ['N'], badge: 'NEW',
      line: '코드 · 아르페지오 · 스트럼 · 변형',
      desc: '고른 노트를 <b>한 번에 화음으로 쌓거나(코드), 화음을 차례로 펼치거나(아르페지오), 기타처럼 긁고(스트럼), 길이 · 순서 · 높이를 바꿀 수 있도록</b> 하는 기능이다. 유료 작곡 프로그램의 「코드 스탬프 · 아르페지에이터 · 스트럼」과 같은 일을 한다.',
      steps: [
        ['노트 고르기', '선택 도구로 바꿀 노트를 끌어서 고른다. 고르지 않으면 지금 트랙 전체가 대상이다.'],
        ['MIDI 도구 열기', '상단의 「MIDI 도구」 버튼을 누르거나 <kbd>N</kbd> 키를 누른다.'],
        ['코드 만들기', '「코드」 탭에서 메이저 · 마이너 · 7 · sus4 같은 화음을 고르면 노트마다 화음이 쌓인다. 「스케일에 맞춰」를 고르면 설정한 조 안의 화음으로 쌓인다.'],
        ['펼치기 · 긁기', '「아르페지오」 탭은 화음을 방향 · 속도 · 옥타브에 맞춰 차례로 펼치고, 「스트럼」 탭은 화음을 기타처럼 조금씩 어긋나게 친다.'],
        ['변형 · 적용', '「변형」 탭에서 레가토 · 길이 비율 · 잘게 나누기 · 역행 · 상하 반전을 고를 수 있다. 「적용」(<kbd>Enter</kbd>)을 눌러야 확정된다.']
      ],
      tips: ['바꾸는 동안 보드에 결과가 바로 보이고, 「들어보기」(Space)로 소리를 확인할 수 있다.', '코드 → 아르페지오 순서로 두 번 적용하면 멜로디 한 줄로 반주 패턴을 만들 수 있다.', '마음에 안 들면 Ctrl+Z 한 번으로 통째로 되돌린다.'],
      scene: function () {
        return editor({ notes: MT_MEL.map(function (m) { return note(m[0], m[1], m[2], 'm'); }).join(''), extra:
          '<div class="gm-mt"><div class="gm-mh"><span class="gm-tab on" data-k="tc">코드</span><span class="gm-tab" data-k="ta">아르페지오</span><span class="gm-tab">스트럼</span><span class="gm-tab">변형</span><span class="sp"></span><span class="gm-x">' + svg('x') + '</span></div>' +
          '<div class="gm-row gm-rc"><span class="lb">화음</span><span class="gm-sel" data-k="ch">메이저 ▾</span><span class="gm-dd gm-ddm"><b>메이저</b><b data-k="c7">maj7 (세련되게)</b><b>마이너</b><b>sus4</b></span></div>' +
          '<div class="gm-row gm-ra"><span class="lb">방향</span><span class="gm-seg"><b class="on">위로 ↑</b><b>아래로</b><b>위아래</b></span><em>1/16</em></div>' +
          '<div class="gm-mf"><span class="gm-btn">' + svg('play') + '들어보기</span><span class="gm-info" data-v="mtinfo">고른 노트 4개</span><span class="gm-btn">취소</span><span class="gm-btn pri" data-k="ok">적용</span></div></div>' });
      },
      script: [
        { cap: '선택 도구로 바꿀 노트를 끌어서 고른다', step: 0, drag: { from: [150, 130], to: [600, 260] }, on: function (s, p, a, b) { lasso(s, a, b); }, end: function (s) { lassoEnd(s); s.qa('.gm-n').forEach(function (n) { n.classList.add('sel'); }); }, hold: 500 },
        { cap: '상단의 「MIDI 도구」를 누른다 (N)', step: 1, click: '[data-k=mt]', fx: function (s) { s.q('.gm-mt').classList.add('show'); s.q('.gm-mt').classList.remove('arp'); }, hold: 500 },
        { cap: '「코드」 탭에서 화음 종류를 고른다', step: 2, click: '[data-k=ch]', fx: function (s) { s.q('.gm-ddm').classList.add('show'); }, hold: 350 },
        { cap: '노트마다 화음이 쌓인다 — 보드에서 바로 확인', step: 2, click: '[data-k=c7]', fx: function (s) { s.q('.gm-ddm').classList.remove('show'); s.q('[data-k=ch]').textContent = 'maj7 ▾'; mtChord(s); s.q('[data-v=mtinfo]').textContent = '고른 노트 4개 → 16개'; }, hold: 1200 },
        { cap: '「아르페지오」 탭: 화음이 위로 차례차례 펼쳐진다', step: 3, click: '[data-k=ta]', fx: function (s) { s.q('.gm-mt').classList.add('arp'); s.qa('.gm-mt .gm-tab').forEach(function (t) { t.classList.toggle('on', t.dataset.k === 'ta'); }); mtArp(s); s.q('[data-v=mtinfo]').textContent = '고른 노트 16개 → 32개'; }, hold: 1600 },
        { cap: '「적용」을 누르면 확정! (Ctrl+Z로 되돌리기)', step: 4, click: '.gm-mt [data-k=ok]', fx: function (s) { s.q('.gm-mt').classList.remove('show'); s.qa('.gm-n').forEach(function (n) { n.classList.remove('sel'); }); toast(s, '아르페지오 — 노트 32개 (Ctrl+Z 로 되돌리기)'); }, hold: 2200 }
      ],
      open: function () { clickReal('mtBtn'); }
    },
    {
      id: 'auto', name: '오토메이션', icon: 'auto', hue: ['#ff9f5a', '#d9632a'], keys: ['B'], badge: 'NEW',
      line: '볼륨 · 팬 · 밝기를 시간에 따라',
      desc: '곡이 흐르는 동안 <b>트랙의 볼륨 · 좌우 위치(팬) · 밝기(필터)가 저절로 바뀌도록 선을 그려 둘 수 있도록</b> 하는 기능이다. 점점 커지는 인트로, 끝에서 사라지는 페이드 아웃, 필터가 열리는 빌드업을 만들 수 있다.',
      steps: [
        ['레인 열기', '<kbd>B</kbd> 키를 누르면 보드 아래에 볼륨 오토메이션 레인이 열린다. 레인 왼쪽 목록에서 세기 · 볼륨 · 팬 · 밝기를 고를 수도 있다.'],
        ['선 그리기', '레인을 누른 채 끌면 지나간 자리의 값이 그 높이로 그려진다. 위 = 크게(오른쪽 · 밝게), 아래 = 작게(왼쪽 · 어둡게).'],
        ['직선 (Shift)', '<kbd>Shift</kbd>를 누른 채 끌면 시작점에서 끝점까지 곧은 선 — 페이드 인 / 아웃에 좋다.'],
        ['종류 바꾸기', '<kbd>B</kbd>를 다시 누를 때마다 볼륨 → 팬 → 밝기 → 닫기. 종류마다 따로 그려진다.'],
        ['들어 보기 · 지우기', '재생하면 그린 대로 소리가 바뀐다. 우클릭(또는 <kbd>Alt</kbd>)으로 끌면 그 구간을 지우고, 휴지통 버튼은 전부 지운다.']
      ],
      tips: ['오토메이션은 지금 고른 트랙에만 그려진다. 트랙을 바꾸면 그 트랙의 선이 보인다.', '볼륨의 노란 가로선이 100%(믹서 볼륨 그대로) 자리다.', 'MP3 · 스템 · 엔진 저장에도 그대로 들어간다.'],
      scene: function () { return editor({ notes: melody(), vel: true, extra: '' }); },
      script: [
        { cap: 'B 키를 누르면 오토메이션 레인이 열린다', step: 0, key: 'B', fx: function (s) { s.q('.gm-roll').classList.add('velOn'); auInit(s, '볼륨'); }, hold: 700 },
        { step: 0, keyUp: true, hold: 200 },
        { cap: '누른 채 끌어서 볼륨이 점점 커지는 선을 그린다', step: 1, drag: { from: function (s) { return lanePt(s, 0.02, 0.15); }, to: function (s) { return lanePt(s, 0.48, 0.8); } }, on: function (s, p, a, b) { auDraw(s, b); }, hold: 500 },
        { cap: 'Shift를 누른 채 끌면 직선 — 끝에서 사라지는 페이드 아웃', step: 2, key: 'Shift', drag: { from: function (s) { return lanePt(s, 0.62, 0.8); }, to: function (s) { return lanePt(s, 0.98, 0.04); } }, on: function (s, p, a, b) { auGuide(s, a, b); }, end: function (s) { auLineEnd(s); }, hold: 700 },
        { step: 2, keyUp: true, hold: 200 },
        { cap: '레인 왼쪽 목록에서 「팬」으로 바꾸면 따로 그릴 수 있다', step: 3, click: '.gm-velH', fx: function (s) { s.q('.gm-lsel').classList.add('show'); }, hold: 350 },
        { step: 3, click: '.gm-lsel [data-k=pan]', fx: function (s) { s.q('.gm-lsel').classList.remove('show'); auInit(s, '팬'); }, hold: 300 },
        { cap: '팬: 위 = 오른쪽 · 아래 = 왼쪽 — 소리가 좌우로 오간다', step: 3, drag: { from: function (s) { return lanePt(s, 0.04, 0.5); }, to: function (s) { return lanePt(s, 0.95, 0.5); } }, on: function (s, p, a, b) { b = [b[0], lanePt(s, 0, 0.5 + 0.38 * Math.sin(p * Math.PI * 4))[1]]; auDraw(s, b); }, hold: 500 },
        { cap: '재생하면 그린 대로 소리가 바뀐다', step: 4, click: '[data-k=play]', fx: function (s) { s.q('[data-k=play]').classList.add('on'); playLoop(s, 0, 1, 0); s.q('.gm-meter').classList.add('on'); }, hold: 1900 },
        { step: 4, fx: function (s) { s.q('[data-k=play]').classList.remove('on'); stopPh(s); s.q('.gm-meter').classList.remove('on'); }, hold: 1000 }
      ],
      open: function () {
        var ed = $id('editor'), ls = $id('laneSel');
        if (ed && !ed.classList.contains('velOn')) { var b = $id('velBtn'); if (b) b.click(); }
        if (ls) { ls.value = 'vol'; ls.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    },
    {
      id: 'mix', name: '믹서', icon: 'mix', hue: ['#6ec3ff', '#2f7fd9'], keys: ['X'], badge: 'NEW',
      line: 'EQ · 컴프 · 센드 · 미터 · LUFS',
      desc: '트랙마다 <b>볼륨 · 팬 · 3밴드 EQ · 컴프레서 · 리버브/딜레이를 한 화면에서 조절하고, 레벨 미터와 라우드니스(LUFS)를 보며 소리의 균형을 맞출 수 있도록</b> 하는 기능이다.',
      steps: [
        ['믹서 열기', '상단의 「믹서」 버튼을 누르거나 <kbd>X</kbd> 키를 누른다. 트랙마다 세로 줄(채널)이 하나씩 보인다.'],
        ['볼륨 맞추기', '페이더(손잡이)를 위아래로 끌어 트랙끼리 크기를 맞춘다. 흰 줄이 0dB(원래 크기)이고, 더블클릭하면 0dB로 돌아간다.'],
        ['EQ · 컴프', '저음 · 중음 · 고음을 올리고 내려 음색을 다듬는다. 「컴프」를 올리면 큰 소리 작은 소리가 고르게 눌려 단단해진다.'],
        ['리버브 · 딜레이', '리버브는 공간의 울림, 딜레이는 BPM에 맞춰 메아리(점8분)를 더한다.'],
        ['미터 보며 듣기', '재생하면 트랙 미터와 마스터 미터가 움직인다. 마스터의 「라우드니스」(LUFS)와 「최고 피크」로 전체 크기를 확인한다.']
      ],
      tips: ['재생하면서 바꾸면 바로 들린다. 바꾼 값은 곡에 저장되고 Ctrl+Z로 되돌릴 수 있다.', '음원 사이트용으로는 라우드니스 −14 LUFS 근처, 최고 피크 −1dB 아래가 무난하다.', '마스터의 빨간 불은 0dB를 넘었다는 뜻 — 누르면 꺼진다.'],
      scene: function () {
        var strip = function (i, nm, col, v) {
          return '<div class="gm-ch" data-i="' + i + '" style="--tc:' + col + '"><b class="nm">' + nm + '</b>' +
            ['저', '중', '고', '컴프', '리버브', '딜레이'].map(function (l, k) { return '<span class="r"><i>' + l + '</i><span class="gm-sl" data-k="m' + i + k + '"><i></i><b></b><u class="start"></u><u class="mid"></u><u class="end"></u></span></span>'; }).join('') +
            '<span class="ms"><b>M</b><b>S</b></span><span class="fw"><span class="fd" data-k="f' + i + '" style="--v:' + v + '"><b></b><u class="lo"></u></span><span class="mt" data-m="' + i + '"><i></i></span></span><em data-v="f' + i + '">0.0</em></div>';
        };
        return editor({ tracks: [['피아노', '#4a9eff', 1], ['베이스', '#ff8a3d', 0], ['드럼', '#2fb39a', 0]], notes: melody(), extra:
          '<div class="gm-mix"><div class="gm-mixH"><b>' + svg('mix') + '믹서</b><span>트랙 3개</span><span class="sp"></span><span class="gm-x">' + svg('x') + '</span></div><div class="gm-mixB">' +
          strip(0, '피아노', '#4a9eff', 0.667) + strip(1, '베이스', '#ff8a3d', 0.667) + strip(2, '드럼', '#2fb39a', 0.667) +
          '<div class="gm-ch gm-mst"><b class="nm">마스터</b><span class="lu"><i>라우드니스</i><b data-v="lm">—</b><i>재생 평균</i><b data-v="li">—</b><i>최고 피크</i><b data-v="pk">—</b></span><span class="lim">● 리미터</span>' +
          '<span class="fw"><span class="fd" style="--v:.667"><b></b><u class="lo"></u></span><span class="mt two" data-m="3"><i></i><i></i></span></span><em>0.0</em></div>' +
          '</div></div>' });
      },
      script: [
        { cap: '상단의 「믹서」를 누르면 (X) 트랙마다 채널이 보인다', step: 0, click: '[data-k=mix]', fx: function (s) { s.q('.gm-mix').classList.add('show'); for (var i = 0; i < 3; i++) for (var k = 0; k < 6; k++) mixSl(s, 'm' + i + k, k === 4 ? 0.25 : k < 3 ? 0.5 : 0); }, hold: 700 },
        { cap: '베이스가 너무 크다 — 페이더를 아래로 끌어 볼륨을 줄인다', step: 1, drag: { from: '[data-k=f1] b', to: function (s) { var r = s.rel(s.q('[data-k=f1]')); return [r.x + r.w / 2, r.y + r.h * 0.5]; } }, on: function (s, p) { fader(s, 1, 0.667 - p * 0.18); }, hold: 500 },
        { cap: 'EQ — 피아노의 고음을 올리면 더 밝고 또렷해진다', step: 2, drag: { from: '[data-k=m02] b', to: function (s) { var r = s.rel(s.q('[data-k=m02]')); return [r.x + r.w * 0.85, r.y + 2]; } }, on: function (s, p) { mixSl(s, 'm02', 0.5 + p * 0.35); }, hold: 400 },
        { cap: '드럼에 컴프를 걸면 소리가 단단하게 고르게', step: 2, drag: { from: '[data-k=m23] b', to: function (s) { var r = s.rel(s.q('[data-k=m23]')); return [r.x + r.w * 0.6, r.y + 2]; } }, on: function (s, p) { mixSl(s, 'm23', p * 0.6); }, hold: 400 },
        { cap: '피아노에 딜레이를 조금 — BPM에 맞춘 메아리가 생긴다', step: 3, drag: { from: '[data-k=m05] b', to: function (s) { var r = s.rel(s.q('[data-k=m05]')); return [r.x + r.w * 0.4, r.y + 2]; } }, on: function (s, p) { mixSl(s, 'm05', p * 0.4); }, hold: 500 },
        { cap: '재생하면 미터와 라우드니스(LUFS)가 움직인다', step: 4, click: '[data-k=play]', fx: function (s) { s.q('[data-k=play]').classList.add('on'); playLoop(s, 0, 1, 0); meters(s, 2600); }, hold: 2800 },
        { step: 4, fx: function (s) { s.q('[data-k=play]').classList.remove('on'); stopPh(s); }, hold: 900 }
      ],
      open: function () { var b = $id('mixBtn'); if (b) b.click(); }
    },
    {
      id: 'stem', name: '스템 내보내기', icon: 'stem', hue: ['#b6e35a', '#6fa61f'], keys: [], badge: 'NEW',
      line: '트랙마다 WAV로 따로 · ZIP',
      desc: '곡을 <b>트랙마다 따로 WAV 파일(스템)로 만들어 ZIP 하나로 저장</b>해서, 다른 작곡 프로그램(DAW)에서 이어 믹스하거나 협업자에게 넘길 수 있도록 하는 기능이다.',
      steps: [
        ['내보내기 열기', '상단 오른쪽의 내보내기 버튼을 누른다 (마이페이지 곡 메뉴의 「내보내기」도 같다).'],
        ['스템 고르기', '「파일로 저장」에서 <b>스템 (트랙별 WAV)</b>을 고른다.'],
        ['만들기', '「파일 저장」을 누르면 트랙을 하나씩 소리로 만든다. 뮤트한 트랙은 빠지고, 솔로를 켜면 솔로 트랙만 나온다.'],
        ['ZIP 저장', '모든 WAV는 길이가 같고 0초에서 시작한다. BPM · 박자가 적힌 「정보.txt」가 함께 들어 있다.'],
        ['다른 DAW에서 쓰기', 'ZIP을 풀어 WAV들을 다른 DAW에 넣고 모두 0초에 놓으면 원래 곡과 똑같이 맞는다.']
      ],
      tips: ['믹서의 EQ · 컴프 · 리버브 · 딜레이와 오토메이션이 들어간 소리로 나온다 (마스터 리미터는 빠짐).', '파일이 크니 긴 곡은 시간이 조금 걸린다. 진행 창의 「취소」로 멈출 수 있다.'],
      scene: function () {
        return editor({ tracks: [['피아노', '#4a9eff', 1], ['베이스', '#ff8a3d', 0], ['드럼', '#2fb39a', 0]], notes: melody(), extra:
          '<div class="gm-exp"><div class="gm-mh"><b class="ttl">내보내기</b><span class="sp"></span><span class="gm-x">' + svg('x') + '</span></div><div class="gm-sec">파일로 저장</div>' +
          '<div class="gm-fmts"><b class="on">MP3<small>어디서나 재생</small></b><b data-k="stems">스템 (트랙별 WAV)<small>.zip · 트랙마다 따로</small></b><b>MIDI<small>트랙별 .mid</small></b><b>프로젝트<small>.json</small></b></div>' +
          '<div class="gm-mf"><span class="sp"></span><span class="gm-btn">취소</span><span class="gm-btn pri" data-k="go">' + svg('mp') + '파일 저장</span></div></div>' +
          '<div class="gm-prog"><span class="ring"><i></i><b data-v="pct">0%</b></span><span class="tx"><b>스템 만드는 중</b><small data-v="ptx">1 / 3 · 피아노</small><span class="bar"><i></i></span></span></div>' +
          '<div class="gm-zip"><b>' + svg('mp') + '새 곡_스템.zip</b><span>01_피아노.wav</span><span>02_베이스.wav</span><span>03_드럼.wav</span><span>정보.txt</span></div>' +
          '<div class="gm-daw"><div class="hd"><b>다른 DAW</b><span>0:00</span><span>0:04</span><span>0:08</span></div>' +
          '<div class="ln" style="--c:#4a9eff"><i>01_피아노</i><s></s></div><div class="ln" style="--c:#ff8a3d"><i>02_베이스</i><s></s></div><div class="ln" style="--c:#2fb39a"><i>03_드럼</i><s></s></div></div>' });
      },
      script: [
        { cap: '상단 오른쪽의 내보내기 버튼을 누른다', step: 0, click: '[data-k=exp]', fx: function (s) { s.q('.gm-exp').classList.add('show'); }, hold: 600 },
        { cap: '「스템 (트랙별 WAV)」을 고른다', step: 1, click: '[data-k=stems]', fx: function (s) { s.qa('.gm-fmts b').forEach(function (b) { b.classList.toggle('on', b.dataset.k === 'stems'); }); }, hold: 600 },
        { cap: '「파일 저장」 — 트랙을 하나씩 WAV로 만든다', step: 2, click: '[data-k=go]', fx: function (s) { s.q('.gm-exp').classList.remove('show'); stemProg(s, 2400); }, hold: 2700 },
        { cap: 'ZIP 하나로 저장 — 같은 길이 · 0초 시작 · 정보.txt', step: 3, fx: function (s) { s.q('.gm-prog').classList.remove('show'); s.q('.gm-zip').classList.add('show'); toast(s, '스템 3개를 ZIP으로 저장했어요 (12.4MB)'); }, hold: 2200 },
        { cap: '다른 DAW에서 모두 0초에 놓으면 원래 곡과 딱 맞는다', step: 4, fx: function (s) { s.q('.gm-zip').classList.remove('show'); s.q('.gm-daw').classList.add('show'); }, hold: 2600 }
      ],
      open: function () { var b = $id('midiBtn'); if (b) b.click(); setTimeout(function () { var f = document.querySelector('#xFmts .xf[data-f=stems]'); if (f) f.click(); }, 60); }
    },
    {
      id: 'loop', name: '반복 구간 · 마커', icon: 'loop', hue: ['#ffb84d', '#e0702a'], keys: ['L', 'M', ', .'], badge: 'NEW',
      line: '한 부분만 계속 · 이름표 붙이기',
      desc: '곡의 한 부분을 <b>계속 반복해 들으며 다듬고</b>, 인트로 · 코러스 같은 <b>이름표(마커)를 붙여 원하는 곳으로 바로 이동할 수 있도록</b> 하는 기능이다.',
      steps: [
        ['반복 구간 정하기', '<kbd>Shift</kbd>를 누른 채 위쪽 눈금자를 끌면 마디 단위로 반복 구간이 생긴다.'],
        ['반복 재생', '재생하면 구간 끝에서 처음으로 끊김 없이 돌아간다. <kbd>L</kbd> 또는 하단 반복 버튼으로 켜고 끈다.'],
        ['마커 넣기', '<kbd>M</kbd>을 누르면 재생 위치 마디에 마커가 생기고, 바로 이름을 적을 수 있다.'],
        ['마커로 이동', '<kbd>,</kbd> / <kbd>.</kbd> 로 이전 · 다음 마커로 건너뛴다. 마커를 더블클릭하면 이름을 바꾼다.'],
        ['눈금자 메뉴', '눈금자를 우클릭하면 마커 넣기 · 지우기, 4마디 반복 같은 메뉴가 나온다.']
      ],
      tips: ['반복 중에 MIDI 녹음을 하면 같은 구간에 여러 번 겹쳐 녹음할 수 있다.', '반복 구간은 곡과 함께 저장된다.'],
      scene: function () { return editor({ notes: melody() }); },
      script: [
        { cap: 'Shift를 누른 채 눈금자를 끌어 반복 구간을 정한다', step: 0, key: 'Shift', drag: { from: function (s) { return rulerPt(s, 0.02); }, to: function (s) { return rulerPt(s, 0.47); } }, on: function (s, p) { band(s, 0, p > 0.5 ? 0.5 : 0.5); s.q('.gm-band').classList.add('show'); }, hold: 400 },
        { keyUp: true, fx: function (s) { toast(s, '반복 구간 1~1마디 — 재생하면 계속 반복해요'); s.q('[data-k=loop]').classList.add('on'); }, hold: 900 },
        { cap: '재생하면 구간 끝에서 처음으로 계속 돌아간다', step: 1, click: '[data-k=play]', fx: function (s) { s.q('[data-k=play]').classList.add('on'); playLoop(s, 0, 0.5, 2); }, hold: 4300 },
        { cap: 'M을 누르면 지금 마디에 마커가 생긴다 — 이름을 적는다', step: 2, key: 'M', fx: function (s) { stopPh(s); s.q('[data-k=play]').classList.remove('on'); marker(s, 0.5, ''); }, hold: 300 },
        { keyUp: true, type: '코러스', into: '.gm-mk:last-child em', hold: 600 },
        { cap: '마커는 이름표처럼 눈금자에 붙는다', step: 3, fx: function (s) { var e = s.q('.gm-mk:last-child'); e.classList.add('done'); marker(s, 0, '인트로', true); }, hold: 1100 },
        { cap: '눈금자를 우클릭하면 마커 · 반복 메뉴가 나온다', step: 4, rclick: function (s) { return rulerPt(s, 0.58); }, fx: function (s) { ctxMenu(s, rulerPt(s, 0.58)); }, hold: 2000 }
      ],
      open: function () { var b = $id('loopBtn'); if (b && !b.classList.contains('on')) b.click(); }
    },
    {
      id: 'midi', name: 'MIDI 키보드', icon: 'midi', hue: ['#ff6b8b', '#d43a62'], keys: [], badge: 'NEW',
      line: '외부 건반으로 연주 · 녹음',
      desc: 'USB로 연결한 <b>MIDI 건반을 바로 악기처럼 연주하고, 연주한 그대로 노트로 녹음할 수 있도록</b> 하는 기능이다.',
      steps: [
        ['건반 연결', 'MIDI 건반을 USB로 꽂고 하단의 건반 모양 버튼을 누른다. 처음 한 번은 브라우저가 사용 허락을 묻는다.'],
        ['바로 연주', '건반을 치면 지금 트랙의 악기 소리로 들린다. 서스테인 페달도 된다.'],
        ['녹음 시작', '「● MIDI」를 누르면 재생 위치부터 재생하면서 연주가 지금 트랙에 노트로 들어간다.'],
        ['녹음 끝', '「● MIDI」를 다시 누르거나 정지하면 끝난다. 박자는 「다듬기」로 정리한다.'],
        ['스텝 입력과 같이', '스텝 입력 창이 열려 있으면 MIDI 건반으로 음을 하나씩 찍을 수 있다.']
      ],
      tips: ['크롬 · 엣지 · 안드로이드 크롬에서 동작한다 (사파리 · 아이폰은 아직 지원하지 않는다).', '메트로놈을 켜고 녹음하면 박자를 맞추기 쉽다.'],
      scene: function () {
        var kb = ''; for (var i = 0; i < 14; i++) kb += '<b data-i="' + i + '"></b>';
        var bk = ''; [0, 1, 3, 4, 5, 7, 8, 10, 11, 12].forEach(function (i) { bk += '<i style="--x:' + i + '"></i>'; });
        return editor({ notes: '', extra:
          '<div class="gm-perm"><b>localhost에서 다음 권한을 요청합니다</b><span>' + svg('midi') + 'MIDI 기기 사용</span><div><span class="gm-btn">차단</span><span class="gm-btn pri" data-k="allow">허용</span></div></div>' +
          '<div class="gm-hw"><div class="gm-hwTop"><span class="led"></span>USB MIDI KEYBOARD<span class="knob"></span><span class="knob"></span></div><div class="gm-hwKeys">' + kb + '<div class="gm-hwBk">' + bk + '</div></div></div>' });
      },
      script: [
        { cap: '건반을 USB로 꽂고, 하단의 건반 모양 버튼을 누른다', step: 0, fx: function (s) { s.q('.gm-hw').classList.add('in'); }, hold: 900 },
        { step: 0, click: '[data-k=midi]', fx: function (s) { s.q('.gm-perm').classList.add('show'); }, hold: 500 },
        { cap: '처음 한 번은 브라우저가 묻는다 — 「허용」', step: 0, click: '[data-k=allow]', fx: function (s) { s.q('.gm-perm').classList.remove('show'); s.q('[data-k=midi]').classList.add('on'); s.q('.gm-hw .led').classList.add('on'); s.q('[data-k=mrec]').classList.add('show'); toast(s, 'MIDI 키보드 1대 연결 — 건반을 눌러 보세요'); }, hold: 1200 },
        { cap: '건반을 치면 지금 트랙 소리로 바로 들린다', step: 1, fx: function (s) { hwPlay(s, [0, 2, 4, 7], 230); }, hold: 1300 },
        { cap: '「● MIDI」를 누르면 재생하면서 녹음이 시작된다', step: 2, click: '[data-k=mrec]', fx: function (s) { s.q('[data-k=mrec]').classList.add('on'); recRun(s); }, hold: 300 },
        { step: 2, fx: function (s) { hwRec(s); }, hold: 4200 },
        { cap: '다시 누르면 녹음 끝 — 연주가 노트로 들어왔다', step: 3, click: '[data-k=mrec]', fx: function (s) { s.q('[data-k=mrec]').classList.remove('on'); stopPh(s); toast(s, 'MIDI 녹음 — 노트 8개를 넣었어요 · 박자 맞추기는 「다듬기」'); }, hold: 2200 }
      ],
      open: function () { var b = $id('midiInBtn'); if (b && !b.classList.contains('on')) b.click(); }
    },
    {
      id: 'mp', name: 'MIDI 불러오기 · 백업', icon: 'mp', hue: ['#5ad1e6', '#1f8fb3'], keys: [], badge: 'NEW',
      line: '마이페이지에서 파일 주고받기',
      desc: '다른 프로그램에서 만든 <b>MIDI 파일을 새 곡으로 불러오고</b>, 모든 곡을 <b>파일 하나로 백업해 다른 기기로 옮길 수 있도록</b> 하는 기능이다.',
      steps: [
        ['마이페이지 열기', '왼쪽 위 로고(또는 「내 곡」)를 눌러 마이페이지로 간다.'],
        ['MIDI 불러오기', '「불러오기 (MIDI · 프로젝트)」를 누르고 .mid 파일을 고른다. 여러 개를 한꺼번에 골라도 된다.'],
        ['바로 편집', '트랙 · 악기 · 템포 · 박자표 · 가사까지 그대로 들어오고, 「편집하기」를 누르면 바로 열린다.'],
        ['전체 백업', '「전체 백업」을 누르면 모든 곡이 .json 파일 하나로 저장된다.'],
        ['되살리기', '백업 파일을 「불러오기」로 열면 곡이 되살아난다. 이미 있는 곡은 건너뛴다.']
      ],
      tips: ['곡은 브라우저 데이터베이스에 저장돼서 큰 곡도 넉넉히 담을 수 있다.', '브라우저 데이터를 지우기 전에는 꼭 전체 백업을 해 둔다.'],
      scene: function () {
        var card = function (n, meta, dots, cls) { var d = ''; for (var i = 0; i < 14; i++) d += '<i style="left:' + (6 + i * 6.5) + '%;top:' + (20 + ((i * 37 + dots) % 55)) + '%"></i>'; return '<div class="gp-card ' + (cls || '') + '"><div class="pv">' + d + '</div><b>' + n + '</b><span>' + meta + '</span><em>편집</em></div>'; };
        return '<div class="gm gp"><div class="gp-top"><span class="gm-logo"></span><b>Thaniya-SoundLab</b></div>' +
          '<div class="gp-head"><span class="gp-av"></span><div><b>마이페이지</b><span>이 브라우저에 저장된 곡 3개</span></div><span class="sp"></span>' +
          '<span class="gm-btn" data-k="imp">불러오기 (MIDI · 프로젝트)</span><span class="gm-btn" data-k="bak">전체 백업</span><span class="gm-btn pri">+ 새 곡</span></div>' +
          '<div class="gp-grid">' + card('봄날 멜로디', '트랙 2 · 노트 64', 3) + card('허밍 메모', '트랙 1 · 노트 21', 11) + card('게임 BGM', '트랙 4 · 노트 210', 19) + '</div>' +
          '<div class="gp-pick"><div class="hd">열기</div><div class="ls"><b data-k="f1">' + svg('mp') + '내 노래.mid<em>12KB</em></b><b>' + svg('mp') + '데모.mid<em>8KB</em></b><b>' + svg('mp') + 'SoundLab 백업.json<em>240KB</em></b></div><div class="ft"><span class="gm-btn">취소</span><span class="gm-btn pri" data-k="open">열기</span></div></div>' +
          '<div class="gp-conf"><b>\'내 노래\'을(를) 불러왔어요</b><span>트랙 3개 · 노트 128개 · 92 BPM — 바로 편집할까요?</span><div><span class="gm-btn">나중에</span><span class="gm-btn pri" data-k="edit">편집하기</span></div></div>' +
          '<div class="gp-dl">' + svg('chk') + 'SoundLab 백업 20261126 (4곡).json</div><div class="gm-toast"></div></div>';
      },
      script: [
        { cap: '마이페이지에서 「불러오기 (MIDI · 프로젝트)」를 누른다', step: 1, click: '[data-k=imp]', fx: function (s) { s.q('.gp-pick').classList.add('show'); }, hold: 400 },
        { cap: '.mid 파일을 고르고 「열기」', step: 1, click: '[data-k=f1]', fx: function (s) { s.q('[data-k=f1]').classList.add('on'); }, hold: 200 },
        { step: 1, click: '[data-k=open]', fx: function (s) {
          s.q('.gp-pick').classList.remove('show');
          var g = s.q('.gp-grid'), d = document.createElement('div'); d.className = 'gp-card new'; var dots = ''; for (var i = 0; i < 14; i++) dots += '<i style="left:' + (6 + i * 6.5) + '%;top:' + (18 + ((i * 29) % 60)) + '%"></i>';
          d.innerHTML = '<div class="pv">' + dots + '</div><b>내 노래</b><span>트랙 3 · 노트 128</span><em>편집</em>'; g.insertBefore(d, g.firstChild);
          s.q('.gp-head div span').textContent = '이 브라우저에 저장된 곡 4개';
        }, hold: 600 },
        { cap: '트랙 · 악기 · 박자 · 가사가 그대로 — 「편집하기」로 바로 연다', step: 2, fx: function (s) { s.q('.gp-conf').classList.add('show'); }, hold: 700 },
        { step: 2, click: '[data-k=edit]', fx: function (s) { s.q('.gp-conf').classList.remove('show'); s.q('.gp-card.new').classList.add('pulse'); toast(s, '편집 화면으로 이동해요'); }, hold: 1300 },
        { cap: '「전체 백업」을 누르면 모든 곡이 파일 하나로 저장된다', step: 3, click: '[data-k=bak]', fx: function (s) { s.q('.gp-dl').classList.add('show'); toast(s, '곡 4개를 백업 파일로 저장했어요'); }, hold: 1800 },
        { cap: '다른 기기에서는 백업 파일을 「불러오기」로 열면 되살아난다', step: 4, move: '[data-k=imp]', hold: 2000 }
      ],
      open: function () { if (IS_MP) { var b = $id('mpImport'); if (b) b.click(); } else location.href = 'mypage.html'; }
    }
  ];

  // 「직접 해 보기」: 앱 함수는 app.js 안에 있어서 바깥에서 못 부르므로, 실제 화면의 버튼을 눌러 줘요
  function clickReal(id) { var b = $id(id); if (b) b.click(); }
  // ───────── 장면 도우미 ─────────
  function toast(s, msg) {
    if (!s) return;
    var t = s.q('.gm-toast'); if (!t) return; t.textContent = msg; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  }
  // ── MIDI 도구 장면
  var MT_MEL = [[0, 8, 9], [8, 8, 8], [16, 8, 10], [24, 8, 9]];
  function mtChord(s) { var h = ''; MT_MEL.forEach(function (m, i) { [2, 4, 6].forEach(function (d, k) { h += '<i class="gm-n pop ch sel" style="--s:' + m[0] + ';--l:' + m[1] + ';--r:' + (m[2] - d) + ';animation-delay:' + (i * 0.12 + k * 0.05) + 's"></i>'; }); }); s.q('.gm-notes').insertAdjacentHTML('beforeend', h); }
  function mtArp(s) {
    s.qa('.gm-n').forEach(function (n) { n.remove(); });
    var h = ''; MT_MEL.forEach(function (m, i) { var rows = [m[2], m[2] - 2, m[2] - 4, m[2] - 6]; for (var k = 0; k < 8; k++) h += '<i class="gm-n pop sel" style="--s:' + (m[0] + k) + ';--l:1;--r:' + rows[k % 4] + ';animation-delay:' + ((i * 8 + k) * 0.025) + 's"></i>'; });
    s.q('.gm-notes').insertAdjacentHTML('beforeend', h);
  }
  // ── 오토메이션 장면: 레인 위에 선 그리기 (가로 0~1 · 세로 0~1 = 아래~위)
  function lanePt(s, fx, fy) { var r = s.rel(s.q('.gm-vel')); return [r.x + r.w * fx, r.y + 4 + (r.h - 8) * (1 - fy)]; }
  function laneVal(s, p) { var r = s.rel(s.q('.gm-vel')); return [Math.max(0, Math.min(1, (p[0] - r.x) / r.w)), Math.max(0, Math.min(1, 1 - (p[1] - r.y - 4) / (r.h - 8)))]; }
  function auInit(s, kind) {
    var v = s.q('.gm-vel'); s._au = []; s._auK = kind;
    v.innerHTML = '<svg class="gm-au" viewBox="0 0 100 100" preserveAspectRatio="none"><line class="base" x1="0" x2="100" y1="' + (kind === '팬' ? 50 : 20) + '" y2="' + (kind === '팬' ? 50 : 20) + '"/><polygon class="fill" points=""/><polyline class="ln" points=""/><line class="gd" x1="0" y1="0" x2="0" y2="0"/></svg><span class="gm-auT">' + kind + ' 오토메이션 — 끌어서 그리기</span>';
    var h = s.q('.gm-velH'); h.innerHTML = '<span class="gm-lv">' + kind + ' ▾</span><span class="gm-lsel"><b>세기</b><b class="' + (kind === '볼륨' ? 'on' : '') + '">볼륨</b><b data-k="pan" class="' + (kind === '팬' ? 'on' : '') + '">팬</b><b>밝기</b></span>';
  }
  function auRender(s) {
    var a = s._au.slice().sort(function (x, y) { return x[0] - y[0]; }), base = s._auK === '팬' ? 50 : 100;
    var pts = a.map(function (p) { return (p[0] * 100).toFixed(2) + ',' + ((1 - p[1]) * 100).toFixed(2); }).join(' ');
    s.q('.gm-au .ln').setAttribute('points', pts);
    s.q('.gm-au .fill').setAttribute('points', a.length ? (a[0][0] * 100).toFixed(2) + ',' + base + ' ' + pts + ' ' + (a[a.length - 1][0] * 100).toFixed(2) + ',' + base : '');
    var t = s.q('.gm-auT'); if (t && a.length) t.style.opacity = 0;
  }
  function auDraw(s, b) {
    var v = laneVal(s, b), last = s._auLast;
    if (last != null) { var lo = Math.min(last, v[0]), hi = Math.max(last, v[0]); s._au = s._au.filter(function (p) { return p[0] <= lo || p[0] >= hi; }); }
    s._au = s._au.filter(function (p) { return Math.abs(p[0] - v[0]) > 0.004; }); s._au.push(v); s._auLast = v[0]; auRender(s);
  }
  function auGuide(s, a, b) { s._auLast = null; var A = laneVal(s, a), B = laneVal(s, b), g = s.q('.gm-au .gd'); g.setAttribute('x1', A[0] * 100); g.setAttribute('y1', (1 - A[1]) * 100); g.setAttribute('x2', B[0] * 100); g.setAttribute('y2', (1 - B[1]) * 100); g.classList.add('show'); s._ln = [A, B]; }
  function auLineEnd(s) { var A = s._ln[0], B = s._ln[1]; s.q('.gm-au .gd').classList.remove('show'); s._au = s._au.filter(function (p) { return p[0] < A[0] || p[0] > B[0]; }); s._au.push(A, B); s._auLast = null; auRender(s); }
  // ── 믹서 장면
  function mixSl(s, k, p) { var sl = s.q('[data-k=' + k + ']'); if (sl) sl.style.setProperty('--p', Math.max(0, Math.min(1, p))); }
  function fader(s, i, v) { var f = s.q('[data-k=f' + i + ']'); f.style.setProperty('--v', v); var db = v <= 0 ? -99 : 20 * Math.log10(v * 1.5); s.q('[data-v=f' + i + ']').textContent = (db >= 0 ? '+' : '') + db.toFixed(1); }
  function meters(s, ms) {
    var t0 = performance.now(), lv = [0.62, 0.48, 0.7];
    var id = setInterval(function () {
      if (s.dead || performance.now() - t0 > ms) { clearInterval(id); s.qa('.gm-mix .mt i').forEach(function (i) { i.style.height = '0%'; }); return; }
      s.qa('.gm-mix .mt').forEach(function (m) { var k = +m.dataset.m; m.querySelectorAll('i').forEach(function (i) { var base = k === 3 ? 0.74 : lv[k] * (k === 1 ? +s.q('[data-k=f1]').style.getPropertyValue('--v') / 0.667 : 1); i.style.height = Math.round((base + (Math.random() - 0.5) * 0.18) * 100) + '%'; }); });
      var e = (performance.now() - t0) / ms; s.q('[data-v=lm]').textContent = (-15.5 + Math.random() * 3).toFixed(1); s.q('[data-v=li]').textContent = (-14.8 + e * 0.6).toFixed(1); s.q('[data-v=pk]').textContent = (-2.4 + Math.random() * 0.8).toFixed(1);
    }, 90);
  }
  // ── 스템 장면
  function stemProg(s, ms) {
    var p = s.q('.gm-prog'), t0 = performance.now(), names = ['피아노', '베이스', '드럼']; p.classList.add('show');
    var id = setInterval(function () {
      if (s.dead) { clearInterval(id); return; }
      var e = Math.min(1, (performance.now() - t0) / ms), k = Math.min(2, Math.floor(e * 3));
      p.style.setProperty('--p', e); s.q('[data-v=pct]').textContent = Math.round(e * 100) + '%'; s.q('[data-v=ptx]').textContent = (k + 1) + ' / 3 · ' + names[k];
      if (e >= 1) clearInterval(id);
    }, 40);
  }
  function pickCard(s, i) { s.qa('.gm-styles b').forEach(function (b) { b.classList.toggle('on', +b.dataset.i === i); }); }
  function seg(s, k) { s.qa('.gm-seg b').forEach(function (b) { b.classList.toggle('on', b.dataset.k === k); }); }
  function addTrack(s, name, col) { s.q('.gm-tl').insertAdjacentHTML('beforeend', '<div class="gm-trk new"><i style="background:' + col + '"></i>' + name + '</div>'); }
  function cursor(s) { var g = s.q('.gm-grid'), c = s.q('.gm-cur'); if (!c) { c = document.createElement('i'); c.className = 'gm-cur'; g.appendChild(c); } c.style.setProperty('--s', s.cur); }
  function lenPick(s, l) { s.len = l; s.qa('.gm-len b').forEach(function (b) { b.classList.toggle('on', +b.dataset.l === l); }); }
  function press(s, i) { var b = s.q('.gm-kb b[data-i="' + i + '"]'); b.classList.add('dn'); setTimeout(function () { b.classList.remove('dn'); }, 260); }
  function stepPut(s, rows) { var h = ''; rows.forEach(function (r) { h += note(s.cur, s.len || 2, r, 'pop'); }); s.q('.gm-notes').insertAdjacentHTML('beforeend', h); s.cur += s.len || 2; cursor(s); }
  function lasso(s, a, b) { var l = s.q('.gm-lasso'), g = s.rel(s.q('.gm-grid')); l.style.cssText = 'display:block;left:' + (Math.min(a[0], b[0]) - g.x) + 'px;top:' + (Math.min(a[1], b[1]) - g.y) + 'px;width:' + Math.abs(b[0] - a[0]) + 'px;height:' + Math.abs(b[1] - a[1]) + 'px'; }
  function lassoEnd(s) { s.q('.gm-lasso').style.display = 'none'; }
  function setSl(s, k, p) { var sl = s.q('[data-k=' + k + ']'); if (!sl.querySelector('.end')) sl.insertAdjacentHTML('beforeend', '<u class="start"></u><u class="mid"></u><u class="end"></u>'); sl.style.setProperty('--p', p); var v = s.q('[data-v=' + k + ']'); if (k === 'str') v.textContent = Math.round(p * 100) + '%'; else v.textContent = p < 0.02 ? '없음' : Math.round(50 + p * 25) + '%'; }
  function quant(s, str, sw) {
    s.qa('.gm-n.q').forEach(function (n) {
      if (n.dataset.s0 == null) { n.dataset.s0 = n.style.getPropertyValue('--s'); n.dataset.l0 = n.style.getPropertyValue('--l'); }
      var s0 = +n.dataset.s0, l0 = +n.dataset.l0, k = Math.round(s0 / 2), tg = k * 2 + (k % 2 ? sw * 2 * 0.66 : 0);
      n.style.setProperty('--s', (s0 + (tg - s0) * str).toFixed(3)); n.style.setProperty('--l', l0);
    });
  }
  function velBars(s) {
    var v = s.q('.gm-vel'), h = ''; s.qa('.gm-n.v').forEach(function (n, i) { var val = [0.9, 0.7, 0.75, 0.8, 0.95, 0.6, 0.85, 0.7, 0.8, 0.65, 0.9][i] || 0.8; n.style.setProperty('--v', val); h += '<b data-i="' + i + '" style="--s:' + n.style.getPropertyValue('--s') + ';--v:' + val + '"></b>'; });
    v.innerHTML = h + '<svg class="gm-vline"><line/></svg>';
  }
  function velPt(s, i, val) { var b = s.qa('.gm-vel b')[i], r = s.rel(b), v = s.rel(s.q('.gm-vel')); return [r.x + 3, v.y + 4 + (v.h - 8) * (1 - val)]; }
  function velVal(s, y) { var v = s.rel(s.q('.gm-vel')); return Math.max(0.05, Math.min(1, 1 - (y - v.y - 4) / (v.h - 8))); }
  function velSet(s, i, val) { var b = s.qa('.gm-vel b')[i], n = s.qa('.gm-n.v')[i]; if (!b) return; b.style.setProperty('--v', val.toFixed(3)); n.style.setProperty('--v', val.toFixed(3)); b.classList.add('hot'); setTimeout(function () { b.classList.remove('hot'); }, 300); }
  function velSetAt(s, p) { var bs = s.qa('.gm-vel b'), best = -1, bd = 1e9; bs.forEach(function (b, i) { var d = Math.abs(s.rel(b).x + 3 - p[0]); if (d < bd) { bd = d; best = i; } }); if (best >= 0 && bd < 12) velSet(s, best, velVal(s, p[1])); }
  function velPaint(s, a, b) { s.qa('.gm-vel b').forEach(function (bar, i) { var x = s.rel(bar).x + 3; if (x >= Math.min(a[0], b[0]) - 4 && x <= Math.max(a[0], b[0]) + 4) velSet(s, i, velVal(s, b[1])); }); }
  function velLine(s, a, b) { var v = s.rel(s.q('.gm-vel')), ln = s.q('.gm-vline line'); s.q('.gm-vline').classList.add('show'); ln.setAttribute('x1', a[0] - v.x); ln.setAttribute('y1', a[1] - v.y); ln.setAttribute('x2', b[0] - v.x); ln.setAttribute('y2', b[1] - v.y); s._ln = [a, b]; }
  function velLineEnd(s) { var a = s._ln[0], b = s._ln[1]; s.q('.gm-vline').classList.remove('show'); s.qa('.gm-vel b').forEach(function (bar, i) { var x = s.rel(bar).x + 3; if (x < a[0] - 4 || x > b[0] + 4) return; var y = a[1] + (b[1] - a[1]) * (x - a[0]) / ((b[0] - a[0]) || 1); setTimeout(function () { velSet(s, i, velVal(s, y)); }, i * 45); }); }
  function rulerPt(s, f) { var r = s.rel(s.q('.gm-ruler')); return [r.x + r.w * f, r.y + r.h / 2]; }
  function band(s, a, b) { var e = s.q('.gm-band'); e.style.left = (a * 100) + '%'; e.style.width = ((b - a) * 100) + '%'; }
  function phAt(s, f) { var p = s.q('.gm-ph'); p.style.display = 'block'; p.style.left = (f * 100) + '%'; }
  function stopPh(s) { clearInterval(s.phT); s.phT = 0; }
  function playLoop(s, a, b, turns) {
    stopPh(s); var t0 = performance.now(), dur = 1800, done = 0;
    s.phT = setInterval(function () {
      if (s.dead) return stopPh(s);
      var e = (performance.now() - t0) / dur, k = Math.floor(e); if (k >= turns + 1) { stopPh(s); return; }
      var f = a + (b - a) * (e - k); phAt(s, f); s.q('.gm-pos').textContent = '1.' + (1 + Math.floor((f / 0.5) * 4) % 4) + '.' + (1 + Math.floor((f / 0.5) * 16) % 4);
      if (k > done) { done = k; s.q('.gm-band').classList.remove('blink'); void s.q('.gm-band').offsetWidth; s.q('.gm-band').classList.add('blink'); }
    }, 30);
  }
  function marker(s, f, name, instant) { var m = document.createElement('span'); m.className = 'gm-mk' + (instant ? ' done' : ''); m.style.left = (f * 100) + '%'; m.innerHTML = '<em>' + name + '</em>'; s.q('.gm-marks').appendChild(m); }
  function ctxMenu(s, p) { var st = s.q('.gm'), m = document.createElement('div'); m.className = 'gm-ctx'; m.innerHTML = '<b>2마디</b><span>' + svg('loop') + '여기에 마커 넣기 (M)</span><span>' + svg('loop') + '여기부터 4마디 반복</span><span>' + svg('loop') + '반복 끄기 (L)</span>'; m.style.left = (p[0] + 4) + 'px'; m.style.top = (p[1] + 6) + 'px'; st.appendChild(m); }
  function hwPlay(s, keys, gap) { keys.forEach(function (k, i) { setTimeout(function () { if (s.dead) return; var b = s.q('.gm-hwKeys b[data-i="' + k + '"]'); b.classList.add('dn'); s.q('.gm-meter').classList.add('on'); setTimeout(function () { b.classList.remove('dn'); s.q('.gm-meter').classList.remove('on'); }, gap * 0.85); }, i * gap); }); }
  function recRun(s) {
    stopPh(s); var t0 = performance.now(), dur = 4000;
    s.phT = setInterval(function () { if (s.dead) return stopPh(s); var f = Math.min(1, (performance.now() - t0) / dur); phAt(s, f); s.q('.gm-ph').classList.add('rec'); if (f >= 1) stopPh(s); }, 30);
  }
  function hwRec(s) {
    var seq = [[0, 11, 3], [500, 10, 3], [1000, 9, 3], [1500, 7, 6], [2300, 8, 3], [2800, 9, 3], [3300, 10, 2], [3700, 11, 2]], hk = { 11: 0, 10: 1, 9: 2, 8: 3, 7: 4 };
    seq.forEach(function (n) { setTimeout(function () {
      if (s.dead) return; var st = n[0] / 4000 * 32;
      s.q('.gm-notes').insertAdjacentHTML('beforeend', note(st.toFixed(2), n[2], n[1], 'pop rec'));
      var b = s.q('.gm-hwKeys b[data-i="' + (hk[n[1]] + 7) + '"]'); if (b) { b.classList.add('dn'); setTimeout(function () { b.classList.remove('dn'); }, 300); }
    }, n[0]); });
  }

  // ───────── 플레이어 ─────────
  var P = { g: null, run: 0, paused: false, speed: 1, step: -1 };
  function makeStage(host) {
    var s = {
      host: host, dead: false,
      q: function (sel) { return host.querySelector(sel); }, qa: function (sel) { return Array.prototype.slice.call(host.querySelectorAll(sel)); },
      scale: function () { var i = host.querySelector('.gd-inner'); return i ? i.getBoundingClientRect().width / 640 : 1; },
      rel: function (el) { var a = host.querySelector('.gd-inner').getBoundingClientRect(), b = el.getBoundingClientRect(), k = s.scale(); return { x: (b.left - a.left) / k, y: (b.top - a.top) / k, w: b.width / k, h: b.height / k }; }
    };
    return s;
  }
  function stageReset(g) {
    var st = $id('gdStage');
    if (P.s) { P.s.dead = true; stopPh(P.s); }
    st.innerHTML = '<div class="gd-inner">' + g.scene() + '<div class="gd-cursor"><svg viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.6L4 20z"/></svg><span class="rip"></span></div><div class="gd-key"></div></div>';
    P.s = makeStage(st); P.s.cur = 0; P.s.len = 4;
    fit(); setCursor([560, 330], 0);
    return P.s;
  }
  function fit() { var st = $id('gdStage'), i = st && st.querySelector('.gd-inner'); if (!i) return; var k = st.clientWidth / 640; i.style.transform = 'scale(' + k + ')'; st.style.height = (400 * k) + 'px'; }
  function setCursor(p, ms) { var c = P.s.q('.gd-cursor'); c.style.transitionDuration = (ms || 0) + 'ms'; c.style.transform = 'translate(' + p[0] + 'px,' + p[1] + 'px)'; P.cx = p; }
  function target(t) {
    if (!t) return null; if (Array.isArray(t)) return t;
    if (typeof t === 'function') return t(P.s);
    var el = P.s.q(t); if (!el) return null; var r = P.s.rel(el); return [r.x + Math.min(r.w / 2, r.w - 4), r.y + r.h / 2];
  }
  async function gate(run) { while (P.paused && run === P.run) await sleep(80); return run === P.run; }
  async function wait(ms, run, fast) { if (fast) return run === P.run; var end = performance.now() + ms / P.speed; while (performance.now() < end) { if (!(await gate(run))) return false; await sleep(Math.min(40, end - performance.now())); } return run === P.run; }
  async function moveTo(p, run, fast) {
    if (!p) return true; var d = Math.hypot(p[0] - P.cx[0], p[1] - P.cx[1]), ms = fast ? 0 : Math.max(260, Math.min(900, d * 2.1)) / P.speed;
    setCursor(p, ms); return wait(ms * P.speed + 60, run, fast);
  }
  function ripple(right) { var c = P.s.q('.gd-cursor'); c.classList.remove('clk', 'rclk'); void c.offsetWidth; c.classList.add(right ? 'rclk' : 'clk'); }
  function showKey(k) { var e = P.s.q('.gd-key'); e.textContent = k; e.classList.add('show'); }
  function hideKey() { var e = P.s.q('.gd-key'); e.classList.remove('show'); }
  function setCap(t) { if (t == null) return; var c = $id('gdCap'); c.classList.remove('in'); void c.offsetWidth; c.querySelector('span').textContent = t; c.classList.add('in'); }
  function setStep(i) {
    if (i == null || i === P.step) return; P.step = i;
    document.querySelectorAll('#gdSteps li').forEach(function (li, k) { li.classList.toggle('on', k === i); li.classList.toggle('done', k < i); });
    document.querySelectorAll('#gdProg b').forEach(function (b, k) { b.classList.toggle('on', k === i); b.classList.toggle('done', k < i); });
    $id('gdCapN').textContent = (i + 1);
  }
  async function act(a, run, fast) {
    if (a.cap) setCap(a.cap); if (a.step != null) setStep(a.step);
    if (a.key) showKey(a.key);
    if (a.move) { if (!(await moveTo(target(a.move), run, fast))) return false; }
    if (a.click || a.rclick) {
      if (!(await moveTo(target(a.click || a.rclick), run, fast))) return false;
      if (!fast) { ripple(!!a.rclick); var el = typeof a.click === 'string' ? P.s.q(a.click) : null; if (el) { el.classList.add('gd-press'); setTimeout(function () { el.classList.remove('gd-press'); }, 220); } if (!(await wait(170, run))) return false; }
    }
    if (a.drag) {
      var A = target(a.drag.from), B = target(a.drag.to);
      if (!(await moveTo(A, run, fast))) return false;
      var c = P.s.q('.gd-cursor'); c.classList.add('down');
      var n = fast ? 1 : 26, i;
      for (i = 1; i <= n; i++) {
        var p = i / n, e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, pt = [A[0] + (B[0] - A[0]) * e, A[1] + (B[1] - A[1]) * e];
        setCursor(pt, fast ? 0 : 30); if (a.on) a.on(P.s, e, A, pt);
        if (!(await wait(32, run, fast))) return false;
      }
      c.classList.remove('down'); if (a.end) a.end(P.s);
    }
    if (a.type) {
      var into = P.s.q(a.into); for (var j = 1; j <= a.type.length; j++) { if (into) into.textContent = a.type.slice(0, j); if (!(await wait(110, run, fast))) return false; }
    }
    if (a.fx) a.fx(P.s);
    if (a.keyUp) hideKey();
    if (a.wait) { if (!(await wait(a.wait, run, fast))) return false; }
    return wait(a.hold != null ? a.hold : 380, run, fast);
  }
  async function runDemo(fromStep) {
    var g = P.g, run = ++P.run; P.step = -1;
    stageReset(g); P.paused = false; ctlUI();
    await wait(450, run);
    var fast = fromStep > 0;
    for (var i = 0; i < g.script.length; i++) {
      var a = g.script[i];
      if (fast && a.step != null && a.step >= fromStep) fast = false;
      if (!(await act(a, run, fast))) return;
    }
    if (!(await wait(1400, run))) return;
    if (run === P.run && $id('gdM').classList.contains('show')) runDemo(0);   // 끝나면 처음부터 다시 (반복 재생)
  }
  function ctlUI() { $id('gdPlay').innerHTML = svg(P.paused ? 'play' : 'pause'); $id('gdPlay').title = P.paused ? '재생' : '일시정지'; $id('gdStage').classList.toggle('paused', P.paused); }

  // ───────── 창 ─────────
  function build() {
    if ($id('gdM')) return;
    var m = document.createElement('div'); m.id = 'gdM';
    m.innerHTML =
      '<div class="gd-card" role="dialog" aria-label="기능 가이드">' +
      '<aside class="gd-side"><div class="gd-brand">' + svg('book') + '<div><b>기능 가이드</b><span>보고 따라 하는 시범 영상</span></div></div><nav id="gdList"></nav>' +
      '<div class="gd-sideFoot">각 기능 창의 <b>' + svg('q') + ' 사용법</b> 버튼으로 언제든 다시 볼 수 있어요</div></aside>' +
      '<section class="gd-main">' +
      '<header class="gd-head"><span class="gd-hIcon" id="gdIcon"></span><div class="gd-hT"><b id="gdTitle"></b><span id="gdKeys"></span></div><span class="sp"></span>' +
      '<button class="gd-try" id="gdTry">' + svg('try') + '직접 해 보기</button><button class="gd-close" id="gdClose" title="닫기 (Esc)">' + svg('x') + '</button></header>' +
      '<div class="gd-scroll">' +
      '<div class="gd-video"><div class="gd-stage" id="gdStage"></div>' +
      '<div class="gd-cap" id="gdCap"><i id="gdCapN">1</i><span></span></div>' +
      '<div class="gd-ctl"><button id="gdPlay" class="gd-cb"></button><button id="gdRe" class="gd-cb" title="처음부터">' + svg('redo') + '</button><div class="gd-prog" id="gdProg"></div><button id="gdSpd" class="gd-spd" title="재생 속도">1×</button></div></div>' +
      '<div class="gd-what"><span class="gd-lbl">이런 기능이에요</span><p id="gdDesc"></p></div>' +
      '<div class="gd-cols"><div class="gd-how"><span class="gd-lbl">이렇게 써요</span><ol id="gdSteps"></ol></div>' +
      '<div class="gd-tips"><span class="gd-lbl">' + svg('bulb') + '알아 두면 좋아요</span><ul id="gdTips"></ul></div></div>' +
      '</div></section></div>';
    document.body.appendChild(m);
    var nav = $id('gdList');
    G.forEach(function (g) {
      var b = document.createElement('button'); b.className = 'gd-item'; b.dataset.id = g.id; b.style.setProperty('--h1', g.hue[0]); b.style.setProperty('--h2', g.hue[1]);
      b.innerHTML = '<span class="ic">' + svg(g.icon) + '</span><span class="tx"><b>' + g.name + (g.badge ? '<em>' + g.badge + '</em>' : '') + '</b><small>' + g.line + '</small></span>' + (seen[g.id] ? '<i class="ok">' + svg('chk') + '</i>' : '');
      b.onclick = function () { show(g.id); }; nav.appendChild(b);
    });
    $id('gdClose').onclick = close;
    m.addEventListener('pointerdown', function (e) { if (e.target === m) close(); });
    $id('gdPlay').onclick = function () { P.paused = !P.paused; ctlUI(); };
    $id('gdRe').onclick = function () { runDemo(0); };
    $id('gdSpd').onclick = function () { P.speed = P.speed === 1 ? 1.5 : P.speed === 1.5 ? 0.75 : 1; $id('gdSpd').textContent = (P.speed === 0.75 ? '0.75' : P.speed) + '×'; };
    $id('gdStage').addEventListener('click', function () { P.paused = !P.paused; ctlUI(); });
    $id('gdTry').onclick = function () { var g = P.g; close(); setTimeout(function () { try { g.open(); } catch (e) {} }, 80); };
    window.addEventListener('resize', function () { if (m.classList.contains('show')) fit(); });
    document.addEventListener('keydown', function (e) {
      if (!m.classList.contains('show')) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.code === 'Space') { e.preventDefault(); P.paused = !P.paused; ctlUI(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var i = G.indexOf(P.g) + (e.key === 'ArrowDown' ? 1 : -1); if (G[i]) show(G[i].id); }
      e.stopImmediatePropagation();
    }, true);
  }
  function show(id) {
    var g = G.filter(function (x) { return x.id === id; })[0] || G[0]; P.g = g; markSeen(g.id);
    document.querySelectorAll('#gdList .gd-item').forEach(function (b) { b.classList.toggle('on', b.dataset.id === g.id); if (b.dataset.id === g.id && !b.querySelector('.ok')) b.insertAdjacentHTML('beforeend', '<i class="ok">' + svg('chk') + '</i>'); });
    var card = $id('gdM').querySelector('.gd-card'); card.style.setProperty('--h1', g.hue[0]); card.style.setProperty('--h2', g.hue[1]);
    $id('gdIcon').innerHTML = svg(g.icon); $id('gdTitle').textContent = g.name;
    $id('gdKeys').innerHTML = g.keys.length ? '단축키 ' + g.keys.map(function (k) { return '<kbd>' + k + '</kbd>'; }).join(' ') : '';
    $id('gdDesc').innerHTML = g.desc;
    $id('gdSteps').innerHTML = g.steps.map(function (s, i) { return '<li data-i="' + i + '"><i>' + (i + 1) + '</i><div><b>' + s[0] + '</b><span>' + s[1] + '</span></div></li>'; }).join('');
    $id('gdSteps').querySelectorAll('li').forEach(function (li) { li.onclick = function () { runDemo(+li.dataset.i); }; });
    $id('gdTips').innerHTML = g.tips.map(function (t) { return '<li>' + t + '</li>'; }).join('');
    $id('gdProg').innerHTML = g.steps.map(function (s, i) { return '<b title="' + (i + 1) + '. ' + s[0] + '"><i></i></b>'; }).join('');
    $id('gdProg').querySelectorAll('b').forEach(function (b, i) { b.onclick = function () { runDemo(i); }; });
    $id('gdTry').hidden = IS_MP && g.id !== 'mp';
    $id('gdM').querySelector('.gd-scroll').scrollTop = 0;
    runDemo(0);
  }
  function open(id) { build(); hideBubble(); var m = $id('gdM'); m.classList.add('show'); document.body.classList.add('gdOpen'); requestAnimationFrame(function () { fit(); show(id || (P.g && P.g.id) || (IS_MP ? 'mp' : G[0].id)); }); }
  function close() { var m = $id('gdM'); if (!m) return; P.run++; if (P.s) { P.s.dead = true; stopPh(P.s); } m.classList.remove('show'); document.body.classList.remove('gdOpen'); }
  window.openGuide = open;
  window.GUIDE_LIST = G.map(function (g) { return g.id; });

  // ───────── 기능 창에 「사용법」 버튼 · 처음 쓸 때 '시범 보기' 말풍선 ─────────
  function helpBtn(id, mini) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'gdHelp' + (mini ? ' mini' : ''); b.dataset.guide = id;
    b.title = '사용법 — 시범 영상으로 보기'; b.innerHTML = svg('q') + (mini ? '' : '<span>사용법</span>');
    b.addEventListener('click', function (e) { e.stopPropagation(); open(id); }); return b;
  }
  function mount(sel, beforeSel, id, mini) { var host = document.querySelector(sel); if (!host || host.querySelector('.gdHelp')) return; var ref = beforeSel ? host.querySelector(beforeSel) : null; host.insertBefore(helpBtn(id, mini), ref); }
  var bub = null;
  function hideBubble() { if (bub) { bub.remove(); bub = null; } }
  function bubble(id, anchorSel) {
    if (seen[id] || seen['b-' + id]) return; seen['b-' + id] = 1; try { localStorage.setItem('hc-guideSeen', JSON.stringify(seen)); } catch (e) {}
    setTimeout(function () {
      var a = document.querySelector(anchorSel); if (!a || !a.offsetParent) return; hideBubble();
      var g = G.filter(function (x) { return x.id === id; })[0], r = a.getBoundingClientRect();
      bub = document.createElement('div'); bub.className = 'gdBubble';
      bub.innerHTML = '<b>' + g.name + ' — 처음이세요?</b><span>마우스로 따라 하는 30초 시범을 볼 수 있어요</span><div><button class="no">괜찮아요</button><button class="yes">' + svg('play') + '시범 보기</button></div>';
      document.body.appendChild(bub);
      var bw = bub.offsetWidth, x = Math.max(8, Math.min(innerWidth - bw - 8, r.left + r.width / 2 - bw / 2)), below = r.bottom + 10 + bub.offsetHeight < innerHeight;
      bub.style.left = x + 'px'; bub.style.top = (below ? r.bottom + 10 : r.top - bub.offsetHeight - 10) + 'px'; bub.classList.add(below ? 'down' : 'up');
      bub.style.setProperty('--ax', (r.left + r.width / 2 - x) + 'px');
      bub.querySelector('.yes').onclick = function () { open(id); };
      bub.querySelector('.no').onclick = hideBubble;
      setTimeout(function () { if (bub && bub.dataset.id === id) hideBubble(); }, 9000); bub.dataset.id = id;
    }, 450);
  }
  function watch(el, cls, fn) { if (!el) return; var was = el.classList.contains(cls); new MutationObserver(function () { var now = el.classList.contains(cls); if (now && !was) fn(); if (!now && was) hideBubble(); was = now; }).observe(el, { attributes: true, attributeFilter: ['class'] }); }   // 창이 닫히면 말풍선도 닫기
  function wire() {
    if (IS_MP) {
      var imp = $id('mpImport'); if (imp && !$id('mpGuide')) { var b = helpBtn('mp'); b.id = 'mpGuide'; b.classList.add('mpGuide'); imp.parentNode.insertBefore(b, imp); }
      return;
    }
    mount('#accModal .mhead', '#accClose', 'acc');
    mount('#stepModal .mhead', '#siClose', 'step');
    mount('#ntM .ntHead', '#ntClose', 'nt');
    mount('#velHead .vhBtns', '#velClose', 'vel', true);
    mount('#mtM .ntHead', '#mtClose', 'mt');
    mount('#mixM .mxHead', '#mxClose', 'mix');
    mount('#exportM .xhead', '#xClose', 'stem', true);
    var gb = $id('guideBtn'); if (gb) gb.onclick = function () { open(); };
    watch($id('accModal'), 'show', function () { bubble('acc', '#accModal .gdHelp'); });
    watch($id('stepModal'), 'show', function () { bubble('step', '#stepModal .gdHelp'); });
    watch($id('ntM'), 'show', function () { bubble('nt', '#ntM .gdHelp'); });
    watch($id('editor'), 'velOn', function () { bubble($id('editor').classList.contains('auLane') ? 'auto' : 'vel', '#velHead .gdHelp'); });
    watch($id('editor'), 'auLane', function () { bubble('auto', '#velHead .gdHelp'); });
    watch($id('mtM'), 'show', function () { bubble('mt', '#mtM .gdHelp'); });
    watch($id('mixM'), 'show', function () { bubble('mix', '#mixM .gdHelp'); });
    watch($id('midiInBtn'), 'on', function () { bubble('midi', '#midiInBtn'); });
    watch($id('loopBtn'), 'on', function () { bubble('loop', '#loopBtn'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'F1' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); open(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
