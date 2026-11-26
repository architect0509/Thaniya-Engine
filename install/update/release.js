#!/usr/bin/env node
/* ═══ SoundLab 새 버전 내기 ═══
   1) install/update/changelog.json 의 history 맨 위에 새 버전을 추가해요.
        { "v": "v1.1.0", "d": "2026.12.01", "title": "드럼 패턴 · 반주 추천",
          "items": ["바뀐 점 1", "바뀐 점 2"] }
      title 은 짧은 요약(선택)이에요. 설정 › 버전 정보에서 1.1.x 묶음 줄에 · 로 이어 보여요.
   2) 프로젝트 폴더에서 실행:   node install/update/release.js
   3) 사이트에 올리면, 앱을 쓰던 사람에게 "새 버전이 있어요!" 알림이 떠요.

   이 스크립트가 한 번에 바꾸는 것
   · install/update/version.json  ← 앱이 확인하는 최신 버전 정보 (최근 10개 버전 변경 내역)
   · install/update/app-version.js ← 앱 안에 들어 있는 "지금 버전"
   · sw.js 의 VERSION             ← 오프라인 저장본을 새로 받게 함
   (Meow-PDF 의 scripts/make-version-json.js 를 SoundLab 용으로 넓힌 것) */
const fs = require('fs'), path = require('path');
const DIR = __dirname, ROOT = path.resolve(DIR, '..', '..');
const KEEP = 10;

const src = JSON.parse(fs.readFileSync(path.join(DIR, 'changelog.json'), 'utf8'));
const H = Array.isArray(src.history) ? src.history : [];
if (!H.length) throw new Error('changelog.json 의 history 가 비어 있어요');
const top = H[0];
if (!/^v?\d+(\.\d+)*$/.test(top.v || '')) throw new Error('맨 위 버전의 v 가 이상해요: ' + top.v);
const ver = top.v.startsWith('v') ? top.v : 'v' + top.v;
const date = top.d || new Date().toISOString().slice(0, 10).replace(/-/g, '.');

// 1) version.json
const out = {
  name: src.name || 'Thaniya-SoundLab',
  version: ver,
  date,
  site: src.site || '',
  download: src.download || {},
  history: H.slice(0, KEEP).map(h => Object.assign({ v: h.v, d: h.d || '' }, h.title ? { title: h.title } : {}, { items: h.items || [] })),
};
fs.writeFileSync(path.join(DIR, 'version.json'), JSON.stringify(out, null, 1) + '\n');

// 2) app-version.js
fs.writeFileSync(path.join(DIR, 'app-version.js'),
  `/* 자동으로 만들어지는 파일이에요. 직접 고치지 말고 changelog.json 을 고친 뒤 release.js 를 실행하세요. */\nwindow.TSL_APP_VERSION = '${ver}';\n`);

// 3) sw.js VERSION
const swPath = path.join(ROOT, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');
const stamp = ver + '-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const sw2 = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${stamp}';`);
if (sw2 === sw) throw new Error('sw.js 에서 VERSION 줄을 찾지 못했어요');
fs.writeFileSync(swPath, sw2);

console.log(`✔ ${ver} (${date}) 준비 완료 — version.json · app-version.js · sw.js(${stamp}) 를 바꿨어요. 이제 사이트에 올리세요.`);
