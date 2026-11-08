/* Thaniya Engine · 처음 안내 (edit.html 전용)
   - 처음 열면 한 번 자동으로 뜸 (localStorage 'thaniya.tour.v1')
   - 지금 화면에 보이는 패널 · 탭을 읽어 단계를 만듦 (도킹 배치가 달라도 맞게)
   - 도움말 › 처음 안내 다시 보기 = TOUR.start() */
(function(){
'use strict';
if(window.TOUR)return;
var KEY='thaniya.tour.v1';

/* ---------- 번역 (i18n.js 사전에 등록 → 화면 글자를 자동으로 바꿈) ---------- */
var TR={
'Thaniya Engine에 오신 걸 환영해요':['Welcome to Thaniya Engine','Thaniya Engine へようこそ','欢迎使用 Thaniya Engine'],
'화면 곳곳의 패널과 탭을 1분 안에 둘러볼게요.':['Let’s take a one-minute tour of the panels and tabs on screen.','画面のパネルとタブを1分で見て回りましょう。','用一分钟看看界面上的面板和标签页。'],
'건너뛰기':['Skip','スキップ','跳过'],
'둘러보기 시작':['Start the tour','ツアーを始める','开始导览'],
'이전':['Back','戻る','上一步'],
'다음':['Next','次へ','下一步'],
'이 패널의 탭':['Tabs in this panel','このパネルのタブ','此面板的标签页'],
'탭을 누르면 그 자리에서 바뀌어요.':['Click a tab to switch it in place.','タブを押すとその場で切り替わります。','点击标签页即可在原位切换。'],
'씬에 있는 타일맵 · 게임 오브젝트 · UI · 매니저를 나무 모양으로 보여 줘요.':['Shows the tilemaps, game objects, UI and managers in your scene as a tree.','シーンのタイルマップ・ゲームオブジェクト・UI・マネージャーをツリーで表示します。','以树状结构显示场景中的图块地图、游戏对象、UI 和管理器。'],
'고른 것의 위치 · 컴포넌트 · 스크립트를 보고 바꿔요.':['View and edit the position, components and scripts of what you select.','選んだものの位置・コンポーネント・スクリプトを確認・変更します。','查看并修改所选对象的位置、组件和脚本。'],
'그림 · 소리 · 스크립트 같은 에셋을 폴더로 정리해요. 에셋스토어와 직접 그리기도 여기 있어요.':['Organize assets like images, sounds and scripts in folders. The Asset Store and Draw tools live here too.','画像・サウンド・スクリプトなどのアセットをフォルダで整理します。アセットストアと「直接描く」もここにあります。','用文件夹整理图片、声音、脚本等资源。资源商店和“亲手绘制”也在这里。'],
'Debug.Log 출력과 오류 메시지를 확인해요.':['Check Debug.Log output and error messages.','Debug.Log の出力とエラーを確認します。','查看 Debug.Log 输出和错误信息。'],
'C# 스크립트를 자동완성과 함께 써요.':['Write C# scripts with autocomplete.','自動補完つきで C# スクリプトを書きます。','借助自动补全编写 C# 脚本。'],
'상태와 전환으로 캐릭터 애니메이션의 흐름을 짜요.':['Build animation flow with states and transitions.','ステートと遷移でアニメーションの流れを組みます。','用状态和过渡编排动画流程。'],
'버튼 · 텍스트 같은 게임 화면 UI를 끌어다 놓아 만들어요.':['Drag and drop buttons, text and more to build game UI.','ボタンやテキストなどのゲーム UI をドラッグ＆ドロップで作ります。','拖放按钮、文本等来制作游戏 UI。'],
'노드를 선으로 이어 코드 없이 게임을 움직여요.':['Wire nodes together to make your game move without code.','ノードを線でつなぎ、コードなしでゲームを動かします。','用连线连接节点，无需代码即可让游戏动起来。'],
'키프레임을 찍어 움직임 클립을 만들어요.':['Set keyframes to create motion clips.','キーフレームを打って動きのクリップを作ります。','设置关键帧来制作动作片段。'],
'여러 오브젝트의 연출을 시간 위에 배치하고 녹화해요.':['Arrange and record multi-object sequences over time.','複数オブジェクトの演出を時間軸に並べて録画します。','在时间轴上编排并录制多个对象的演出。'],
'타일을 골라 씬에 맵을 칠해요.':['Pick tiles and paint maps in the scene.','タイルを選んでシーンにマップを塗ります。','选择图块并在场景中绘制地图。'],
'씬 · 게임 뷰':['Scene · Game view','シーン・ゲームビュー','场景 · 游戏视图'],
'맵을 그리고 오브젝트를 배치하는 작업 공간이에요.':['The workspace where you paint maps and place objects.','マップを描きオブジェクトを配置する作業スペースです。','绘制地图、摆放对象的工作区。'],
'실제 게임 화면이 어떻게 보일지 미리 봐요.':['Preview how the actual game screen will look.','実際のゲーム画面の見え方をプレビューします。','预览实际游戏画面的样子。'],
'씬과 게임 화면을 좌우로 함께 봐요.':['See the scene and game views side by side.','シーンとゲーム画面を左右に並べて表示します。','左右并排查看场景和游戏画面。'],
'왼쪽 도구 막대로 손 · 선택 · 브러시 · 지우개 같은 도구를 바꿔요.':['Switch tools like Hand, Select, Brush and Eraser on the toolbar at the left.','左のツールバーで手・選択・ブラシ・消しゴムなどのツールを切り替えます。','用左侧工具栏切换抓手、选择、画笔、橡皮擦等工具。'],
'위쪽 도구 막대':['Top toolbar','上部ツールバー','顶部工具栏'],
'자주 쓰는 기능이 모여 있어요.':['Your most-used actions live here.','よく使う機能がまとまっています。','常用功能都集中在这里。'],
'편집 레이어':['Edit layers','編集レイヤー','编辑图层'],
'지금 무엇을 칠하고 고를지 정해요 (타일맵 · 콜라이더 · 게임 오브젝트 · UI).':['Choose what you paint and select (Tilemap, Collider, Game Object, UI).','何を塗り・選ぶかを決めます（タイルマップ・コライダー・ゲームオブジェクト・UI）。','决定当前绘制和选择的对象（图块地图、碰撞体、游戏对象、UI）。'],
'버튼과 텍스트로 게임 화면을 꾸미는 UI 빌더를 열어요.':['Opens the UI Builder to design screens with buttons and text.','ボタンやテキストで画面を作る UI ビルダーを開きます。','打开 UI 构建器，用按钮和文本设计界面。'],
'C# · 비주얼 스크립트':['C# · Visual Script','C#・ビジュアルスクリプト','C# · 可视化脚本'],
'코드로 쓰거나, 노드를 이어 스크립트를 만들어요.':['Write scripts in code, or build them by wiring nodes.','コードで書くか、ノードをつないでスクリプトを作ります。','用代码编写，或连接节点来制作脚本。'],
'만든 게임을 바로 실행해 봐요.':['Run your game right away.','作ったゲームをすぐに実行します。','立即运行你的游戏。'],
'학습 기능이 있어요':['There’s a built-in Learn mode','学習機能があります','内置学习功能'],
'「학습」을 누르면 Thaniya Engine Edu 학습 창이 엔진 위에 떠서, 레슨을 따라 하며 엔진과 C#을 배울 수 있어요.':['Press “Learn” to open the Thaniya Engine Edu window on top of the engine and learn the engine and C# by following lessons.','「学習」を押すと Thaniya Engine Edu の学習ウィンドウがエンジンの上に開き、レッスンに沿ってエンジンと C# を学べます。','点击“学习”，Thaniya Engine Edu 学习窗口会浮现在引擎上方，跟着课程学习引擎和 C#。'],
'패널마다 있는 작은 「학습」 버튼은 그 창과 관련된 레슨으로 바로 데려가요.':['The small “Learn” button on each panel jumps straight to lessons about that panel.','各パネルの小さな「学習」ボタンは、そのウィンドウに関するレッスンへ直接案内します。','每个面板上的小“学习”按钮会直接带你进入相关课程。'],
'전체 화면을 권장해요':['We recommend full screen','全画面がおすすめです','建议使用全屏'],
'브라우저 주소창과 탭이 사라져 작업 공간이 넓어지고, 단축키가 브라우저와 덜 겹쳐요.':['The address bar and tabs disappear for more workspace, and shortcuts clash less with the browser.','アドレスバーやタブが消えて作業スペースが広がり、ショートカットもブラウザと重なりにくくなります。','地址栏和标签页会隐藏，工作区更宽，快捷键也更少与浏览器冲突。'],
'오른쪽 위 이 버튼이나 F11로 언제든 켜고 끌 수 있어요.':['Toggle it anytime with this button at the top right or F11.','右上のこのボタンか F11 でいつでも切り替えられます。','随时可用右上角的此按钮或 F11 切换。'],
'이미 전체 화면이에요. 좋아요!':['You’re already in full screen. Nice!','すでに全画面です。いいですね！','已经是全屏了，很好！'],
'나중에':['Later','あとで','稍后'],
'전체 화면으로 시작':['Go full screen','全画面で始める','全屏开始'],
'완료':['Done','完了','完成'],
'닫기':['Close','閉じる','关闭'],
'처음 안내 다시 보기':['Replay the intro tour','初回ガイドをもう一度見る','重新观看入门导览'],
'엔진을 처음 열었을 때 나온 튜토리얼을 다시 봅니다. 패널과 탭, 학습 기능, 전체 화면을 차례로 소개합니다.':['Replay the tutorial shown when you first opened the engine. It walks through panels and tabs, Learn mode and full screen.','エンジンを初めて開いたときのチュートリアルをもう一度見ます。パネルとタブ、学習機能、全画面を順に紹介します。','重新观看首次打开引擎时的教程，依次介绍面板与标签页、学习功能和全屏。'],
'튜토리얼 보기':['Show tutorial','チュートリアルを見る','查看教程'],
'정보: ':['About: ','情報: ','信息: '],
'패널 목록':['Panels','パネル一覧','面板列表'],
'아래 버튼으로 패널을 하나씩 바꿔 봐요.':['Switch panels one at a time with the buttons below.','下のボタンでパネルを1つずつ切り替えます。','用下方按钮逐个切换面板。']
};
if(window.TI18N&&TI18N.add)TI18N.add(TR);

var PD={
  hier:'씬에 있는 타일맵 · 게임 오브젝트 · UI · 매니저를 나무 모양으로 보여 줘요.',
  insp:'고른 것의 위치 · 컴포넌트 · 스크립트를 보고 바꿔요.',
  assets:'그림 · 소리 · 스크립트 같은 에셋을 폴더로 정리해요. 에셋스토어와 직접 그리기도 여기 있어요.',
  console:'Debug.Log 출력과 오류 메시지를 확인해요.',
  script:'C# 스크립트를 자동완성과 함께 써요.',
  animator:'상태와 전환으로 캐릭터 애니메이션의 흐름을 짜요.',
  uib:'버튼 · 텍스트 같은 게임 화면 UI를 끌어다 놓아 만들어요.',
  vs:'노드를 선으로 이어 코드 없이 게임을 움직여요.',
  anim:'키프레임을 찍어 움직임 클립을 만들어요.',
  tl:'여러 오브젝트의 연출을 시간 위에 배치하고 녹화해요.',
  palette:'타일을 골라 씬에 맵을 칠해요.'
};
var VD=['맵을 그리고 오브젝트를 배치하는 작업 공간이에요.','실제 게임 화면이 어떻게 보일지 미리 봐요.','씬과 게임 화면을 좌우로 함께 봐요.'];

/* ---------- 아이콘 ---------- */
var SV=function(p){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>'};
var IC={
  hi:SV('<path d="M12 3l1.9 4.6L19 9l-4 3.4L16.2 18 12 15.3 7.8 18 9 12.4 5 9l5.1-1.4z"/>'),
  panel:SV('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9h17M9 9v10.5"/>'),
  scene:SV('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M7 15l3-3 2.5 2.5L15 12l2 3"/>'),
  bar:SV('<rect x="3" y="7" width="18" height="10" rx="3"/><path d="M7 12h2M11 12h2M15 12h2"/>'),
  learn:SV('<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>'),
  full:SV('<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/>'),
  play:SV('<path d="M8 5.5v13l10-6.5z"/>'),
  layer:SV('<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>'),
  ui:SV('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10h8M8 14h5"/>'),
  code:SV('<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>')
};

/* ---------- 스타일 ---------- */
var CSS=`
.tour{position:fixed;inset:0;z-index:2147483000;font-family:inherit;--t-bg:rgba(24,24,30,.94);--t-fg:#f2f2f5;--t-mute:#a3a3ae;--t-line:rgba(255,255,255,.1);--t-chip:rgba(255,255,255,.05);--t-acc:#e9bd0c;--t-acc-fg:#1a1400;--t-dim:rgba(6,6,9,.66)}
html[data-theme="light"] .tour{--t-bg:rgba(255,255,255,.97);--t-fg:#15151b;--t-mute:#5c5c68;--t-line:rgba(0,0,0,.1);--t-chip:rgba(0,0,0,.035);--t-acc-tx:#8a6a00;--t-dim:rgba(20,20,28,.45)}
.tour-block{position:absolute;inset:0;background:transparent}
.tour.tc-center .tour-block{background:var(--t-dim);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);transition:background .3s}
.tour-hole{position:absolute;border-radius:14px;pointer-events:none;box-shadow:0 0 0 200vmax var(--t-dim);transition:left .45s cubic-bezier(.2,.8,.2,1),top .45s cubic-bezier(.2,.8,.2,1),width .45s cubic-bezier(.2,.8,.2,1),height .45s cubic-bezier(.2,.8,.2,1),opacity .3s}
.tour-hole::before{content:"";position:absolute;inset:-2px;border-radius:inherit;border:2px solid var(--t-acc);box-shadow:0 0 0 4px rgba(233,189,12,.18),0 0 26px rgba(233,189,12,.45)}
.tour-hole::after{content:"";position:absolute;inset:-2px;border-radius:inherit;border:2px solid var(--t-acc);animation:tourPulse 1.8s ease-out infinite}
@keyframes tourPulse{0%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(1.06)}}
.tour.tc-center .tour-hole{opacity:0;box-shadow:none}
.tour-ring{position:absolute;pointer-events:none;border-radius:10px;border:2px solid var(--t-acc);box-shadow:0 0 18px rgba(233,189,12,.6);animation:tourBlink 1.2s ease-in-out infinite}
.tour-ring.tc-soft{animation-delay:.3s;border-style:dashed}
@keyframes tourBlink{0%,100%{opacity:1}50%{opacity:.35}}
.tour-card{position:absolute;width:min(380px,calc(100vw - 24px));box-sizing:border-box;padding:18px 18px 14px;border-radius:20px;color:var(--t-fg);background:var(--t-bg);
  background-image:radial-gradient(120% 80% at 0% 0%,rgba(233,189,12,.14),transparent 55%);border:1px solid rgba(233,189,12,.32);
  -webkit-backdrop-filter:blur(18px) saturate(1.3);backdrop-filter:blur(18px) saturate(1.3);
  box-shadow:0 24px 60px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06);
  transition:left .45s cubic-bezier(.2,.8,.2,1),top .45s cubic-bezier(.2,.8,.2,1);font-size:13.5px;line-height:1.6;-webkit-user-select:none;user-select:none}
html[data-theme="light"] .tour-card{box-shadow:0 24px 60px rgba(0,0,0,.18)}
.tour-card.tc-in{animation:tourIn .35s cubic-bezier(.2,.8,.2,1)}
@keyframes tourIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
.tour-arrow{position:absolute;width:14px;height:14px;background:inherit;background-color:var(--t-bg);border:1px solid rgba(233,189,12,.32);transform:rotate(45deg)}
.tour-arrow.tc-l{left:-8px;border-right:0;border-top:0}.tour-arrow.tc-r{right:-8px;border-left:0;border-bottom:0}
.tour-arrow.tc-t{top:-8px;border-right:0;border-bottom:0}.tour-arrow.tc-b2{bottom:-8px;border-left:0;border-top:0}
.tc-top{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.tc-ic{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:rgba(233,189,12,.16);color:var(--t-acc-tx,var(--t-acc))}
.tc-ic svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.tc-h{flex:1;min-width:0;margin:0;font-size:16px;font-weight:700;line-height:1.3;letter-spacing:-.01em}
.tc-n{flex:none;font:500 11px ui-monospace,Menlo,Consolas,monospace;color:var(--t-mute);padding:2px 8px;border:1px solid var(--t-line);border-radius:999px}
.tc-x{flex:none;width:24px;height:24px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:var(--t-chip);color:var(--t-mute);cursor:pointer;font-size:15px;line-height:1}
.tc-x:hover{color:var(--t-fg);background:rgba(255,80,90,.25)}
.tc-p{margin:0 0 8px;color:var(--t-fg)}
.tc-p.tc-m{color:var(--t-mute);font-size:12.5px}
.tc-cap{margin:12px 0 6px;font-size:11px;font-weight:600;letter-spacing:.08em;color:var(--t-acc-tx,var(--t-acc));text-transform:uppercase}
.tc-tabs{list-style:none;margin:0;padding:0;display:grid;gap:6px;max-height:min(46vh,330px);overflow:auto}
.tc-tabs button{display:flex;align-items:flex-start;gap:10px;width:100%;padding:8px 10px;border:1px solid var(--t-line);border-radius:12px;background:var(--t-chip);color:var(--t-fg);font:inherit;text-align:left;cursor:pointer;transition:border-color .15s,background .15s,transform .15s}
.tc-tabs button:hover,.tc-tabs button:focus-visible{border-color:rgba(233,189,12,.55);background:rgba(233,189,12,.08);transform:translateX(2px);outline:none}
.tc-tabs button.tc-on{border-color:rgba(233,189,12,.45)}
.tc-ti{flex:none;display:grid;place-items:center;width:24px;height:24px;margin-top:1px;border-radius:7px;background:rgba(233,189,12,.14);color:var(--t-acc-tx,var(--t-acc))}
.tc-ti svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.tc-tabs b{display:block;font-size:13px;line-height:1.35}
.tc-tabs small{display:block;font-size:12px;line-height:1.45;color:var(--t-mute)}
.tc-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px}
.tc-dots{display:flex;gap:4px;flex-wrap:nowrap;min-width:0;flex-shrink:1;overflow:hidden}
.tc-dots i{flex:none}
.tc-dots i{width:6px;height:6px;border-radius:999px;background:var(--t-line);transition:width .25s,background .25s}
.tc-dots i.tc-on{width:18px;background:var(--t-acc)}
.tc-btns{display:flex;gap:6px;margin-left:auto}
.tc-b{height:32px;padding:0 14px;border-radius:10px;border:1px solid var(--t-line);background:transparent;color:var(--t-fg);font-family:inherit;font-weight:600;font-size:13px;line-height:1;position:static;cursor:pointer;white-space:nowrap;transition:background .15s,filter .15s,transform .1s}
.tc-b:hover{background:var(--t-chip)}
.tc-b:active{transform:scale(.97)}
.tc-b.tc-pri{border-color:transparent;color:var(--t-acc-fg);background:linear-gradient(180deg,#f6cd2a,#e9bd0c);box-shadow:0 4px 14px rgba(233,189,12,.32)}
.tc-b.tc-pri:hover{filter:brightness(1.07)}
.tc-b.tc-ghost{border-color:transparent;color:var(--t-mute)}
.tc-b.tc-ghost:hover{color:var(--t-fg)}
.tour-card.tc-hero{width:min(440px,calc(100vw - 24px));padding:28px 26px 20px;text-align:center}
.tour-card.tc-hero .tc-logo{width:76px;height:76px;margin:0 auto 14px;display:grid;place-items:center;border-radius:22px;background:radial-gradient(circle at 50% 40%,#1c1c22,#000);box-shadow:0 10px 26px rgba(0,0,0,.45),0 0 0 1px rgba(233,189,12,.3),0 0 40px rgba(233,189,12,.18)}
.tour-card.tc-hero .tc-logo img{width:58px;height:58px;object-fit:contain;animation:tourFloat 3s ease-in-out infinite}
@keyframes tourFloat{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-3px) rotate(-4deg)}}
.tour-card.tc-hero .tc-ey{font:600 11px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.18em;color:var(--t-acc-tx,var(--t-acc));margin-bottom:6px}
.tour-card.tc-hero h3{margin:0 0 8px;font-size:21px;font-weight:700;letter-spacing:-.01em}
.tour-card.tc-hero .tc-p{color:var(--t-mute);margin-bottom:4px}
.tour-card.tc-hero .tc-map{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:18px auto 4px;max-width:300px}
.tour-card.tc-hero .tc-map span{height:40px;border-radius:8px;border:1px solid var(--t-line);background:var(--t-chip);animation:tourTile 2.4s ease-in-out infinite}
.tour-card.tc-hero .tc-map span:nth-child(2){grid-row:span 2;height:auto;background:rgba(233,189,12,.12);border-color:rgba(233,189,12,.35);animation-delay:.2s}
.tour-card.tc-hero .tc-map span:nth-child(3){animation-delay:.4s}.tour-card.tc-hero .tc-map span:nth-child(4){animation-delay:.6s}.tour-card.tc-hero .tc-map span:nth-child(5){animation-delay:.8s}
@keyframes tourTile{0%,100%{opacity:.55}50%{opacity:1}}
.tour-card.tc-hero .tc-foot{justify-content:center;margin-top:20px}
.tour-card.tc-hero .tc-btns{margin:0}
.tour-card.tc-hero .tc-b{height:38px;padding:0 18px}
@media (prefers-reduced-motion:reduce){.tour-hole,.tour-card{transition:none}.tour-hole::after,.tour-ring,.tour-card.tc-in,.tc-logo img,.tc-map span{animation:none!important}}
`;

/* ---------- 도우미 ---------- */
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function vis(el){if(!el||!el.isConnected)return false;var r=el.getBoundingClientRect();return r.width>8&&r.height>8&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth&&getComputedStyle(el).visibility!=='hidden'}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function txt(el){return el?el.textContent.replace(/\s+/g,' ').trim():''}

/* 패널 탭 바꾸기 — 엔진은 탭을 click이 아니라 pointerdown → pointerup으로 바꿈 */
function switchTab(id){
  try{
    if(typeof L!=='undefined'&&typeof rootOf==='function'&&typeof renderLayout==='function'){
      L.active[rootOf(id)]=id;if(typeof saveLayout==='function')saveLayout();renderLayout();return;
    }
  }catch(e){}
  var x=$('.ptabbtn[data-id="'+id+'"]');if(!x)return;
  var r=x.getBoundingClientRect(),o={bubbles:true,cancelable:true,button:0,buttons:1,pointerId:1,isPrimary:true,pointerType:'mouse',clientX:r.left+r.width/2,clientY:r.top+r.height/2};
  x.dispatchEvent(new PointerEvent('pointerdown',o));x.dispatchEvent(new PointerEvent('pointerup',Object.assign({},o,{buttons:0})));
}
/* 지금 화면의 단계 만들기 */
function buildSteps(){
  var S=[{kind:'hero'}];
  var groups=[];
  var nt=$('.ntabs');
  if(nt&&vis(nt)){
    var items=$$('button[data-id]',nt).map(function(b){return{name:txt(b),desc:PD[b.dataset.id]||'',icon:IC.panel,el:b,act:function(){b.click()}}});
    groups.push({el:function(){return $('.ntabs')},rect:null,title:'패널 목록',icon:IC.panel,lead:'아래 버튼으로 패널을 하나씩 바꿔 봐요.',items:items});
  }else{
    var seen={};
    $$('.panel[data-id]').forEach(function(p){
      if(!vis(p)||p.closest('.float')&&false)return;
      var id=p.dataset.id;if(seen[id])return;
      var btns=$$('.tabstrip .ptabbtn',p),items;
      if(btns.length){
        items=btns.map(function(b){seen[b.dataset.id]=1;var ic=$('.ticon',b);return{id:b.dataset.id,name:txt($('.tl',b)),desc:PD[b.dataset.id]||'',icon:ic?ic.innerHTML:IC.panel,on:b.classList.contains('on'),act:function(){switchTab(b.dataset.id)}}});
      }else{
        seen[id]=1;var ic=$('.ticon',p);
        items=[{id:id,name:txt($('.ptitle',p)),desc:PD[id]||'',icon:ic?ic.innerHTML:IC.panel,on:true}];
      }
      var r=p.getBoundingClientRect();
      groups.push({pid:id,sort:Math.round(r.top/80)*100000+r.left,el:function(){var a=$('.panel[data-id="'+id+'"]');if(vis(a))return a;for(var i=0;i<items.length;i++){var e=$('.panel[data-id="'+items[i].id+'"]');if(vis(e))return e}return a},
        title:items.map(function(i){return i.name}).join(' · '),icon:IC.panel,items:items,tabs:items.length>1});
    });
    var sp=$('#scenepanel');
    if(vis(sp)){
      var r=sp.getBoundingClientRect(),vt=$$('.vtab',sp).filter(vis);
      groups.push({sort:Math.round(r.top/80)*100000+r.left,el:function(){return $('#scenepanel')},title:'씬 · 게임 뷰',icon:IC.scene,tabs:vt.length>1,
        items:vt.map(function(b,i){return{name:txt(b),desc:VD[i]||'',icon:IC.scene,on:b.classList.contains('on'),act:function(){b.click()}}}),
        foot:vis($('#sbar'))?'왼쪽 도구 막대로 손 · 선택 · 브러시 · 지우개 같은 도구를 바꿔요.':''});
    }
    groups.sort(function(a,b){return a.sort-b.sort});
  }
  groups.forEach(function(g){S.push({kind:'group',g:g})});
  var tb=$('#toolbar');
  if(vis(tb)){
    var it=[];
    if(vis($('#layers')))it.push({name:'편집 레이어',desc:'지금 무엇을 칠하고 고를지 정해요 (타일맵 · 콜라이더 · 게임 오브젝트 · UI).',icon:IC.layer,el:'#layers'});
    if(vis($('#bUib')))it.push({name:'UI 화면 만들기',desc:'버튼과 텍스트로 게임 화면을 꾸미는 UI 빌더를 열어요.',icon:IC.ui,el:'#bUib'});
    if(vis($('#bSed'))||vis($('#bVs')))it.push({name:'C# · 비주얼 스크립트',desc:'코드로 쓰거나, 노드를 이어 스크립트를 만들어요.',icon:IC.code,el:'.codegrp'});
    if(vis($('#bPlay')))it.push({name:'플레이',desc:'만든 게임을 바로 실행해 봐요.',icon:IC.play,el:'#bPlay'});
    S.push({kind:'group',g:{el:function(){return $('#toolbar')},title:'위쪽 도구 막대',icon:IC.bar,lead:'자주 쓰는 기능이 모여 있어요.',items:it,hoverOnly:true}});
  }
  if(vis($('#bLearn')))S.push({kind:'learn'});
  if(vis($('#bFull')))S.push({kind:'full'});
  return S;
}

/* ---------- 화면 ---------- */
var root,hole,card,rings=[],steps=[],cur=0,styled=false,keyH,resH,prevFocus;
function ensureStyle(){if(styled)return;styled=true;var s=document.createElement('style');s.id='tourCss';s.textContent=CSS;document.head.appendChild(s)}
function clearRings(){rings.forEach(function(r){r.remove()});rings=[]}
function ring(el,soft){
  if(!vis(el))return;var r=el.getBoundingClientRect(),d=document.createElement('div');
  d.className='tour-ring'+(soft?' tc-soft':'');d.style.cssText='left:'+(r.left-4)+'px;top:'+(r.top-4)+'px;width:'+(r.width+8)+'px;height:'+(r.height+8)+'px';
  root.appendChild(d);rings.push(d);return d;
}
function stepTarget(s){
  if(s.kind==='group')return s.g.el();
  if(s.kind==='learn')return $('#bLearn');
  if(s.kind==='full')return $('#bFull');
  return null;
}
function dots(){var h='';for(var i=0;i<steps.length;i++)h+='<i class="'+(i===cur?'tc-on':'')+'"></i>';return '<div class="tc-dots" aria-hidden="true">'+h+'</div>'}
function head(icon,title){return '<div class="tc-top"><span class="tc-ic">'+icon+'</span><h3 class="tc-h">'+esc(title)+'</h3><span class="tc-n">'+(cur)+' / '+(steps.length-1)+'</span><button type="button" class="tc-x" data-a="close" aria-label="닫기">×</button></div>'}
function navBtns(last){
  return '<div class="tc-btns">'+(cur>1?'<button type="button" class="tc-b tc-ghost" data-a="prev">이전</button>':'')+
    (last||'<button type="button" class="tc-b tc-pri" data-a="next">다음</button>')+'</div>';
}
function render(){
  var s=steps[cur];clearRings();
  card.className='tour-card tc-in';void card.offsetWidth;
  var h='';
  if(s.kind==='hero'){
    root.classList.add('tc-center');card.classList.add('tc-hero');
    h='<div class="tc-logo"><img src="assets/thaniya-logo.png" alt=""></div><div class="tc-ey">WELCOME</div>'+
      '<h3>Thaniya Engine에 오신 걸 환영해요</h3><p class="tc-p">화면 곳곳의 패널과 탭을 1분 안에 둘러볼게요.</p>'+
      '<div class="tc-map" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>'+
      '<div class="tc-foot"><div class="tc-btns"><button type="button" class="tc-b tc-ghost" data-a="close">건너뛰기</button><button type="button" class="tc-b tc-pri" data-a="next">둘러보기 시작</button></div></div>';
  }else{
    root.classList.remove('tc-center');
    if(s.kind==='group'){
      var g=s.g;
      h=head(g.icon,g.title);
      if(g.lead)h+='<p class="tc-p">'+esc(g.lead)+'</p>';
      if(g.tabs)h+='<div class="tc-cap">이 패널의 탭</div>';
      else if(!g.lead&&g.items.length===1&&g.items[0].desc){h+='<p class="tc-p">'+esc(g.items[0].desc)+'</p>'}
      if(g.tabs||g.lead){
        h+='<ul class="tc-tabs">'+g.items.map(function(it,i){return '<li><button type="button" data-i="'+i+'" class="'+(it.on?'tc-on':'')+'"><span class="tc-ti">'+it.icon+'</span><span><b>'+esc(it.name)+'</b>'+(it.desc?'<small>'+esc(it.desc)+'</small>':'')+'</span></button></li>'}).join('')+'</ul>';
        if(g.tabs)h+='<p class="tc-p tc-m" style="margin:8px 0 0">탭을 누르면 그 자리에서 바뀌어요.</p>';
      }
      if(g.foot)h+='<p class="tc-p tc-m" style="margin:8px 0 0">'+esc(g.foot)+'</p>';
      h+='<div class="tc-foot">'+dots()+navBtns()+'</div>';
    }else if(s.kind==='learn'){
      h=head(IC.learn,'학습 기능이 있어요')+
        '<p class="tc-p">「학습」을 누르면 Thaniya Engine Edu 학습 창이 엔진 위에 떠서, 레슨을 따라 하며 엔진과 C#을 배울 수 있어요.</p>'+
        '<p class="tc-p tc-m">패널마다 있는 작은 「학습」 버튼은 그 창과 관련된 레슨으로 바로 데려가요.</p>'+
        '<div class="tc-foot">'+dots()+navBtns()+'</div>';
    }else if(s.kind==='full'){
      var isFull=!!(document.fullscreenElement||document.webkitFullscreenElement);
      h=head(IC.full,'전체 화면을 권장해요')+
        '<p class="tc-p">브라우저 주소창과 탭이 사라져 작업 공간이 넓어지고, 단축키가 브라우저와 덜 겹쳐요.</p>'+
        '<p class="tc-p tc-m">'+(isFull?'이미 전체 화면이에요. 좋아요!':'오른쪽 위 이 버튼이나 F11로 언제든 켜고 끌 수 있어요.')+'</p>'+
        '<div class="tc-foot">'+dots()+navBtns(isFull?'<button type="button" class="tc-b tc-pri" data-a="close">완료</button>':
          '<button type="button" class="tc-b" data-a="close">나중에</button><button type="button" class="tc-b tc-pri" data-a="full">전체 화면으로 시작</button>')+'</div>';
    }
  }
  card.innerHTML=h;
  if(s.kind==='learn')$$('.plearn').forEach(function(b){if(vis(b))ring(b,true)});
  place();
  var f=$('.tc-b.tc-pri',card);if(f)f.focus({preventScroll:true});
  clearTimeout(render.t);render.t=setTimeout(function(){if(root)place()},420);
}
function place(){
  var s=steps[cur],t=stepTarget(s),W=innerWidth,H=innerHeight;
  var old=$('.tour-arrow',card);if(old)old.remove();
  if(s.kind==='hero'||!t||!vis(t)){
    hole.style.cssText='left:'+(W/2)+'px;top:'+(H/2)+'px;width:0;height:0';
    var cw=card.offsetWidth,ch=card.offsetHeight;
    card.style.left=Math.round((W-cw)/2)+'px';card.style.top=Math.round((H-ch)/2)+'px';
    if(s.kind!=='hero')root.classList.add('tc-center');
    return;
  }
  var pad=s.kind==='group'?4:6,r=t.getBoundingClientRect();
  var x=Math.max(4,r.left-pad),y=Math.max(4,r.top-pad),w=Math.min(W-4,r.right+pad)-x,h=Math.min(H-4,r.bottom+pad)-y;
  hole.style.cssText='left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px;border-radius:'+(s.kind==='group'?16:12)+'px';
  /* 다시 그린 링 위치 */
  if(s.kind==='learn'){clearRings();$$('.plearn').forEach(function(b){if(vis(b))ring(b,true)})}
  var cw=card.offsetWidth,ch=card.offsetHeight,G=16,M=12,cx,cy,side=null;
  var fits={r:x+w+G+cw<=W-M,l:x-G-cw>=M,b:y+h+G+ch<=H-M,t:y-G-ch>=M};
  var order=w>h*1.6?['b','t','r','l']:['r','l','b','t'];
  for(var i=0;i<order.length;i++)if(fits[order[i]]){side=order[i];break}
  function clampX(v){return Math.max(M,Math.min(W-M-cw,v))}
  function clampY(v){return Math.max(M,Math.min(H-M-ch,v))}
  if(side==='r'){cx=x+w+G;cy=clampY(y+h/2-ch/2)}
  else if(side==='l'){cx=x-G-cw;cy=clampY(y+h/2-ch/2)}
  else if(side==='b'){cy=y+h+G;cx=clampX(x+w/2-cw/2)}
  else if(side==='t'){cy=y-G-ch;cx=clampX(x+w/2-cw/2)}
  else{cx=clampX(x+w-cw-18);cy=clampY(y+h-ch-18)} /* 큰 영역: 안쪽 오른쪽 아래 */
  card.style.left=Math.round(cx)+'px';card.style.top=Math.round(cy)+'px';
  if(side){
    var a=document.createElement('i');a.className='tour-arrow '+({r:'tc-l',l:'tc-r',b:'tc-t',t:'tc-b2'})[side];
    if(side==='r'||side==='l')a.style.top=Math.max(18,Math.min(ch-32,y+h/2-cy-7))+'px';
    else a.style.left=Math.max(18,Math.min(cw-32,x+w/2-cx-7))+'px';
    card.appendChild(a);
  }
}
function go(i){
  if(i<0||i>=steps.length)return;
  var n=i;while(n>0&&n<steps.length&&steps[n].kind!=='hero'&&!vis(stepTarget(steps[n])))n+=(i>=cur?1:-1);
  if(n>=steps.length){close(true);return}
  cur=Math.max(0,n);render();
}
function close(done){
  try{localStorage.setItem(KEY,'1')}catch(e){}
  if(!root)return;
  removeEventListener('keydown',keyH,true);removeEventListener('resize',resH);
  root.remove();root=null;clearRings();
  if(prevFocus&&prevFocus.focus)try{prevFocus.focus({preventScroll:true})}catch(e){}
}
function start(){
  if(root)return;
  try{localStorage.setItem(KEY,'1')}catch(e){}
  ensureStyle();
  prevFocus=document.activeElement;
  try{var m=$('#menu');if(m&&!m.hidden&&typeof hideMenu==='function')hideMenu()}catch(e){}
  steps=buildSteps();cur=0;
  root=document.createElement('div');root.className='tour tc-center';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Thaniya Engine 처음 안내');
  root.innerHTML='<div class="tour-block"></div><div class="tour-hole"></div><div class="tour-card"></div>';
  document.body.appendChild(root);
  hole=$('.tour-hole',root);card=$('.tour-card',root);
  card.addEventListener('click',function(e){
    var b=e.target.closest('[data-a]');
    if(b){var a=b.dataset.a;
      if(a==='next')go(cur+1);else if(a==='prev')go(cur-1);else if(a==='close')close(true);
      else if(a==='full'){var f=$('#bFull');close(true);if(f)f.click()}
      return}
    var t=e.target.closest('.tc-tabs button');if(!t)return;
    var g=steps[cur].g,it=g&&g.items[+t.dataset.i];
    if(it&&it.act&&!g.hoverOnly){it.act();setTimeout(function(){if(!root)return;
      $$('.tc-tabs button',card).forEach(function(x){x.classList.toggle('tc-on',x===t)});
      g.items.forEach(function(o,k){o.on=(k===+t.dataset.i)});place()},60)}
  });
  card.addEventListener('pointerover',function(e){
    var t=e.target.closest('.tc-tabs button');clearRings();if(!t)return;
    var s=steps[cur];if(s.kind!=='group')return;var it=s.g.items[+t.dataset.i];if(!it)return;
    var el=null;
    if(typeof it.el==='string')el=$(it.el);
    else if(it.el)el=it.el;
    else if(it.id)el=$('.ptabbtn[data-id="'+it.id+'"]')||$('.panel[data-id="'+it.id+'"] .phead');
    else if(s.g.title==='씬 · 게임 뷰')el=$$('#scenepanel .vtab').filter(vis)[+t.dataset.i];
    if(el)ring(el);
  });
  card.addEventListener('pointerleave',function(){if(steps[cur]&&steps[cur].kind!=='learn')clearRings()});
  keyH=function(e){
    if(!root)return;
    var k=e.key;
    if(k==='Escape'){e.preventDefault();e.stopPropagation();close(true);return}
    if(k==='ArrowRight'){e.preventDefault();e.stopPropagation();go(cur+1);return}
    if(k==='ArrowLeft'){e.preventDefault();e.stopPropagation();if(cur>1)go(cur-1);return}
    if(k==='Tab'){var f=$$('button',card);if(!f.length)return;var i=f.indexOf(document.activeElement);e.preventDefault();e.stopPropagation();f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus();return}
    if(k==='Enter'||k===' '){if(card.contains(document.activeElement)){e.stopPropagation();return}e.preventDefault();e.stopPropagation();go(cur+1);return}
    if(!e.ctrlKey&&!e.metaKey&&k!=='F11'){e.stopPropagation()}
  };
  addEventListener('keydown',keyH,true);
  resH=function(){if(root)place()};addEventListener('resize',resH);
  render();
}
function seen(){try{return localStorage.getItem(KEY)==='1'}catch(e){return true}}
window.TOUR={start:start,close:close,reset:function(){try{localStorage.removeItem(KEY)}catch(e){}}};

/* 처음 열었을 때 한 번 */
function auto(){
  if(seen())return;
  if(window.top!==window)return;
  if(document.body.classList.contains('popbody'))return;
  var tries=0;
  (function wait(){
    tries++;
    var busy=$$('.modal,dialog[open]').some(vis);
    if((busy||!vis($('#menubar')))&&tries<20){setTimeout(wait,500);return}
    if(!busy)start();
  })();
}
if(document.readyState==='complete')setTimeout(auto,700);else addEventListener('load',function(){setTimeout(auto,700)});
})();
