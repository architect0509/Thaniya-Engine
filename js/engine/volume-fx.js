/* Thaniya Engine — 볼륨 (Volume) · 후처리 효과 (Post Processing)
   유니티 URP의 Volume 컴포넌트처럼:
   · 전역(Global) 볼륨은 어디서나, 지역(Local) 볼륨은 박스 콜라이더 2D 범위 안(+ 섞는 거리)에서만 효과를 줍니다.
   · 카메라 위치에서 각 볼륨의 무게(weight)를 구하고, 우선순위(priority)가 낮은 것부터 차례로 값을 섞습니다.
   · 효과(override)는 볼륨마다 목록으로 들고 있으며, 같은 효과가 여러 볼륨에 있으면 값이 부드럽게 섞입니다.
   · 그리기: 게임 화면(카메라 출력)을 WebGL 셰이더 한 번으로 처리한 뒤 다시 2D 캔버스에 그립니다. UI는 그 뒤에 그려져 효과를 받지 않습니다.
   데이터: o.props.volume = {mode:'global'|'local', weight, priority, blend, on, fx:[{k, on, p:{…}}]}
*/
(function(){
'use strict';
const TR={};
const L=(ko,en,ja,zh)=>{if(en)TR[ko]=[en,ja||en,zh||en];return ko};

/* ===================== 효과 정의 =====================
   p: 값 목록 — t: num(기본) | color | bool | enum | text
   neu: 「효과 없음」 값. neu가 있는 값만 효과의 세기로 셉니다 (섞을 때 볼륨 밖은 neu에서 시작).
   neu가 없는 값(문턱 · 반경 · 색 · 줄 수 …)은 def에서 시작합니다. */
const EFFECTS=[
 {k:'color',n:L('색 보정','Color Adjustments','色補正','颜色调整'),en:'Color Adjustments',ic:'◐',
  d:L('밝기 · 대비 · 채도 · 색온도로 화면 전체의 색감을 바꾼다. 「예쁜 필터」는 대부분 이 효과로 만든다.','Changes the overall look with exposure, contrast, saturation and white balance. Most “pretty filters” are made with this.','露出・コントラスト・彩度・色温度で画面全体の色味を変えます。「きれいなフィルター」の多くはこの効果で作ります。','用曝光、对比度、饱和度和色温改变整个画面的色调。大多数“好看的滤镜”都用它制作。'),
  p:[{k:'exposure',n:L('노출','Exposure','露出','曝光'),en:'postExposure',min:-3,max:3,step:.05,def:0,neu:0,tip:L('화면 밝기이다. +1은 두 배 밝게, -1은 절반으로 어둡게 한다.','Screen brightness. +1 doubles it, -1 halves it.','画面の明るさです。+1で2倍、-1で半分の明るさになります。','画面亮度。+1 变为两倍亮，-1 变为一半。')},
     {k:'contrast',n:L('대비','Contrast','コントラスト','对比度'),en:'contrast',min:-100,max:100,step:1,def:0,neu:0,tip:L('밝은 곳과 어두운 곳의 차이이다. 높이면 또렷하고 강해진다.','Difference between light and dark. Higher looks sharper and stronger.','明るい所と暗い所の差です。上げるとくっきり強くなります。','明暗之间的差异。调高会更鲜明。')},
     {k:'saturation',n:L('채도','Saturation','彩度','饱和度'),en:'saturation',min:-100,max:100,step:1,def:0,neu:0,tip:L('색의 진하기이다. -100이면 흑백이 된다.','Color intensity. -100 makes it black and white.','色の鮮やかさです。-100で白黒になります。','颜色浓度。-100 为黑白。')},
     {k:'hue',n:L('색상 회전','Hue Shift','色相シフト','色相偏移'),en:'hueShift',min:-180,max:180,step:1,def:0,neu:0,tip:L('모든 색을 색상환에서 돌린다. 기묘한 분위기에 좋다.','Rotates every color around the color wheel. Great for an eerie mood.','すべての色を色相環で回します。不思議な雰囲気に向いています。','在色环上旋转所有颜色。适合营造诡异氛围。')},
     {k:'temp',n:L('색온도','Temperature','色温度','色温'),en:'temperature',min:-100,max:100,step:1,def:0,neu:0,tip:L('+는 노을처럼 따뜻하게(주황), -는 새벽처럼 차갑게(파랑) 만든다.','+ is warm like sunset (orange), - is cold like dawn (blue).','+は夕焼けのように暖かく（オレンジ）、-は夜明けのように冷たく（青）します。','+ 像夕阳一样温暖（橙），- 像黎明一样寒冷（蓝）。')},
     {k:'tint',n:L('색조','Tint','色かぶり','色调'),en:'tint',min:-100,max:100,step:1,def:0,neu:0,tip:L('+는 분홍빛(마젠타), -는 초록빛으로 기울인다.','+ leans magenta, - leans green.','+はピンク（マゼンタ）寄り、-は緑寄りにします。','+ 偏洋红，- 偏绿。')},
     {k:'filter',t:'color',n:L('컬러 필터','Color Filter','カラーフィルター','颜色滤镜'),en:'colorFilter',def:'#ffffff',neu:'#ffffff',tip:L('화면에 곱하는 색이다. 흰색이면 그대로, 색을 고르면 그 색 셀로판을 댄 것처럼 보인다.','A color multiplied over the screen. White changes nothing; other colors look like colored cellophane.','画面に掛け合わせる色です。白はそのまま、色を選ぶとその色のセロハンを当てたように見えます。','与画面相乘的颜色。白色不变，其他颜色像贴了彩色玻璃纸。')}]},
 {k:'bloom',n:L('블룸','Bloom','ブルーム','泛光'),en:'Bloom',ic:'✺',
  d:L('밝은 부분이 빛처럼 번져 보이게 한다. 횃불 · 마법 · 몽환적인 장면에 어울린다.','Makes bright areas glow and spill light. Great for torches, magic and dreamy scenes.','明るい部分が光のようににじんで見えます。たいまつ・魔法・幻想的な場面に。','让明亮部分像光一样晕开。适合火把、魔法和梦幻场景。'),
  p:[{k:'intensity',n:L('강도','Intensity','強度','强度'),en:'intensity',min:0,max:3,step:.05,def:1,neu:0,tip:L('번지는 빛의 세기이다.','Strength of the glow.','にじむ光の強さです。','光晕的强度。')},
     {k:'threshold',n:L('문턱','Threshold','しきい値','阈值'),en:'threshold',min:0,max:1,step:.01,def:.7,tip:L('이 밝기보다 밝은 곳만 번진다. 낮출수록 더 많은 곳이 빛난다.','Only areas brighter than this glow. Lower means more of the screen glows.','この明るさより明るい所だけがにじみます。下げるほど多くが光ります。','只有比这更亮的地方会发光。越低发光的部分越多。')},
     {k:'radius',n:L('퍼짐(픽셀)','Scatter (px)','広がり(px)','扩散(像素)'),en:'scatter',min:1,max:10,step:.5,def:3,tip:L('빛이 퍼지는 거리이다.','How far the glow spreads.','光が広がる距離です。','光晕扩散的距离。')},
     {k:'tint',t:'color',n:L('빛 색','Tint','光の色','光色'),en:'tint',def:'#ffffff',tip:L('번지는 빛에 입힐 색이다.','Color applied to the glow.','にじむ光に付ける色です。','给光晕上的颜色。')}]},
 {k:'vignette',n:L('비네트','Vignette','ビネット','暗角'),en:'Vignette',ic:'◉',
  d:L('화면 가장자리를 어둡게(또는 다른 색으로) 감싼다. 시선을 가운데로 모으고, 공포 · 회상 장면에 자주 쓴다.','Darkens (or tints) the screen edges. Draws the eye to the center; common in horror and flashbacks.','画面の端を暗く（または別の色で）包みます。視線を中央に集め、ホラーや回想でよく使います。','让画面边缘变暗（或着色）。把视线集中到中央，常用于恐怖和回忆场景。'),
  p:[{k:'intensity',n:L('강도','Intensity','強度','强度'),en:'intensity',min:0,max:1,step:.01,def:.4,neu:0,tip:L('가장자리가 얼마나 안쪽까지 덮이는지이다.','How far in the edges are covered.','端がどこまで内側に覆われるかです。','边缘向内覆盖的程度。')},
     {k:'smooth',n:L('부드러움','Smoothness','滑らかさ','平滑度'),en:'smoothness',min:.01,max:1,step:.01,def:.45,tip:L('가장자리 경계가 얼마나 흐릿하게 이어지는지이다.','How soft the edge transition is.','境界がどれだけぼやけてつながるかです。','边缘过渡的柔和程度。')},
     {k:'color',t:'color',n:L('색','Color','色','颜色'),en:'color',def:'#000000',tip:L('가장자리 색이다. 빨강이면 피격 · 위험 연출이 된다.','Edge color. Red works for damage or danger.','端の色です。赤にすると被弾・危険の演出になります。','边缘颜色。红色可做受伤或危险效果。')}]},
 {k:'chroma',n:L('색수차','Chromatic Aberration','色収差','色差'),en:'Chromatic Aberration',ic:'⧉',
  d:L('빨강 · 파랑이 가장자리로 갈수록 어긋나 값싼 렌즈나 어지러운 느낌을 준다.','Red and blue drift apart toward the edges, like a cheap lens or a dizzy feeling.','赤と青が端に行くほどずれ、安いレンズやめまいのような感じを出します。','红蓝越到边缘越错开，像廉价镜头或眩晕感。'),
  p:[{k:'intensity',n:L('강도','Intensity','強度','强度'),en:'intensity',min:0,max:1,step:.01,def:.5,neu:0,tip:L('색이 어긋나는 정도이다.','How far the colors split.','色がずれる度合いです。','颜色错开的程度。')}]},
 {k:'lens',n:L('렌즈 왜곡','Lens Distortion','レンズ歪み','镜头畸变'),en:'Lens Distortion',ic:'◎',
  d:L('화면을 렌즈로 본 것처럼 휘게 한다. +는 볼록렌즈(가운데가 부풀어 보임), -는 오목렌즈이다.','Bends the screen like a lens. + is a convex (bulging) lens, - is concave.','画面をレンズで見たように曲げます。+は凸レンズ（中央がふくらむ）、-は凹レンズです。','让画面像透过镜头一样弯曲。+ 为凸透镜（中间鼓起），- 为凹透镜。'),
  p:[{k:'intensity',n:L('강도','Intensity','強度','强度'),en:'intensity',min:-1,max:1,step:.01,def:.5,neu:0,tip:L('+: 볼록렌즈 · 물고기 눈처럼 부푼다. -: 오목렌즈 · 가장자리가 늘어난다.','+: convex, bulges like a fisheye. -: concave, stretches the edges.','+：凸レンズ・魚眼のようにふくらみます。-：凹レンズ・端が伸びます。','+：凸透镜，像鱼眼一样鼓起。-：凹透镜，边缘被拉伸。')},
     {k:'scale',n:L('배율','Scale','倍率','缩放'),en:'scale',min:.5,max:2,step:.01,def:1,neu:1,tip:L('렌즈로 보는 화면의 확대 배율이다. 1보다 크면 확대된다.','Zoom of the lensed image. Above 1 zooms in.','レンズで見る画面の拡大率です。1より大きいと拡大します。','透过镜头的放大倍率。大于 1 时放大。')},
     {k:'cx',n:L('중심 X','Center X','中心 X','中心 X'),en:'center.x',min:0,max:1,step:.01,def:.5,tip:L('렌즈 중심의 가로 위치이다 (0 왼쪽 · 1 오른쪽).','Horizontal lens center (0 left, 1 right).','レンズ中心の横位置です（0 左・1 右）。','镜头中心的水平位置（0 左，1 右）。')},
     {k:'cy',n:L('중심 Y','Center Y','中心 Y','中心 Y'),en:'center.y',min:0,max:1,step:.01,def:.5,tip:L('렌즈 중심의 세로 위치이다 (0 위 · 1 아래).','Vertical lens center (0 top, 1 bottom).','レンズ中心の縦位置です（0 上・1 下）。','镜头中心的垂直位置（0 上，1 下）。')}]},
 {k:'blur',n:L('흐림','Blur','ぼかし','模糊'),en:'Blur',ic:'≋',
  d:L('화면 전체를 부드럽게 흐리다. 꿈 · 기절 · 취한 연출에 쓴다.','Softly blurs the whole screen. For dreams, fainting or dizziness.','画面全体をやわらかくぼかします。夢・気絶・酔いの演出に。','柔和地模糊整个画面。用于梦境、昏迷或醉酒效果。'),
  p:[{k:'amount',n:L('양','Amount','量','程度'),en:'amount',min:0,max:1,step:.01,def:.4,neu:0,tip:L('흐린 정도이다.','How blurry.','ぼかしの度合いです。','模糊程度。')}]},
 {k:'grain',n:L('노이즈 · 필름 그레인','Noise · Film Grain','ノイズ・フィルムグレイン','噪点 · 胶片颗粒'),en:'Film Grain',ic:'░',
  d:L('화면에 자글자글한 알갱이를 뿌린다. 「필름 그레인」은 은은하게, 「TV 지직」은 신호가 끊긴 TV처럼 덮는다.','Sprinkles grain over the screen. “Film grain” is subtle; “TV static” covers it like a TV with no signal.','画面にざらざらした粒をまきます。「フィルムグレイン」は控えめ、「テレビの砂嵐」は信号の切れたテレビのように覆います。','在画面上撒颗粒。“胶片颗粒”较柔和，“电视雪花”像没有信号的电视一样覆盖画面。'),
  p:[{k:'type',t:'enum',n:L('종류','Type','種類','类型'),en:'type',def:'grain',opts:[['grain',L('필름 그레인','Film grain','フィルムグレイン','胶片颗粒')],['static',L('TV 지직','TV static','テレビの砂嵐','电视雪花')]],tip:L('알갱이를 섞는 방식이다.','How the grain is mixed in.','粒の混ぜ方です。','颗粒的混合方式。')},
     {k:'intensity',n:L('강도','Intensity','強度','强度'),en:'intensity',min:0,max:1,step:.01,def:.4,neu:0,tip:L('알갱이의 세기이다.','Grain strength.','粒の強さです。','颗粒强度。')},
     {k:'size',n:L('크기(픽셀)','Size (px)','サイズ(px)','大小(像素)'),en:'size',min:1,max:6,step:.5,def:1,tip:L('알갱이 하나의 크기이다.','Size of one grain.','粒ひとつの大きさです。','单个颗粒的大小。')}]},
 {k:'lowres',n:L('저화질','Low Resolution','低画質','低画质'),en:'Low Resolution',ic:'▦',
  d:L('픽셀을 크게 키우고 색 수를 줄여 옛날 게임기 · 낡은 디지털카메라처럼 만든다.','Enlarges pixels and reduces colors, like an old console or cheap digital camera.','ピクセルを大きくし色数を減らして、昔のゲーム機・古いデジカメのようにします。','放大像素并减少颜色，像老游戏机或旧数码相机。'),
  p:[{k:'pixel',n:L('픽셀 크기','Pixel Size','ピクセルサイズ','像素大小'),en:'pixelSize',min:1,max:16,step:.5,def:3,neu:1,tip:L('화면을 몇 픽셀씩 묶어 한 칸으로 보일지이다. 1이면 원래 화질이다.','How many pixels merge into one block. 1 is the original quality.','何ピクセルをまとめて1マスに見せるかです。1で元の画質です。','多少像素合并为一块。1 为原始画质。')},
     {k:'colors',n:L('색 단계','Color Steps','色の段階','颜色级数'),en:'colorSteps',min:2,max:64,step:1,def:16,neu:64,tip:L('빨강 · 초록 · 파랑을 각각 몇 단계로 나눌지이다. 작을수록 포스터처럼 색이 뭉개진다. 64면 그대로이다.','How many levels each of red, green and blue gets. Lower looks posterized. 64 is unchanged.','赤・緑・青をそれぞれ何段階に分けるかです。小さいほどポスターのように色がつぶれます。64でそのままです。','红绿蓝各分为几级。越小越像海报。64 表示不变。')}]},
 {k:'crt',n:L('브라운관','CRT Screen','ブラウン管','显像管'),en:'CRT',ic:'▤',
  d:L('옛날 브라운관 TV처럼 가로줄(주사선) · 빨강초록파랑 격자 · 둥글게 휜 화면을 만든다.','Makes it look like an old tube TV: scanlines, an RGB mask and a curved screen.','昔のブラウン管テレビのように走査線・RGBの格子・丸く曲がった画面を作ります。','像老式显像管电视：扫描线、RGB 网格和弯曲屏幕。'),
  p:[{k:'scan',n:L('주사선','Scanlines','走査線','扫描线'),en:'scanlines',min:0,max:1,step:.01,def:.5,neu:0,tip:L('가로줄의 진하기이다.','How dark the horizontal lines are.','横線の濃さです。','横线的深浅。')},
     {k:'lines',n:L('줄 수','Line Count','ライン数','线数'),en:'lineCount',min:60,max:720,step:10,def:240,tip:L('화면 세로에 들어가는 주사선 수이다.','Number of scanlines over the screen height.','画面の縦に入る走査線の数です。','画面纵向的扫描线数量。')},
     {k:'mask',n:L('RGB 격자','RGB Mask','RGBマスク','RGB 网格'),en:'mask',min:0,max:1,step:.01,def:.3,neu:0,tip:L('가까이서 본 TV처럼 빨강 · 초록 · 파랑 세로줄이 보인다.','Shows red, green and blue stripes like a TV seen up close.','近くで見たテレビのように赤・緑・青の縦線が見えます。','像近看电视一样显示红绿蓝竖条。')},
     {k:'curve',n:L('화면 휨','Curvature','画面の湾曲','屏幕弯曲'),en:'curvature',min:0,max:1,step:.01,def:.4,neu:0,tip:L('볼록한 유리 화면처럼 가장자리가 휘고 모서리가 둥글어진다.','Bends the edges and rounds the corners like convex glass.','凸ガラスのように端が曲がり角が丸くなります。','像凸面玻璃一样边缘弯曲、角变圆。')},
     {k:'flicker',n:L('깜빡임','Flicker','ちらつき','闪烁'),en:'flicker',min:0,max:1,step:.01,def:.2,neu:0,tip:L('화면 밝기가 빠르게 미세하게 떨린다.','Brightness flickers quickly and slightly.','画面の明るさが速くわずかに揺れます。','亮度快速轻微抖动。')}]},
 {k:'vhs',n:L('VHS 테이프','VHS Tape','VHSテープ','VHS 录像带'),en:'VHS',ic:'▭',
  d:L('비디오테이프처럼 줄이 흔들리고 색이 번지고, 트래킹 노이즈 띠가 흘러간다. 아날로그 호러의 핵심 효과이다.','Wobbling lines, bleeding color and rolling tracking noise like a videotape. The core of analog horror.','ビデオテープのように線が揺れ色がにじみ、トラッキングノイズの帯が流れます。アナログホラーの要です。','像录像带一样线条晃动、颜色溢出、跟踪噪声带滚动。是模拟恐怖的核心效果。'),
  p:[{k:'wobble',n:L('줄 흔들림','Wobble','揺れ','晃动'),en:'wobble',min:0,max:1,step:.01,def:.4,neu:0,tip:L('가로줄마다 좌우로 흔들린다.','Each line jitters sideways.','横線ごとに左右に揺れます。','每行左右抖动。')},
     {k:'bleed',n:L('색 번짐','Color Bleed','色にじみ','色彩溢出'),en:'colorBleed',min:0,max:1,step:.01,def:.5,neu:0,tip:L('색이 오른쪽으로 번져 흐릿해진다 (밝기 윤곽은 유지).','Color smears to the right (brightness edges stay).','色が右ににじんでぼやけます（明るさの輪郭は残ります）。','颜色向右拖影（亮度轮廓保留）。')},
     {k:'track',n:L('트래킹 노이즈','Tracking Noise','トラッキングノイズ','跟踪噪声'),en:'tracking',min:0,max:1,step:.01,def:.4,neu:0,tip:L('지직거리는 띠가 화면을 위아래로 흐르고, 아래쪽 가장자리가 찢어진다.','A noisy band rolls over the screen and the bottom edge tears.','ざらついた帯が画面を流れ、下端が乱れます。','噪声带在画面上滚动，底部边缘撕裂。')},
     {k:'noise',n:L('테이프 노이즈','Tape Noise','テープノイズ','磁带噪声'),en:'noise',min:0,max:1,step:.01,def:.3,neu:0,tip:L('잔잔한 잡음과 가끔 번쩍이는 흰 줄인다.','Fine noise plus the occasional white streak.','細かな雑音と時々光る白い線です。','细小噪声和偶尔闪过的白线。')},
     {k:'osd',t:'bool',n:L('화면 글자 (OSD)','On-Screen Text','画面表示 (OSD)','屏幕文字 (OSD)'),en:'osd',def:true,neu:false,tip:L('비디오 재생기처럼 왼쪽 위에 글자, 왼쪽 아래에 시간을 띄운다.','Shows text at the top-left and a timecode at the bottom-left like a VCR.','ビデオデッキのように左上に文字、左下に時間を表示します。','像录像机一样在左上显示文字、左下显示时间。')},
     {k:'text',t:'text',n:L('글자','Text','文字','文字'),en:'osdText',def:'▶ PLAY',tip:L('왼쪽 위에 보일 글자이다. 예: ● REC, ▶ PLAY, 1998.10.31','Text shown at the top-left. e.g. ● REC, ▶ PLAY, 1998.10.31','左上に表示する文字です。例：● REC、▶ PLAY、1998.10.31','左上显示的文字。例如：● REC、▶ PLAY、1998.10.31')}]},
 {k:'glitch',n:L('글리치','Glitch','グリッチ','故障'),en:'Glitch',ic:'▚',
  d:L('화면이 가끔 덩어리째 옆으로 찢어지고 색이 뒤바뀐다. 신호 오류 · 저주 · 해킹 연출에 쓴다.','The screen sometimes tears sideways in blocks and colors swap. For signal errors, curses or hacking.','画面がときどきブロックごとに横へ裂け、色が入れ替わります。信号エラー・呪い・ハッキングの演出に。','画面偶尔成块地横向撕裂、颜色互换。用于信号错误、诅咒或黑客效果。'),
  p:[{k:'intensity',n:L('강도','Intensity','強度','强度'),en:'intensity',min:0,max:1,step:.01,def:.5,neu:0,tip:L('찢어지는 거리와 색 뒤틀림의 세기이다.','How far blocks tear and how strong the color warp is.','裂ける距離と色のゆがみの強さです。','撕裂距离和颜色扭曲的强度。')},
     {k:'freq',n:L('빈도','Frequency','頻度','频率'),en:'frequency',min:0,max:1,step:.01,def:.4,tip:L('얼마나 자주 일어나는지이다.','How often it happens.','どれくらい頻繁に起こるかです。','发生的频率。')},
     {k:'block',n:L('덩어리 크기','Block Size','ブロックの大きさ','块大小'),en:'blockSize',min:0,max:1,step:.01,def:.5,tip:L('클수록 두꺼운 띠로 찢어진다.','Larger tears in thicker bands.','大きいほど太い帯で裂けます。','越大撕裂的条带越粗。')}]},
 {k:'oldfilm',n:L('오래된 필름','Old Film','古いフィルム','老电影'),en:'Old Film',ic:'▣',
  d:L('누렇게 바랜 색, 긁힌 자국, 먼지, 깜빡이는 밝기, 덜컹이는 화면으로 오래된 영사기 필름을 흉내 낸다.','Imitates old projector film: faded sepia, scratches, dust, flickering brightness and a shaky frame.','色あせたセピア、傷、ほこり、明滅、がたつく画面で古い映写機のフィルムをまねます。','模仿老放映机胶片：泛黄、划痕、灰尘、亮度闪烁和画面抖动。'),
  p:[{k:'sepia',n:L('세피아','Sepia','セピア','怀旧色'),en:'sepia',min:0,max:1,step:.01,def:.8,neu:0,tip:L('누렇게 바랜 갈색 톤이다.','Faded brown tone.','色あせた茶色のトーンです。','泛黄的棕色调。')},
     {k:'scratch',n:L('긁힘','Scratches','傷','划痕'),en:'scratches',min:0,max:1,step:.01,def:.5,neu:0,tip:L('세로로 지나가는 긁힌 줄인다.','Vertical scratch lines.','縦に走る傷の線です。','竖向的划痕线。')},
     {k:'dust',n:L('먼지','Dust','ほこり','灰尘'),en:'dust',min:0,max:1,step:.01,def:.5,neu:0,tip:L('잠깐씩 나타나는 검은 점이다.','Black specks that pop in and out.','一瞬だけ現れる黒い点です。','时隐时现的黑点。')},
     {k:'flicker',n:L('깜빡임','Flicker','ちらつき','闪烁'),en:'flicker',min:0,max:1,step:.01,def:.4,neu:0,tip:L('영사기처럼 밝기가 들쑥날쑥하다.','Uneven brightness like a projector.','映写機のように明るさがばらつきます。','像放映机一样亮度忽明忽暗。')},
     {k:'jitter',n:L('덜컹임','Frame Jitter','がたつき','画面抖动'),en:'jitter',min:0,max:1,step:.01,def:.3,neu:0,tip:L('필름이 걸리듯 화면이 살짝 위아래로 튄다.','The frame hops slightly as if the film catches.','フィルムが引っかかるように画面が少し上下に跳ねます。','画面像胶片卡住一样轻微上下跳动。')}]}
];
const EBY=Object.fromEntries(EFFECTS.map(e=>[e.k,e]));

/* ===================== 프리셋 (프로필) ===================== */
const PRE=[
 {k:'warm',n:L('따뜻한 오후','Warm Afternoon','暖かい午後','温暖午后'),fx:{color:{temp:35,saturation:12,contrast:8,exposure:.1},bloom:{intensity:.6,threshold:.75,radius:3,tint:'#ffd9a0'},vignette:{intensity:.25,smooth:.5}}},
 {k:'cold',n:L('차가운 새벽','Cold Dawn','冷たい夜明け','寒冷黎明'),fx:{color:{temp:-40,saturation:-18,exposure:-.2,tint:6},vignette:{intensity:.3,smooth:.5,color:'#06101e'}}},
 {k:'dream',n:L('몽환','Dreamy','幻想','梦幻'),fx:{bloom:{intensity:1.4,threshold:.5,radius:5,tint:'#ffd6f5'},blur:{amount:.25},color:{saturation:10,temp:8,tint:30,exposure:.1,filter:'#fff0fa'},chroma:{intensity:.3},vignette:{intensity:.3,smooth:.6,color:'#2a1640'}}},
 {k:'noir',n:L('흑백 영화','Black & White Film','白黒映画','黑白电影'),fx:{color:{saturation:-100,contrast:25},grain:{intensity:.3},vignette:{intensity:.45,smooth:.5},oldfilm:{sepia:0,scratch:.3,dust:.3,flicker:.25,jitter:.1}}},
 {k:'oldfilm',n:L('오래된 필름','Old Film','古いフィルム','老电影'),fx:{oldfilm:{sepia:.85,scratch:.5,dust:.5,flicker:.4,jitter:.3},grain:{intensity:.35},vignette:{intensity:.5,smooth:.5,color:'#1a0f05'},blur:{amount:.1}}},
 {k:'retro',n:L('레트로 게임기 (CRT)','Retro Console (CRT)','レトロゲーム機 (CRT)','复古游戏机 (CRT)'),fx:{lowres:{pixel:3,colors:12},crt:{scan:.55,lines:240,mask:.35,curve:.45,flicker:.15},bloom:{intensity:.5,threshold:.6,radius:3},vignette:{intensity:.3,smooth:.5}}},
 {k:'vhs',n:L('VHS 테이프','VHS Tape','VHSテープ','VHS 录像带'),fx:{vhs:{wobble:.4,bleed:.6,track:.35,noise:.3,osd:true,text:'▶ PLAY'},color:{saturation:-20,contrast:10},chroma:{intensity:.35},grain:{intensity:.2},vignette:{intensity:.3,smooth:.5},lowres:{pixel:1.5,colors:64}}},
 {k:'horror',n:L('아날로그 호러','Analog Horror','アナログホラー','模拟恐怖'),fx:{color:{saturation:-60,contrast:20,exposure:-.35,temp:-15,filter:'#d8e6d0'},vhs:{wobble:.6,bleed:.7,track:.6,noise:.55,osd:true,text:'● REC'},glitch:{intensity:.35,freq:.3,block:.6},grain:{intensity:.45},chroma:{intensity:.5},lens:{intensity:.15},vignette:{intensity:.6,smooth:.5}}},
 {k:'convex',n:L('볼록 렌즈','Convex Lens','凸レンズ','凸透镜'),fx:{lens:{intensity:.7,scale:1.05},chroma:{intensity:.4},vignette:{intensity:.35,smooth:.5}}},
 {k:'static',n:L('TV 지직','TV Static','テレビの砂嵐','电视雪花'),fx:{grain:{type:'static',intensity:.45,size:1.5},vhs:{wobble:.3,track:.5,noise:.5,bleed:.3,osd:false},color:{saturation:-100},crt:{scan:.3,lines:240,curve:.25}}},
 {k:'nightmare',n:L('악몽','Nightmare','悪夢','噩梦'),fx:{color:{saturation:-40,contrast:30,exposure:-.3,filter:'#ff9a9a'},lens:{intensity:-.25},chroma:{intensity:.8},glitch:{intensity:.2,freq:.2,block:.5},vignette:{intensity:.7,smooth:.5,color:'#300000'},blur:{amount:.15}}}
];

/* ===================== 데이터 ===================== */
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const isHex=s=>typeof s==='string'&&/^#[0-9a-f]{6}$/i.test(s);
function newFx(k,vals){const E=EBY[k];if(!E)return null;const p={};E.p.forEach(q=>{p[q.k]=q.def});if(vals)Object.keys(vals).forEach(n=>{if(n in p)p[n]=vals[n]});return{k,on:true,p}}
function newVolume(mode){return{mode:mode==='local'?'local':'global',weight:1,priority:0,blend:1,fx:[]}}
function normParam(q,v){
  const t=q.t||'num';
  if(t==='color')return isHex(v)?v.toLowerCase():q.def;
  if(t==='bool')return typeof v==='boolean'?v:q.def;
  if(t==='enum')return q.opts.some(o=>o[0]===v)?v:q.def;
  if(t==='text')return typeof v==='string'?v.slice(0,40):q.def;
  v=+v;return isFinite(v)?clamp(v,q.min,q.max):q.def;
}
function norm(v){
  if(!v||typeof v!=='object')v={};
  const o={mode:v.mode==='local'?'local':'global',weight:isFinite(+v.weight)?clamp(+v.weight,0,1):1,priority:isFinite(+v.priority)?clamp(Math.round(+v.priority),-999,999):0,blend:isFinite(+v.blend)?clamp(+v.blend,0,50):1,fx:[]};
  if(v.on===false)o.on=false;
  (Array.isArray(v.fx)?v.fx:[]).forEach(f=>{const E=f&&EBY[f.k];if(!E||o.fx.some(x=>x.k===f.k))return;const p={};E.p.forEach(q=>{p[q.k]=normParam(q,f.p?f.p[q.k]:undefined)});const n={k:f.k,on:f.on!==false,p};if(f.fold)n.fold=true;o.fx.push(n)});
  return o;
}
function applyPreset(v,pk){const P=PRE.find(x=>x.k===pk);if(!P)return false;v.fx=Object.keys(P.fx).map(k=>newFx(k,P.fx[k]));return true}

/* ===================== 섞기 (Volume blending) =====================
   list = [{v, w}] (w = 무게 × 카메라 거리 비율). 우선순위가 낮은 것부터 섞어서, 높은 볼륨이 마지막에 덮습니다. */
const hex2=h=>[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255];
const rgb2hex=c=>'#'+c.map(x=>Math.round(clamp(x,0,1)*255).toString(16).padStart(2,'0')).join('');
function base(){const S={};EFFECTS.forEach(E=>{const o={};E.p.forEach(q=>{o[q.k]=q.neu!==undefined?q.neu:q.def});S[E.k]=o});return S}
function blend(list){
  const S=base();
  list.slice().sort((a,b)=>(a.v.priority||0)-(b.v.priority||0)).forEach(({v,w})=>{
    if(!(w>0))return;w=Math.min(1,w);
    v.fx.forEach(f=>{if(!f.on)return;const E=EBY[f.k];if(!E)return;const o=S[f.k];
      E.p.forEach(q=>{const t=q.t||'num',x=f.p[q.k];
        if(t==='num')o[q.k]=o[q.k]+(x-o[q.k])*w;
        else if(t==='color'){const a=hex2(o[q.k]),b=hex2(x);o[q.k]=rgb2hex(a.map((c,i)=>c+(b[i]-c)*w))}
        else if(w>=.5)o[q.k]=x;});
    });
  });
  return S;
}
/* 효과가 실제로 하는 일이 있는지 (neu가 있는 값이 하나라도 neu와 다르면) */
function activeOf(S){const r={};let any=false;EFFECTS.forEach(E=>{r[E.k]=E.p.some(q=>q.neu!==undefined&&(typeof q.neu==='number'?Math.abs(S[E.k][q.k]-q.neu)>1e-3:S[E.k][q.k]!==q.neu));if(r[E.k])any=true});r.any=any;return r}

/* ===================== WebGL 후처리 ===================== */
const VS='attribute vec2 a;varying vec2 vUv;void main(){vUv=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
const FS=`precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;uniform vec2 uReg,uRes,uPx;uniform float uT;
uniform float uExpo,uCon,uSat,uHue,uTemp,uTint;uniform vec3 uFilt;
uniform float uBloom,uBThr,uBRad;uniform vec3 uBTint;
uniform float uBlur,uVig,uVigS;uniform vec3 uVigC;
uniform float uCA,uLens,uLensS;uniform vec2 uLensC;
uniform float uGrain,uGrainS,uGrainM,uPix,uLev;
uniform float uScan,uScanN,uMask,uCurve,uFlick;
uniform float uWob,uBleed,uTrack,uVNoise;
uniform float uGlitch,uGFreq,uGBlock;
uniform float uSepia,uScratch,uDust,uOFlick,uJitter;
float h2(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float h1(float n){return h2(vec2(n,n*.618+3.7));}
vec3 S(vec2 s){if(s.x<0.||s.y<0.||s.x>1.||s.y>1.)return vec3(0.);return texture2D(uTex,vec2(s.x*uReg.x,1.-(1.-s.y)*uReg.y)).rgb;}
void main(){
  vec2 s=vUv;float asp=uRes.x/uRes.y;float t=uT;vec2 px=1./uRes;
  if(uJitter>0.){float f=floor(t*12.);s+=(vec2(h1(f),h1(f+7.))-.5)*vec2(.004,.014)*uJitter*step(.4,h1(f+3.));}
  if(uCurve>0.){vec2 c=s*2.-1.;c*=1.+c.yx*c.yx*.18*uCurve;s=c*.5+.5;}
  if(uLens!=0.||uLensS!=1.){vec2 c=vec2(uLensC.x,1.-uLensC.y);vec2 d=s-c;d.x*=asp;float r2=dot(d,d)/(.25*(asp*asp+1.));
    float f=uLens>=0.?1./(1.+.8*uLens*r2):1.-.6*uLens*r2;d*=f/uLensS;d.x/=asp;s=c+d;}
  float inb=step(0.,s.x)*step(s.x,1.)*step(0.,s.y)*step(s.y,1.);
  if(uCurve>0.){vec2 e=min(s,1.-s);inb*=smoothstep(0.,.012*uCurve,e.x)*smoothstep(0.,.012*uCurve,e.y);}
  float gOn=0.;
  if(uGlitch>0.){float tb=floor(t*(4.+uGFreq*20.));float rows=mix(40.,5.,uGBlock);float row=floor(s.y*rows);
    float burst=step(h1(tb*1.7+.3),.15+uGFreq*.6);gOn=step(h2(vec2(row,tb)),uGlitch*(.15+uGFreq*.5))*burst;
    s.x+=(h2(vec2(row*3.1,tb+1.))-.5)*.25*uGlitch*gOn;}
  float band=0.;
  if(uWob>0.||uTrack>0.){float yy=s.y*uRes.y;
    s.x+=sin(yy*.08+t*6.)*.0012*uWob+(h2(vec2(floor(yy*.5),floor(t*30.)))-.5)*.004*uWob;
    float bp=fract(t*.11+.3);band=smoothstep(.07,0.,abs(s.y-(1.-bp)))*uTrack;
    s.x+=(h2(vec2(floor(yy),floor(t*40.)))-.5)*.04*band;
    float bot=smoothstep(.045,0.,s.y)*uTrack;s.x+=(h2(vec2(floor(yy*.5),floor(t*20.)))*.05+.01)*bot;band=max(band,bot*.6);}
  if(uPix>1.){vec2 g=uRes/uPix;s=(floor(s*g)+.5)/g;}
  vec2 ca=(s-.5)*uCA*.03+vec2(gOn*.012*uGlitch,0.);
  vec3 col=S(s);
  if(dot(ca,ca)>0.)col=vec3(S(s+ca).r,col.g,S(s-ca).b);
  if(uBleed>0.){vec3 acc=vec3(0.);for(int i=0;i<6;i++){acc+=S(s-vec2((float(i)*2.5+2.)*px.x*uBleed,0.));}acc/=6.;
    float Y=dot(col,vec3(.299,.587,.114));float I=dot(acc,vec3(.596,-.274,-.322)),Q=dot(acc,vec3(.211,-.523,.312));
    vec3 bl=vec3(Y+.956*I+.621*Q,Y-.272*I-.647*Q,Y-1.106*I+1.703*Q);col=mix(col,bl,min(1.,uBleed*1.2));}
  if(uBlur>0.){vec3 acc=vec3(0.);float R=uBlur*5.;for(int i=0;i<12;i++){float a=float(i)*.5236;float rr=(mod(float(i),2.)<1.?1.:.5)*R;acc+=S(s+vec2(cos(a),sin(a))*rr*px);}
    col=mix(col,acc/12.,min(1.,uBlur*1.6));}
  if(uBloom>0.){vec3 acc=vec3(0.);for(int i=0;i<16;i++){float a=float(i)*.3927+.2;float rr=(i<8?1.:2.3)*uBRad;vec3 c=S(s+vec2(cos(a),sin(a))*rr*px);float l=max(c.r,max(c.g,c.b));acc+=c*max(l-uBThr,0.)/max(l,.001);}
    col+=acc/16.*uBloom*uBTint*1.6;}
  col*=exp2(uExpo);
  col*=vec3(1.+.18*uTemp+.06*uTint,1.-.12*uTint,1.-.18*uTemp+.06*uTint);
  col=(col-.5)*(1.+uCon)+.5;
  if(uHue!=0.){float Y=dot(col,vec3(.299,.587,.114));float I=dot(col,vec3(.596,-.274,-.322)),Q=dot(col,vec3(.211,-.523,.312));float cs=cos(uHue),sn=sin(uHue);float I2=I*cs-Q*sn,Q2=I*sn+Q*cs;
    col=vec3(Y+.956*I2+.621*Q2,Y-.272*I2-.647*Q2,Y-1.106*I2+1.703*Q2);}
  {float Y=dot(col,vec3(.299,.587,.114));col=mix(vec3(Y),col,1.+uSat);}
  col*=uFilt;col=max(col,0.);
  if(uLev<63.5){float n=max(uLev-1.,1.);col=floor(clamp(col,0.,1.)*n+.5)/n;}
  if(uSepia>0.){float Y=dot(col,vec3(.299,.587,.114));col=mix(col,vec3(Y*1.07+.04,Y*.86+.02,Y*.6),uSepia);}
  if(uOFlick>0.)col*=1.-uOFlick*.2*h1(floor(t*18.));
  if(uScratch>0.){float f=floor(t*10.);for(int i=0;i<3;i++){float fi=float(i);float on=step(h1(f*1.3+fi*5.1),uScratch*.75);float x=h1(f+fi*17.3);
    float d=abs(s.x-x-sin(s.y*7.+fi)*.003);col=mix(col,h1(fi*3.+f)>.4?vec3(.92,.88,.78):vec3(.12),on*smoothstep(.0012,0.,d)*.85);}}
  if(uDust>0.){vec2 g=vec2(asp,1.)*14.;vec2 cell=floor(s*g);float f=floor(t*12.);if(h2(cell+f*31.7)<uDust*.06){vec2 cp=(cell+vec2(h2(cell+f),h2(cell-f+.5)))/g;
    float d=length((s-cp)*vec2(asp,1.));float sz=.002+.004*h2(cell*.7+f);col=mix(col,vec3(.07),smoothstep(sz,sz*.4,d));}}
  if(gOn>0.)col=mix(col,col.brg,.55*uGlitch);
  if(band>0.){float n=h2(vec2(floor(s.x*uRes.x*.5),floor(s.y*uRes.y)+floor(t*60.)*7.));col=mix(col,vec3(n),band*.55);}
  if(uVNoise>0.){float yy=floor(s.y*uRes.y);float n=h2(vec2(floor(s.x*uRes.x),yy)+fract(t)*91.)-.5;col+=n*uVNoise*.18;
    float st=step(1.-uVNoise*.012,h2(vec2(yy,floor(t*30.))));col=mix(col,vec3(.88),st*h2(vec2(floor(s.x*uRes.x*.1),yy+floor(t*30.)))*.8);}
  if(uScan>0.){float l=.5+.5*cos(s.y*uScanN*6.2832);col*=1.-uScan*.55*l;}
  if(uMask>0.){float m=mod(gl_FragCoord.x,3.);vec3 mk=m<1.?vec3(1.,.45,.45):m<2.?vec3(.45,1.,.45):vec3(.45,.45,1.);col*=mix(vec3(1.),mk*1.3,uMask);}
  if(uFlick>0.)col*=1.-uFlick*.07*(.5+.5*sin(t*110.));
  if(uGrain>0.){vec2 gp=floor(gl_FragCoord.xy/max(uGrainS*uPx.x/uRes.x,1.));float n=h2(gp+fract(t*7.13)*vec2(113.,71.));
    if(uGrainM<.5){float Y=dot(col,vec3(.299,.587,.114));col+=(n-.5)*uGrain*.4*(1.-Y*.5);}else col=mix(col,vec3(n),uGrain*.8);}
  if(uVig>0.){vec2 d=(vUv-.5)*vec2(asp,1.)/(.5*sqrt(asp*asp+1.));float r=length(d);float st=1.-uVig*1.2;float v=smoothstep(st,st+max(uVigS,.02)+.05,r);col=mix(col,uVigC,v*min(1.,uVig*2.5));}
  gl_FragColor=vec4(clamp(col,0.,1.)*inb,1.);
}`;
const UN=['uTex','uReg','uRes','uPx','uT','uExpo','uCon','uSat','uHue','uTemp','uTint','uFilt','uBloom','uBThr','uBRad','uBTint','uBlur','uVig','uVigS','uVigC','uCA','uLens','uLensS','uLensC','uGrain','uGrainS','uGrainM','uPix','uLev','uScan','uScanN','uMask','uCurve','uFlick','uWob','uBleed','uTrack','uVNoise','uGlitch','uGFreq','uGBlock','uSepia','uScratch','uDust','uOFlick','uJitter'];
let G=null,failed=false;
function initGL(){
  if(G||failed)return G;
  try{
    const cv=document.createElement('canvas');cv.width=cv.height=2;
    const gl=cv.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:true});
    if(!gl)throw new Error('WebGL 없음');
    const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
    const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const a=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]].forEach(q=>gl.texParameteri(gl.TEXTURE_2D,q[0],q[1]));
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    const U={};UN.forEach(n=>U[n]=gl.getUniformLocation(pr,n));
    cv.addEventListener('webglcontextlost',e=>{e.preventDefault();G=null},false);
    G={cv,gl,U};
  }catch(e){failed=true;console.warn('[Volume] 후처리를 쓸 수 없습니다 (WebGL):',e&&e.message||e)}
  return G;
}
const ANIM=S=>S.grain.intensity>1e-3||S.vhs.wobble>1e-3||S.vhs.track>1e-3||S.vhs.noise>1e-3||S.glitch.intensity>1e-3||S.oldfilm.flicker>1e-3||S.oldfilm.scratch>1e-3||S.oldfilm.dust>1e-3||S.oldfilm.jitter>1e-3||S.crt.flicker>1e-3;
const T0=performance.now();
/* g: 대상 2D 컨텍스트 · S: blend() 결과 · W×H: 논리 화면 · d: 논리 → 캔버스 배율 · 돌려주는 값: 그렸는지 · 움직이는 효과인지 */
function render(g,S,W,H,d,time){
  const A=activeOf(S);if(!A.any)return{drawn:false,anim:false};
  const R=initGL();if(!R)return{drawn:false,anim:false};
  const {cv,gl,U}=R,src=g.canvas,Rw=Math.max(1,Math.min(src.width,Math.round(W*d))),Rh=Math.max(1,Math.min(src.height,Math.round(H*d)));
  if(cv.width!==Rw||cv.height!==Rh){cv.width=Rw;cv.height=Rh}
  gl.viewport(0,0,Rw,Rh);
  try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src)}catch(e){return{drawn:false,anim:false}}
  const t=((time!=null?time:(performance.now()-T0)/1000))%600;
  const f1=(n,v)=>gl.uniform1f(U[n],v),f3=(n,h)=>{const c=hex2(h);gl.uniform3f(U[n],c[0],c[1],c[2])};
  gl.uniform1i(U.uTex,0);gl.uniform2f(U.uReg,Rw/src.width,Rh/src.height);gl.uniform2f(U.uRes,W,H);gl.uniform2f(U.uPx,Rw,Rh);f1('uT',t);
  const C=S.color;f1('uExpo',A.color?C.exposure:0);f1('uCon',A.color?C.contrast/100:0);f1('uSat',A.color?C.saturation/100:0);f1('uHue',A.color?C.hue*Math.PI/180:0);f1('uTemp',A.color?C.temp/100:0);f1('uTint',A.color?C.tint/100:0);f3('uFilt',A.color?C.filter:'#ffffff');
  const B=S.bloom;f1('uBloom',A.bloom?B.intensity:0);f1('uBThr',Math.min(.98,B.threshold));f1('uBRad',B.radius);f3('uBTint',B.tint);
  f1('uBlur',A.blur?S.blur.amount:0);
  const V=S.vignette;f1('uVig',A.vignette?V.intensity:0);f1('uVigS',V.smooth);f3('uVigC',V.color);
  f1('uCA',A.chroma?S.chroma.intensity:0);
  const Ln=S.lens;f1('uLens',A.lens?Ln.intensity:0);f1('uLensS',A.lens?Ln.scale:1);gl.uniform2f(U.uLensC,Ln.cx,Ln.cy);
  const Gr=S.grain;f1('uGrain',A.grain?Gr.intensity:0);f1('uGrainS',Gr.size);f1('uGrainM',Gr.type==='static'?1:0);
  const Lo=S.lowres;f1('uPix',A.lowres?Math.max(1,Lo.pixel):1);f1('uLev',A.lowres?Lo.colors:64);
  const Cr=S.crt;f1('uScan',A.crt?Cr.scan:0);f1('uScanN',Cr.lines);f1('uMask',A.crt?Cr.mask:0);f1('uCurve',A.crt?Cr.curve:0);f1('uFlick',A.crt?Cr.flicker:0);
  const Vh=S.vhs;f1('uWob',A.vhs?Vh.wobble:0);f1('uBleed',A.vhs?Vh.bleed:0);f1('uTrack',A.vhs?Vh.track:0);f1('uVNoise',A.vhs?Vh.noise:0);
  const Gl=S.glitch;f1('uGlitch',A.glitch?Gl.intensity:0);f1('uGFreq',Gl.freq);f1('uGBlock',Gl.block);
  const O=S.oldfilm;f1('uSepia',A.oldfilm?O.sepia:0);f1('uScratch',A.oldfilm?O.scratch:0);f1('uDust',A.oldfilm?O.dust:0);f1('uOFlick',A.oldfilm?O.flicker:0);f1('uJitter',A.oldfilm?O.jitter:0);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.imageSmoothingEnabled=false;g.drawImage(cv,0,0,Rw,Rh);g.restore();
  /* VHS 화면 글자 (OSD) — 셰이더 뒤에 2D로 */
  if(Vh.osd&&A.vhs){
    const fs=Math.max(10,Math.round(H*.055)),j=Vh.wobble>0?(Math.random()-.5)*Vh.wobble*1.5:0;
    g.save();g.setTransform(d,0,0,d,0,0);g.font=`700 ${fs}px "VT323","Courier New",monospace`;g.textBaseline='top';g.textAlign='left';
    const sh=(txt,x,y)=>{g.fillStyle='rgba(0,0,0,.55)';g.fillText(txt,x+2,y+2);g.fillStyle='rgba(255,255,255,.92)';g.fillText(txt,x,y)};
    if(Vh.text)sh(Vh.text,fs*.9+j,fs*.8);
    const s=Math.floor(t),tc=`SP ${Math.floor(s/3600)}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    g.textBaseline='bottom';sh(tc,fs*.9+j,H-fs*.8);
    g.restore();
  }
  return{drawn:true,anim:ANIM(S)||(Vh.osd&&A.vhs)};
}

/* ===================== 스타일 (인스펙터 효과 카드) ===================== */
function css(){
  if(document.getElementById('volfx-css'))return;const st=document.createElement('style');st.id='volfx-css';
  st.textContent=`
.vfseg{display:flex;flex:1;border:1px solid var(--line2);border-radius:4px;overflow:hidden;height:22px}
.vfseg button{flex:1;border:0;background:var(--field);color:var(--mute);font-size:11.5px;padding:0 6px;cursor:pointer}
.vfseg button+button{border-left:1px solid var(--line2)}
.vfseg button.on{background:var(--accent);color:#16161a;font-weight:600}
.vfrow{display:flex;align-items:center;gap:6px;flex:1;min-width:0}
.vfrow input[type=range]{flex:1;min-width:40px;height:16px;margin:0;accent-color:var(--accent,#e9bd0c)}
.vfrow .num{flex:0 0 62px}
.vfwarn{margin:6px 0;padding:6px 8px;border-radius:4px;background:rgba(239,91,107,.12);border:1px solid rgba(239,91,107,.45);font-size:11.5px;line-height:1.45;display:flex;gap:6px;align-items:flex-start}
.vfwarn button{margin-left:auto;flex:none}
.vfhint{margin:6px 0 2px;font-size:11.5px;color:var(--mute);line-height:1.45}
.vfx{border:1px solid var(--line2);border-radius:5px;margin:7px 0;background:var(--field);overflow:hidden}
.vfx.off{opacity:.62}
.vfx .vfh{display:flex;align-items:center;gap:6px;height:26px;padding:0 4px 0 6px;background:var(--head);cursor:pointer;user-select:none}
.vfx .vfh .vfi{width:16px;text-align:center;color:var(--accent);font-size:12px}
.vfx .vfh b{flex:1;min-width:0;font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vfx .vfh small{color:var(--mute);font-weight:400;margin-left:4px}
.vfx .vfh .vfar{color:var(--mute);font-size:10px;width:12px;text-align:center}
.vfx .vfh button{border:0;background:none;color:var(--mute);width:20px;height:20px;border-radius:3px;cursor:pointer;font-size:12px;padding:0}
.vfx .vfh button:hover{background:rgba(128,128,128,.18);color:var(--fg)}
.vfx .vfh input[type=checkbox]{margin:0}
.vfx .vfb{padding:4px 8px 6px}
.vfx.vfz .vfb{display:none}
.vfx.vfz .vfh{border-bottom:0}
.vfx .vfd{font-size:11px;color:var(--mute);line-height:1.45;margin:2px 0 4px}
.vfadd{display:flex;gap:6px;margin-top:8px}
.vfadd .btn{flex:1}
.vfrp{flex:none;width:20px;height:20px;padding:0;border:0;border-radius:3px;background:none;color:var(--accent,#e9bd0c);cursor:pointer;font-size:13px;line-height:1}
.vfrp:hover{background:rgba(128,128,128,.18)}
.vfrp[hidden]{display:inline-block!important;visibility:hidden}
.vfx .vfh button[data-vfreset]{font-size:13px}
.vfadd select{flex:1;min-width:0;height:24px}
`;
  document.head.appendChild(st);
}
if(document.head)css();else document.addEventListener('DOMContentLoaded',css);
if(window.TI18N)TI18N.add(TR);

window.VOLFX={EFFECTS,EBY,PRESETS:PRE,newFx,newVolume,norm,normParam,applyPreset,blend,activeOf,render,css,hasGL:()=>!!initGL(),L,TR};
})();
