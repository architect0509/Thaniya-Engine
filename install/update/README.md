# 새 버전 알림 (Update Notifier)

Meow-PDF의 Update Notifier를 SoundLab에 넣은 것이에요. 설치한 앱(PC · 휴대폰 홈 화면)에서
새 버전이 올라오면 오른쪽 아래에 "새 버전이 있어요!" 창이 뜨고, **업데이트**를 누르면 새 버전으로 다시 열려요.

| 파일 | 하는 일 |
|---|---|
| `update-notifier.js` / `.css` | 알림 창 · 자세히 보기 · "업데이트했어요" 토스트 (색만 SoundLab에 맞춤) |
| `changelog.json` | **여기만 고쳐요.** 버전별 바뀐 내용 (새 버전이 맨 위, `title`은 짧은 요약) |
| `version-panel.js` / `.css` | 편집 화면 설정 › **버전 정보** (앱 카드 · 업데이트 확인 · 업데이트 내역) |
| `release.js` | changelog.json → version.json · app-version.js · sw.js 버전을 한 번에 바꿔요 |
| `version.json` | 앱이 확인하는 최신 버전 정보 (자동 생성) |
| `app-version.js` | 앱 안에 들어 있는 "지금 버전" (자동 생성) |

설정(언제 확인할지, 문구 등)은 `install/install.js`의 `UpdateNotifier.init({...})`에서 바꿔요.

## 새 버전 내기

1. `changelog.json`의 `history` 맨 위에 추가
   ```json
   { "v": "v1.1.0", "d": "2026.12.01", "title": "드럼 패턴 · 반주 추천", "items": ["드럼 패턴 추가", "반주 추천 개선"] }
   ```
2. 프로젝트 폴더에서 `node install/update/release.js`
3. 사이트에 올리기

## 언제 확인하나요

- 앱을 켜고 2.5초 뒤
- 앱을 다른 화면에 두었다가 돌아왔을 때 (30분 간격)
- 인터넷이 다시 연결됐을 때

일반 웹페이지(설치하지 않은 상태)는 열 때마다 새 파일을 받으니 알림을 띄우지 않아요. 띄우고 싶으면 `install.js`에서 `web: true`로 바꾸세요.
