# Thaniya-SoundLab

노래하거나 연주하면 실시간으로 음표가 찍히는 웹 작곡 스튜디오예요. 설치 없이 브라우저에서 바로 쓰고, 앱(PWA)으로 설치하면 오프라인에서도 열려요.

- **스튜디오 모드**: 허밍 → 음표, 피아노 롤, 반주 · 비트 자동 생성, 믹서 · 오토메이션, MIDI · WAV · 스템 내보내기
- **응애모드**: 칸을 톡톡 눌러 작곡하는 아주 쉬운 모드 (어린이 · 휴대폰용, 따로 설치 가능)

현재 버전과 변경 내역은 [`docs/CHANGELOG.md`](docs/CHANGELOG.md)에 있어요.

## 폴더 구조

```
Thaniya-SoundLab/
├─ index.html              첫 화면 (모드 고르기 · 내 곡 · 설치)
├─ edit.html               편집 화면 (스튜디오 모드)
├─ mypage.html             마이페이지 (곡 목록 · 불러오기 · 백업)
├─ humming-composer.html   예전 주소 호환 (edit / mypage 로 넘김)
├─ sw.js                   서비스 워커 — 사이트 전체를 다루려면 맨 위에 있어야 해요
│
├─ js/
│  ├─ app.js               편집 화면 본체
│  ├─ mypage.js            마이페이지
│  ├─ guide.js             기능 가이드 (시범 영상)
│  ├─ loader.js            공용 로딩 화면
│  ├─ fullscreen.js        전체화면
│  ├─ thaniya-intro.js     로고 인트로
│  ├─ lame.min.js          MP3 인코더
│  └─ store.js             (선택) IndexedDB 저장소 — 없으면 localStorage만 써요
├─ css/
│  └─ app.css              편집 화면 · 마이페이지 스타일
├─ baby/                   응애모드 (한 파일 + 앱 설치용 manifest)
├─ Asset/                  로고 · 아이콘 이미지
├─ install/                앱 설치 · 새 버전 알림
│  └─ update/              changelog.json · release.js · version.json …
└─ docs/
   ├─ CHANGELOG.md         변경 내역 (깃허브용)
   └─ CHANGELOG-v1.3.0.txt 버전별 텍스트 로그
```

## 새 버전 내기

1. `install/update/changelog.json`의 `history` 맨 위에 새 버전을 추가해요.
2. 프로젝트 폴더에서 `node install/update/release.js`를 실행해요. (`version.json` · `app-version.js` · `sw.js` 버전을 한 번에 바꿔요)
3. `docs/CHANGELOG.md`에 같은 내용을 적고, 필요하면 `docs/CHANGELOG-vX.Y.Z.txt`도 만들어요.
4. 파일을 고쳤다면 `index.html` · `edit.html` · `mypage.html`의 `?v=` 값을 올려요.
5. 사이트에 올리면, 앱을 쓰던 사람에게 새 버전 알림이 떠요.

## 로컬에서 실행

서비스 워커와 앱 설치는 `http(s)://` 주소에서만 동작해요.

```
python -m http.server 8000
```

그다음 브라우저에서 `http://localhost:8000/`을 열어요.

---

개발: [Thaniya Project](https://thaniya.co.kr/)
