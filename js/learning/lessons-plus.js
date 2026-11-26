/* =====================================================================
   lessons-plus.js — 레슨 23 · 24 · 25 + 예제 3개 (learning.html이 본문 스크립트보다 먼저 불러옴)
   · 레슨 23 「2D 플랫포머: 리지드바디 2D · 점프 · 충돌」  — 엔진 실습장 (edit.html?learn=1)
   · 레슨 24 「생성과 기록: Instantiate · 코루틴 · PlayerPrefs」 — 엔진 실습장
   · 레슨 25 「비주얼 스크립트 심화: 상태 머신으로 경비병 AI」 — 엔진 실습장 · 비주얼 스크립트 창
   · 예제 platform · stars · vsguard 의 프로젝트도 여기서 만든다 (LP_EXAMPLES → examples.js 끝에서 THANIYA_EXAMPLES에 더함)
   확인(checks)은 learning.html의 enCode · enEv · enEvP · enO · EN 을 부를 때 씀 (그때는 이미 정의돼 있음).
   실습 프로젝트 형식은 레슨 13~16과 같다: 타일은 「에셋id:칸」 글자, 직접 그린 그림은 assets[].image(data URL).
   ===================================================================== */
/* ---- 이 레슨들에서 쓰는 그림 (32×32 픽셀 아트 · 구름은 64×32) ---- */
const LP_SPR={"ex_spikes":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAh0lEQVR4XmNgGAWjYBSMglEwCkYBGhARk/uPL1CoLc+Ez7IBAa8//MAbAtSWRwkBWPDiCmZayA94FIw6AA5A8btlz4n/oEQGotHTAa3kB18UnDxzgcHcxABnEUBt+cERAqD4XbBsFYqvQXzkfE8r+cERAgMJBjwEGKMS8vBWPrQGAx4CA+4AAI12edEy2FGlAAAAAElFTkSuQmCC","ex_flag":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA/UlEQVR4Xu2XPQrCQBBGV7ERLMVyvYNnECFXsBTPZekVAh7C0t4t1VKwNIww62D2Z3Z3JM2+MrvJ9/JNIIlSlYEZhfLnC/3G9cfNBPfmMo6duF/rzxaQoUJSTFIuZNqZ0s23FaC0mSSB6XKn7helXteD9aZCOTJJAhgMIohpy2SSBBDaAEcmNKosAYpLBo7B80LBUf2OqVjAJwPo5mmXfc+HqAA3lCImgHfru1MfRQKcimMkC0iEZo8AwlMrjsFuQDoYib6M/k0VqA3UBmoDgzfg/dbfblb2n4ByPJ1F/w+cDfjCgdBaDj0BTgBnD5eeAKdizh4uzhGEAiTDgQ7CQWZs+bGRggAAAABJRU5ErkJggg==","ex_star":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABAUlEQVR4Xu2WvQ3CMBCFA6JiCVahzghsADUlJSU1bMAYUaZIzxChNTqBnbNsJ88+RyiSv8qK7Pt5Z9+lqgoFIffDVklMrCWH/w5lr7paSVRYrgI6e9U3IhWWqYCVPSnQN8n3IJsCx8s+6Ulu+FNCbzM5C4HYOD3fK33eLDRkYMyBYXd2Y3jd3G+Mx7W1nBNOCSg62pgbn3PCUYArQWtIjRF0Mlx2TjCA6JJ4CGXNmXwFqSVBnHvvgI/YIFDncABzMlmCuYECgHvDj5iuCAUwJ+IApE3LmgUx2A2mzdK0vJjR29XmxyM0cOg7348MJliBqZZKDO32q0gWdFYpxhAFCoUPjHqZl0f9ME4AAAAASUVORK5CYII=","ex_cloud":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAA7ElEQVR4Xu2XzQ2DMAxGSSfopRt0iO5/6hDdgAsbpOKAhKok2PGXH9d+d3C+F9uIZXFsE3rEjzGuuTohhEePM2TrtyxeCv7LKBFNBHCCjxZxQ3eAJPyO9HkuUAGow6PeQwEmAH1o9PuaL8FeBz5ALU3IEuwd/oxUBGwERiGVX90B0sJoajuBLWC24NJxIAuYObhEAmkHaAlfA6kDtAqg7IVLAVrDU8eCNALaKV1iUcA/3P5BLouJDihhSkCqC0wJSOECSvNB+Y5qxztA+w1ySHW0KQG+BBOY74DLn6Gd92eLnFmbkdfzTsrqWOMLxDtbPsiAYE8AAAAASUVORK5CYII=","ex_key":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAArUlEQVR4Xu2UMQqAMAxFqzg6imPv44m9j6M4uisRPtTYWqUpFsnbKjX5+WlijKIoysdUsfxdbzf3zjJP0X/eEAyGxNPYnuLZYT3OUkK8Aig5T8whIRIi6jd25aDhQX3Vw3buCn8fT3Gduwi4s9oO59bE2uQDxYDyWsChKqly+h6aiBSyTQHeEqaFn8tuAb3SmO0SO4AITgESQAhIScwngBDd6y7ujkgRrSiK8n92zj5XudV0ETIAAAAASUVORK5CYII=","ex_guard":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABFElEQVR4XmNgGAUDDBjJtV9ETO4/ut43rx6RbB4LuQ4AgS1qcnDtPrcekWUUE1m6qAiIDjJsQU4IEBMlJEWBhpYRITvh4Ma1c0SpHfAoICkEiPUVKYDoNIAM8KUHYuIdGRDtAGRLnRou4fTkvgY9uBwxjiHoAJjF+CzFBWCOwecQvA4AWQ6zOMONH8WeGbs+4rQYHYAcgssROHMBPstBAN1B+ADIE7jSDVYHELIcBqjhCAwHIFtObYAtJAgWRPjimpR0gAugOACX77FZRK7l6KFAdEkIshA5j2PLloTksQGCUUBrMOqAAQ8BjKI4bNoHjMYmtcGqLAG4vQMeAqMOGA0BjFyAq96mJkBunGA4gBhAzUYpABisY9EDMJI3AAAAAElFTkSuQmCC","ex_gem":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABCUlEQVR4Xu2XQQrCQAxFR88ggpseRDyHCw/ooucQD9KFgrh1rUQIjHFm8pO04qIPRKS2/+fP79CmNDMTpH9cnpFLLCMnr9bdW5y/fwqJ0vT88ZpwJUBih3P/MTD99phYWGJjARLbbbqvU0/XIR23+3S/DfB14T/KqWsGCDJBIEYgA4g4QykwSBpqB0rrjYL0ommgJF6KPkce10xUDUQml7RMVA1QgbhMUVpdUDsgyUtWQjsuaRoYIwXtTjAnYEETJ1QDY6TQQjXAO1peyNo6WzchKIGpgRIopdACWXsGNoCasIiHlkD2wHr/uxLQUrBOH0pA4hF3G5h6b4DhB1PPs6C7A39H9MVk5gWeiKKY1dQCPwAAAABJRU5ErkJggg==","ex_coin":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABOklEQVR4Xu2WsQ4BQRCGjwgeQKUUhSg8imdQXOEJRHkd8QQKT6D0CGqVQhRypcoDOAUyl8xlsjc7N7uJINmvIWTv/2Z27YiiQODL1Hzy5+Pmy1y33D28ntVwEcDgZNZjlqW5lKuI2hrCF9t9lB0monOySp0kVAJm+Ol4K0kMR53iMxeJSgEunIYhIOUjIQpAON1vGtIaxEV4dt7k730k6tpDSB/ObQEAHTC/20zbpV8MxSpgVu8DdO9yfYpLVR0wWyvh2gWVwCcJAv/RAe5g2XA5sIC1AzBU4Erl4G5CDljf78pNVk9D7AKG4+1HsVUfr+/WG1fUM7sgbQV3DVdVD1QOI4CbCSbmIMJwqXq1ACdhg+57VbiTAErAK/ePCA+stnJEtQUUmG7cgKH7rancWwDhxqxLcCDwM7wBYjiiRfwiyIgAAAAASUVORK5CYII=","ex_door":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABAUlEQVR4XmNgGGDACLNfTkzoPz3d8ujVO7DdLMiW2mmI0cUNh268gtuD4gAQsFIRwOqIR68+MciJ8WHIkSp+7M4HFDMwHAACSnKYIYFNDJdaXOL3HiF8DgNYHYBNIak+xaUeHTBhiNAZjDoAIw08kgrAHglSDAyPsMmQKn5nAf5ccO7MKZqmAvT8NeBpACMKAqSe0bggQjV+8IUAJeDGiwso2m+8QHA1JAywGo21JKQE1BUpYGhv6nuA00iqOwAEAnLuwS3cMEUJr38GPA0MuANoEgWEgh0ZUN0B+BIcNkBVByBntSHTHhitDQdfNhxxteGAR8GoA1BCALnTSCuAbgcAZvdh6CXadx0AAAAASUVORK5CYII="};
const LP_ANAME={ex_spikes:'가시',ex_flag:'깃발',ex_star:'별똥별',ex_cloud:'구름',ex_key:'열쇠',ex_guard:'경비 슬라임',ex_gem:'보석',ex_coin:'동전',ex_door:'문'};
const lpA=(...ids)=>ids.map(id=>({id,name:LP_ANAME[id]||id,kind:'sprite',tileW:id==='ex_cloud'?64:32,tileH:32,image:LP_SPR[id]}));
/* 씬: l[0] 바닥 · l[1] 장식 · l[2] 벽(막힘) · col = 칸 충돌(1 막힘) · fn(x,y) → [바닥, 장식, 벽, 막힘?] */
function lpMap(id,name,W,H,bg,fn){
  const g=[],d=[],w=[],c=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const r=fn?fn(x,y)||[]:[];g.push(r[0]||0);d.push(r[1]||0);w.push(r[2]||0);c.push(r[3]?1:0)}
  return{id,name,w:W,h:H,ox:0,oy:0,theme:'기본',bg:bg||'',l:[g,d,w],lm:[{name:'바닥',wall:false},{name:'장식',wall:false},{name:'벽',wall:true}],dark:{on:false,color:'#05060d',level:.88},col:c,objs:[],groups:[],ui:[],uiGroups:[],uiCv:{w:640,h:360,mode:'expand',match:.5},camInit:true};
}
const lpObj=(id,type,name,x,y,props,more)=>Object.assign({id,type,name,x,y,props:props||{},group:null,parent:null},more||{});
const lpProj=(name,maps,extra)=>Object.assign({name,start:maps[0].id,maps,nextN:0,playerSprite:'',afolders:[],afmap:{},sfmap:{},mgrs:[],mgrInit:true,mgrV2:true,prefabs:[]},extra||{});
const lpGrass=(x,y)=>'base_grass:'+((x*7+y*5)%3);
/* 학습 화면 UI 요소 (점수판 등) */
const lpUi=(id,type,name,group,anchor,x,y,w,h,props)=>({id,type,name,anchor,x,y,w,h,l:0,r:0,t:0,b:0,props:props||{},group,visible:true,opacity:1,tag:''});
/* 코드 빈칸: 문제 번호 n이 k보다 크면 정답, 같으면 TODO 주석, 작으면 아직 안 보이는 자리(빈 줄) */
const lpBlank=(n,k,todo,ans)=>n>k?ans:n===k?todo:'';

/* ===================== 레슨 23 · 2D 플랫포머 (구름 정원) =====================
   옆에서 보는 맵(하늘색 배경) · 주인공(spawn)에 리지드바디 2D + PlatformHero 스크립트만 (위에서 보는 이동 스크립트는 넣지 않음)
   문제 n: 1 리지드바디 붙이기 · 2 걷기 · 3 점프 · 4 가시 · 떨어지면 처음 자리로 · 5 버섯 튕기기 · 6 = 완성(예제) */
function l23Code(n){
  const B=(k,todo,ans)=>lpBlank(n,k,todo,ans);
  return `using UnityEngine;

// 플랫포머 주인공: 리지드바디 2D의 속도(velocity)로 걷고, 땅에 있을 때만 점프한다.
// 좌표: 오른쪽이 +x, 아래쪽이 +y 이다. 그래서 위로 뛰려면 y 속도를 음수(-)로 준다.
public class PlatformHero : MonoBehaviour
{
    [Header("이동")]
    public float moveSpeed = 5f;
    public float jumpPower = 12f;

    [Header("버섯 · 떨어짐")]
    public float bouncePower = 18f;
    public float fallY = 15f;

    Rigidbody2D rb;
    Animator animator;
    Vector2 startPos;
    bool landed = false;

    void Start()
    {
        rb = GetComponent<Rigidbody2D>();
        animator = GetComponent<Animator>();
        startPos = transform.position;
    }

    void Update()
    {
        if (rb == null)
            return;   // 리지드바디 2D가 아직 없어요

        float x = Input.GetAxisRaw("Horizontal");   // ← -1 · → +1
${B(2,`        // TODO ① 가로 속도만 바꾸고, 세로 속도(rb.velocity.y)는 그대로 둔다
`,`        rb.velocity = new Vector2(x * moveSpeed, rb.velocity.y);
`)}        Animate(x);
${B(3,`
        // TODO ② 발밑 0.6칸 안에 땅이 있으면(Raycast) Space로 점프 · 위쪽은 -y
`,`
        bool grounded = Physics2D.Raycast(transform.position, Vector2.down, 0.6f);
        if (grounded && Input.GetKeyDown(KeyCode.Space))
        {
            rb.velocity = new Vector2(rb.velocity.x, -jumpPower);
            Debug.Log("점프!");
        }
`)}${B(4,`
        // TODO ③-2 fallY보다 아래로 떨어지면 처음 자리로 (Respawn)
`,`
        if (transform.position.y > fallY)
            Respawn();
`)}    }

    void OnCollisionEnter2D(Collision2D col)
    {
        if (!landed && col.gameObject.CompareTag("Ground"))
        {
            landed = true;
            Debug.Log("착지!");
        }
${B(5,`
        // TODO ④ 태그가 Bounce인 것(버섯)에 부딪히면 위로 튕겨 오르기
`,`
        if (col.gameObject.CompareTag("Bounce"))
        {
            rb.velocity = new Vector2(rb.velocity.x, -bouncePower);
            Debug.Log("뿅!");
        }
`)}    }
${n>=4?`
    void OnTriggerEnter2D(Collider2D other)
    {
${B(4,`        // TODO ③-1 태그가 Trap인 것(가시)에 닿으면 처음 자리로 (Respawn)
`,`        if (other.CompareTag("Trap"))
            Respawn();
`)}    }

    void Respawn()
    {
${B(4,`        // TODO ③-3 처음 자리로 옮기고, 속도를 0으로, 콘솔에 「처음 자리로!」
`,`        transform.position = startPos;
        rb.velocity = Vector2.zero;
        Debug.Log("처음 자리로!");
`)}    }
`:''}
    // 걷기 · 바라보기 그림: 애니메이터 파라미터만 바꾼다 (Dir 2 = 왼쪽, 3 = 오른쪽)
    void Animate(float x)
    {
        if (animator == null)
            return;
        animator.SetBool("IsMoving", x != 0);
        if (x != 0)
            animator.SetInteger("Dir", x < 0 ? 2 : 3);
    }
}
`;
}
const L23_GOAL=`using UnityEngine;

// 깃발: 주인공(태그 Player)이 닿으면 한 번만 「깃발 도착!」
public class Goal : MonoBehaviour
{
    bool reached = false;

    void OnTriggerEnter2D(Collider2D other)
    {
        if (reached || !other.CompareTag("Player"))
            return;
        reached = true;
        Debug.Log("깃발 도착!");
        Message.Show("깃발 도착!", 2f);
    }
}
`;
const L23_COIN=`using UnityEngine;

// 동전: 주인공이 닿으면 점수판을 올리고 사라진다
public class SkyCoin : MonoBehaviour
{
    static int count = 0;

    void OnTriggerEnter2D(Collider2D other)
    {
        if (!other.CompareTag("Player"))
            return;
        count++;
        UIScreen.SetText("점수판", "동전", "동전 " + count);
        Destroy(gameObject);
    }
}
`;
/* 구름 정원 (36 × 14): 땅 10~13줄 · 구덩이 15~16 · 발판 A(7~9, 8줄) · B(11~13, 6줄) · 가시(18) · 버섯(21) · 높은 발판 C(22~26, 4줄) */
const L23_SOLID=(x,y)=>{
  if(x===0||x===35)return true;
  if(y>=10&&!(x>=15&&x<=16))return true;
  if(y===8&&x>=7&&x<=9)return true;
  if(y===6&&x>=11&&x<=13)return true;
  if(y===4&&x>=22&&x<=27)return true;
  if(y===8&&x>=29&&x<=31)return true;
  return false;
};
function labPlat(n){
  const m=lpMap('sky','구름 정원',36,14,'#8fd0f5',(x,y)=>{
    if(!L23_SOLID(x,y))return null;
    const top=!L23_SOLID(x,y-1)&&x!==0&&x!==35;
    if(x===0||x===35)return['base_stone_wall:0',0,0,1];
    if(y<10)return[top?lpGrass(x,y):'base_wood_floor:0',0,0,1];
    return[top?lpGrass(x,y):'base_dirt:'+((x+y)%2),0,0,1];
  });
  const rb={type:'dynamic',grav:2.5,mass:1,drag:0,adrag:.05,frot:true,fzx:false,fzy:false,bounce:0};
  const hp={start:true};if(n>=2||n===0)hp.rb=rb;
  m.objs=[
    lpObj('hero','spawn','주인공',3,n===1?4:9,hp,{scripts:[{id:'phs',sid:'sc_plat',vals:{}}]}),
    lpObj('cam','empty','카메라',3,9,{camera:{start:true,size:5,clamp:true,smooth:true,smoothTime:.2}},{parent:'hero'}),
    lpObj('cl1','empty','구름',6,2,{sprite:'ex_cloud',sx:2,sy:2}),lpObj('cl2','empty','구름 2',17,1,{sprite:'ex_cloud',sx:2,sy:2}),lpObj('cl3','empty','구름 3',30,2,{sprite:'ex_cloud',sx:2,sy:2})
  ];
  if(n>=4||n===0)m.objs.push(lpObj('spk','empty','가시',18,9,{sprite:'ex_spikes',box:{trigger:true,w:.9,h:.45,ox:0,oy:.25}},{tag:'Trap'}));
  if(n>=5||n===0)m.objs.push(lpObj('msh','empty','버섯',21,9,{sprite:'base_mushroom',box:{trigger:false,w:.8,h:.5,ox:0,oy:.25}},{tag:'Bounce'}));
  const fl={2:[6,9],3:[12,5],4:[20,9],5:[25,3],6:[30,7],0:[30,7]}[n];
  if(fl)m.objs.push(lpObj('flag','empty','깃발',fl[0],fl[1],{sprite:'ex_flag',box:{trigger:true,w:.8,h:1,ox:0,oy:0}},{scripts:[{id:'gls',sid:'sc_goal',vals:{}}]}));
  const scripts=[{id:'sc_plat',name:'PlatformHero',code:l23Code(n||6)},{id:'sc_goal',name:'Goal',code:L23_GOAL}];
  const extra={scripts,heroInit:true,heroTileInit:true,roleInit:true,heroScripts:{},roleIds:{},assets:lpA('ex_spikes','ex_flag','ex_cloud','ex_coin')};
  return lpProj('구름 정원 실습',[m],extra);
}
/* 예제 「구름 정원 플랫포머」: 완성 코드 + 동전 7개 + 점수판 */
function exPlatform(){
  const p=labPlat(0),m=p.maps[0];p.name='구름 정원 플랫포머';
  [[8,7],[12,5],[13,5],[19,7],[24,3],[26,3],[30,7]].forEach(([x,y],i)=>m.objs.push(lpObj('cn'+i,'empty','동전'+(i?' '+(i+1):''),x,y,{sprite:'ex_coin',box:{trigger:true,w:.7,h:.7,ox:0,oy:0}},{scripts:[{id:'cns'+i,sid:'sc_coin',vals:{}}]})));
  p.scripts.push({id:'sc_coin',name:'SkyCoin',code:L23_COIN});
  m.uiGroups=[{id:'ug_sc',name:'점수판'}];
  m.ui=[lpUi('u_bg','panel','배경','ug_sc','tl',12,10,140,36,{bg:'#0f2433',alpha:.75,radius:10,border:'#f6cd2a',bw:2,sprite:''}),
    lpUi('u_ic','image','동전 그림','ug_sc','tl',18,12,32,32,{sprite:'ex_coin'}),
    lpUi('u_tx','text','동전','ug_sc','tl',54,13,92,30,{text:'동전 0',color:'#ffe08a',size:16,align:'left',valign:'mid',shadow:true,bold:true}),
    lpUi('u_hint','text','안내','ug_sc','tr',-12,12,260,24,{text:'← → 걷기 · Space 점프',color:'#ffffff',size:12,align:'right',valign:'mid',shadow:true,bold:false})];
  return p;
}
const lpHero=()=>{try{return enObjs().find(o=>o.type==='spawn')||null}catch(e){return null}};
const lpCode=n=>{try{return enCode(n)}catch(e){return''}};
const lpHas=(n,re)=>re.test(lpCode(n));
const L23_HOW='<br><br><b>스크립트 여는 법</b>: 계층 구조에서 <b>주인공</b>을 고르고 인스펙터의 PlatformHero 칸에서 <b>스크립트 편집</b>(또는 프로젝트 창의 PlatformHero 더블클릭). <b>TODO</b> 주석 자리를 채우고 Ctrl+S로 저장해요.<br><b>조작</b>: 게임 화면을 한 번 누르고 ← → 로 걷기, Space로 점프.';
const L23={no:23,title:'2D 플랫포머: 리지드바디 2D · 점프 · 충돌',clear:'통과했어요. 레슨 23 완료! 리지드바디 2D의 중력으로 떨어지고, velocity로 걷고, Raycast로 땅을 확인해 점프하고, 트리거로 가시를 · 충돌로 버섯을 알아채는 옆에서 보는 게임을 처음부터 짰어요. 예제 「구름 정원 플랫포머」에는 동전 · 점수판까지 들어 있어요.',
 lead:'지금까지의 게임은 위에서 내려다보는 게임이었어요. 이번에는 옆에서 보는 플랫포머예요. 리지드바디 2D를 붙여 중력으로 떨어지게 하고, 속도(velocity)로 걷고, 땅에 서 있을 때만 점프하고, 가시와 버섯에 반응하는 주인공을 진짜 엔진에서 만들어요.'};
const L23P=[
{id:'pl-rb',task:true,en:{proj:()=>labPlat(1),sel:'hero'},title:'리지드바디 2D로 떨어지게 하기',
 desc:'<b>리지드바디 2D</b>(Rigidbody2D)는 오브젝트가 물리를 따르게 하는 컴포넌트예요. 붙이면 <b>중력</b>으로 떨어지고, 땅 · 벽 같은 콜라이더에 부딪혀 멈춰요. 지금 주인공은 하늘에 떠 있어요.<br><br>이 맵의 땅은 타일맵의 <b>콜라이더 칸</b>이라서, 부딪힌 상대의 이름은 <code>Tilemap</code>, 태그는 <code>Ground</code>로 와요. PlatformHero는 처음 땅에 닿으면 「착지!」를 찍도록 미리 짜 두었어요.<br><br>중력 배율 1은 1초에 9.81칸/초씩 빨라지는 보통 중력이에요. 게임은 조금 무거운 편이 손맛이 좋아서 <b>2.5</b>를 많이 써요.',
 goal:'주인공에 리지드바디 2D를 붙이고 중력 배율을 2.5로 바꾼 뒤, 플레이해서 땅에 떨어지는 것을 보세요.',
 checks:[
  {t:'계층 구조에서 <b>주인공</b>을 고르고 인스펙터 <b>컴포넌트 추가 › 리지드바디 2D</b>',ok:()=>{const h=lpHero();return!!(h&&h.props&&h.props.rb)}},
  {t:'몸 종류는 <b>움직임 (Dynamic)</b>, <b>중력 배율</b>은 <b>2.5</b>',ok:()=>{const h=lpHero(),r=h&&h.props&&h.props.rb;return!!r&&(r.type||'dynamic')==='dynamic'&&+r.grav>=2&&+r.grav<=3}},
  {t:'<b>▶ 플레이</b> → 주인공이 떨어져 땅에 서고 콘솔에 「착지!」',ok:()=>enEv('log:info:착지!')}],
 hint:'인스펙터 맨 아래 「컴포넌트 추가」 → 검색 칸에 「리지드바디」.\n중력 배율 칸의 G 글자를 좌우로 끌어도 값이 바뀌어요.\n\n플레이 중에 인스펙터에서 「속도 (실시간)」을 보면 떨어지는 동안 y 속도가 점점 커지는 게 보여요(아래쪽이 +y).'},
{id:'pl-walk',task:true,en:{proj:()=>labPlat(2),sel:'hero'},title:'velocity로 좌우 걷기',
 desc:'리지드바디가 붙은 오브젝트는 <code>transform.position</code>을 직접 바꾸지 말고 <b>속도</b>를 정해요. 그래야 물리가 벽 · 땅과의 충돌을 계산해 줘요.<pre>rb.velocity = new Vector2(x * moveSpeed, rb.velocity.y);</pre>가로 속도만 입력으로 정하고, 세로 속도는 <code>rb.velocity.y</code>를 그대로 넣어요. 여기에 0을 넣으면 떨어지던 속도가 매 프레임 지워져 <b>중력이 사라져요</b>.'+L23_HOW,
 goal:'Update()의 TODO ①을 채워 ← → 로 걷고, 오른쪽 깃발까지 가 보세요.',
 checks:[
  {t:'TODO ①: <code>rb.velocity = new Vector2(x * moveSpeed, rb.velocity.y);</code>',ok:()=>lpHas('PlatformHero',/rb\s*\.\s*velocity\s*=\s*new\s+Vector2\s*\(\s*x\s*\*\s*moveSpeed\s*,\s*rb\s*\.\s*velocity\s*\.\s*y\s*\)/)},
  {t:'<b>▶ 플레이</b> → 게임 화면을 누르고 → 로 걸어 <b>깃발</b>에 닿기 (콘솔 「깃발 도착!」)',ok:()=>enEv('log:info:깃발 도착!')}],
 hint:'void Update() 안, TODO ① 자리:\n\nrb.velocity = new Vector2(x * moveSpeed, rb.velocity.y);\n\nmoveSpeed는 인스펙터에서 바꿀 수 있는 public 변수예요. 8로 올리면 훨씬 빨라져요.'},
{id:'pl-jump',task:true,en:{proj:()=>labPlat(3),sel:'hero'},title:'땅에 있을 때만 점프 (Raycast)',
 desc:'아무 때나 점프하면 공중에서 계속 뛰어 하늘로 날아가요. 그래서 <b>발밑에 땅이 있는지</b> 먼저 확인해요. <code>Physics2D.Raycast(시작점, 방향, 거리)</code>는 그 방향으로 보이지 않는 선(광선)을 쏴서 처음 맞은 콜라이더를 알려 줘요. 맞은 게 있으면 참이에요.<br><br>주인공 몸 가운데에서 아래로 <b>0.6칸</b>만 쏘면 서 있을 때만 땅에 닿아요. 이 엔진은 <b>아래쪽이 +y</b>라서 위로 뛰려면 y 속도를 <code>-jumpPower</code>로 줘요.'+L23_HOW,
 goal:'TODO ②를 채워 Space로 점프하고, 발판을 밟고 올라가 높은 곳의 깃발에 닿으세요.',
 checks:[
  {t:'<code>bool grounded = Physics2D.Raycast(transform.position, Vector2.down, 0.6f);</code>',ok:()=>lpHas('PlatformHero',/Physics2D\s*\.\s*Raycast\s*\(\s*transform\s*\.\s*position\s*,\s*Vector2\s*\.\s*down\s*,\s*0?\.\d+f?\s*\)/)},
  {t:'<code>if (grounded &amp;&amp; Input.GetKeyDown(KeyCode.Space))</code> 일 때 <code>rb.velocity = new Vector2(rb.velocity.x, -jumpPower);</code> · 「점프!」',ok:()=>lpHas('PlatformHero',/grounded\s*&&\s*Input\s*\.\s*GetKeyDown\s*\(\s*KeyCode\s*\.\s*Space\s*\)|Input\s*\.\s*GetKeyDown\s*\(\s*KeyCode\s*\.\s*Space\s*\)\s*&&\s*grounded/)&&lpHas('PlatformHero',/-\s*jumpPower/)},
  {t:'<b>▶ 플레이</b> → Space로 점프 (콘솔 「점프!」)',ok:()=>enEv('log:info:점프!')},
  {t:'나무 발판 두 개를 밟고 올라가 <b>깃발</b>에 닿기',ok:()=>enEv('log:info:깃발 도착!')&&enEv('log:info:점프!')}],
 hint:'TODO ② 자리:\n\nbool grounded = Physics2D.Raycast(transform.position, Vector2.down, 0.6f);\nif (grounded && Input.GetKeyDown(KeyCode.Space))\n{\n    rb.velocity = new Vector2(rb.velocity.x, -jumpPower);\n    Debug.Log("점프!");\n}\n\n→ 키를 누른 채 Space를 누르면 앞으로 뛰어요.\n공중에서 Space를 눌러도 뛰지 않으면 성공이에요(땅 확인이 잘 된 거예요).'},
{id:'pl-trap',task:true,en:{proj:()=>labPlat(4),sel:'hero'},title:'가시 · 구덩이에 빠지면 처음 자리로',
 desc:'가시는 막는 것이 아니라 <b>닿았는지만</b> 알면 되니 박스 콜라이더의 <b>트리거</b>를 켜 두었고, 태그는 <code>Trap</code>이에요. 리지드바디가 트리거에 들어가면 <code>OnTriggerEnter2D(Collider2D other)</code>가 불려요. <code>other.CompareTag("Trap")</code>으로 무엇에 닿았는지 확인해요.<br><br>구덩이로 떨어지면 아무것에도 닿지 않으니, <b>y 위치가 fallY(15)보다 커지면</b>(아래로 떨어지면) 되살려요. 두 경우 모두 같은 일을 하니 <code>Respawn()</code> 메서드 하나로 모아요.'+L23_HOW,
 goal:'TODO ③을 채워 가시에 닿거나 구덩이에 떨어지면 처음 자리로 돌아오게 하고, 구덩이와 가시를 넘어 깃발에 닿으세요.',
 checks:[
  {t:'③-1 OnTriggerEnter2D: <code>if (other.CompareTag("Trap")) Respawn();</code>',ok:()=>lpHas('PlatformHero',/CompareTag\s*\(\s*"Trap"\s*\)/)&&lpHas('PlatformHero',/OnTriggerEnter2D[\s\S]*Respawn\s*\(\s*\)/)},
  {t:'③-2 Update: <code>if (transform.position.y &gt; fallY) Respawn();</code>',ok:()=>lpHas('PlatformHero',/transform\s*\.\s*position\s*\.\s*y\s*>\s*fallY/)},
  {t:'③-3 Respawn(): <code>transform.position = startPos;</code> · <code>rb.velocity = Vector2.zero;</code> · 「처음 자리로!」',ok:()=>lpHas('PlatformHero',/transform\s*\.\s*position\s*=\s*startPos/)&&lpHas('PlatformHero',/rb\s*\.\s*velocity\s*=\s*Vector2\s*\.\s*zero/)},
  {t:'<b>▶ 플레이</b> → 가시에 닿거나 구덩이에 빠져 처음 자리로 돌아오기 (콘솔 「처음 자리로!」)',ok:()=>enEv('log:info:처음 자리로!')},
  {t:'구덩이와 가시를 뛰어넘어 <b>깃발</b>에 닿기',ok:()=>enEv('log:info:깃발 도착!')}],
 hint:'void OnTriggerEnter2D(Collider2D other) 안:\nif (other.CompareTag("Trap"))\n    Respawn();\n\nvoid Update() 아래쪽 TODO ③-2:\nif (transform.position.y > fallY)\n    Respawn();\n\nvoid Respawn() 안:\ntransform.position = startPos;\nrb.velocity = Vector2.zero;\nDebug.Log("처음 자리로!");\n\n속도를 0으로 하지 않으면 떨어지던 빠르기 그대로 다시 떨어져요.'},
{id:'pl-bounce',task:true,en:{proj:()=>labPlat(5),sel:'hero'},title:'밟으면 튕겨 오르는 버섯 (OnCollisionEnter2D)',
 desc:'버섯은 가시와 달리 <b>밟고 설 수 있어야</b> 하니 트리거를 끈 박스 콜라이더예요(태그 <code>Bounce</code>). 트리거가 아닌 콜라이더에 부딪히면 <code>OnCollisionEnter2D(Collision2D col)</code>가 불려요. 부딪힌 오브젝트는 <code>col.gameObject</code>예요.<br><br>버섯을 밟는 순간 위쪽 속도를 <code>-bouncePower</code>(18)로 주면, 보통 점프로는 못 가는 높은 구름 발판까지 날아올라요.'+L23_HOW,
 goal:'TODO ④를 채워 버섯을 밟으면 높이 튕겨 오르게 하고, 높은 발판 위 깃발에 닿으세요.',
 checks:[
  {t:'OnCollisionEnter2D: <code>if (col.gameObject.CompareTag("Bounce"))</code>',ok:()=>lpHas('PlatformHero',/col\s*\.\s*gameObject\s*\.\s*CompareTag\s*\(\s*"Bounce"\s*\)/)},
  {t:'<code>rb.velocity = new Vector2(rb.velocity.x, -bouncePower);</code> · 「뿅!」',ok:()=>lpHas('PlatformHero',/-\s*bouncePower/)},
  {t:'<b>▶ 플레이</b> → 버섯을 밟아 튕겨 오르기 (콘솔 「뿅!」)',ok:()=>enEv('log:info:뿅!')},
  {t:'튕겨 오르면서 → 를 눌러 높은 발판의 <b>깃발</b>에 닿기',ok:()=>enEv('log:info:깃발 도착!')&&enEv('log:info:뿅!')}],
 hint:'void OnCollisionEnter2D(Collision2D col) 안, TODO ④ 자리:\n\nif (col.gameObject.CompareTag("Bounce"))\n{\n    rb.velocity = new Vector2(rb.velocity.x, -bouncePower);\n    Debug.Log("뿅!");\n}\n\n트리거 → OnTriggerEnter2D(Collider2D other)\n충돌 → OnCollisionEnter2D(Collision2D col)\n인자의 종류가 달라요. 충돌은 col.gameObject로 상대 오브젝트를 꺼내요.'}
];

/* ===================== 레슨 24 · 생성과 기록 (별빛 광장) =====================
   위에서 보는 광장 · 기본 주인공(이동 · 체력) · 별 생성기(StarSpawner) · 프리팹 「별똥별」(FallingStar) · 「반짝 터짐」(파티클) · 게임 매니저(StarGame) · 점수판 UI
   문제 n: 1 Instantiate · 2 떨어지기 · Destroy · 파티클 · 3 맞으면 피해 · 흔들기 · 4 코루틴 · 5 PlayerPrefs · 6 = 완성(예제) */
function l24Spawner(n){
  const B=(k,todo,ans)=>lpBlank(n,k,todo,ans);
  return `using UnityEngine;
using System.Collections;

// 별 생성기: every초마다 별똥별 프리팹을 하늘(맨 위 줄)의 아무 곳에 만든다.
public class StarSpawner : MonoBehaviour
{
    public GameObject starPrefab;        // 프로젝트 창의 「별똥별」 프리팹
    public float every = 1.2f;           // 몇 초마다 만들지
    public float minX = 2f;
    public float maxX = 13f;

    StarGame game;
    float timer = 0f;

    void Start()
    {
        game = GameObject.Find("게임 매니저").GetComponent<StarGame>();
${B(4,`        // TODO ④ 코루틴 SpeedUp()을 시작한다
`,`        StartCoroutine(SpeedUp());
`)}    }

    void Update()
    {
        if (game.over)
            return;
        timer += Time.deltaTime;
        if (timer >= every)
        {
            timer = 0f;
${B(1,`            // TODO ① 가로 minX ~ maxX 중 아무 곳, 세로 1 위치에 starPrefab을 만들고 「별 생성」
`,`            Vector2 pos = new Vector2(Random.Range(minX, maxX), 1f);
            Instantiate(starPrefab, pos, Quaternion.identity);
            Debug.Log("별 생성");
`)}        }
    }
${n>=4?`
    // 5초마다 별이 더 자주 떨어지게 (코루틴: 기다렸다가 이어서 하기)
    IEnumerator SpeedUp()
    {
${B(4,`        // TODO ④ 끝날 때까지(while) 5초 기다렸다가 every를 0.75배로 · 「더 빨라져요!」
`,`        while (!game.over)
        {
            yield return new WaitForSeconds(5f);
            every = every * 0.75f;
            Debug.Log("더 빨라져요!");
        }
`)}    }
`:''}}
`;
}
function l24Star(n){
  const B=(k,todo,ans)=>lpBlank(n,k,todo,ans);
  return `using UnityEngine;

// 별똥별 (프리팹): 아래로 떨어지다가 땅에 닿으면 반짝 터지고 사라진다. 주인공에게 맞으면 피해를 준다.
// 좌표: 아래쪽이 +y 이다.
public class FallingStar : MonoBehaviour
{
    public float speed = 4f;
    public float groundY = 9.3f;
    public GameObject boomPrefab;        // 프로젝트 창의 「반짝 터짐」 프리팹 (파티클)

    StarGame game;

    void Start()
    {
        game = GameObject.Find("게임 매니저").GetComponent<StarGame>();
    }

    void Update()
    {
${B(2,`        // TODO ② 아래로 떨어지기 (y를 speed × 시간만큼 더하기)
        //        땅(groundY)보다 아래면: 반짝 터짐 만들기 → game.Dodge() → 나는 사라지기(Destroy)
`,`        transform.position += new Vector3(0, speed * Time.deltaTime, 0);
        if (transform.position.y > groundY)
        {
            Instantiate(boomPrefab, transform.position, Quaternion.identity);
            game.Dodge();
            Destroy(gameObject);
        }
`)}    }
${n>=3?`
    void OnTriggerEnter2D(Collider2D other)
    {
${B(3,`        // TODO ③ 주인공(태그 Player)에 닿으면: 체력 20 깎기 · 화면 흔들기 · game.Hit() · 사라지기
`,`        if (other.CompareTag("Player"))
        {
            Hero.main.TakeDamage(20);
            Camera.main.Shake(0.3f, 0.25f);
            game.Hit();
            Destroy(gameObject);
        }
`)}    }
`:''}}
`;
}
function l24Game(n){
  const B=(k,todo,ans)=>lpBlank(n,k,todo,ans);
  return `using UnityEngine;

// 게임 매니저: 남은 시간 · 피한 별 수를 점수판에 보여 주고, 시간이 끝나면 기록을 남긴다.
public class StarGame : MonoBehaviour
{
    public float roundTime = 20f;
    public bool over = false;

    int dodged = 0;
    int hits = 0;
    float left;

    void Start()
    {
        left = roundTime;
        int best = PlayerPrefs.GetInt("bestStars", 0);
        UIScreen.SetText("점수판", "최고", "최고 " + best);
    }

    void Update()
    {
        if (over)
            return;
        left -= Time.deltaTime;
        UIScreen.SetText("점수판", "시간", Mathf.CeilToInt(left) + "초");
        if (left <= 0)
            EndRound();
    }

    public void Dodge()
    {
        if (over)
            return;
        dodged++;
        UIScreen.SetText("점수판", "점수", "피한 별 " + dodged);
    }

    public void Hit()
    {
        hits++;
        Debug.Log("맞았다! " + hits + "번째");
    }

    void EndRound()
    {
        over = true;
        Debug.Log("끝! 피한 별 " + dodged);
${B(5,`        // TODO ⑤ PlayerPrefs의 "bestStars"보다 많이 피했으면 새 기록으로 저장하고 「새 기록!」
`,`        int best = PlayerPrefs.GetInt("bestStars", 0);
        if (dodged > best)
        {
            PlayerPrefs.SetInt("bestStars", dodged);
            UIScreen.SetText("점수판", "최고", "최고 " + dodged);
            Debug.Log("새 기록!");
            Message.Show("새 기록! 피한 별 " + dodged, 3f);
        }
        else
        {
            Debug.Log("최고 기록 그대로");
            Message.Show("피한 별 " + dodged + " · 최고 " + best, 3f);
        }
`)}    }
}
`;
}
function labStar(n){
  const W=16,H=11;
  const m=lpMap('plaza','별빛 광장',W,H,'#101527',(x,y)=>{
    if(x===0||x===W-1||y===0||y===H-1)return['base_stone_floor:0',0,'base_stone_wall:0',1];
    return[(x+y)%5===0?'base_stone_floor:0':'base_cobble:0'];
  });
  m.dark={on:true,color:'#0a0d1e',level:.35};
  m.objs=[
    lpObj('hero','spawn','주인공',8,8,{start:true}),
    lpObj('cam','empty','카메라',8,6,{camera:{start:true,size:5.5,clamp:true,smooth:false,smoothTime:.3}}),
    lpObj('spw','empty','별 생성기',8,1,{},{scripts:[{id:'sps',sid:'sc_spawn',vals:{starPrefab:'pf:pf_star'}}]}),
    lpObj('gm','empty','게임 매니저',1,1,{},{scripts:[{id:'gms',sid:'sc_game',vals:{}}]}),
    lpObj('t1','empty','횃불',3,9,{sprite:'base_torch',light:{color:'#ffb35c',radius:3,intensity:1}}),lpObj('t2','empty','횃불 2',12,9,{sprite:'base_torch',light:{color:'#ffb35c',radius:3,intensity:1}})
  ];
  const star={id:'pk_star',type:'empty',name:'별똥별',x:0,y:0,parent:null,props:{sprite:'ex_star',box:{trigger:true,w:.7,h:.7,ox:0,oy:0},light:{color:'#ffd65c',radius:1.6,intensity:.9}},tag:'Enemy',scripts:[{id:'fss',sid:'sc_star',vals:{boomPrefab:'pf:pf_boom'}}]};
  const boom={id:'pk_boom',type:'empty',name:'반짝 터짐',x:0,y:0,parent:null,props:{ps:{preset:'hit',loop:false,dur:.5,life:.6,speed:4.5,rand:.6,size0:.26,size1:0,col0:'#fff7c2',col1:'#ffb52e',a0:1,a1:0,grav:1.5,drag:2,rate:0,burst:26,shape:'point',radius:.1,dir:0,spread:360,look:'star',add:true,max:80,play:true,kill:true}}};
  m.uiGroups=[{id:'ug_sc',name:'점수판'}];
  m.ui=[lpUi('u_bg','panel','배경','ug_sc','tl',10,8,300,34,{bg:'#0b0f1f',alpha:.8,radius:10,border:'#f6cd2a',bw:2,sprite:''}),
    lpUi('u_t','text','시간','ug_sc','tl',18,10,60,30,{text:'20초',color:'#ffffff',size:15,align:'left',valign:'mid',shadow:true,bold:true}),
    lpUi('u_s','text','점수','ug_sc','tl',80,10,120,30,{text:'피한 별 0',color:'#ffe08a',size:15,align:'left',valign:'mid',shadow:true,bold:true}),
    lpUi('u_b','text','최고','ug_sc','tl',204,10,100,30,{text:'최고 0',color:'#8fd4ec',size:14,align:'left',valign:'mid',shadow:true,bold:false})];
  const scripts=[{id:'sc_spawn',name:'StarSpawner',code:l24Spawner(n||6)},{id:'sc_star',name:'FallingStar',code:l24Star(n||6)},{id:'sc_game',name:'StarGame',code:l24Game(n||6)}];
  return lpProj('별빛 광장 실습',[m],{scripts,prefabs:[{id:'pf_star',name:'별똥별',objs:[star]},{id:'pf_boom',name:'반짝 터짐',objs:[boom]}],assets:lpA('ex_star')});
}
function exStars(){const p=labStar(0);p.name='별똥별 피하기';return p}
const L24_HOW='<br><br><b>스크립트 여는 법</b>: 프로젝트 창의 스크립트 목록에서 더블클릭하거나, 오브젝트를 고르고 인스펙터의 스크립트 칸에서 <b>스크립트 편집</b>. <b>TODO</b> 자리를 채우고 Ctrl+S로 저장해요. 프리팹에 붙은 스크립트(FallingStar)는 프로젝트 창의 <b>별똥별</b> 프리팹을 고르면 보여요.';
const L24={no:24,title:'생성과 기록: Instantiate · 코루틴 · PlayerPrefs',clear:'통과했어요. 레슨 24 완료! 프리팹을 Instantiate로 찍어 내고, 스스로 떨어지다 Destroy되게 하고, 파티클로 터뜨리고, 맞으면 화면을 흔들고, 코루틴으로 점점 어렵게 만들고, PlayerPrefs로 최고 기록을 남겼어요. 예제 「별똥별 피하기」와 비교해 보세요.',
 lead:'게임은 플레이 도중에 오브젝트를 새로 만들고(총알 · 몬스터 · 아이템) 없애요. 하늘에서 별똥별이 쏟아지는 광장에서, 프리팹을 Instantiate로 찍어 내고 Destroy로 지우고, 파티클과 화면 흔들기로 손맛을 내고, 코루틴으로 난이도를 올리고, PlayerPrefs로 최고 기록을 저장해요.'};
const l24Seq=k=>{try{return EN.seq.filter(x=>x===k).length}catch(e){return 0}};
const L24P=[
{id:'st-spawn',task:true,en:{proj:()=>labStar(1),sel:'spw'},title:'프리팹을 Instantiate로 찍어 내기',
 desc:'<b>Instantiate(프리팹, 위치, 회전)</b>는 프리팹을 플레이 도중에 하나 복제해 씬에 놓아요. 만든 복제본의 이름 뒤에는 <code>(Clone)</code>이 붙어요.<br><br><b>별 생성기</b>의 StarSpawner에는 <code>public GameObject starPrefab</code> 칸이 있고, 인스펙터에서 프로젝트 창의 <b>별똥별</b> 프리팹을 넣어 두었어요. <code>Random.Range(최소, 최대)</code>로 가로 위치를 고르면 매번 다른 곳에서 떨어져요. 회전 없음은 <code>Quaternion.identity</code>예요.'+L24_HOW,
 goal:'StarSpawner의 TODO ①을 채워 1.2초마다 별똥별이 하늘에 생기게 하세요.',
 checks:[
  {t:'<code>Vector2 pos = new Vector2(Random.Range(minX, maxX), 1f);</code>',ok:()=>lpHas('StarSpawner',/Random\s*\.\s*Range\s*\(\s*minX\s*,\s*maxX\s*\)/)},
  {t:'<code>Instantiate(starPrefab, pos, Quaternion.identity);</code> · 「별 생성」',ok:()=>lpHas('StarSpawner',/Instantiate\s*\(\s*starPrefab\s*,/)},
  {t:'<b>▶ 플레이</b> → 별이 세 개 이상 생기기 (콘솔 「별 생성」, 계층 구조에 별똥별(Clone))',ok:()=>l24Seq('log:info:별 생성')>=3}],
 hint:'if (timer >= every) 안, TODO ① 자리:\n\nVector2 pos = new Vector2(Random.Range(minX, maxX), 1f);\nInstantiate(starPrefab, pos, Quaternion.identity);\nDebug.Log("별 생성");\n\n아직 별이 떨어지지는 않아요. 다음 문제에서 별 스스로 움직이게 만들어요.'},
{id:'st-fall',task:true,en:{proj:()=>labStar(2),sel:'spw'},title:'떨어지고 · 터지고 · 사라지기 (Destroy · 파티클)',
 desc:'별똥별 프리팹의 <b>FallingStar</b>가 매 프레임 자기 위치를 아래로 옮겨요. 이 엔진은 <b>아래쪽이 +y</b>예요. <code>speed * Time.deltaTime</code>을 더하면 1초에 speed칸씩 내려가요.<br><br>땅에 닿은 별은 <b>Destroy(gameObject)</b>로 지워요. 지우지 않으면 화면 밖에서 영원히 떨어지며 쌓여 게임이 느려져요. 사라지기 전에 <b>반짝 터짐</b> 프리팹(파티클 시스템 · 다 뿜으면 스스로 사라짐)을 그 자리에 만들어 손맛을 내요.'+L24_HOW,
 goal:'FallingStar의 TODO ②를 채워 별이 떨어지다 땅에서 반짝 터지고 사라지게 하세요.',
 checks:[
  {t:'프로젝트 창에서 <b>별똥별</b> 프리팹을 고르고 FallingStar 스크립트 열기 · <code>transform.position += new Vector3(0, speed * Time.deltaTime, 0);</code>',ok:()=>lpHas('FallingStar',/transform\s*\.\s*position\s*\+=\s*new\s+Vector3\s*\(\s*0f?\s*,\s*speed\s*\*\s*Time\s*\.\s*deltaTime/)},
  {t:'<code>if (transform.position.y &gt; groundY)</code> 이면 <code>Instantiate(boomPrefab, transform.position, Quaternion.identity);</code>',ok:()=>lpHas('FallingStar',/position\s*\.\s*y\s*>\s*groundY/)&&lpHas('FallingStar',/Instantiate\s*\(\s*boomPrefab/)},
  {t:'이어서 <code>game.Dodge();</code> · <code>Destroy(gameObject);</code>',ok:()=>lpHas('FallingStar',/game\s*\.\s*Dodge\s*\(\s*\)/)&&lpHas('FallingStar',/Destroy\s*\(\s*gameObject\s*\)/)},
  {t:'<b>▶ 플레이</b> → 별이 땅에서 반짝 터지고, 점수판 「피한 별」이 오르는 것 보기',ok:()=>l24Seq('log:info:별 생성')>=3&&lpHas('FallingStar',/Destroy\s*\(\s*gameObject\s*\)/)}],
 hint:'void Update() 안:\n\ntransform.position += new Vector3(0, speed * Time.deltaTime, 0);\nif (transform.position.y > groundY)\n{\n    Instantiate(boomPrefab, transform.position, Quaternion.identity);\n    game.Dodge();\n    Destroy(gameObject);\n}\n\n프리팹의 speed를 인스펙터에서 바꾸면 그 뒤로 만들어지는 모든 별이 함께 바뀌어요.'},
{id:'st-hit',task:true,en:{proj:()=>labStar(3),sel:'spw'},title:'맞으면 아프게 · 화면 흔들기',
 desc:'별똥별에는 <b>트리거</b> 박스 콜라이더가 있어요. 주인공(태그 <code>Player</code>)과 겹치면 별의 <code>OnTriggerEnter2D</code>가 불려요.<br><br><code>Hero.main.TakeDamage(20)</code>은 주인공 체력을 깎고 잠깐 무적이 돼요(왼쪽 위 체력 막대). <code>Camera.main.Shake(세기, 시간)</code>은 화면을 흔들어 맞았다는 느낌을 줘요. 맞은 별은 바로 사라져야 한 번만 아파요.'+L24_HOW,
 goal:'FallingStar의 TODO ③을 채워 별에 맞으면 체력이 깎이고 화면이 흔들리게 하세요. 방향키로 피해 보세요.',
 checks:[
  {t:'<code>if (other.CompareTag("Player"))</code> 안에서 <code>Hero.main.TakeDamage(20);</code>',ok:()=>lpHas('FallingStar',/CompareTag\s*\(\s*"Player"\s*\)/)&&lpHas('FallingStar',/Hero\s*\.\s*main\s*\.\s*TakeDamage\s*\(/)},
  {t:'<code>Camera.main.Shake(0.3f, 0.25f);</code> · <code>game.Hit();</code> · <code>Destroy(gameObject);</code>',ok:()=>lpHas('FallingStar',/Camera\s*\.\s*main\s*\.\s*Shake\s*\(/)&&lpHas('FallingStar',/game\s*\.\s*Hit\s*\(\s*\)/)},
  {t:'<b>▶ 플레이</b> → 별에 한 번 맞아 보기 (체력이 줄고 화면이 흔들려요)',ok:()=>enEvP(/^en:hero:hurt:/)&&enEvP(/^en:log:info:맞았다!/)}],
 hint:'void OnTriggerEnter2D(Collider2D other) 안:\n\nif (other.CompareTag("Player"))\n{\n    Hero.main.TakeDamage(20);\n    Camera.main.Shake(0.3f, 0.25f);\n    game.Hit();\n    Destroy(gameObject);\n}\n\n별 아래에 가만히 서 있으면 맞아요.'},
{id:'st-co',task:true,en:{proj:()=>labStar(4),sel:'spw'},title:'코루틴으로 점점 어렵게',
 desc:'<b>코루틴</b>은 「기다렸다가 이어서 하는」 메서드예요. <code>IEnumerator</code>로 만들고 <code>yield return new WaitForSeconds(5f);</code>를 만나면 거기서 5초 쉬었다가 다음 줄부터 이어 가요. 그동안 게임은 멈추지 않아요. <code>StartCoroutine(SpeedUp());</code>으로 시작해요.<br><br><code>while (!game.over)</code> 반복 안에서 5초마다 <code>every</code>를 0.75배로 줄이면 별이 점점 자주 떨어져요.'+L24_HOW,
 goal:'StarSpawner의 TODO ④ 두 곳을 채워 5초마다 「더 빨라져요!」와 함께 별이 더 자주 떨어지게 하세요.',
 checks:[
  {t:'Start(): <code>StartCoroutine(SpeedUp());</code>',ok:()=>lpHas('StarSpawner',/StartCoroutine\s*\(\s*SpeedUp\s*\(\s*\)\s*\)/)},
  {t:'SpeedUp(): <code>while (!game.over)</code> 안에 <code>yield return new WaitForSeconds(5f);</code>',ok:()=>lpHas('StarSpawner',/while\s*\(/)&&lpHas('StarSpawner',/yield\s+return\s+new\s+WaitForSeconds\s*\(\s*5/)},
  {t:'<code>every = every * 0.75f;</code> · 「더 빨라져요!」',ok:()=>lpHas('StarSpawner',/every\s*(\*=\s*0?\.\d+f?|=\s*every\s*\*\s*0?\.\d+f?)/)},
  {t:'<b>▶ 플레이</b> → 10초 넘게 버티며 「더 빨라져요!」 두 번 보기',ok:()=>l24Seq('log:info:더 빨라져요!')>=2}],
 hint:'void Start() 안 TODO ④:\nStartCoroutine(SpeedUp());\n\nIEnumerator SpeedUp() 안:\nwhile (!game.over)\n{\n    yield return new WaitForSeconds(5f);\n    every = every * 0.75f;\n    Debug.Log("더 빨라져요!");\n}\n\nwhile 안에 yield가 없으면 한 프레임 안에서 영원히 돌아 게임이 멈춰요. 코루틴의 반복에는 꼭 yield를 넣어요.'},
{id:'st-best',task:true,en:{proj:()=>labStar(5),sel:'gm'},title:'PlayerPrefs로 최고 기록 남기기',
 desc:'<b>PlayerPrefs</b>는 게임을 껐다 켜도 남는 작은 저장 공간이에요. <code>PlayerPrefs.GetInt("이름", 없을 때 값)</code>으로 읽고 <code>PlayerPrefs.SetInt("이름", 값)</code>으로 써요. 최고 점수 · 설정 · 진행 상황을 여기에 둬요.<br><br><b>게임 매니저</b>의 StarGame은 20초가 지나면 <code>EndRound()</code>를 불러요. 지금 기록(<code>dodged</code>)이 저장된 최고 기록보다 크면 새로 저장해요. 시작할 때 점수판 「최고」 칸은 이미 저장된 값을 읽어 보여 줘요.<br><br>저장된 값은 플레이 ▾ 메뉴의 「저장 데이터 지우기」로 지울 수 있어요.'+L24_HOW,
 goal:'StarGame의 TODO ⑤를 채워 20초 라운드가 끝나면 최고 기록을 저장하고, 다시 플레이해 점수판에 최고 기록이 남아 있는지 보세요.',
 checks:[
  {t:'<code>int best = PlayerPrefs.GetInt("bestStars", 0);</code>',ok:()=>(lpCode('StarGame').match(/PlayerPrefs\s*\.\s*GetInt\s*\(\s*"bestStars"/g)||[]).length>=2},
  {t:'<code>if (dodged &gt; best)</code> 이면 <code>PlayerPrefs.SetInt("bestStars", dodged);</code> · 「새 기록!」',ok:()=>lpHas('StarGame',/dodged\s*>\s*best/)&&lpHas('StarGame',/PlayerPrefs\s*\.\s*SetInt\s*\(\s*"bestStars"\s*,\s*dodged\s*\)/)},
  {t:'<b>▶ 플레이</b> → 20초 버텨 라운드 끝내기 (콘솔 「끝! …」 · 「새 기록!」 또는 「최고 기록 그대로」)',ok:()=>enEvP(/^en:log:info:끝! /)&&(enEv('log:info:새 기록!')||enEv('log:info:최고 기록 그대로'))}],
 hint:'void EndRound() 안 TODO ⑤:\n\nint best = PlayerPrefs.GetInt("bestStars", 0);\nif (dodged > best)\n{\n    PlayerPrefs.SetInt("bestStars", dodged);\n    UIScreen.SetText("점수판", "최고", "최고 " + dodged);\n    Debug.Log("새 기록!");\n    Message.Show("새 기록! 피한 별 " + dodged, 3f);\n}\nelse\n{\n    Debug.Log("최고 기록 그대로");\n    Message.Show("피한 별 " + dodged + " · 최고 " + best, 3f);\n}\n\nroundTime을 인스펙터에서 10으로 줄이면 확인이 빨라요.'}
];

/* ===================== 레슨 25 · 비주얼 스크립트 심화: 상태 머신 경비병 AI (숲속 보석 창고) =====================
   경비 슬라임에 상태 그래프 「경비 AI」: 순찰 ↔ 추격 → 잡음 → (끝나면) 순찰
   문제 n: 1 상태 머신 · 2 순찰(변수 · 계산 · 타이머) · 3 전환(거리) · 4 추격(C# 메서드 부르기) · 5 잡음(이벤트 · 상태 끝내기) · 6 = 완성 */
let LP_NID=0;const lpId=p=>(p||'n')+(++LP_NID).toString(36);
const vN=(t,x,y,v)=>({id:lpId('n'),t,x,y,v:v||{}});
const vL=(a,ap,b,bp)=>({id:lpId('l'),a:a.id,ap,b:b.id,bp});
const vFlow=(nodes,links)=>({id:lpId('g'),kind:'flow',nodes,links,vars:[]});
/* 상태 안의 기본 그래프 (진입 · 업데이트 · 나감) + 덧붙일 노드 */
function vStateG(build){const en=vN('ev.enter',60,60),up=vN('ev.update',60,220),ex=vN('ev.exit',60,380);const g=vFlow([en,up,ex],[]);if(build)build(g,en,up,ex);return g}
const vAdd=(g,...ns)=>{g.nodes.push(...ns);return ns[0]};
const vLink=(g,...ls)=>g.links.push(...ls);
/* 순찰 상태 (정답): 진입 → 방향 = 1 → Log 「순찰 중」 · 업데이트 → 이동(방향 × 델타 시간 × 1.5) · 타이머 2초 → 방향 = 방향 × -1 */
function vPatrol(g,en,up){
  const set1=vAdd(g,vN('var.set',300,60,{scope:'object',name:'방향',value:1})),lg=vAdd(g,vN('log',540,60,{msg:'순찰 중'}));
  vLink(g,vL(en,'out',set1,'in'),vL(set1,'out',lg,'in'));
  const vg=vAdd(g,vN('var.get',60,330,{scope:'object',name:'방향'})),dt=vAdd(g,vN('time',60,420,{k:'dt'}));
  const m1=vAdd(g,vN('math',260,360,{op:'*',a:0,b:1})),m2=vAdd(g,vN('math',440,380,{op:'*',a:0,b:1.5})),mv=vAdd(g,vN('move',640,220,{to:'self',tname:'',dx:1,dy:0}));
  vLink(g,vL(up,'out',mv,'in'),vL(vg,'value',m1,'a'),vL(dt,'r',m1,'b'),vL(m1,'r',m2,'a'),vL(m2,'r',mv,'dx'));
  const tm=vAdd(g,vN('ev.timer',60,520,{sec:2})),vg2=vAdd(g,vN('var.get',60,610,{scope:'object',name:'방향'})),m3=vAdd(g,vN('math',260,600,{op:'*',a:0,b:-1})),set2=vAdd(g,vN('var.set',460,540,{scope:'object',name:'방향',value:0}));
  vLink(g,vL(tm,'out',set2,'in'),vL(vg2,'value',m3,'a'),vL(m3,'r',set2,'value'));
}
function vChaseEnter(g,en){const lg=vAdd(g,vN('log',300,60,{msg:'들켰다!'})),ms=vAdd(g,vN('msg',520,60,{text:'들켰다!',sec:1.2}));vLink(g,vL(en,'out',lg,'in'),vL(lg,'out',ms,'in'))}
function vChaseUpdate(g,up){const cs=vAdd(g,vN('cs',300,220,{method:'Chase',to:'self',tname:''}));vLink(g,vL(up,'out',cs,'in'))}
function vCatch(g,en){
  const lg=vAdd(g,vN('log',280,60,{msg:'잡았다!'})),tr=vAdd(g,vN('trig',500,60,{name:'잡혔다',to:'all',tname:'',arg:''})),w=vAdd(g,vN('wait',720,60,{sec:1})),dn=vAdd(g,vN('st.done',920,60));
  vLink(g,vL(en,'out',lg,'in'),vL(lg,'out',tr,'in'),vL(tr,'out',w,'in'),vL(w,'out',dn,'in'));
}
/* 문제 n의 처음 그래프 (앞 문제까지 정답) — n=1이면 없음 */
function vGuardGraph(n){
  if(n<2)return null;
  const sP={id:'st_patrol',name:'순찰',x:120,y:160,kind:'flow',g:vStateG((g,en,up)=>{if(n>2)vPatrol(g,en,up)})};
  const sC={id:'st_chase',name:'추격',x:460,y:160,kind:'flow',g:vStateG((g,en,up)=>{if(n>3)vChaseEnter(g,en);if(n>4)vChaseUpdate(g,up)})};
  const states=[sP,sC],trans=[];
  if(n>3)trans.push({id:'tr_pc',a:'st_patrol',b:'st_chase',c:{t:'dist',to:'hero',tname:'',op:'<',val:3}},{id:'tr_cp',a:'st_chase',b:'st_patrol',c:{t:'dist',to:'hero',tname:'',op:'>',val:5}});
  if(n>5){states.push({id:'st_catch',name:'잡음',x:460,y:380,kind:'flow',g:vStateG((g,en)=>vCatch(g,en))});
    trans.push({id:'tr_cc',a:'st_chase',b:'st_catch',c:{t:'dist',to:'hero',tname:'',op:'<',val:.8}},{id:'tr_cr',a:'st_catch',b:'st_patrol',c:{t:'done'}})}
  return{id:'vg_guard',name:'경비 AI',kind:'state',states,trans,start:'st_patrol',vars:[]};
}
/* 보석: 주인공이 칸에 들어오면 한 번 알림 · 게임 매니저: 「잡혔다」를 받으면 알림 */
function vGemGraph(){const g=vFlow([],[]);g.id='vg_gem';g.name='보석 스크립트';
  const e=vAdd(g,vN('ev.msg',60,60,{msg:'OnHeroEnter'})),o=vAdd(g,vN('once',280,60)),lg=vAdd(g,vN('log',500,40,{msg:'보석을 찾았다!'})),ms=vAdd(g,vN('msg',720,40,{text:'보석을 찾았다! 경비를 따돌렸어요',sec:2.5})),off=vAdd(g,vN('active',940,40,{to:'self',tname:'',on:false}));
  vLink(g,vL(e,'out',o,'in'),vL(o,'first',lg,'in'),vL(lg,'out',ms,'in'),vL(ms,'out',off,'in'));return g}
function vMgrGraph(){const g=vFlow([],[]);g.id='vg_mgr';g.name='게임 매니저 스크립트';
  const e=vAdd(g,vN('ev.custom',60,60,{name:'잡혔다'})),c=vAdd(g,vN('var.add',300,60,{scope:'scene',name:'잡힌 횟수',amount:1})),cc=vAdd(g,vN('concat',300,200,{a:'잡혔다! 잡힌 횟수 ',b:''})),ms=vAdd(g,vN('msg',540,60,{text:'',sec:1.6}));
  vLink(g,vL(e,'out',c,'in'),vL(c,'out',ms,'in'),vL(c,'now',cc,'b'),vL(cc,'r',ms,'text'));return g}
const L25_GUARD_CS=`using UnityEngine;

// 경비 슬라임의 움직임 (C#) — 비주얼 스크립트 「C# 메서드 부르기」 노드가 이름(Chase)으로 부른다
public class GuardMove : MonoBehaviour
{
    public float chaseSpeed = 2.2f;

    // 주인공 쪽으로 한 프레임만큼 다가간다 (추격 상태의 업데이트에서 매 프레임 불림)
    public void Chase()
    {
        Vector2 target = Hero.main.position;
        transform.position = Vector2.MoveTowards(transform.position, target, chaseSpeed * Time.deltaTime);
    }
}
`;
function labGuard(n){
  const W=18,H=12;
  const m=lpMap('vault','숲속 보석 창고',W,H,'',(x,y)=>{
    const edge=x===0||x===W-1||y===0||y===H-1;
    if(edge)return[lpGrass(x,y),0,'base_stone_wall:0',1];
    if(x>=13&&x<=16&&y>=4&&y<=7)return['base_stone_floor:0'];
    if(y===6&&x>=2&&x<=12)return['base_dirt:'+(x%2)];
    return[lpGrass(x,y)];
  });
  m.groups=[{id:'gdeco',name:'숲 장식'}];
  const deco=(id,nm,s,x,y)=>lpObj(id,'empty',nm,x,y,{sprite:s},{group:'gdeco'});
  m.objs=[
    lpObj('hero','spawn','주인공',2,6,{start:true}),
    lpObj('guard','empty','경비 슬라임',10,6,{sprite:'ex_guard'},{scripts:[{id:'gms1',sid:'sc_guard',vals:{}}]}),
    lpObj('gem','empty','보석',15,6,{sprite:'ex_gem',light:{color:'#6ee7d0',radius:2.5,intensity:1}}),
    lpObj('mgr','empty','게임 매니저',1,1,{}),
    deco('d1','나무','base_tree',4,3),deco('d2','소나무','base_pine',7,9),deco('d3','나무 2','base_tree',12,2),deco('d4','덤불','base_bush',5,8),deco('d5','바위','base_rock',11,9),deco('d6','꽃','base_flowers',3,9),deco('d7','횃불','base_torch',13,4),deco('d8','횃불 2','base_torch',16,4)
  ];
  const G=vGuardGraph(n||6),gs=[vGemGraph(),vMgrGraph()];
  if(G){gs.unshift(G);m.objs[1].vs=[{id:'gvs1',gid:G.id,vals:{}}]}
  m.objs[2].vs=[{id:'gvs2',gid:'vg_gem',vals:{}}];m.objs[3].vs=[{id:'gvs3',gid:'vg_mgr',vals:{}}];
  return lpProj('숲속 보석 창고 실습',[m],{scripts:[{id:'sc_guard',name:'GuardMove',code:L25_GUARD_CS}],vgraphs:gs,assets:lpA('ex_guard','ex_gem')});
}
/* 예제 「슬라임 경비대」: 경비 셋이 같은 상태 그래프를 나눠 쓴다 · 보석 셋 · 다 모으면 문이 열림 (C#은 GuardMove 하나) */
function exGuard(){
  const p=labGuard(0),m=p.maps[0];p.name='슬라임 경비대 (비주얼 스크립트)';
  const g0=m.objs.find(o=>o.id==='guard');g0.x=9;g0.y=4;
  m.objs.push(lpObj('guard2','empty','경비 슬라임 2',6,9,{sprite:'ex_guard'},{scripts:[{id:'gms2',sid:'sc_guard',vals:{}}],vs:[{id:'gvs4',gid:'vg_guard',vals:{}}]}),
    lpObj('guard3','empty','경비 슬라임 3',12,7,{sprite:'ex_guard'},{scripts:[{id:'gms3',sid:'sc_guard',vals:{}}],vs:[{id:'gvs5',gid:'vg_guard',vals:{}}]}));
  /* 보석 셋: 같은 보석 그래프를 쓰고, 찾을 때마다 씬 변수 「보석」에 1을 더하고 「보석 찾음」을 보냄 */
  const gem=p.vgraphs.find(g=>g.id==='vg_gem');
  const add=vAdd(gem,vN('var.add',1160,40,{scope:'scene',name:'보석',amount:1})),tr=vAdd(gem,vN('trig',1380,40,{name:'보석 찾음',to:'all',tname:'',arg:''}));
  const last=gem.nodes.find(n=>n.t==='active');vLink(gem,vL(last,'out',add,'in'),vL(add,'out',tr,'in'));
  gem.nodes.find(n=>n.t==='msg').v.text='보석을 찾았다!';
  const gm=m.objs.find(o=>o.id==='gem');gm.x=15;gm.y=5;
  m.objs.push(lpObj('gem2','empty','보석 2',3,2,{sprite:'ex_gem',light:{color:'#6ee7d0',radius:2.5,intensity:1}},{vs:[{id:'gvs6',gid:'vg_gem',vals:{}}]}),
    lpObj('gem3','empty','보석 3',15,10,{sprite:'ex_gem',light:{color:'#6ee7d0',radius:2.5,intensity:1}},{vs:[{id:'gvs7',gid:'vg_gem',vals:{}}]}),
    lpObj('door','empty','출구 문',16,1,{sprite:'ex_door',box:{trigger:false,w:1,h:1,ox:0,oy:0}}));
  /* 게임 매니저: 보석 찾음 → 3개면 문 열기 (끄기) + 알림 · UI 점수판 */
  const mg=p.vgraphs.find(g=>g.id==='vg_mgr');
  const e2=vAdd(mg,vN('ev.custom',60,320,{name:'보석 찾음'})),vg=vAdd(mg,vN('var.get',60,440,{scope:'scene',name:'보석'})),cc=vAdd(mg,vN('concat',280,440,{a:'보석 ',b:''})),cc2=vAdd(mg,vN('concat',480,440,{a:'',b:' / 3'}));
  const ut=vAdd(mg,vN('ui.text',300,320,{screen:'점수판',el:'보석',text:''})),cmp=vAdd(mg,vN('cmp',520,540,{op:'>=',a:0,b:3})),iff=vAdd(mg,vN('if',720,320,{cond:true}));
  const door=vAdd(mg,vN('active',940,300,{to:'name',tname:'출구 문',on:false})),ms=vAdd(mg,vN('msg',1160,300,{text:'보석을 모두 모았다! 출구 문이 열렸어요',sec:3}));
  vLink(mg,vL(e2,'out',ut,'in'),vL(vg,'value',cc,'b'),vL(cc,'r',cc2,'a'),vL(cc2,'r',ut,'text'),vL(ut,'out',iff,'in'),vL(vg,'value',cmp,'a'),vL(cmp,'r',iff,'cond'),vL(iff,'yes',door,'in'),vL(door,'out',ms,'in'));
  m.uiGroups=[{id:'ug_sc',name:'점수판'}];
  m.ui=[lpUi('u_bg','panel','배경','ug_sc','tl',10,8,170,34,{bg:'#0f1a12',alpha:.8,radius:10,border:'#6ee7d0',bw:2,sprite:''}),
    lpUi('u_ic','image','보석 그림','ug_sc','tl',16,9,32,32,{sprite:'ex_gem'}),
    lpUi('u_t','text','보석','ug_sc','tl',52,10,124,30,{text:'보석 0 / 3',color:'#c9fff4',size:15,align:'left',valign:'mid',shadow:true,bold:true})];
  p.assets=lpA('ex_guard','ex_gem','ex_door');
  return p;
}
/* ---- 확인 도우미 (EN.P의 비주얼 스크립트) ---- */
const lpVG=id=>((EN.P&&EN.P.vgraphs)||[]).find(g=>g.id===id)||null;
function lpGuardSM(){const o=enO('경비 슬라임');if(!o||!Array.isArray(o.vs))return null;for(const v of o.vs){const g=lpVG(v.gid);if(g&&g.kind==='state')return g}return null}
const lpSt=(g,nm)=>g&&Array.isArray(g.states)?g.states.find(s=>enIs(s.name,nm))||null:null;
const lpSG=nm=>{const s=lpSt(lpGuardSM(),nm);return s&&s.g&&s.g.kind==='flow'?s.g:null};
const lpNs=(g,t,f)=>g&&Array.isArray(g.nodes)?g.nodes.filter(n=>n.t===t&&(!f||f(n))):[];
const lpSrc=(g,n,port)=>{const l=g.links.find(q=>q.b===n.id&&q.bp===port);return l?g.nodes.find(q=>q.id===l.a)||null:null};
function lpReach(g,from,pred){if(!g||!from)return false;const seen=new Set([from.id]),q=[from];while(q.length){const n=q.shift();for(const l of g.links){if(l.a!==n.id||seen.has(l.b))continue;const b=g.nodes.find(x=>x.id===l.b);if(!b)continue;if(pred(b))return true;seen.add(b.id);q.push(b)}}return false}
const lpTr=(g,a,b,f)=>{const A=lpSt(g,a),B=lpSt(g,b);return!!(A&&B&&g.trans.some(t=>t.a===A.id&&t.b===B.id&&(!f||f(t.c||{}))))};
const lpVarNm=n=>String((n.v||{}).name||'').trim();
const L25_HOW='<br><br><b>여는 법</b>: 계층 구조에서 <b>경비 슬라임</b>을 고르고 툴바의 <b>비주얼 스크립트</b>(또는 인스펙터의 「경비 AI」 칸 · 편집). 상태를 <b>더블클릭</b>하면 그 상태 안의 그래프로 들어가고, 왼쪽 위 ↑ 단추(또는 Backspace)로 바깥 상태 지도로 나와요.';
const L25={no:25,title:'비주얼 스크립트 심화: 상태 머신으로 경비병 AI',clear:'통과했어요. 레슨 25 완료! 상태 그래프로 순찰 · 추격 · 잡음을 나누고, 오브젝트 변수와 계산 노드로 왔다 갔다 하게 하고, 거리 조건으로 전환하고, C# 메서드 부르기로 움직임을 맡기고, 커스텀 이벤트와 상태 끝내기로 상태를 이어 붙였어요. 예제 「슬라임 경비대」는 경비 셋이 같은 그래프를 나눠 쓰고, 보석을 다 모으면 문이 열려요.',
 lead:'몬스터는 「지금 무엇을 하는 중인지」에 따라 다르게 움직여요. 레슨 11 · 12의 스크립트 그래프 하나로 모두 짜면 만약 · 만약이 끝없이 늘어나요. 이번에는 상태 그래프로 순찰 · 추격 · 잡음 상태를 나누고, 상태 사이를 조건 화살표(전환)로 잇는 경비병 AI를 진짜 엔진의 비주얼 스크립트 창에서 만들어요.'};
const L25P=[
{id:'vs-sm',task:true,en:{proj:()=>labGuard(1),sel:'guard'},title:'상태 그래프 만들기: 순찰 · 추격',
 desc:'<b>상태 그래프</b>(상태 머신)는 큰 지도예요. 네모 하나가 <b>상태</b>이고, 상태마다 안에 작은 스크립트 그래프가 들어 있어요. 한 번에 한 상태만 실행되고, 시작 상태(초록 표시)부터 시작해요.<br><br>경비 슬라임에 상태 그래프를 붙이고, 처음 생기는 상태 「대기」의 이름을 <b>순찰</b>로 바꾼 다음 <b>추격</b> 상태를 하나 더 만들어요. 상태 이름은 나중에 「상태 바꾸기」 노드와 로그에서 그대로 쓰여요.'+L25_HOW,
 goal:'경비 슬라임에 상태 그래프 「경비 AI」를 만들고 상태 순찰(시작) · 추격을 두세요.',
 checks:[
  {t:'경비 슬라임을 고르고 <b>비주얼 스크립트</b> 창 → <b>새 상태 머신 (상태 그래프)…</b> · 이름 <b>경비 AI</b>',ok:()=>{const g=lpGuardSM();return!!g&&enIs(g.name,'경비 AI')}},
  {t:'처음 상태 「대기」를 우클릭 › 이름 바꾸기 → <b>순찰</b> (시작 상태)',ok:()=>{const g=lpGuardSM(),s=lpSt(g,'순찰');return!!s&&g.start===s.id}},
  {t:'빈 곳을 우클릭 › <b>상태 추가</b> → 이름 <b>추격</b>',ok:()=>!!lpSt(lpGuardSM(),'추격')},
  {t:'<b>▶ 플레이</b> → 비주얼 스크립트 창에서 순찰 상태가 빛나는 것 보기',ok:()=>enEv('play')&&!!lpSt(lpGuardSM(),'추격')}],
 hint:'비주얼 스크립트 창 위쪽의 그래프 메뉴(또는 빈 창의 단추)에서 「새 상태 머신 (상태 그래프)…」를 고르면 지금 고른 오브젝트에 붙어요.\n상태 이름은 상태를 고르고 오른쪽 속성 칸에서도 바꿀 수 있어요.'},
{id:'vs-patrol',task:true,en:{proj:()=>labGuard(2),sel:'guard'},title:'순찰: 변수 · 계산 · 타이머로 왔다 갔다',
 desc:'순찰 상태를 더블클릭해 안으로 들어가요. 처음부터 <b>상태 진입 · 업데이트 · 상태 나감</b> 이벤트가 있어요.<br><br>① <b>상태 진입</b>: 오브젝트 변수 <b>방향</b>을 1로 정하고(변수 설정 · 범위 <b>오브젝트</b>) Debug.Log 「순찰 중」.<br>② <b>업데이트</b>: <b>이동하기</b>(자신)의 가로에 <code>방향 × 델타 시간 × 1.5</code>를 이어요. 계산 노드는 두 값만 곱하니 두 개를 이어 붙여요.<br>③ <b>타이머</b>(매 2초): 방향을 <code>방향 × -1</code>로 바꿔 돌아서게 해요.<br><br>변수 범위 「오브젝트」는 이 오브젝트의 모든 머신 · 모든 상태가 함께 쓰는 변수예요.'+L25_HOW,
 goal:'순찰 상태 안에 ①②③을 만들어 경비 슬라임이 2초마다 방향을 바꾸며 좌우로 걷게 하세요.',
 checks:[
  {t:'① 상태 진입 → <b>변수 설정</b>(오브젝트 · 방향 · 1) → <b>Debug.Log</b> 「순찰 중」',ok:()=>{const g=lpSG('순찰'),en=lpNs(g,'ev.enter')[0];return!!g&&lpReach(g,en,n=>n.t==='var.set'&&lpVarNm(n)==='방향'&&(n.v.scope||'graph')==='object')&&lpReach(g,en,n=>n.t==='log')}},
  {t:'② 업데이트 → <b>이동하기</b>(대상 자신)',ok:()=>{const g=lpSG('순찰'),up=lpNs(g,'ev.update')[0];return!!g&&lpReach(g,up,n=>n.t==='move')}},
  {t:'② 이동하기 <b>가로</b> ← 계산(×) ← <b>변수 가져오기</b>(방향) · <b>시간</b>(델타 시간)',ok:()=>{const g=lpSG('순찰');return lpNs(g,'move').some(mv=>{const s=lpSrc(g,mv,'dx');if(!s)return false;const seen=new Set(),q=[s];let vg=false,dt=false;while(q.length){const n=q.shift();if(seen.has(n.id))continue;seen.add(n.id);if(n.t==='var.get'&&lpVarNm(n)==='방향')vg=true;if(n.t==='time'&&(n.v.k||'dt')==='dt')dt=true;['a','b'].forEach(pt=>{const x=lpSrc(g,n,pt);if(x)q.push(x)})}return vg&&dt})}},
  {t:'③ <b>타이머</b>(2초) → <b>변수 설정</b>(방향) ← 계산(방향 × -1)',ok:()=>{const g=lpSG('순찰');return lpNs(g,'ev.timer').some(t=>lpReach(g,t,n=>n.t==='var.set'&&lpVarNm(n)==='방향'&&(()=>{const s=lpSrc(g,n,'value');return!!s&&s.t==='math'&&s.v.op==='*'})()))}},
  {t:'<b>▶ 플레이</b> → 경비 슬라임이 왔다 갔다 하고 콘솔에 「순찰 중」',ok:()=>enEv('log:info:순찰 중')}],
 hint:'노드는 왼쪽 노드 목록에서 끌어오거나 빈 곳 우클릭.\n변수 설정 · 변수 가져오기의 범위를 꼭 「오브젝트」로 같게 맞춰요(이름도 똑같이 「방향」).\n\n② 계산 노드 2개:  [변수 가져오기(방향)] → A, [시간(델타 시간)] → B, 연산 ×  →  결과를 다음 계산의 A, B = 1.5  →  결과를 이동하기 「가로」에.\n③ [변수 가져오기(방향)] → 계산 A, B = -1, × → 변수 설정 「값」.'},
{id:'vs-trans',task:true,en:{proj:()=>labGuard(3),sel:'guard'},title:'전환: 가까우면 추격, 멀어지면 순찰',
 desc:'상태 사이의 화살표가 <b>전환</b>이에요. 상태 오른쪽의 ◉를 끌어 다른 상태에 놓으면 생겨요. 화살표를 누르면 오른쪽에서 <b>언제</b> 넘어갈지 정해요. 「오브젝트와의 거리」를 고르면 주인공과 몇 칸 안이면(가까우면 &lt;) · 밖이면(멀면 &gt;) 넘어가요.<br><br>추격 상태에 들어왔는지 눈으로 알 수 있게, 추격 상태 안의 <b>상태 진입</b>에 Debug.Log 「들켰다!」와 알림 메시지를 이어 둬요.'+L25_HOW,
 goal:'순찰 → 추격(주인공과 3칸 안), 추격 → 순찰(5칸 밖) 전환을 만들고, 추격 진입에 「들켰다!」 로그를 이으세요.',
 checks:[
  {t:'순찰 → 추격: <b>오브젝트와의 거리</b> · 주인공 · <b>가까우면 (&lt;)</b> · <b>3</b>칸',ok:()=>lpTr(lpGuardSM(),'순찰','추격',c=>c.t==='dist'&&(c.op||'<')==='<'&&+c.val>=2&&+c.val<=4)},
  {t:'추격 → 순찰: 오브젝트와의 거리 · <b>멀면 (&gt;)</b> · <b>5</b>칸',ok:()=>lpTr(lpGuardSM(),'추격','순찰',c=>c.t==='dist'&&c.op==='>'&&+c.val>=4)},
  {t:'추격 상태 안: <b>상태 진입</b> → <b>Debug.Log</b> 「들켰다!」 (+ 알림 메시지)',ok:()=>{const g=lpSG('추격');return!!g&&lpReach(g,lpNs(g,'ev.enter')[0],n=>n.t==='log'&&/들켰다/.test(String(n.v.msg||'')))}},
  {t:'<b>▶ 플레이</b> → 방향키로 경비에게 다가가 「들켰다!」 보기 → 멀리 도망가면 다시 순찰 (「순찰 중」)',ok:()=>enEv('log:info:들켰다!')&&(()=>{try{const s=EN.seq,i=s.indexOf('log:info:들켰다!');return i>=0&&s.slice(i).includes('log:info:순찰 중')}catch(e){return false}})()}],
 hint:'전환을 만들 때 3칸 · 5칸처럼 들어가는 거리와 나오는 거리를 다르게 두면, 경계선에서 상태가 깜빡깜빡 바뀌지 않아요(유니티에서도 쓰는 방법이에요).\n추격 상태 안은 아직 움직이지 않아요. 다음 문제에서 쫓아가게 만들어요.'},
{id:'vs-chase',task:true,en:{proj:()=>labGuard(4),sel:'guard'},title:'추격: C# 메서드 부르기로 쫓아가기',
 desc:'주인공 쪽으로 다가가는 계산은 노드로 짜면 길어져요(위치 가져오기 2개 · 빼기 · 정규화 …). 이럴 때 비주얼 스크립트와 C#을 <b>함께</b> 써요. 경비 슬라임에는 C# 스크립트 <b>GuardMove</b>가 붙어 있고, <code>public void Chase()</code>는 한 번 불릴 때마다 주인공 쪽으로 한 프레임만큼 다가가요.<br><br>추격 상태의 <b>업데이트</b>에 <b>C# 메서드 부르기</b> 노드를 잇고 메서드 이름을 <b>Chase</b>로 쓰면, 추격하는 동안 매 프레임 불려요. 「무엇을 할지」는 그래프가, 「어떻게 움직일지」는 C#이 맡는 구조예요.'+L25_HOW,
 goal:'추격 상태의 업데이트에 C# 메서드 부르기(Chase · 대상 자신)를 이어 경비가 주인공을 쫓아오게 하세요.',
 checks:[
  {t:'추격 상태 안: <b>업데이트</b> → <b>C# 메서드 부르기</b>(이벤트 보내기 · C#)',ok:()=>{const g=lpSG('추격');return!!g&&lpReach(g,lpNs(g,'ev.update')[0],n=>n.t==='cs')}},
  {t:'메서드 이름 <b>Chase</b> · 대상 <b>자신</b>',ok:()=>{const g=lpSG('추격');return lpNs(g,'cs',n=>String(n.v.method||'').trim()==='Chase'&&(n.v.to||'self')==='self').length>0}},
  {t:'<b>▶ 플레이</b> → 다가가면 「들켰다!」와 함께 쫓아오기 · 멀리 달아나면(Shift 달리기) 다시 순찰',ok:()=>enEv('log:info:들켰다!')&&lpNs(lpSG('추격'),'cs',n=>String(n.v.method||'').trim()==='Chase').length>0}],
 hint:'C# 메서드 부르기의 「대상」을 자신으로 두면 이 그래프가 붙은 오브젝트(경비 슬라임)의 스크립트에서 이름이 같은 메서드를 찾아요.\nGuardMove의 chaseSpeed를 인스펙터에서 바꾸면 쫓아오는 빠르기가 바뀌어요. 주인공보다 느려야 도망칠 수 있어요.'},
{id:'vs-catch',task:true,en:{proj:()=>labGuard(5),sel:'guard'},title:'잡음: 커스텀 이벤트 · 상태 끝내기',
 desc:'경비가 주인공을 잡으면 잠깐 멈췄다가 다시 순찰로 돌아가게 해요. 새 상태 <b>잡음</b>을 만들고 추격 → 잡음 전환을 <b>거리 0.8칸 안</b>으로 둬요.<br><br>잡음 상태의 <b>상태 진입</b>에서 Debug.Log 「잡았다!」 → <b>커스텀 이벤트 보내기</b> 「잡혔다」(받는 곳 <b>씬 전체</b>) → <b>기다리기</b> 1초 → <b>상태 끝내기</b>. 잡음 → 순찰 전환의 조건을 <b>상태가 끝나면</b>으로 두면, 상태 끝내기가 실행되는 순간 순찰로 돌아가요.<br><br>게임 매니저의 그래프는 「잡혔다」를 받아 잡힌 횟수를 세고 알림을 띄우도록 미리 짜 두었어요. 이렇게 이벤트 이름만 약속하면 서로의 그래프를 몰라도 이야기할 수 있어요.'+L25_HOW,
 goal:'잡음 상태와 두 전환을 만들고, 잡히면 「잡혔다」 이벤트가 매니저에게 가고 1초 뒤 경비가 순찰로 돌아가게 하세요. 마지막으로 경비를 따돌리고 보석을 찾으세요.',
 checks:[
  {t:'새 상태 <b>잡음</b> · 추격 → 잡음: 오브젝트와의 거리 · 가까우면 · <b>0.8</b>칸',ok:()=>lpTr(lpGuardSM(),'추격','잡음',c=>c.t==='dist'&&(c.op||'<')==='<'&&+c.val>0&&+c.val<=1.5)},
  {t:'잡음 → 순찰: <b>상태가 끝나면</b>',ok:()=>lpTr(lpGuardSM(),'잡음','순찰',c=>c.t==='done')},
  {t:'잡음 상태 안: 상태 진입 → Debug.Log 「잡았다!」 → <b>커스텀 이벤트 보내기</b> 「잡혔다」 · <b>씬 전체</b>',ok:()=>{const g=lpSG('잡음'),en=lpNs(g,'ev.enter')[0];return!!g&&lpReach(g,en,n=>n.t==='log'&&/잡았다/.test(String(n.v.msg||'')))&&lpReach(g,en,n=>n.t==='trig'&&String(n.v.name||'').trim()==='잡혔다'&&n.v.to==='all')}},
  {t:'이어서 <b>기다리기</b>(1초) → <b>상태 끝내기</b>',ok:()=>{const g=lpSG('잡음'),en=lpNs(g,'ev.enter')[0];return!!g&&lpReach(g,en,n=>n.t==='wait')&&lpReach(g,en,n=>n.t==='st.done')}},
  {t:'<b>▶ 플레이</b> → 일부러 잡혀 보기 (「잡았다!」 · 매니저 알림) → 1초 뒤 경비가 다시 움직임',ok:()=>enEv('log:info:잡았다!')&&(()=>{try{const s=EN.seq,i=s.indexOf('log:info:잡았다!');return i>=0&&s.slice(i).includes('log:info:순찰 중')}catch(e){return false}})()},
  {t:'경비를 따돌리고 오른쪽 창고의 <b>보석</b>에 닿기 (「보석을 찾았다!」)',ok:()=>enEv('log:info:보석을 찾았다!')}],
 hint:'잡음 상태는 상태 그래프 빈 곳 우클릭 › 상태 추가.\n커스텀 이벤트 보내기의 받는 곳을 「씬 전체」로 해야 게임 매니저의 「커스텀 이벤트 받기」에 닿아요.\n「상태 끝내기」가 없으면 「상태가 끝나면」 전환은 영원히 일어나지 않아요.\n\n잡힌 뒤 1초 동안 경비는 멈춰 있어요. 그 사이에 멀리 달아나요(Shift 달리기).'}
];

/* ===================== 레슨 소개(#about-lesson-N) · 번역 ===================== */
if(window.PV_DATA){
PV_DATA['lesson-23']={intro:'지금까지 만든 게임은 위에서 내려다보는 게임이었다. 이 레슨은 옆에서 보는 플랫포머를 진짜 엔진에서 처음부터 만든다. 리지드바디 2D를 붙여 중력으로 떨어지게 하고, 속도로 걷고, 땅에 서 있을 때만 점프하고, 가시와 버섯에 서로 다르게 반응하게 한다.',
 s:[{h:'중력은 리지드바디 2D가 맡는다',p:['리지드바디 2D를 붙이면 오브젝트가 중력으로 떨어지고 콜라이더에 부딪혀 멈춘다. 이 엔진은 아래쪽이 +y라서, 떨어지는 동안 y 속도가 커지고 위로 뛰려면 y 속도를 음수로 준다.','게임에서는 보통 중력보다 조금 무거운 2~3배를 쓴다. 떨어지는 시간이 짧아져 조작이 또렷해진다.'],img:'lesson-23-0',cap:'구름 정원. 땅 · 나무 발판 · 구덩이 · 가시 · 버섯 · 높은 구름 발판으로 이루어진 옆에서 보는 맵이다.'},
  {h:'위치 대신 속도를 바꾼다',p:'리지드바디가 붙은 오브젝트를 transform.position으로 옮기면 물리를 건너뛰어 벽을 뚫는다. 가로 속도만 입력으로 정하고 세로 속도는 그대로 두면, 걷는 동안에도 중력이 계속 작동한다.',code:'rb.velocity = new Vector2(x * moveSpeed, rb.velocity.y);',ct:'걷기'},
  {h:'땅을 확인하고 점프한다',p:'Physics2D.Raycast로 발밑 0.6칸에 광선을 쏴 땅이 있을 때만 점프한다. 공중에서 다시 뛰는 무한 점프를 막는 가장 흔한 방법이다.',code:'bool grounded = Physics2D.Raycast(transform.position, Vector2.down, 0.6f);\nif (grounded && Input.GetKeyDown(KeyCode.Space))\n    rb.velocity = new Vector2(rb.velocity.x, -jumpPower);',ct:'점프'},
  {h:'트리거와 충돌은 다르다',p:['가시처럼 닿았는지만 알면 되는 것은 트리거로 두고 OnTriggerEnter2D(Collider2D)로 받는다. 버섯처럼 밟고 설 수 있어야 하는 것은 트리거를 끄고 OnCollisionEnter2D(Collision2D)로 받는다.','두 메서드 모두 CompareTag로 상대가 무엇인지 확인한다. 가시는 Trap, 버섯은 Bounce, 타일 땅은 Ground 태그다.']}],
 terms:[['Rigidbody2D','중력 · 힘 · 충돌을 받아 움직이게 하는 2D 물리 컴포넌트다.'],['velocity','1초에 몇 칸 움직이는지 나타내는 속도다.'],['Raycast','한 방향으로 광선을 쏴 처음 맞은 콜라이더를 알아낸다.'],['트리거','막지 않고 닿았는지만 알리는 콜라이더다.'],['OnCollisionEnter2D','트리거가 아닌 콜라이더에 부딪힌 순간 불린다.']]};
PV_DATA['lesson-24']={intro:'게임은 플레이 도중에 오브젝트를 새로 만들고 없앤다. 별똥별이 쏟아지는 광장에서 프리팹을 Instantiate로 찍어 내고, 스스로 떨어지다 Destroy되게 하고, 파티클과 화면 흔들기로 손맛을 내고, 코루틴으로 점점 어렵게 하고, PlayerPrefs로 최고 기록을 남긴다.',
 s:[{h:'프리팹을 찍어 낸다',p:['별 생성기는 1.2초마다 별똥별 프리팹을 하늘의 아무 곳에 만든다. 프리팹은 스크립트의 GameObject 칸에 넣어 두고, Instantiate(프리팹, 위치, 회전)으로 복제한다.','복제본은 원래 프리팹과 같은 스프라이트 · 콜라이더 · 스크립트를 가진다. 이름 뒤에는 (Clone)이 붙는다.'],img:'lesson-24-0',cap:'별빛 광장. 별똥별이 떨어지다 땅에서 반짝 터지고, 점수판에 남은 시간과 피한 별이 보인다.',code:'Vector2 pos = new Vector2(Random.Range(minX, maxX), 1f);\nInstantiate(starPrefab, pos, Quaternion.identity);',ct:'별 만들기'},
  {h:'다 쓴 것은 지운다',p:'떨어진 별을 지우지 않으면 화면 밖에서 영원히 떨어지며 쌓인다. 땅에 닿으면 파티클 프리팹을 그 자리에 만들고 Destroy(gameObject)로 자신을 지운다. 파티클은 다 뿜으면 스스로 사라지도록 해 두었다.'},
  {h:'코루틴으로 시간 순서를 짠다',p:'IEnumerator 메서드 안에서 yield return new WaitForSeconds(5f)를 만나면 5초 쉬었다가 다음 줄을 이어 간다. while 반복과 함께 쓰면 「5초마다 조금씩 어렵게」 같은 흐름을 한 메서드로 짤 수 있다.',code:'IEnumerator SpeedUp()\n{\n    while (!game.over)\n    {\n        yield return new WaitForSeconds(5f);\n        every = every * 0.75f;\n    }\n}',ct:'코루틴'},
  {h:'기록은 PlayerPrefs에',p:'PlayerPrefs는 게임을 껐다 켜도 남는 작은 저장 공간이다. GetInt로 읽고 SetInt로 쓴다. 지금 기록이 저장된 최고 기록보다 클 때만 새로 저장한다.'}],
 terms:[['Instantiate','프리팹이나 오브젝트를 플레이 중에 복제해 씬에 놓는다.'],['Destroy','오브젝트를 씬에서 지운다. 초를 주면 그만큼 뒤에 지운다.'],['코루틴','yield로 기다렸다가 이어서 실행하는 메서드다.'],['PlayerPrefs','게임을 꺼도 남는 키 · 값 저장 공간이다.'],['Camera.main.Shake','화면을 잠깐 흔들어 타격감을 준다.']]};
PV_DATA['lesson-25']={intro:'몬스터는 「지금 무엇을 하는 중인지」에 따라 다르게 움직인다. 스크립트 그래프 하나에 만약을 계속 늘리는 대신, 상태 그래프로 순찰 · 추격 · 잡음 상태를 나누고 조건 화살표로 잇는 경비병 AI를 진짜 엔진의 비주얼 스크립트 창에서 만든다.',
 s:[{h:'상태 그래프는 큰 지도다',p:['네모 하나가 상태이고, 한 번에 한 상태만 실행된다. 상태마다 안에 작은 스크립트 그래프가 있어 상태 진입 · 업데이트 · 상태 나감 이벤트로 할 일을 정한다.','화살표(전환)는 언제 다른 상태로 넘어갈지 정한다. 이 레슨은 「오브젝트와의 거리」와 「상태가 끝나면」 조건을 쓴다.'],img:'lesson-25-0',cap:'경비 AI 상태 그래프. 순찰 ↔ 추격은 거리 조건, 추격 → 잡음은 0.8칸, 잡음 → 순찰은 「상태가 끝나면」이다.'},
  {h:'변수와 계산으로 순찰한다',p:'오브젝트 변수 「방향」을 1로 두고, 업데이트마다 방향 × 델타 시간 × 1.5만큼 옮긴다. 타이머가 2초마다 방향에 -1을 곱하면 왔다 갔다 한다. 오브젝트 범위 변수는 이 오브젝트의 모든 상태가 함께 쓴다.'},
  {h:'C#과 함께 쓴다',p:'주인공 쪽으로 다가가는 계산은 C# 메서드 Chase()에 맡기고, 추격 상태의 업데이트에서 「C# 메서드 부르기」로 부른다. 그래프는 「언제 무엇을」, C#은 「어떻게」를 맡는 구조다.',code:'public void Chase()\n{\n    Vector2 target = Hero.main.position;\n    transform.position = Vector2.MoveTowards(transform.position, target, chaseSpeed * Time.deltaTime);\n}',ct:'GuardMove.cs'},
  {h:'이벤트와 상태 끝내기로 잇는다',p:'잡음 상태는 「잡혔다」 커스텀 이벤트를 씬 전체에 보내고 1초 기다린 뒤 상태 끝내기를 실행한다. 게임 매니저는 이벤트 이름만 알면 받을 수 있고, 「상태가 끝나면」 전환이 경비를 다시 순찰로 돌려보낸다.'}],
 terms:[['상태 그래프','상태와 전환으로 이루어진 비주얼 스크립트 그래프다 (상태 머신).'],['전환','다른 상태로 넘어가는 조건 화살표다.'],['오브젝트 변수','한 오브젝트의 모든 머신 · 상태가 함께 쓰는 변수다.'],['C# 메서드 부르기','그래프에서 C# 스크립트의 메서드를 이름으로 부르는 노드다.'],['상태 끝내기','「상태가 끝나면」 전환을 지나가게 하는 노드다.']]};
}
if(window.TI18N)TI18N.add({
 "2D 플랫포머: 리지드바디 2D · 점프 · 충돌":["2D Platformer: Rigidbody 2D · Jumping · Collisions","2D プラットフォーマー：リジッドボディ 2D・ジャンプ・衝突","2D 平台跳跃：刚体 2D · 跳跃 · 碰撞"],
 "생성과 기록: Instantiate · 코루틴 · PlayerPrefs":["Spawning & Records: Instantiate · Coroutines · PlayerPrefs","生成と記録：Instantiate・コルーチン・PlayerPrefs","生成与记录：Instantiate · 协程 · PlayerPrefs"],
 "비주얼 스크립트 심화: 상태 머신으로 경비병 AI":["Advanced Visual Scripting: Guard AI with State Machines","ビジュアルスクリプト応用：ステートマシンで警備 AI","可视化脚本进阶：用状态机做守卫 AI"],
 "구름 정원 플랫포머":["Cloud Garden Platformer","雲の庭プラットフォーマー","云之庭平台跳跃"],"별똥별 피하기":["Dodge the Shooting Stars","流れ星よけ","躲避流星"],"슬라임 경비대 (비주얼 스크립트)":["Slime Guards (Visual Scripting)","スライム警備隊（ビジュアルスクリプト）","史莱姆守卫队（可视化脚本）"],
 "리지드바디 2D로 떨어지게 하기":["Fall with Rigidbody 2D","リジッドボディ 2D で落とす","用刚体 2D 让它下落"],"velocity로 좌우 걷기":["Walk with velocity","velocity で左右に歩く","用 velocity 左右行走"],"땅에 있을 때만 점프 (Raycast)":["Jump only when grounded (Raycast)","地面にいるときだけジャンプ (Raycast)","只在地面上跳跃 (Raycast)"],
 "가시 · 구덩이에 빠지면 처음 자리로":["Respawn on spikes or pits","トゲ・穴で最初の位置へ","碰到尖刺或掉坑就回到起点"],"밟으면 튕겨 오르는 버섯 (OnCollisionEnter2D)":["A bouncy mushroom (OnCollisionEnter2D)","踏むと跳ねるキノコ (OnCollisionEnter2D)","踩上去会弹起的蘑菇 (OnCollisionEnter2D)"],
 "프리팹을 Instantiate로 찍어 내기":["Stamp out prefabs with Instantiate","プレハブを Instantiate で生成","用 Instantiate 生成预制体"],"떨어지고 · 터지고 · 사라지기 (Destroy · 파티클)":["Fall, burst, disappear (Destroy · particles)","落ちて・はじけて・消える (Destroy・パーティクル)","下落 · 爆开 · 消失 (Destroy · 粒子)"],
 "맞으면 아프게 · 화면 흔들기":["Hurt on hit · screen shake","当たるとダメージ・画面を揺らす","被击中受伤 · 屏幕震动"],"코루틴으로 점점 어렵게":["Ramp up difficulty with a coroutine","コルーチンでだんだん難しく","用协程逐渐变难"],"PlayerPrefs로 최고 기록 남기기":["Save the best score with PlayerPrefs","PlayerPrefs で最高記録を残す","用 PlayerPrefs 保存最高纪录"],
 "상태 그래프 만들기: 순찰 · 추격":["Make a state graph: Patrol · Chase","ステートグラフを作る：巡回・追跡","创建状态图：巡逻 · 追击"],"순찰: 변수 · 계산 · 타이머로 왔다 갔다":["Patrol: back and forth with variables, math and a timer","巡回：変数・計算・タイマーで行ったり来たり","巡逻：用变量 · 计算 · 定时器来回走"],
 "전환: 가까우면 추격, 멀어지면 순찰":["Transitions: chase when near, patrol when far","遷移：近いと追跡、離れると巡回","转换：靠近就追击，远离就巡逻"],"추격: C# 메서드 부르기로 쫓아가기":["Chase: call a C# method","追跡：C# メソッド呼び出しで追いかける","追击：调用 C# 方法追赶"],"잡음: 커스텀 이벤트 · 상태 끝내기":["Caught: custom events · finish state","捕まえた：カスタムイベント・状態終了","抓住：自定义事件 · 结束状态"]});

/* 예제 3개 (학습 › 예제 · 로드맵)의 프로젝트 빌더 */
window.LP_EXAMPLE_BUILD={platform:exPlatform,stars:exStars,vsguard:exGuard};
