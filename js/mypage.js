/* Thaniya-SoundLab 마이페이지 (mypage.html 전용)
   편집 화면(app.js)과 따로 돌아가요 — 편집 화면을 고쳐도 마이페이지가 깨지지 않게 나눠 둔 파일.
   곡 데이터는 편집 화면과 같은 저장소(store.js: localStorage + IndexedDB, hc-library / hc-proj-<id>)를 함께 써요. */
(() => {
'use strict';
const LOW = 12, HIGH = 108;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const PG_EDIT = './edit.html';
const goPage = (url, q) => { location.href = url + (q || ''); };

// ───────── 아이콘 (app.js 와 같은 모양) ─────────
const ICON = {
  fsEnter: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  fsExit: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  grip: [6,12,18].map(y => `<circle cx="9" cy="${y}" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="${y}" r="1.4" fill="currentColor" stroke="none"/>`).join(''),
  hand: '<path d="M18 11V6.5a1.5 1.5 0 0 0-3 0V11"/><path d="M15 10.5V4.5a1.5 1.5 0 0 0-3 0v6"/><path d="M12 10.5V5.5a1.5 1.5 0 0 0-3 0V13"/><path d="M18 8.5a1.5 1.5 0 0 1 3 0V14a8 8 0 0 1-8 8h-1.2a7 7 0 0 1-5.2-2.3L3.4 16a1.6 1.6 0 0 1 2.3-2.2L9 16.5V13"/>',
  select: '<path d="M5 3.5l13.5 6.2-5.8 1.9-2 5.9z"/><path d="M13 12l5.5 5.5"/>',
  pen: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="M14.5 5.5l3 3"/>',
  eraser: '<path d="M8.5 19.5L4 15a1.5 1.5 0 0 1 0-2.1L13 4a1.5 1.5 0 0 1 2.1 0l4.9 4.9a1.5 1.5 0 0 1 0 2.1L11.5 19.5z"/><path d="M8.5 19.5H20"/><path d="M8.5 8.5l7 7"/>',
  range: '<rect x="4" y="4" width="16" height="16" rx="1.5" stroke-dasharray="3 2.6"/>',
  bucket: '<path d="M10.5 3.5l8 8-6.6 6.6a2 2 0 0 1-2.8 0L4 13a2 2 0 0 1 0-2.8z"/><path d="M4.5 12h13.6"/><path d="M20.5 15.5s-1.6 2-1.6 3.1a1.6 1.6 0 0 0 3.2 0c0-1.1-1.6-3.1-1.6-3.1z"/>',
  picker: '<path d="M13 5l6 6"/><path d="M15 3.8a2.3 2.3 0 0 1 3.2 0l1.9 1.9a2.3 2.3 0 0 1 0 3.2L18 11"/><path d="M16 9l-9 9H5v-2l9-9"/>',
  dockUp: '<path d="M5 4h14"/><path d="M12 20V9"/><path d="M7.5 13.5L12 9l4.5 4.5"/>',
  dockDown: '<path d="M5 20h14"/><path d="M12 4v11"/><path d="M7.5 10.5L12 15l4.5-4.5"/>',
  rec: '<circle cx="12" cy="12" r="6.5" fill="currentColor" stroke="none"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
  home: '<path d="M6 5v14"/><path d="M18.5 5.5v13L9 12z" fill="currentColor" stroke="none"/>',
  homeH: '<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>',
  metro: '<path d="M9 3.5h6l3.5 17h-13z"/><path d="M12 15.5l5-9"/><path d="M7 15.5h10"/>',
  countin: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/><text x="12.5" y="15.5" font-size="8.5" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif" font-weight="700">1</text>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  paste: '<path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><rect x="9" y="2.5" width="6" height="3.5" rx="1"/>',
  dup: '<rect x="3" y="7" width="9" height="10" rx="1.5"/><rect x="12" y="7" width="9" height="10" rx="1.5" stroke-dasharray="2.5 2"/>',
  trash: '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>',
  download: '<path d="M12 4v11"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M5 20h14"/>',
  clear: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9l6 6M15 9l-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  minus: '<path d="M5 12h14"/>',
  rename: '<path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M9 19h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  upload: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><circle cx="10" cy="16" r="1.6"/><path d="M11.6 16v-5l3 1"/>',
  magnet: '<path d="M6 3.5v8a6 6 0 0 0 12 0v-8"/><path d="M6 7.5h4M14 7.5h4"/><path d="M10 3.5v8a2 2 0 0 0 4 0v-8"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  panelL: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15"/><path d="M5.5 8h2M5.5 11h2"/>',
  panelR: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M14.5 4.5v15"/><path d="M16.5 8h2M16.5 11h2"/>',
  // ── 악기 · 테마 아이콘 (라인 스타일)
  keys: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14M7.5 12v7M16.5 12v7"/><rect x="6.2" y="5" width="2.6" height="7" rx=".6" fill="currentColor" stroke="none"/><rect x="15.2" y="5" width="2.6" height="7" rx=".6" fill="currentColor" stroke="none"/>',
  ekeys: '<rect x="2.5" y="8" width="19" height="11" rx="2"/><path d="M2.5 13h19M7 13v6M12 13v6M17 13v6"/><path d="M5.5 10.5h4"/><circle cx="15.5" cy="10.5" r=".9" fill="currentColor" stroke="none"/><circle cx="18.5" cy="10.5" r=".9" fill="currentColor" stroke="none"/><path d="M9 3.5l-1.5 2.5h2L8 8"/>',
  organ: '<rect x="3.5" y="10" width="3" height="10" rx="1.5"/><rect x="8" y="6" width="3" height="14" rx="1.5"/><rect x="12.5" y="3.5" width="3" height="16.5" rx="1.5"/><rect x="17" y="8" width="3" height="12" rx="1.5"/><path d="M2.5 20.5h19"/>',
  sparkle: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M18.5 15.5v5M16 18h5"/>',
  musicbox: '<rect x="3" y="10" width="14" height="10" rx="1.5"/><path d="M3 10l2.5-4h9L17 10"/><path d="M17 15h3v-3h1.5"/><circle cx="10" cy="15" r="1.6"/>',
  violin: '<path d="M12 9.5c-2 0-3.5.8-3.5 2.6 0 1 .8 1.5.8 2.4s-1.3 1.4-1.3 3c0 2 1.8 3.5 4 3.5s4-1.5 4-3.5c0-1.6-1.3-2.1-1.3-3s.8-1.4.8-2.4c0-1.8-1.5-2.6-3.5-2.6z"/><path d="M12 2.5v13M10.5 18.5h3M10.4 3.2h3.2"/>',
  viola: '<path d="M12 9.5c-2 0-3.5.8-3.5 2.6 0 1 .8 1.5.8 2.4s-1.3 1.4-1.3 3c0 2 1.8 3.5 4 3.5s4-1.5 4-3.5c0-1.6-1.3-2.1-1.3-3s.8-1.4.8-2.4c0-1.8-1.5-2.6-3.5-2.6z"/><path d="M12 2.5v13M10.5 18.5h3M10.4 3.2h3.2"/><path d="M17.5 3l1.5 4M20 3l-1 4"/>',
  cello: '<path d="M12 7.5c-2.3 0-4 1-4 3 0 1.2.9 1.7.9 2.7s-1.5 1.6-1.5 3.4c0 2.3 2 3.9 4.6 3.9s4.6-1.6 4.6-3.9c0-1.8-1.5-2.4-1.5-3.4s.9-1.5.9-2.7c0-2-1.7-3-4-3z"/><path d="M12 1.5v13M10.3 17h3.4M12 20.5v2.5"/>',
  strings: '<path d="M10 9.5c-2 0-3.5.8-3.5 2.6 0 1 .8 1.5.8 2.4s-1.3 1.4-1.3 3c0 2 1.8 3.5 4 3.5s4-1.5 4-3.5c0-1.6-1.3-2.1-1.3-3s.8-1.4.8-2.4c0-1.8-1.5-2.6-3.5-2.6z"/><path d="M10 2.5v13"/><path d="M4 21L21 4.5"/><path d="M19.5 3.5l2 2"/>',
  pizz: '<path d="M10 9.5c-2 0-3.5.8-3.5 2.6 0 1 .8 1.5.8 2.4s-1.3 1.4-1.3 3c0 2 1.8 3.5 4 3.5s4-1.5 4-3.5c0-1.6-1.3-2.1-1.3-3s.8-1.4.8-2.4c0-1.8-1.5-2.6-3.5-2.6z"/><path d="M10 2.5v13"/><path d="M17 9l3-1.5M17.5 12.5h3.5M17 16l3 1.5"/>',
  flute: '<g transform="rotate(-38 12 12)"><rect x="1" y="10.4" width="22" height="3.2" rx="1.6"/><circle cx="5" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="11" cy="12" r=".7" fill="currentColor" stroke="none"/><circle cx="14" cy="12" r=".7" fill="currentColor" stroke="none"/><circle cx="17" cy="12" r=".7" fill="currentColor" stroke="none"/></g>',
  recorder: '<path d="M10.5 2.5h3v15.5l1.5 3.5h-6l1.5-3.5z"/><path d="M10.5 6h3"/><circle cx="12" cy="9" r=".8" fill="currentColor" stroke="none"/><circle cx="12" cy="11.8" r=".8" fill="currentColor" stroke="none"/><circle cx="12" cy="14.6" r=".8" fill="currentColor" stroke="none"/>',
  clarinet: '<path d="M11 2.5h2l.3 3h-2.6z"/><path d="M10.6 5.5h2.8V17l3 4.5H7.6l3-4.5z"/><circle cx="12" cy="8.5" r=".7" fill="currentColor" stroke="none"/><circle cx="12" cy="11" r=".7" fill="currentColor" stroke="none"/><circle cx="12" cy="13.5" r=".7" fill="currentColor" stroke="none"/>',
  shawm: '<path d="M11 2.5h2l.3 3h-2.6z"/><path d="M10.6 5.5h2.8L15 15l3.5 6.5h-13L9 15z"/><circle cx="12" cy="9" r=".7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r=".7" fill="currentColor" stroke="none"/>',
  whistle: '<path d="M2.5 9h12a5 5 0 1 1-4.7 6.7H5.5a3 3 0 0 1-3-3z"/><circle cx="14.5" cy="14" r="1.6"/><path d="M8.5 9V6.5"/><path d="M18 4.5l1.5-1.5M20.5 7.5l1.5-.5"/>',
  mandolin: '<circle cx="9" cy="15" r="6"/><circle cx="9" cy="15" r="1.6"/><path d="M13.2 10.8L20 4"/><path d="M18.3 2.6l3.1 3.1"/>',
  lute: '<ellipse cx="9" cy="15" rx="5.5" ry="6.8" transform="rotate(45 9 15)"/><circle cx="9" cy="15" r="1.5"/><path d="M13.3 10.7l4.7-4.7"/><path d="M18 6l3 2.5"/>',
  guitar: '<path d="M14 10l6-6"/><path d="M18.8 2.8l2.4 2.4"/><path d="M10.5 9.5c-1-1-3.5-.5-4.5 1.5-.6 1.2-2.5 1-3.3 2.6-1.2 2.4.5 5.7 3.2 6.6 2.4.8 4.6-.8 4.8-2.7.2-1.5 1.8-2 2.5-3.1 1.1-1.8.6-3.9-.5-4.6z"/><circle cx="8.6" cy="15.4" r="1.4"/>',
  harp: '<path d="M5 21V3.5"/><path d="M5 3.5c4 0 5 3 9 3s5-1.5 6-2.5"/><path d="M20 4L7 21"/><path d="M4 21h4.5"/><path d="M8 5.4v14.2M11 6.4v9.4M14 6.6v5.2M17 5.6v2.4"/>',
  harpsichord: '<path d="M4 3.5h5.5c1.2 0 1.8.6 2.3 1.8L18.8 19a1.5 1.5 0 0 1-1.4 2H4z"/><path d="M4 8h7.5"/><path d="M6.5 11v7.5M9.5 11v7.5M12.5 12v6.5"/>',
  dulcimer: '<path d="M2.5 19h19L17 8H7z"/><path d="M5 15.5h14M6.5 11.8h11"/><path d="M15 2.5l-3 5.5"/><circle cx="11.6" cy="8.6" r="1.1" fill="currentColor" stroke="none"/>',
  hurdy: '<path d="M3.5 12c0-4 4-6 8-6h4.5c3 0 5 2.5 5 6s-2 6-5 6h-4.5c-4 0-8-2-8-6z"/><circle cx="16" cy="12" r="3"/><path d="M3.5 12H1.5V9"/><path d="M6.5 10.5h4.5M6.5 13.5h4.5"/>',
  bagpipe: '<path d="M5 13.5c0-3.5 3-6 6.5-6S18 10 18 13.5 15 20 11 20s-6-3-6-6.5z"/><path d="M9 8L6 2.5M12.5 7.5l1-5M15.8 9l4-5.5"/><path d="M11 20v2.5"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/><path d="M12 3v2"/>',
  handbell: '<path d="M12 2.5V8M10 2.5h4"/><path d="M7 18.5c0-6 1-10.5 5-10.5s5 4.5 5 10.5z"/><path d="M5 18.5h14"/><circle cx="12" cy="21" r="1.1"/>',
  chime: '<path d="M3 3.5h18"/><path d="M6 3.5v1M10 3.5v1M14 3.5v1M18 3.5v1"/><rect x="4.8" y="4.5" width="2.4" height="16" rx="1.2"/><rect x="8.8" y="4.5" width="2.4" height="13" rx="1.2"/><rect x="12.8" y="4.5" width="2.4" height="10" rx="1.2"/><rect x="16.8" y="4.5" width="2.4" height="7.5" rx="1.2"/>',
  sleigh: '<circle cx="8" cy="15" r="4"/><circle cx="16.5" cy="16.5" r="3.5"/><path d="M6.2 16.5h3.6M14.8 18h3.4"/><path d="M8 11c.5-4 4.5-6.5 9-6"/><path d="M16.5 13c.6-3 1-5.5.5-8"/>',
  cymbal: '<ellipse cx="12" cy="9" rx="9" ry="2.6"/><path d="M12 6.4V5M12 11.6V21M8 21h8"/>',
  drum: '<ellipse cx="12" cy="10" rx="8" ry="3"/><path d="M4 10v7.5c0 1.7 3.6 3 8 3s8-1.3 8-3V10"/><path d="M8 12.6l1.5 7.6M16 12.6l-1.5 7.6"/><path d="M5 2.5l5.5 5.5M19 2.5l-5.5 5.5"/>',
  choir: '<circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.6"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0"/><path d="M13.2 17a4.5 4.5 0 0 1 8.3 3"/>',
  candle: '<rect x="9" y="10" width="6" height="11" rx="1"/><path d="M12 10V8.2"/><path d="M12 2.8c1.6 1.8 2.1 3.1 1 4.4a1.4 1.4 0 0 1-2 0c-1.1-1.3-.6-2.6 1-4.4z"/>',
  ufo: '<ellipse cx="12" cy="12" rx="9.5" ry="3.2"/><path d="M7.4 10.2a4.6 4.6 0 0 1 9.2 0"/><path d="M8 18l-1 2.5M12 18.3v2.7M16 18l1 2.5"/>',
  sine: '<path d="M2.5 12c1.6-5 4.7-5 6.3 0s4.7 5 6.3 0 4.7-5 6.4 0"/>',
  wave: '<path d="M2.5 12c1.6-5 4.7-5 6.3 0s4.7 5 6.3 0 4.7-5 6.4 0"/>',
  pulse: '<path d="M2.5 16.5h3V7h4.5v9.5h3V7h4.5v9.5h4"/>',
  triwave: '<path d="M2.5 15.5l4.75-8 4.75 8 4.75-8 4.75 8"/>',
  invader: 'PIX',
  gamepad: '<path d="M7 7h10a5 5 0 0 1 4.8 6.4l-1 3.4a2.5 2.5 0 0 1-4.3.9L14.5 15h-5l-2 2.7a2.5 2.5 0 0 1-4.3-.9l-1-3.4A5 5 0 0 1 7 7z"/><path d="M7.5 9.5v3.5M5.8 11.2h3.4"/><circle cx="15.5" cy="10" r=".9" fill="currentColor" stroke="none"/><circle cx="17.7" cy="12.2" r=".9" fill="currentColor" stroke="none"/>',
  diamond: '<path d="M6.5 4h11l4 5.5L12 21 2.5 9.5z"/><path d="M2.5 9.5h19M8.5 9.5L12 21l3.5-11.5"/>',
  tv: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 3l3.5 4 3.5-4"/><path d="M6 11h1.5M10 11h2M15.5 11h2.5M7 14h3M13 14h1.5M17 14h1M6 17h2M11 17h3M16.5 17h1.5"/>',
  trumpet: '<path d="M2.5 9.5v5M2.5 12H14"/><path d="M14 9.5l7-4v13l-7-4z"/><path d="M6.5 12v3.5M9 12v3.5M11.5 12v3.5"/>',
  speaker: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><circle cx="12" cy="14.5" r="4"/><circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="6.5" r="1.5"/>',
  cart: '<path d="M5 3h14v12l-2 2v4H7v-4l-2-2z"/><rect x="8" y="6" width="8" height="6" rx="1"/><path d="M9.5 18v2M12 18v2M14.5 18v2"/>',
  castle: '<path d="M3 21V8h2.5v2.2h2.2V8h2.6v2.5h3.4V8h2.6v2.2h2.2V8H21v13z"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  tree: '<path d="M12 2.5l5 6h-2.5l4 5H16l4 5H4l4-5H5.5l4-5H7z"/><path d="M12 18.5V22"/>',
  bear: '<circle cx="6" cy="6.5" r="2.5"/><circle cx="18" cy="6.5" r="2.5"/><circle cx="12" cy="13" r="7"/><circle cx="9.5" cy="11.5" r=".9" fill="currentColor" stroke="none"/><circle cx="14.5" cy="11.5" r=".9" fill="currentColor" stroke="none"/><ellipse cx="12" cy="15.5" rx="2.4" ry="1.8"/>',
  coffee: '<path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3"/>',
  bolt: '<path d="M13.5 2.5L5 13.5h6.5l-1 8 8.5-11h-6.5z"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="7" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="7" rx="1.5"/>',
  disco: '<circle cx="12" cy="13.5" r="7.5"/><path d="M4.5 13.5h15M12 6v15M6 9.5h12M6 17.5h12"/><path d="M12 2v4"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5l-5.3 2.9 1.2-6-4.5-4.1 6-.7z"/>',
  sax: '<path d="M8.5 2.5h4M10.5 2.5v11a4.5 4.5 0 0 0 9 0V11.5"/><path d="M16.5 11.5h5"/><circle cx="10.5" cy="7" r=".8" fill="currentColor" stroke="none"/><circle cx="10.5" cy="10" r=".8" fill="currentColor" stroke="none"/>',
  palm: '<path d="M12 21c0-5 .5-9 1.5-12"/><path d="M13.5 9C11 5 6 5 3.5 7.5M13.5 9c2-4 6-5 8.5-3M13.5 9c-3 0-6 2-7 5M13.5 9c3 0 5.5 2 6 5"/><path d="M7.5 21h10"/>',
  sliders: '<path d="M6 3.5v17M12 3.5v17M18 3.5v17"/><rect x="3.8" y="13" width="4.4" height="3.2" rx="1" fill="currentColor"/><rect x="9.8" y="6.5" width="4.4" height="3.2" rx="1" fill="currentColor"/><rect x="15.8" y="10.5" width="4.4" height="3.2" rx="1" fill="currentColor"/>',
  env: '<path d="M2.5 19.5l4-15 4.5 7.5h6l4.5 7.5"/><path d="M2.5 20.5h19" stroke-dasharray="1.5 2"/>',
  filter: '<path d="M2.5 9.5h10c2 0 3-3.5 4.5-3.5s2 3.5 4.5 13.5"/><path d="M2.5 20.5h19" stroke-dasharray="1.5 2"/>',
  vibrato: '<path d="M2.5 12h2.5c1 0 1.5-4 3-4s2 8 3.5 8 2-8 3.5-8 2 8 3.5 8c1 0 1.5-4 3-4"/>',
  layers: '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M3 12l9 4.5 9-4.5"/><path d="M3 16.5L12 21l9-4.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none"/>',
  folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8a1.5 1.5 0 0 1 1.5 1.5v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
  folderOpen: '<path d="M3 18.5V6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2H18a1.5 1.5 0 0 1 1.5 1.5V10"/><path d="M3 18.5l2.6-7.2a1.5 1.5 0 0 1 1.4-1H21a1 1 0 0 1 .9 1.4l-2.5 6.9a1.5 1.5 0 0 1-1.4.9z"/>',
  folderPlus: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8a1.5 1.5 0 0 1 1.5 1.5v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/><path d="M12 10.5v6M9 13.5h6"/>',
  folderOut: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8a1.5 1.5 0 0 1 1.5 1.5v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/><path d="M9 13.5h6"/>',
  more: '<circle cx="5.5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  logo: '<path d="M2.5 12h2.5l2-5 3 10 3-14 3 13 2-4h3"/>',
  speakerOn: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
};
{ // 픽셀 인베이더 (칩튠)
  const R = ['..X.....X..','...X...X...','..XXXXXXX..','.XX.XXX.XX.','XXXXXXXXXXX','X.XXXXXXX.X','X.X.....X.X','...XX.XX...'];
  ICON.invader = R.map((r, y) => [...r].map((c, x) => c === 'X' ? `<rect x="${1.5 + x * 1.9}" y="${4.5 + y * 1.9}" width="1.95" height="1.95" fill="currentColor" stroke="none"/>` : '').join('')).join('');
}
const svg = n => `<svg class="i" viewBox="0 0 24 24">${ICON[n] || ICON.music}</svg>`;

// ───────── 악기 정의 (MIDI 불러오기·내보내기, 썸네일 색에 사용) ─────────
const BASE = { wave: 'triangle', harm: null, tone: 1, oct: 0, mix2: 0, wave2: 'sine', ratio2: 1, det2: 0,
  a: 0.01, d: 0.3, s: 0.8, r: 0.15, keytrack: 0, cut: 8, res: 0.7, fenv: 0, fdec: 0.3,
  fm: 0, fmRatio: 1, fmDec: 0.5, vib: 0, vibRate: 5.5, vibDelay: 0.15, noise: 0, nHz: 0, nQ: 1,
  trem: 0, tremRate: 12, bend: 0, formant: 0, lvl: 1, rev: 0.18, pan: 0 };
const PULSE = d => Array.from({ length: 24 }, (_, i) => Math.sin(Math.PI * (i + 1) * d) / (i + 1));   // 펄스파 배음
const DRUM_BASE = { tune: 0, dlen: 1, lvl: 1, rev: 0.12, pan: 0 };
const INSTS = {
  piano:    { label: '그랜드 피아노', fam: 'keys', icon: 'keys', color: '#5fa8ff', prog: 0, alias: 'piano grand 피아노',
    p: { wave: 'harm', harm: [1,.6,.3,.22,.1,.08,.04,.03], mix2: .25, wave2: 'sine', ratio2: 2, det2: 2, a: .002, d: 1.8, s: 0, r: .4, keytrack: 1, cut: 7, fenv: 2.5, fdec: .5, fm: .4, fmRatio: 1, fmDec: .2, lvl: 1.1, rev: .28 } },
  epiano:   { label: '일렉 피아노', fam: 'keys', icon: 'ekeys', color: '#4d8fe6', prog: 4, alias: 'electric piano rhodes ep 일렉',
    p: { wave: 'sine', fm: 1.2, fmRatio: 1, fmDec: 1.2, mix2: .2, wave2: 'sine', ratio2: 1, det2: 5, a: .002, d: 2.2, s: .12, r: .35, keytrack: .8, cut: 10, trem: .25, tremRate: 4.5, rev: .3 } },
  organ:    { label: '오르간', fam: 'keys', icon: 'organ', color: '#7aa7d9', prog: 16, alias: 'organ 오르간',
    p: { wave: 'harm', harm: [1,.7,.45,.35,0,.25,0,.18], a: .01, d: .1, s: 1, r: .06, cut: 12, trem: .15, tremRate: 6.5, lvl: .7, rev: .3 } },
  celesta:  { label: '첼레스타', fam: 'keys', icon: 'sparkle', color: '#8fd0ff', prog: 8, alias: 'celesta 첼레스타',
    p: { wave: 'sine', oct: 1, fm: 1.4, fmRatio: 4, fmDec: .25, mix2: .25, wave2: 'sine', ratio2: 3, a: .002, d: 1.4, s: 0, r: .6, keytrack: .6, cut: 12, lvl: .9, rev: .45 } },
  musicbox: { label: '오르골', fam: 'keys', icon: 'musicbox', color: '#a4b8ff', prog: 10, alias: 'music box 오르골 뮤직박스',
    p: { wave: 'sine', oct: 1, fm: 2, fmRatio: 5.3, fmDec: .12, mix2: .3, wave2: 'sine', ratio2: 4.02, a: .001, d: 1.6, s: 0, r: .8, keytrack: .5, cut: 14, rev: .5 } },
  violin:   { label: '바이올린', fam: 'str', icon: 'violin', color: '#c792ea', prog: 40, alias: 'violin 바이올린 vn',
    p: { wave: 'sawtooth', mix2: .6, wave2: 'sawtooth', det2: 4, a: .08, d: .3, s: .9, r: .18, cut: 5, res: 1.2, vib: 25, vibRate: 5.6, vibDelay: .15, lvl: .55, rev: .3 } },
  viola:    { label: '비올라', fam: 'str', icon: 'viola', color: '#ad7fe0', prog: 41, alias: 'viola 비올라 va',
    p: { wave: 'sawtooth', mix2: .6, wave2: 'sawtooth', det2: 5, a: .09, d: .3, s: .9, r: .2, cut: 4, res: 1.2, vib: 20, vibRate: 5.2, vibDelay: .18, lvl: .6, rev: .3 } },
  cello:    { label: '첼로', fam: 'str', icon: 'cello', color: '#9a6bd1', prog: 42, alias: 'cello 첼로 vc',
    p: { wave: 'sawtooth', mix2: .5, wave2: 'sawtooth', det2: 5, a: .1, d: .3, s: .9, r: .25, cut: 3.2, res: 1.5, vib: 18, vibRate: 5, vibDelay: .2, lvl: .7, rev: .3 } },
  strings:  { label: '스트링 합주', fam: 'str', icon: 'strings', color: '#d6a8f2', prog: 48, alias: 'strings str ensemble 현악 스트링',
    p: { wave: 'sawtooth', mix2: .8, wave2: 'sawtooth', det2: 9, a: .3, d: .4, s: .9, r: .5, cut: 3, res: .8, vib: 10, vibRate: 5, vibDelay: .3, lvl: .55, rev: .4 } },
  pizz:     { label: '피치카토', fam: 'str', icon: 'pizz', color: '#e0b5ff', prog: 45, alias: 'pizzicato pizz 피치카토',
    p: { wave: 'sawtooth', mix2: .3, wave2: 'triangle', det2: 6, a: .002, d: .4, s: 0, r: .2, keytrack: 1, cut: 3.5, fenv: 4, fdec: .08, rev: .35 } },
  flute:    { label: '플루트', fam: 'wind', icon: 'flute', color: '#5ed6d0', prog: 73, alias: 'flute fl 플루트',
    p: { wave: 'harm', harm: [1,.35,.12,.05], a: .06, d: .25, s: .85, r: .12, cut: 5, vib: 10, vibRate: 5, vibDelay: .25, noise: .1, nQ: 1.5, rev: .3 } },
  flutesus: { label: '플루트 서스테인', fam: 'wind', icon: 'flute', color: '#48c2bc', prog: 73, alias: 'flute sus fl sus 플루트',
    p: { wave: 'harm', harm: [1,.35,.12,.05], a: .18, d: .3, s: .95, r: .35, cut: 5, vib: 14, vibRate: 5, vibDelay: .4, noise: .08, nQ: 1.5, rev: .38 } },
  clarinet: { label: '클라리넷', fam: 'wind', icon: 'clarinet', color: '#3ba8a3', prog: 71, alias: 'clarinet cl 클라리넷',
    p: { wave: 'square', a: .04, d: .2, s: .9, r: .1, cut: 3.2, res: 1, vib: 6, vibDelay: .3, noise: .03, lvl: .7, rev: .25 } },
  whistle:  { label: '휘슬', fam: 'wind', icon: 'whistle', color: '#86e6e0', prog: 78, alias: 'whistle 휘슬 휘파람',
    p: { wave: 'sine', a: .04, d: .2, s: .9, r: .08, cut: 6, vib: 18, vibRate: 5.8, vibDelay: .1, noise: .06, nQ: 2, lvl: .8, rev: .25 } },
  mandolin: { label: '만돌린', fam: 'pluck', icon: 'mandolin', color: '#ffb454', prog: 25, alias: 'mandolin 만돌린',
    p: { wave: 'sawtooth', mix2: .7, wave2: 'sawtooth', det2: 7, a: .002, d: .6, s: 0, r: .15, keytrack: 1, cut: 4, fenv: 4, fdec: .06, lvl: .7, rev: .25 } },
  mandotrem:{ label: '만돌린 트레몰로', fam: 'pluck', icon: 'mandolin', color: '#f29a3a', prog: 25, alias: 'mandolin tr tremolo 만돌린 트레몰로',
    p: { wave: 'sawtooth', mix2: .7, wave2: 'sawtooth', det2: 7, a: .002, d: .1, s: .75, r: .2, cut: 4, fenv: 2, fdec: .06, trem: 1, tremRate: 13, lvl: .7, rev: .25 } },
  bell:     { label: '벨', fam: 'bell', icon: 'bell', color: '#f2c230', prog: 9, alias: 'bell 벨 종 glockenspiel',
    p: { wave: 'sine', fm: 3, fmRatio: 1.4, fmDec: 1.5, mix2: .15, wave2: 'sine', ratio2: 2.76, a: .001, d: 3, s: 0, r: 1.2, keytrack: .4, cut: 14, rev: .5 } },
  chime:    { label: '차임', fam: 'bell', icon: 'chime', color: '#e0b020', prog: 14, alias: 'chime tubular 차임 튜불러',
    p: { wave: 'sine', fm: 1.8, fmRatio: 2.76, fmDec: 1.2, mix2: .3, wave2: 'sine', ratio2: 5.4, a: .001, d: 3.5, s: 0, r: 1.5, keytrack: .3, cut: 14, rev: .45 } },
  sleigh:   { label: '슬레이벨', fam: 'bell', icon: 'sleigh', color: '#ffd966', prog: 9, alias: 's-bell sleigh bell 슬레이벨 방울',
    p: { wave: 'sine', tone: .1, oct: 2, noise: 1, nHz: 8000, nQ: 3, trem: 1, tremRate: 18, a: .001, d: .45, s: 0, r: .2, cut: 16, lvl: 1.2, rev: .3 } },
  cym:      { label: '심벌 스웰', fam: 'bell', icon: 'cymbal', color: '#b8b2a6', prog: 119, alias: 'cym cymbal 심벌',
    p: { wave: 'sine', tone: 0, noise: 1, nHz: 6000, nQ: .4, a: .002, d: 2, s: 0, r: 1, cut: 16, rev: .35 } },
  drums:    { label: '드럼 키트', fam: 'bell', icon: 'drum', color: '#4fd1a5', prog: 0, alias: 'drum drums kit 드럼 타악기 percussion', drum: true },
  choir:    { label: '콰이어', fam: 'synth', icon: 'choir', color: '#ff8fb1', prog: 52, alias: 'choir 콰이어 합창 보컬 aah',
    p: { wave: 'sawtooth', mix2: .8, wave2: 'sawtooth', det2: 12, a: .35, d: .5, s: .9, r: .6, cut: 2.2, vib: 8, vibRate: 4.5, vibDelay: .2, noise: .04, nQ: .7, formant: .8, lvl: .55, rev: .5 } },
  // 보컬 (가사로 노래하는 목소리)
  vocal:    { label: '여성 보컬', fam: 'voice', icon: 'mic', color: '#ff7aa8', prog: 54, vocal: true, alias: 'vocal voice vocaloid singer female soprano 보컬 보컬로이드 가사 노래 한국어 여자 여성 소프라노 기본',
    p: { vSex: 1, vBreath: .2, vTense: .5, vPorta: 1, vCons: 1, vRobot: 0, vib: 30, vibRate: 5.6, vibDelay: .25, lvl: 1, rev: .25 } },
  vidol:    { label: '디지털 아이돌', fam: 'voice', icon: 'sparkle', color: '#3fd8d0', prog: 54, vocal: true, alias: 'vocal voice vocaloid idol digital miku synth 보컬 보컬로이드 미쿠 아이돌 디지털 전자 기계 맑은 밝은 여성 가사 노래',
    p: { vSex: 1.17, vBreath: .04, vTense: .9, vPorta: .55, vCons: .85, vRobot: .85, vib: 18, vibRate: 6.4, vibDelay: .35, lvl: .95, rev: .2 } },
  vhusky:   { label: '허스키 여성 보컬', fam: 'voice', icon: 'mic', color: '#c98a6b', prog: 54, vocal: true, alias: 'vocal voice husky breathy alto female 보컬 허스키 숨 알토 여성 가사 노래 발라드 재즈',
    p: { vSex: .95, vBreath: .62, vTense: .28, vPorta: 1.3, vCons: 1, vRobot: 0, vib: 34, vibRate: 5.1, vibDelay: .3, lvl: 1.05, rev: .3 } },
  vocalm:   { label: '남성 보컬 (테너)', fam: 'voice', icon: 'mic', color: '#e0607f', prog: 54, vocal: true, alias: 'vocal voice vocaloid singer male tenor 보컬 보컬로이드 가사 노래 한국어 남자 남성 테너',
    p: { vSex: .84, vBreath: .15, vTense: .45, vPorta: 1, vCons: 1, vRobot: 0, vib: 22, vibRate: 5.2, vibDelay: .3, lvl: 1, rev: .22 } },
  vbari:    { label: '바리톤 남성 보컬', fam: 'voice', icon: 'mic', color: '#7a6fe0', prog: 54, vocal: true, alias: 'vocal voice baritone bass deep male 보컬 바리톤 베이스 굵은 낮은 남자 남성 가사 노래',
    p: { vSex: .75, vBreath: .18, vTense: .4, vPorta: 1.1, vCons: 1.05, vRobot: 0, vib: 26, vibRate: 4.9, vibDelay: .35, lvl: 1.1, rev: .24 } },
  fx:       { label: 'FX 신스', fam: 'synth', icon: 'ufo', color: '#ff6fd8', prog: 98, alias: 'fx effect 효과 신스',
    p: { wave: 'square', mix2: .5, wave2: 'sawtooth', det2: 25, bend: 12, a: .01, d: .5, s: .6, r: .6, cut: 6, res: 6, fenv: 3, fdec: .6, vib: 40, vibRate: 7, vibDelay: 0, lvl: .5, rev: .5 } },
  synth:    { label: '신스 리드', fam: 'synth', icon: 'sine', color: '#ff6f91', prog: 80, alias: 'synth lead 신스 리드 삼각파',
    p: { wave: 'triangle', a: .012, d: .1, s: .9, r: .05, cut: 16, rev: .1 } },
  bass:     { label: '베이스', fam: 'synth', icon: 'guitar', color: '#e0735a', prog: 33, alias: 'bass bs 베이스',
    p: { wave: 'sawtooth', mix2: .6, wave2: 'square', ratio2: .5, a: .005, d: .35, s: .55, r: .08, cut: 2.5, res: 2, fenv: 3, fdec: .18, lvl: 1.1, rev: .05 } },

  // 16비트 / 칩튠
  chipsq:   { label: '칩 스퀘어', fam: 'chip', icon: 'invader', color: '#7cff6b', prog: 80, alias: 'chip square 8bit 16bit 칩튠 스퀘어 게임 레트로',
    p: { wave: 'square', a: .002, d: .1, s: .8, r: .05, cut: 16, vib: 15, vibRate: 6, vibDelay: .3, lvl: .45, rev: .08 } },
  chip25:   { label: '칩 펄스 25%', fam: 'chip', icon: 'pulse', color: '#5ee35e', prog: 80, alias: 'chip pulse 25 8bit 16bit 칩튠 펄스 레트로',
    p: { wave: 'harm', harm: PULSE(.25), a: .002, d: .1, s: .8, r: .05, cut: 16, vib: 15, vibRate: 6, vibDelay: .3, lvl: .5, rev: .08 } },
  chip12:   { label: '칩 펄스 12.5%', fam: 'chip', icon: 'gamepad', color: '#a4ff8a', prog: 80, alias: 'chip pulse 12.5 thin 8bit 16bit 칩튠 펄스',
    p: { wave: 'harm', harm: PULSE(.125), a: .002, d: .1, s: .8, r: .05, cut: 16, vib: 12, vibRate: 6, vibDelay: .3, lvl: .55, rev: .08 } },
  chiptri:  { label: '칩 트라이앵글 베이스', fam: 'chip', icon: 'triwave', color: '#4cc94c', prog: 38, alias: 'chip triangle bass 8bit 16bit 칩튠 베이스',
    p: { wave: 'harm', harm: [1,0,.11,0,.04,0,.02,0,.012,0,.008,0,.006,0,.004,0,.12,0,.03], a: .002, d: .1, s: 1, r: .03, cut: 16, lvl: 1, rev: .03 } },
  chipbell: { label: '칩 벨', fam: 'chip', icon: 'diamond', color: '#b6ff9a', prog: 8, alias: 'chip bell 8bit 16bit 칩튠 벨 반짝',
    p: { wave: 'harm', harm: PULSE(.125), oct: 1, a: .001, d: .45, s: 0, r: .2, keytrack: .5, cut: 16, lvl: .55, rev: .2 } },
  chipnoise:{ label: '칩 노이즈', fam: 'chip', icon: 'tv', color: '#8fbf7f', prog: 121, alias: 'chip noise 8bit 16bit 칩튠 노이즈 효과 폭발',
    p: { wave: 'sine', tone: 0, noise: 1, nHz: 0, nQ: .6, a: .001, d: .18, s: 0, r: .05, cut: 16, lvl: 1.2, rev: .05 } },
  fmbrass:  { label: 'FM 브라스', fam: 'chip', icon: 'trumpet', color: '#6bffd0', prog: 61, alias: 'fm brass 16bit genesis 메가드라이브 브라스 트럼펫',
    p: { wave: 'sine', fm: 2.6, fmRatio: 1, fmDec: .45, mix2: .25, wave2: 'sawtooth', det2: 4, a: .03, d: .3, s: .75, r: .1, cut: 9, vib: 8, vibRate: 5.5, vibDelay: .25, lvl: .6, rev: .15 } },
  fmbass:   { label: 'FM 슬랩 베이스', fam: 'chip', icon: 'speaker', color: '#4fd6b0', prog: 36, alias: 'fm bass slap 16bit genesis 메가드라이브 베이스',
    p: { wave: 'sine', fm: 3, fmRatio: 1, fmDec: .15, mix2: .3, wave2: 'sine', ratio2: .5, a: .002, d: .3, s: .4, r: .05, cut: 12, lvl: 1, rev: .03 } },
  snesstr:  { label: 'SNES 스트링', fam: 'chip', icon: 'cart', color: '#9ae0ff', prog: 50, alias: 'snes strings 16bit 슈퍼패미컴 스트링 rpg',
    p: { wave: 'sawtooth', mix2: .5, wave2: 'sawtooth', det2: 6, a: .15, d: .4, s: .85, r: .3, cut: 2.4, res: 1, vib: 6, vibRate: 5, vibDelay: .3, lvl: .5, rev: .3 } },

  // 중세
  lute:     { label: '류트', fam: 'medieval', icon: 'lute', color: '#c8935a', prog: 24, alias: 'lute 류트 음유시인 중세 판타지 발현',
    p: { wave: 'sawtooth', mix2: .5, wave2: 'triangle', det2: 5, a: .002, d: .9, s: 0, r: .25, keytrack: 1, cut: 2.6, fenv: 3, fdec: .05, lvl: .8, rev: .3 } },
  harp:     { label: '하프', fam: 'medieval', icon: 'harp', color: '#e0b07a', prog: 46, alias: 'harp 하프 중세 판타지 몽환',
    p: { wave: 'triangle', mix2: .3, wave2: 'sine', ratio2: 2, a: .002, d: 1.8, s: 0, r: .6, keytrack: 1, cut: 6, fenv: 1.5, fdec: .1, lvl: .9, rev: .45 } },
  recorder: { label: '리코더', fam: 'medieval', icon: 'recorder', color: '#b8875a', prog: 74, alias: 'recorder 리코더 피리 중세 동요',
    p: { wave: 'harm', harm: [1,.2,.08,.03], a: .04, d: .2, s: .9, r: .08, cut: 6, vib: 6, vibRate: 5, vibDelay: .3, noise: .14, nQ: 1.2, lvl: .8, rev: .3 } },
  harpsichord:{ label: '하프시코드', fam: 'medieval', icon: 'harpsichord', color: '#d9a36b', prog: 6, alias: 'harpsichord 하프시코드 쳄발로 바로크 중세',
    p: { wave: 'sawtooth', mix2: .5, wave2: 'sawtooth', ratio2: 2, det2: 3, a: .001, d: 1.2, s: 0, r: .12, keytrack: .8, cut: 9, res: 2, fenv: 2, fdec: .15, lvl: .6, rev: .3 } },
  dulcimer: { label: '해머드 덜시머', fam: 'medieval', icon: 'dulcimer', color: '#c47a4a', prog: 15, alias: 'dulcimer 덜시머 양금 중세 판타지',
    p: { wave: 'harm', harm: [1,.5,.4,.2,.15], mix2: .5, wave2: 'triangle', det2: 9, fm: .6, fmRatio: 2, fmDec: .1, a: .001, d: 2, s: 0, r: .8, keytrack: .6, cut: 8, lvl: .8, rev: .4 } },
  hurdy:    { label: '허디거디', fam: 'medieval', icon: 'hurdy', color: '#a8613f', prog: 110, alias: 'hurdy gurdy 허디거디 중세 드론',
    p: { wave: 'sawtooth', mix2: .7, wave2: 'sawtooth', ratio2: .5, det2: 4, a: .06, d: .3, s: 1, r: .2, cut: 3.5, res: 3, trem: .1, tremRate: 9, noise: .05, formant: .4, lvl: .5, rev: .3 } },
  bagpipe:  { label: '백파이프', fam: 'medieval', icon: 'bagpipe', color: '#b5523b', prog: 109, alias: 'bagpipe 백파이프 켈틱 스코틀랜드 중세',
    p: { wave: 'square', mix2: .6, wave2: 'sawtooth', ratio2: .5, a: .02, d: .2, s: 1, r: .05, cut: 5, res: 4, formant: .5, lvl: .45, rev: .25 } },
  shawm:    { label: '숌', fam: 'medieval', icon: 'shawm', color: '#c96a52', prog: 111, alias: 'shawm 숌 오보에 리드 중세 축제',
    p: { wave: 'sawtooth', a: .03, d: .2, s: .9, r: .08, cut: 4, res: 5, vib: 5, vibDelay: .3, noise: .04, formant: .7, lvl: .5, rev: .3 } },
  chant:    { label: '수도사 성가', fam: 'medieval', icon: 'candle', color: '#9c7a5b', prog: 53, alias: 'chant monk gregorian 성가 그레고리안 수도사 합창 중세',
    p: { wave: 'sawtooth', mix2: .8, wave2: 'sawtooth', det2: 8, a: .4, d: .5, s: .9, r: .7, cut: 1.4, vib: 4, vibRate: 4.5, noise: .03, formant: 1, lvl: .6, rev: .65 } },
  handbell: { label: '핸드벨', fam: 'medieval', icon: 'handbell', color: '#e8c28a', prog: 112, alias: 'handbell 핸드벨 종 교회 크리스마스 중세',
    p: { wave: 'sine', fm: 1.6, fmRatio: 2.4, fmDec: .8, mix2: .2, wave2: 'sine', ratio2: 3.01, a: .001, d: 2.5, s: 0, r: 1.2, keytrack: .4, cut: 14, lvl: .9, rev: .5 } },
};
const FAMS = [['all','전체'], ['voice','보컬 · 목소리'], ['keys','건반'], ['str','현악'], ['wind','목관'], ['pluck','발현'], ['bell','벨 · 타악'], ['synth','합창 · 신스 · 베이스'], ['chip','16비트'], ['medieval','중세']];
// 테마: 악기 창 위쪽 2:1 블록 (좌우로 넘김)
const THEMES = [
  { id: 'all', name: '전체 악기', desc: '모든 악기 보기', icon: 'music', grad: ['#3a3f4b', '#15171c'], list: null },
  { id: 'voice', name: '보컬 · 노래', desc: '가사를 넣으면 노래하는 목소리', icon: 'mic', grad: ['#a03a6a', '#2a0f1f'],
    list: ['vocal','vidol','vhusky','vocalm','vbari','choir'] },
  { id: 'chip', name: '16비트 게임', desc: '칩튠 · FM 음원 · 레트로', icon: 'invader', grad: ['#1d7a40', '#0b2416'],
    list: ['chipsq','chip25','chip12','chiptri','chipbell','chipnoise','fmbrass','fmbass','snesstr','drums'] },
  { id: 'medieval', name: '중세 판타지', desc: '류트 · 하프 · 백파이프', icon: 'castle', grad: ['#7a5226', '#24170a'],
    list: ['lute','harp','recorder','harpsichord','dulcimer','hurdy','bagpipe','shawm','chant','handbell','organ','drums'] },
  { id: 'orch', name: '오케스트라', desc: '현악 · 목관 · 피아노', icon: 'violin', grad: ['#5a2f80', '#1b1230'],
    list: ['violin','viola','cello','strings','pizz','flute','flutesus','clarinet','harp','piano','celesta','chime','drums'] },
  { id: 'dream', name: '몽환 · 앰비언트', desc: '반짝임 · 잔향 · 패드', icon: 'moon', grad: ['#25458a', '#0d1530'],
    list: ['musicbox','celesta','epiano','choir','strings','bell','chime','harp','flutesus','chant','fx','snesstr'] },
  { id: 'xmas', name: '크리스마스', desc: '방울 · 종 · 합창', icon: 'tree', grad: ['#8a2230', '#1b3d24'],
    list: ['sleigh','bell','handbell','chime','celesta','musicbox','choir','strings','piano','flute','drums'] },
  { id: 'band', name: '밴드 · 팝', desc: '건반 · 베이스 · 드럼', icon: 'guitar', grad: ['#8a4220', '#2a130a'],
    list: ['piano','epiano','organ','bass','synth','fx','drums','strings','mandolin','cym'] },
  { id: 'kids', name: '동요 · 잔잔', desc: '맑고 귀여운 소리', icon: 'bear', grad: ['#8a7420', '#2a230a'],
    list: ['piano','musicbox','recorder','whistle','celesta','pizz','flute','mandolin','bell','harp','chipbell'] },
  { id: 'perc', name: '타악기 · 효과', desc: '드럼 · 심벌 · 노이즈', icon: 'drum', grad: ['#1f7070', '#0a2424'],
    list: ['drums','cym','sleigh','handbell','chime','chipnoise','fx'] },
];
const famName = f => (FAMS.find(x => x[0] === f) || [, ''])[1];
const preset = inst => INSTS[inst] && INSTS[inst].drum ? { ...DRUM_BASE } : JSON.parse(JSON.stringify({ ...BASE, ...(INSTS[inst] || INSTS.piano).p }));

// 드럼 키트: GM 드럼 번호 = 건반 번호 (36 킥 …). 레이어: t=음(파형,시작Hz,끝Hz,스윕,크기,감쇠) n=노이즈(필터,Hz,Q,크기,감쇠,떨림) c=클랩
const DK = {
  35: ['어쿠스틱 킥', [['t','sine',120,40,.14,1.2,.45]]],
  36: ['킥', [['t','sine',150,45,.12,1.2,.38], ['n','lowpass',3000,1,.15,.02]]],
  37: ['사이드스틱', [['t','triangle',1700,1500,.01,.6,.04], ['n','bandpass',3000,2,.4,.03]]],
  38: ['스네어', [['n','highpass',1200,1,.6,.2], ['t','triangle',190,140,.1,.5,.12]]],
  39: ['클랩', [['c']]],
  40: ['스네어 2', [['n','highpass',1800,1,.7,.16], ['t','triangle',220,170,.08,.4,.1]]],
  41: ['로우 플로어 탐', [['t','sine',95,65,.3,1,.5]]],
  42: ['닫힌 하이햇', [['n','highpass',7500,1,.45,.05]]],
  43: ['하이 플로어 탐', [['t','sine',115,80,.3,1,.45]]],
  44: ['페달 하이햇', [['n','highpass',7000,1,.35,.07]]],
  45: ['로우 탐', [['t','sine',140,95,.25,1,.4]]],
  46: ['열린 하이햇', [['n','highpass',7000,1,.4,.4]]],
  47: ['로우미드 탐', [['t','sine',165,115,.25,1,.38]]],
  48: ['하이미드 탐', [['t','sine',190,135,.22,1,.35]]],
  49: ['크래시', [['n','highpass',5000,1,.45,1.5], ['n','bandpass',3000,.8,.3,.25]]],
  50: ['하이 탐', [['t','sine',230,165,.2,1,.32]]],
  51: ['라이드', [['n','bandpass',6000,1.5,.3,1], ['t','sine',3200,3200,0,.08,.8]]],
  52: ['차이나', [['n','bandpass',4000,.7,.5,1.2]]],
  53: ['라이드 벨', [['t','square',820,820,0,.12,.7], ['t','square',1230,1230,0,.08,.6]]],
  54: ['탬버린', [['n','highpass',6500,1,.5,.25,18]]],
  55: ['스플래시', [['n','highpass',6000,1,.4,.6]]],
  56: ['카우벨', [['t','square',545,545,0,.15,.3], ['t','square',815,815,0,.1,.3]]],
  57: ['크래시 2', [['n','highpass',4500,1,.45,1.8]]],
  58: ['비브라슬랩', [['n','bandpass',2500,3,.4,.8,30]]],
  59: ['라이드 2', [['n','bandpass',5000,1.5,.3,1.1], ['t','sine',2900,2900,0,.08,.9]]],
  60: ['하이 봉고', [['t','sine',420,380,.05,.9,.15]]],
  61: ['로우 봉고', [['t','sine',310,280,.05,.9,.18]]],
  62: ['콩가 뮤트', [['t','sine',360,330,.03,.8,.08]]],
  63: ['하이 콩가', [['t','sine',330,300,.05,.9,.25]]],
  64: ['로우 콩가', [['t','sine',250,220,.05,.9,.3]]],
  65: ['하이 팀발레', [['t','triangle',520,480,.03,.7,.25], ['n','bandpass',3000,1,.2,.1]]],
  66: ['로우 팀발레', [['t','triangle',380,350,.03,.7,.3], ['n','bandpass',2500,1,.2,.1]]],
  67: ['하이 아고고', [['t','sine',920,920,0,.5,.35], ['t','sine',2300,2300,0,.15,.2]]],
  68: ['로우 아고고', [['t','sine',660,660,0,.5,.4], ['t','sine',1650,1650,0,.15,.2]]],
  69: ['카바사', [['n','highpass',6000,1,.35,.08]]],
  70: ['마라카스', [['n','highpass',7500,1,.35,.06]]],
  71: ['짧은 휘슬', [['t','sine',2300,2300,0,.35,.12]]],
  72: ['긴 휘슬', [['t','sine',2300,2250,.4,.35,.5]]],
  73: ['짧은 귀로', [['n','bandpass',3500,4,.5,.12,40]]],
  74: ['긴 귀로', [['n','bandpass',3500,4,.5,.35,40]]],
  75: ['클라베스', [['t','sine',2500,2500,0,.7,.06]]],
  76: ['하이 우드블록', [['t','sine',900,860,.02,.8,.08], ['n','bandpass',900,5,.3,.03]]],
  77: ['로우 우드블록', [['t','sine',650,620,.02,.8,.1]]],
  78: ['뮤트 쿠이카', [['t','sine',600,900,.1,.5,.12]]],
  79: ['오픈 쿠이카', [['t','sine',400,800,.2,.5,.3]]],
  80: ['뮤트 트라이앵글', [['t','sine',4500,4500,0,.3,.15], ['t','sine',6300,6300,0,.15,.1]]],
  81: ['오픈 트라이앵글', [['t','sine',4500,4500,0,.3,1.6], ['t','sine',6300,6300,0,.15,1.2]]],
};


const mkTrack = (id, inst, name) => ({ id, name: name || INSTS[inst].label, inst, color: null, vol: 1, mute: false, solo: false, snd: preset(inst) });
const PKEYS = ['notes', 'bpm', 'grid', 'bars', 'ts', 'composer', 'key', 'labelMode', 'tracks', 'active', 'nextId', 'folders'];
const blankProject = () => ({ notes: [], bpm: 100, grid: 2, bars: 32, ts: 4, composer: '', key: 'off', labelMode: 'sol', tracks: [mkTrack(1, 'piano', '피아노')], active: 1, nextId: 2, folders: [] });
const isDrumTrack = t => t && t.inst === 'drums';
const isVocalTrack = t => !!(t && INSTS[t.inst] && INSTS[t.inst].vocal);

// ───────── 저장소 (편집 화면과 공유) ─────────
const LIB_KEY = 'hc-library', PROJ = id => 'hc-proj-' + id;
const lsGet = k => { try { return JSON.parse(window.TSLS ? TSLS.get(k) : localStorage.getItem(k)); } catch (e) { return null; } };
const lsRaw = (k, j) => { if (window.TSLS) { if (!TSLS.set(k, j)) throw new Error('full'); } else localStorage.setItem(k, j); };   // 저장소(store.js): localStorage + IndexedDB
const lsDel = k => { try { if (window.TSLS) TSLS.del(k); else localStorage.removeItem(k); } catch (e) {} };
let storageWarned = false;
const lsSet = (k, v) => { try { lsRaw(k, JSON.stringify(v)); return true; } catch (e) { if (!storageWarned) { storageWarned = true; setTimeout(() => toast('브라우저 저장 공간이 부족해요. 곡을 내보내고 정리해 주세요'), 0); } return false; } };
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let LIB = lsGet(LIB_KEY);
if (!LIB || !Array.isArray(LIB.items) || !LIB.items.length) {   // 아직 라이브러리가 없으면(첫 방문·이전 버전) 편집 화면이 먼저 만들어 줘요
  location.replace(PG_EDIT + '?mypage'); return;
}
if (!LIB.items.some(i => i.id === LIB.cur)) LIB.cur = LIB.items[0].id;
const reloadLib = () => { const l = lsGet(LIB_KEY); if (l && Array.isArray(l.items)) LIB = l; };

// ───────── 알림 · 확인창 · 메뉴 ─────────
let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
let confirmResolve = null;
function confirmBox(title, msg, okLabel = '확인', kind = 'danger') {   // kind: 'danger'(지우기 등) · 'ok'(일반 확인)
  $('cTitle').textContent = title; $('cMsg').textContent = msg || ''; $('cYes').textContent = okLabel;
  const ok = kind === 'ok', ic = document.querySelector('#confirm .cicon');
  $('cYes').className = 'btn ' + (ok ? 'primary' : 'danger'); ic.classList.toggle('ok', ok); ic.innerHTML = svg(ok ? 'music' : 'trash');
  $('confirm').classList.add('show'); setTimeout(() => $('cYes').focus(), 20);
  return new Promise(res => { confirmResolve = res; });
}
function closeConfirm(v) { $('confirm').classList.remove('show'); if (confirmResolve) { confirmResolve(v); confirmResolve = null; } }
$('cYes').onclick = () => closeConfirm(true);
$('cNo').onclick = () => closeConfirm(false);
$('confirm').addEventListener('pointerdown', e => { if (e.target.id === 'confirm') closeConfirm(false); });
const ctx = $('ctx');
function closeCtx() { ctx.classList.remove('show'); }
window.addEventListener('pointerdown', e => { if (!ctx.contains(e.target)) closeCtx(); }, true);
window.addEventListener('blur', closeCtx);

// ───────── 파일 내보내기 (프로젝트 · MIDI) ─────────
const safeName = n => (n || '곡').replace(/[\\/:*?"<>|]+/g, '_').trim() || '곡';
function downloadBlob(blob, filename) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function exportProjectFile(proj, name) {
  const data = { format: 'thaniya-soundlab', version: 1, name, exported: new Date().toISOString(), project: proj };
  downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), safeName(name) + '.tsl.json');
  toast(`'${name}' 프로젝트 파일을 저장했어요`);
}


function exportMidi(proj = S, name = (curItem() || {}).name) {
  if (!proj.notes.length) return toast('내보낼 노트가 없어요');
  const TPQ = 480, TPS = TPQ / 4;
  const vlq = (a, v) => { const b = [v & 0x7f]; v >>= 7; while (v) { b.unshift((v & 0x7f) | 0x80); v >>= 7; } a.push(...b); };
  const chunk = a => { const L = a.length; return [0x4d,0x54,0x72,0x6b,(L>>>24)&255,(L>>16)&255,(L>>8)&255,L&255].concat(a); };
  const us = Math.round(60000000 / proj.bpm), t0 = [];
  vlq(t0, 0); t0.push(0xFF, 0x51, 0x03, (us >> 16) & 255, (us >> 8) & 255, us & 255);
  vlq(t0, 0); t0.push(0xFF, 0x58, 0x04, [2, 3, 4, 5].includes(proj.ts) ? proj.ts : 4, 2, 24, 8);
  vlq(t0, 0); t0.push(0xFF, 0x2F, 0x00);
  const chunks = [chunk(t0)]; let chan = 0;
  for (const tr of proj.tracks) {
    const ns = proj.notes.filter(n => n.t === tr.id); if (!ns.length) continue;
    const drums = isDrumTrack(tr);
    let ch = 9;
    if (!drums) { if (chan === 9) chan++; ch = Math.min(chan, 15); chan++; }
    const a = [], nm = Array.from(new TextEncoder().encode(tr.name));
    vlq(a, 0); a.push(0xFF, 0x03); vlq(a, nm.length); a.push(...nm);
    if (!drums) { vlq(a, 0); a.push(0xC0 | ch, INSTS[tr.inst].prog); }
    const vel = Math.round(clamp(96 * tr.vol, 1, 127)), ev = [];
    if (isVocalTrack(tr)) for (const n of ns) ev.push([Math.round(n.s * TPS), 0.5, 'ly', Array.from(new TextEncoder().encode(n.ly || '라'))]);   // 가사 (UTF-8)
    for (const n of ns) { const nv = Math.round(clamp(vel * (n.v ?? 1), 1, 127)); ev.push([Math.round(n.s * TPS), 1, 0x90 | ch, n.p, nv]); ev.push([Math.round((n.s + n.l) * TPS), 0, 0x80 | ch, n.p, 0]); }
    ev.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    let last = 0; for (const e of ev) { vlq(a, e[0] - last); last = e[0]; if (e[2] === 'ly') { a.push(0xFF, 0x05); vlq(a, e[3].length); a.push(...e[3]); } else a.push(e[2], e[3], e[4]); }
    vlq(a, 0); a.push(0xFF, 0x2F, 0x00);
    chunks.push(chunk(a));
  }
  const head = [0x4d,0x54,0x68,0x64,0,0,0,6,0,1,0,chunks.length,(TPQ>>8)&255,TPQ&255];
  const fname = safeName(name) + '.mid';
  downloadBlob(new Blob([new Uint8Array(head.concat(...chunks))], { type: 'audio/midi' }), fname);
  toast(`${fname} 저장 (트랙 ${chunks.length - 1}개)`);
}


// ───────── MIDI 불러오기 ─────────
// 가사 토큰: 한글 한 글자 = 1, '-'(늘이기) = 1, 나머지는 무시 (app.js 의 KV.tokens 와 같은 규칙 · 마이페이지에는 보컬 엔진이 없어서 따로 둠)
const lyTokens = text => { const out = []; for (const ch of String(text || '')) { const c = ch.charCodeAt(0); if (c >= 0xAC00 && c <= 0xD7A3) out.push(ch); else if (/^[-~ー_]$/.test(ch)) out.push('-'); } return out; };
function parseMidi(buf) {
  const d = new DataView(buf); let p = 0;
  const str = n => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(d.getUint8(p + i)); p += n; return s; };
  const u32 = () => { const v = d.getUint32(p); p += 4; return v; }, u16 = () => { const v = d.getUint16(p); p += 2; return v; };
  if (str(4) !== 'MThd') throw new Error('MIDI 파일이 아니에요');
  const hl = u32(); u16(); const ntr = u16(), div = u16(); p += hl - 6;
  if (div & 0x8000) throw new Error('SMPTE 타이밍 MIDI는 아직 지원하지 않아요');
  let tempo = null, tsig = null; const tracks = [];
  for (let t = 0; t < ntr && p + 8 <= buf.byteLength; t++) {
    const id = str(4), len = u32(), end = Math.min(buf.byteLength, p + len);
    if (id !== 'MTrk') { p = end; continue; }
    let tick = 0, run = 0, name = ''; const byCh = {}, lyr = new Map();
    const vlq = () => { let v = 0, b; do { b = d.getUint8(p++); v = (v << 7) | (b & 0x7f); } while (b & 0x80 && p < end); return v; };
    while (p < end) { try {
      tick += vlq(); if (p >= end) break;
      let st = d.getUint8(p);
      if (st < 0x80) st = run; else { p++; if (st < 0xF0) run = st; }
      if (st === 0xFF) {
        const type = d.getUint8(p++), l = vlq();
        if (type === 0x51 && tempo == null) tempo = (d.getUint8(p) << 16) | (d.getUint8(p + 1) << 8) | d.getUint8(p + 2);
        if (type === 0x58 && tsig == null && d.getUint8(p + 1) === 2) tsig = d.getUint8(p);   // 박자표 (x/4만)
        else if (type === 0x03 && !name) { try { name = new TextDecoder().decode(new Uint8Array(buf, p, l)); } catch (e) {} }
        else if (type === 0x05 && l) {   // 가사 (UTF-8, 아니면 EUC-KR)
          const raw = new Uint8Array(buf, p, l); let txt = '';
          try { txt = new TextDecoder('utf-8', { fatal: true }).decode(raw); } catch (e) { try { txt = new TextDecoder('euc-kr').decode(raw); } catch (e2) {} }
          const tk = lyTokens(txt); if (tk.length) lyr.set(tick, (lyr.get(tick) || '') + tk.join(''));
        }
        p += l; continue;
      }
      if (st === 0xF0 || st === 0xF7) { p += vlq(); continue; }
      const type = st & 0xF0, ch = st & 0x0F, a = d.getUint8(p++), b = (type === 0xC0 || type === 0xD0) ? 0 : d.getUint8(p++);
      const C = byCh[ch] || (byCh[ch] = { prog: 0, notes: [], on: {} });
      if (type === 0xC0) C.prog = a;
      else if (type === 0x90 && b > 0) (C.on[a] = C.on[a] || []).push([tick, b]);
      else if (type === 0x80 || (type === 0x90 && b === 0)) { const q = C.on[a]; if (q && q.length) { const [t0, v] = q.shift(); C.notes.push({ p: a, t0, t1: tick, v }); } }
    } catch (e) { break; } }   // 손상된 부분은 건너뛰고 읽은 데까지 살림
    p = end;
    for (const ch in byCh) { const C = byCh[ch]; for (const k in C.on) for (const [t0, v] of C.on[k]) C.notes.push({ p: +k, t0, t1: Math.max(tick, t0 + div / 4), v }); }   // 끝(Note Off)이 없는 노트는 트랙 끝에서 닫기
    for (const ch in byCh) if (byCh[ch].notes.length) {
      const ns = byCh[ch].notes; let ly = 0;
      if (lyr.size) ns.forEach(n => { if (lyr.has(n.t0)) { n.ly = lyr.get(n.t0); ly++; } });
      tracks.push({ name, ch: +ch, prog: byCh[ch].prog, notes: ns.sort((x, y) => x.t0 - y.t0 || x.p - y.p), lyrics: ly > ns.length * 0.3 });
    }
  }
  return { tpq: div, bpm: Math.round(60000000 / (tempo || 500000)), tracks, ts: [2, 3, 4, 5].includes(tsig) ? tsig : 4 };
}
function instFromProgram(prog) {   // GM 악기 번호 → 가장 가까운 악기
  const exact = Object.keys(INSTS).find(k => !INSTS[k].drum && INSTS[k].prog === prog); if (exact) return exact;
  const R = [[8,'piano'],[16,'celesta'],[24,'organ'],[32,'mandolin'],[40,'bass'],[41,'violin'],[42,'viola'],[44,'cello'],[45,'strings'],[46,'pizz'],[48,'harp'],[52,'strings'],[56,'choir'],[64,'fmbrass'],[72,'clarinet'],[80,'flute'],[88,'synth'],[96,'strings'],[104,'fx'],[112,'mandolin'],[120,'handbell'],[128,'fx']];
  return (R.find(([hi]) => prog < hi) || [, 'piano'])[1];
}
function midiToProject(M) {
  const P = blankProject(); P.tracks = []; P.notes = []; P.bpm = clamp(M.bpm, 40, 240);
  const spt = 4 / M.tpq; let id = 1, maxEnd = 0;
  for (const tr of M.tracks) {
    const drum = tr.ch === 9, inst = drum ? 'drums' : tr.lyrics ? 'vocal' : instFromProgram(tr.prog);
    const t = mkTrack(id++, inst, tr.name || (drum ? '드럼' : INSTS[inst].label));
    P.tracks.push(t);
    for (const n of tr.notes) {
      if (n.p < LOW || n.p > HIGH) continue;
      const s = Math.round(n.t0 * spt * 100) / 100, l = Math.max(0.25, Math.round((n.t1 - n.t0) * spt * 100) / 100);
      P.notes.push({ p: n.p, s, l, t: t.id, v: Math.round(clamp(n.v / 112, 0.15, 1) * 100) / 100, ...(n.ly ? { ly: n.ly } : {}) }); maxEnd = Math.max(maxEnd, s + l);
    }
  }
  if (!P.tracks.length) throw new Error('MIDI 안에 노트가 없어요');
  P.active = P.tracks[0].id; P.nextId = id; P.bars = Math.max(32, Math.ceil(maxEnd / 16) + 4); P.ts = M.ts || 4;
  return P;
}


// ───────── 마이페이지 ─────────
const mp = $('myPage');
let mpSel = new Set();
function setSelMode(on) { mp.classList.toggle('selmode', on); mpSel = new Set(); renderMyPage(); }
function updateSelBar() { $('mpSelCnt').textContent = `${mpSel.size}개 선택`; $('mpSelDel').disabled = !mpSel.size; }
function afterDeleteCur() {   // 편집 중이던 곡이 지워졌을 때: 가장 최근 곡(없으면 새 곡)을 현재 곡으로
  if (!LIB.items.length) { const nid = addProject(blankProject(), '새 곡'); if (nid) LIB.cur = nid; }
  else LIB.cur = LIB.items.slice().sort((a, b) => b.updated - a.updated)[0].id;
  lsSet(LIB_KEY, LIB);
}
async function deleteProjects(ids) {
  if (!ids.length) return;
  if (!await confirmBox(`곡 ${ids.length}개를 삭제할까요?`, '이 브라우저에서 완전히 지워져요. 필요하면 먼저 프로젝트 파일로 내보내세요.', '삭제')) return;
  const hadCur = ids.includes(LIB.cur);
  LIB.items = LIB.items.filter(i => !ids.includes(i.id));
  ids.forEach(id => { lsDel(PROJ(id)); lsDel('hc-stepboards-' + id); });
  if (hadCur) afterDeleteCur();
  lsSet(LIB_KEY, LIB); mpSel = new Set(); renderMyPage(); toast(`곡 ${ids.length}개를 삭제했어요`);
}
const uniqueName = base => { const names = new Set(LIB.items.map(i => i.name)); if (!names.has(base)) return base; let k = 2; while (names.has(`${base} ${k}`)) k++; return `${base} ${k}`; };
function addProject(proj, name) {
  const id = newId(), now = Date.now();
  if (!lsSet(PROJ(id), proj)) return null;
  LIB.items.push({ id, name: uniqueName(name), created: now, updated: now }); lsSet(LIB_KEY, LIB);
  return id;
}
function openProject(id) { goPage(PG_EDIT, '?open=' + encodeURIComponent(id)); }
function newProject() { const id = addProject(blankProject(), '새 곡'); if (id) openProject(id); }
function renameProject(id, name) {
  const it = LIB.items.find(i => i.id === id); name = (name || '').trim();
  if (!it || !name || name === it.name) return;
  it.name = name.slice(0, 40); lsSet(LIB_KEY, LIB);
}
function duplicateProject(id) {
  const it = LIB.items.find(i => i.id === id), p = lsGet(PROJ(id)); if (!p) return;
  if (addProject(p, it.name + ' 복사')) { renderMyPage(); toast(`'${it.name}'을(를) 복제했어요`); }
}
async function deleteProject(id) {
  const it = LIB.items.find(i => i.id === id); if (!it) return;
  if (!await confirmBox(`'${it.name}'을(를) 삭제할까요?`, '이 브라우저에서 완전히 지워져요. 필요하면 먼저 프로젝트 파일로 내보내세요.', '삭제')) return;
  LIB.items = LIB.items.filter(i => i.id !== id);
  lsDel(PROJ(id)); lsDel('hc-stepboards-' + id);
  if (id === LIB.cur) afterDeleteCur();
  lsSet(LIB_KEY, LIB); renderMyPage(); toast(`'${it.name}'을(를) 삭제했어요`);
}
function exportProjectById(id, kind) {
  const it = LIB.items.find(i => i.id === id), p = lsGet(PROJ(id)); if (!p) return;
  if (kind === 'midi') exportMidi(p, it.name); else exportProjectFile(p, it.name);
}
async function importFiles(files) {
  let ok = 0, lastId = null, midiN = 0, backup = false;
  for (const f of files) {
    try {
      const base = f.name.replace(/\.(tsl\.json|json|midi?|kar|smf)$/i, '');
      const head = new Uint8Array(await f.slice(0, 4).arrayBuffer());
      if (/\.(midi?|kar|smf)$/i.test(f.name) || String.fromCharCode(...head) === 'MThd') {   // 확장자가 없어도 MIDI 머리(MThd)면 MIDI
        const P = midiToProject(parseMidi(await f.arrayBuffer()));
        const id = addProject(P, base); if (id) { ok++; midiN++; lastId = id; }
      } else {
        const d = JSON.parse(await f.text());
        if (d && d.format === 'thaniya-soundlab-backup' && Array.isArray(d.items)) {   // 전체 백업: 곡 여러 개를 한 번에 (이미 있는 같은 곡은 건너뛰기)
          const have = new Set(LIB.items.map(i => i.created + '|' + i.updated));
          let n = 0, skip = 0;
          for (const it of d.items) {
            const pj = it && it.project; if (!pj || !Array.isArray(pj.notes) || !Array.isArray(pj.tracks)) continue;
            if (have.has(it.created + '|' + it.updated)) { skip++; continue; }
            const id = addProject(Object.assign(blankProject(), pj), it.name || base); if (!id) break;
            const li = LIB.items.find(i => i.id === id); if (it.created) li.created = it.created; if (it.updated) li.updated = it.updated; n++;
          }
          lsSet(LIB_KEY, LIB); ok += n; backup = true;
          toast(`백업에서 곡 ${n}개를 되살렸어요${skip ? ` · 이미 있는 곡 ${skip}개는 건너뛰었어요` : ''}`);
          continue;
        }
        const proj = d && d.format === 'thaniya-soundlab' ? d.project : d;
        if (!proj || !Array.isArray(proj.notes) || !Array.isArray(proj.tracks)) throw new Error('Thaniya-SoundLab 프로젝트 파일이 아니에요');
        if (addProject(Object.assign(blankProject(), proj), (d && d.name) || base)) ok++;
      }
    } catch (e) { toast(`'${f.name}' 불러오기 실패: ${e.message}`); }
  }
  if (!ok) return;
  renderMyPage();
  if (ok === 1 && midiN === 1 && lastId) {   // MIDI 한 곡이면 바로 열지 물어봐요
    const it = LIB.items.find(i => i.id === lastId), P = lsGet(PROJ(lastId)) || { tracks: [], notes: [] };
    if (await confirmBox(`'${it.name}' 곡을 불러왔어요`, `트랙 ${P.tracks.length}개 · 노트 ${P.notes.length}개 · ${P.bpm} BPM — 바로 편집할까요?`, '편집하기', 'ok')) openProject(lastId);
  } else if (!backup) toast(`곡 ${ok}개를 불러왔어요 · '편집'을 눌러 열어 보세요`);
}
function timeAgo(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return '방금 전'; if (s < 3600) return Math.floor(s / 60) + '분 전'; if (s < 86400) return Math.floor(s / 3600) + '시간 전';
  if (s < 86400 * 7) return Math.floor(s / 86400) + '일 전';
  const d = new Date(t); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}
function drawThumb(cv, p) {
  const w = cv.clientWidth || 260, h = cv.clientHeight || 110, r = window.devicePixelRatio || 1;
  cv.width = w * r; cv.height = h * r; const c = cv.getContext('2d'); c.scale(r, r);
  c.fillStyle = '#101114'; c.fillRect(0, 0, w, h);
  const notes = (p && p.notes) || [];
  if (!notes.length) { c.fillStyle = '#4a4e57'; c.font = '12px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('빈 곡', w / 2, h / 2 + 4); return; }
  let end = 0, lo = 127, hi = 0; for (const n of notes) { end = Math.max(end, n.s + n.l); lo = Math.min(lo, n.p); hi = Math.max(hi, n.p); }
  lo -= 2; hi += 2; const span = Math.max(12, hi - lo), rowH = (h - 16) / span, sx = (w - 16) / Math.max(16, end);
  c.strokeStyle = '#1b1d22'; c.lineWidth = 1;
  for (let b = 0, BR = ([2, 3, 4, 5].includes(p.ts) ? p.ts : 4) * 4; b <= end; b += BR) { const x = 8 + b * sx; c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, h); c.stroke(); }
  const col = {}; (p.tracks || []).forEach(t => col[t.id] = t.color || (INSTS[t.inst] || INSTS.piano).color);
  for (const n of notes) {
    c.globalAlpha = 0.5 + 0.5 * (n.v ?? 1); c.fillStyle = col[n.t] || '#5fa8ff';
    c.fillRect(8 + n.s * sx, 8 + (hi - n.p) * rowH, Math.max(1.5, n.l * sx - 0.5), Math.max(1.5, rowH - 0.5));
  }
  c.globalAlpha = 1;
}
function storageUsage() { if (window.TSLS) return TSLS.usage(); let b = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^hc-|^humming/.test(k)) b += (localStorage.getItem(k) || '').length * 2; } } catch (e) {} return { used: b, cap: 5 * 1024 * 1024, idb: false, over: 0 }; }
const fmtBytes = b => b < 1024 * 1024 ? (b / 1024).toFixed(0) + 'KB' : b < 1024 ** 3 ? (b / 1024 / 1024).toFixed(1) + 'MB' : (b / 1024 ** 3).toFixed(1) + 'GB';
function renderMyPage() {
  const q = $('mpSearch').value.trim().toLowerCase(), sort = $('mpSort').value;
  const items = LIB.items.filter(i => !q || i.name.toLowerCase().includes(q));
  items.sort(sort === 'name' ? (a, b) => a.name.localeCompare(b.name, 'ko') : sort === 'created' ? (a, b) => b.created - a.created : (a, b) => b.updated - a.updated);
  $('mpSub').textContent = `이 브라우저에 저장된 곡 ${LIB.items.length}개 · 자동 저장`;
  const { used, cap, idb } = storageUsage();
  $('mpStoreFill').style.width = Math.max(used ? 1 : 0, Math.min(100, used / cap * 100)) + '%';
  $('mpStoreTxt').textContent = `${fmtBytes(used)} / ${idb ? '약 ' + fmtBytes(cap) : '약 5MB'}`;
  $('mpStoreTxt').parentElement.title = idb ? '곡은 브라우저 데이터베이스(IndexedDB)에 저장돼요 — 큰 곡도 넉넉히 저장할 수 있어요' : '이 브라우저는 데이터베이스 저장을 쓸 수 없어서 약 5MB까지만 저장돼요';
  mpSel.forEach(id => { if (!LIB.items.some(i => i.id === id)) mpSel.delete(id); }); updateSelBar();
  const g = $('mpGrid'); g.innerHTML = '';
  if (!items.length) { g.appendChild(el('div', 'mpEmpty', q ? `'${q}'에 맞는 곡이 없어요` : '저장된 곡이 없어요. 새 곡을 만들어 보세요')); return; }
  for (const it of items) {
    const p = lsGet(PROJ(it.id));
    const card = el('div', 'song' + (it.id === LIB.cur ? ' cur' : ''));
    const cv = document.createElement('canvas'); cv.title = '편집하기'; card.appendChild(cv);
    const body = el('div', 'sBody'), row = el('div', 'sNameRow'), nm = el('div', 'sName', it.name);
    nm.title = '더블클릭해서 이름 바꾸기'; row.appendChild(nm);
    if (it.id === LIB.cur) row.appendChild(el('span', 'curBadge', '편집 중'));
    body.appendChild(row);
    const notes = (p && p.notes) || [], end = notes.reduce((a, n) => Math.max(a, n.s + n.l), 0), sec = end * 60 / ((p && p.bpm) || 100) / 4;
    body.appendChild(el('div', 'sMeta', `트랙 ${(p && p.tracks || []).length} · 노트 ${notes.length} · ♩${(p && p.bpm) || 100} · ${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`));
    body.appendChild(el('div', 'sDate', `${timeAgo(it.updated)} 수정`));
    const btns = el('div', 'sBtns');
    const ed = el('button', 'btn primary edit'); ed.innerHTML = svg('pen'); ed.appendChild(el('span', null, '편집'));
    const rn = el('button', 'btn'); rn.innerHTML = svg('rename'); rn.title = '이름 바꾸기';
    const mo = el('button', 'btn'); mo.innerHTML = svg('more'); mo.title = '더 보기 (복제 · 내보내기 · 삭제)';
    btns.append(ed, rn, mo); body.appendChild(btns); card.appendChild(body);
    const ck = el('span', 'chk2'); ck.innerHTML = svg('check'); card.appendChild(ck);
    if (mpSel.has(it.id)) card.classList.add('picked');
    const pick = () => { mpSel.has(it.id) ? mpSel.delete(it.id) : mpSel.add(it.id); card.classList.toggle('picked', mpSel.has(it.id)); updateSelBar(); };
    card.addEventListener('click', e => { if (mp.classList.contains('selmode')) { e.preventDefault(); e.stopPropagation(); pick(); } }, true);
    ed.onclick = () => openProject(it.id);
    cv.onclick = () => openProject(it.id);
    const startRename = () => {
      const inp = document.createElement('input'); inp.type = 'text'; inp.value = it.name; inp.maxLength = 40;
      nm.textContent = ''; nm.appendChild(inp); inp.focus(); inp.select();
      let done = false; const fin = ok => { if (done) return; done = true; if (ok) renameProject(it.id, inp.value); renderMyPage(); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') fin(true); else if (e.key === 'Escape') fin(false); e.stopPropagation(); });
      inp.addEventListener('blur', () => fin(true));
    };
    nm.ondblclick = () => { if (!mp.classList.contains('selmode')) startRename(); }; rn.onclick = startRename;
    const menu = (x, y) => {
      ctx.innerHTML = ''; ctx.appendChild(el('div', 'ctxHead', it.name));
      const item = (icon, label, fn, cls = '') => { const d = el('div', 'ci ' + cls); d.innerHTML = svg(icon); d.appendChild(el('span', null, label)); d.addEventListener('click', () => { closeCtx(); fn(); }); ctx.appendChild(d); };
      item('pen', '편집하기', () => openProject(it.id));
      item('rename', '이름 바꾸기', startRename);
      item('copy', '복제', () => duplicateProject(it.id));
      ctx.appendChild(el('div', 'csep'));
      item('download', '내보내기… (프로젝트 · MIDI · MP3)', () => openExport(it.id));
      ctx.appendChild(el('div', 'csep'));
      item('trash', '삭제', () => deleteProject(it.id), 'danger');
      ctx.classList.add('show');
      ctx.style.left = clamp(x, 4, innerWidth - ctx.offsetWidth - 4) + 'px'; ctx.style.top = clamp(y, 4, innerHeight - ctx.offsetHeight - 4) + 'px';
    };
    mo.onclick = e => { const r = mo.getBoundingClientRect(); menu(r.left, r.bottom + 4); e.stopPropagation(); };
    card.addEventListener('contextmenu', e => { e.preventDefault(); menu(e.clientX, e.clientY); });
    g.appendChild(card);
    requestAnimationFrame(() => drawThumb(cv, p));
  }
}

// ───────── 내보내기 창 (MP3는 편집 화면에서 만들어요) ─────────
const EXP_KEY = 'hc-export', KBPS = [[96, '가벼움', '용량 작게'], [128, '보통', '일반 재생용'], [192, '좋음', '추천'], [256, '높음', '음질 우선'], [320, '최고', '가장 큰 용량']];
const expPrefs = Object.assign({ fmt: 'mp3', kbps: 192 }, lsGet(EXP_KEY) || {});
const expM = document.createElement('div'); expM.id = 'exportM';
expM.innerHTML = `<div class="xcard" role="dialog" aria-label="내보내기">
  <div class="xhead"><b>내보내기</b><span class="xsong" id="xSong"></span><button class="ib" id="xClose" title="닫기 (Esc)">✕</button></div>
  <div class="xsec">형식</div>
  <div class="xfmts" id="xFmts"></div>
  <div id="xQ"><div class="xsec">MP3 음질</div><div class="xq" id="xQBtns"></div><div class="xinfo" id="xInfo"></div></div>
  <div class="xfoot"><button class="btn" id="xCancel">취소</button><button class="btn primary" id="xGo"><span id="xGoIc"></span>내보내기</button></div>
</div>`;
document.body.appendChild(expM);
let expId = null;
const EXP_FMT = [['mp3', 'MP3', '오디오 파일 · 어디서나 재생', 'music'], ['stems', '스템 (트랙별 WAV)', '.zip · 트랙마다 따로 · 다른 DAW에서 믹스', 'layers'], ['midi', 'MIDI', '트랙별 .mid · 다른 프로그램에서 편집', 'note'], ['json', '프로젝트 파일', '.json · 나중에 다시 불러와서 편집', 'download']];
function expSec(id) {
  const p = lsGet(PROJ(id)), notes = (p && p.notes) || [];
  const end = notes.reduce((a, n) => Math.max(a, n.s + n.l), 0);
  return end * 60 / ((p && p.bpm) || 100) / 4 + 1;
}
function expRefresh() {
  $('xFmts').querySelectorAll('.xf').forEach(b => b.classList.toggle('on', b.dataset.f === expPrefs.fmt));
  $('xQ').style.display = expPrefs.fmt === 'mp3' ? '' : 'none';
  $('xQBtns').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.k === expPrefs.kbps));
  const sec = expSec(expId), mb = sec * expPrefs.kbps * 1000 / 8 / 1048576;
  $('xInfo').textContent = `예상 길이 약 ${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')} · 예상 크기 약 ${mb < 0.1 ? '0.1' : mb.toFixed(1)}MB (${expPrefs.kbps}kbps 스테레오)`;
  $('xGoIc').innerHTML = svg((EXP_FMT.find(f => f[0] === expPrefs.fmt) || EXP_FMT[0])[3]);
}
EXP_FMT.forEach(([k, t, d, ic]) => {
  const b = el('button', 'xf'); b.dataset.f = k; b.type = 'button';
  b.innerHTML = svg(ic) + '<span class="xt"></span><span class="xd"></span>'; b.querySelector('.xt').textContent = t; b.querySelector('.xd').textContent = d;
  b.onclick = () => { expPrefs.fmt = k; expRefresh(); };
  $('xFmts').appendChild(b);
});
KBPS.forEach(([k, t, d]) => {
  const b = el('button', 'xk'); b.dataset.k = k; b.type = 'button'; b.innerHTML = `<b>${k}</b><span>${t}</span>`; b.title = `${k}kbps · ${d}`;
  b.onclick = () => { expPrefs.kbps = k; expRefresh(); };
  $('xQBtns').appendChild(b);
});
function closeExport() { expM.classList.remove('show'); }
function openExport(id) {
  const it = LIB.items.find(i => i.id === id); if (!it) return;
  expId = id; $('xSong').textContent = it.name; closeCtx(); expRefresh(); expM.classList.add('show');
}
$('xClose').onclick = $('xCancel').onclick = closeExport;
expM.addEventListener('pointerdown', e => { if (e.target === expM) closeExport(); });
$('xGo').onclick = () => {
  const id = expId; lsSet(EXP_KEY, expPrefs); closeExport();
  if (expPrefs.fmt === 'json') exportProjectById(id, 'json');
  else if (expPrefs.fmt === 'midi') exportProjectById(id, 'midi');
  else if (expPrefs.fmt === 'stems') goPage(PG_EDIT, '?open=' + encodeURIComponent(id) + '&export=stems');   // 스템도 편집 화면의 소리 엔진으로 만들어요
  else goPage(PG_EDIT, '?open=' + encodeURIComponent(id) + '&export=mp3&kbps=' + expPrefs.kbps);   // MP3는 편집 화면의 소리 엔진으로 만들어요
};

// ───────── 연결 ─────────
document.querySelectorAll('[data-icon]').forEach(e => e.innerHTML = svg(e.dataset.icon));
document.querySelectorAll('[data-logo]').forEach(box => {
  const img = new Image(); img.className = 'logo-img'; img.alt = ''; img.draggable = false;
  img.onload = () => { box.innerHTML = ''; box.appendChild(img); box.classList.add('has-img'); };
  img.src = './Asset/icon.png';
});
document.querySelectorAll('button').forEach(b => b.addEventListener('mousedown', e => e.preventDefault()));
$('mpBack').onclick = () => openProject(LIB.cur);
// 새 곡 만들기: 스튜디오(모든 기능) / 응애모드(칸을 톡톡 — 아주 쉬운 모드) 고르기
function chooseNew() {
  let m = $('mpModeM');
  if (!m) {
    m = el('div', 'mpModeM'); m.id = 'mpModeM'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = `<div class="mpModeBox">
      <div class="mpModeHd"><b>어떻게 만들까요?</b><button type="button" class="mpModeX" aria-label="닫기">✕</button></div>
      <button type="button" class="mpModeCard studio" data-m="studio">
        <span class="mmIc"><svg class="i" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14M7.5 12v7M16.5 12v7"/></svg></span>
        <span class="mmTx"><b>스튜디오</b><small>피아노 롤 · 허밍 녹음 · 반주/비트 · 믹서까지 모든 기능</small></span>
      </button>
      <button type="button" class="mpModeCard baby" data-m="baby">
        <span class="mmIc">🍼</span>
        <span class="mmTx"><b>응애모드 <em>쉬움</em></b><small>칸을 톡톡 누르면 노래가 돼요 · 가볍고 어린이도 바로 쓸 수 있어요</small></span>
      </button>
      <p class="mpModeFt">응애모드는 편집 화면 설정에서도 바꿀 수 있어요</p>
    </div>`;
    document.body.appendChild(m);
    const close = () => m.classList.remove('show');
    m.addEventListener('click', e => {
      if (e.target === m || e.target.closest('.mpModeX')) return close();
      const c = e.target.closest('[data-m]'); if (!c) return;
      close();
      if (c.dataset.m === 'baby') location.href = './baby/index.html?new=1';
      else newProject();
    });
    m.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  }
  m.classList.add('show');
  setTimeout(() => { const f = m.querySelector('[data-m="studio"]'); if (f) f.focus(); }, 30);
}
$('mpNew').onclick = chooseNew;
$('mpSelBtn').onclick = () => setSelMode(!mp.classList.contains('selmode'));
$('mpSelDone').onclick = () => setSelMode(false);
$('mpSelAll').onclick = () => { const q = $('mpSearch').value.trim().toLowerCase(); const vis = LIB.items.filter(i => !q || i.name.toLowerCase().includes(q)).map(i => i.id); mpSel = vis.every(id => mpSel.has(id)) ? new Set() : new Set(vis); renderMyPage(); };
$('mpSelDel').onclick = () => deleteProjects([...mpSel]);
$('mpImport').onclick = () => $('mpFile').click();
function exportBackup() {   // 모든 곡을 파일 하나로 (다른 브라우저 · 컴퓨터로 옮기거나 보관용)
  const items = LIB.items.map(i => ({ name: i.name, created: i.created, updated: i.updated, project: lsGet(PROJ(i.id)) })).filter(i => i.project);
  if (!items.length) { toast('백업할 곡이 없어요'); return; }
  const d = new Date(), stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  downloadBlob(new Blob([JSON.stringify({ format: 'thaniya-soundlab-backup', version: 1, created: Date.now(), items })], { type: 'application/json' }), `SoundLab 백업 ${stamp} (${items.length}곡).json`);
  try { localStorage.setItem('hc-lastBackup', String(Date.now())); } catch (e) {}
  toast(`곡 ${items.length}개를 백업 파일로 저장했어요 · 「불러오기」로 언제든 되살릴 수 있어요`);
}
$('mpBackup').onclick = exportBackup;
$('mpFile').addEventListener('change', e => { importFiles([...e.target.files]); e.target.value = ''; });
$('mpSearch').addEventListener('input', renderMyPage);
$('mpSort').addEventListener('change', e => { renderMyPage(); e.target.blur(); });
mp.addEventListener('dragover', e => { e.preventDefault(); mp.classList.add('dragging'); });
mp.addEventListener('dragleave', e => { if (e.target === mp || !mp.contains(e.relatedTarget)) mp.classList.remove('dragging'); });
mp.addEventListener('drop', e => { e.preventDefault(); mp.classList.remove('dragging'); importFiles([...e.dataTransfer.files]); });
{ // 전체화면 (fullscreen.js 공용)
  const b = $('mpFs');
  if (window.TSFS && b) TSFS.bind(b, { iconIn: svg('fsEnter'), iconOut: svg('fsExit'), notify: toast });
  else if (b) b.style.display = 'none';
}
document.addEventListener('keydown', e => {
  if (expM.classList.contains('show')) { if (e.key === 'Escape') { e.preventDefault(); closeExport(); } else if (e.key === 'Enter' && !/^(button|select)$/i.test(e.target.tagName)) { e.preventDefault(); $('xGo').click(); } return; }
  if ($('confirm').classList.contains('show')) { if (e.key === 'Escape') closeConfirm(false); if (e.key === 'Enter') { e.preventDefault(); closeConfirm(true); } return; }
  const tg = (e.target.tagName || '').toLowerCase();
  if (e.key === 'Escape' && tg !== 'input') { if (ctx.classList.contains('show')) closeCtx(); else if (mp.classList.contains('selmode')) setSelMode(false); else openProject(LIB.cur); }
});
// 다른 탭(편집 화면)에서 곡이 바뀌면 목록도 새로
window.addEventListener('storage', e => { if (e.key === LIB_KEY) { reloadLib(); renderMyPage(); } });
window.addEventListener('pageshow', e => { if (e.persisted) { reloadLib(); renderMyPage(); } });
renderMyPage();
})();
