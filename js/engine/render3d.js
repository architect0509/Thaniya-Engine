/* render3d.js — Thaniya Engine 3D 렌더러 (WebGL2)
   · 좌표계는 유니티와 같다: X 오른쪽 · Y 위 · Z 앞 (왼손 좌표계), 각도는 도(°), 회전 순서는 Z → X → Y
   · 기본 도형: cube · sphere · capsule · cylinder · plane(10×10) · quad(1×1, -Z를 바라봄)
   · 빛: 방향 빛 · 점 빛 · 스포트 빛 (최대 8개) + 하늘 색으로 만든 주변광, 첫 번째 방향 빛은 그림자
   · 하늘: 위 · 지평선 · 땅 세 가지 색 그라데이션 (유니티 기본 스카이박스 느낌)
   · 편집용: 바닥 격자, 선택한 오브젝트 주황 외곽선
   사용: const r=R3D.create(); r.render(frame) → r.canvas 를 2D 캔버스에 drawImage
   window.R3D = {create, ok, math, shapes} */
(function(){
'use strict';
/* ---------------- 수학 (열 우선 4×4) ---------------- */
const D2R=Math.PI/180;
function m4(){const a=new Float32Array(16);a[0]=a[5]=a[10]=a[15]=1;return a}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}
/* 회전 행렬 3×3 (행 우선 배열 [r00,r01,r02, r10,...]) · 유니티 순서: R = Ry · Rx · Rz */
function rot3(rx,ry,rz){
  const x=rx*D2R,y=ry*D2R,z=rz*D2R,cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);
  const Ry=[cy,0,sy, 0,1,0, -sy,0,cy],Rx=[1,0,0, 0,cx,-sx, 0,sx,cx],Rz=[cz,-sz,0, sz,cz,0, 0,0,1];
  return m3mul(m3mul(Ry,Rx),Rz);
}
function m3mul(a,b){const o=new Array(9);for(let r=0;r<3;r++)for(let c=0;c<3;c++){o[r*3+c]=a[r*3]*b[c]+a[r*3+1]*b[3+c]+a[r*3+2]*b[6+c]}return o}
const m3v=(R,v)=>[R[0]*v[0]+R[1]*v[1]+R[2]*v[2],R[3]*v[0]+R[4]*v[1]+R[5]*v[2],R[6]*v[0]+R[7]*v[1]+R[8]*v[2]];
/* 위치 · 회전(도) · 크기 → 모델 행렬 */
function trs(p,r,s){const R=rot3(r[0],r[1],r[2]),o=m4();
  for(let c=0;c<3;c++){o[c*4]=R[c]*s[c];o[c*4+1]=R[3+c]*s[c];o[c*4+2]=R[6+c]*s[c]}
  o[12]=p[0];o[13]=p[1];o[14]=p[2];return o}
function inv(m){
  const a=m,o=new Float32Array(16);
  const a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
  const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
  let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(!det)return m4();det=1/det;
  o[0]=(a11*b11-a12*b10+a13*b09)*det;o[1]=(a02*b10-a01*b11-a03*b09)*det;o[2]=(a31*b05-a32*b04+a33*b03)*det;o[3]=(a22*b04-a21*b05-a23*b03)*det;
  o[4]=(a12*b08-a10*b11-a13*b07)*det;o[5]=(a00*b11-a02*b08+a03*b07)*det;o[6]=(a32*b02-a30*b05-a33*b01)*det;o[7]=(a20*b05-a22*b02+a23*b01)*det;
  o[8]=(a10*b10-a11*b08+a13*b06)*det;o[9]=(a01*b08-a00*b10-a03*b06)*det;o[10]=(a30*b04-a31*b02+a33*b00)*det;o[11]=(a21*b02-a20*b04-a23*b00)*det;
  o[12]=(a11*b07-a10*b09-a12*b06)*det;o[13]=(a00*b09-a01*b07+a02*b06)*det;o[14]=(a31*b01-a30*b03-a32*b00)*det;o[15]=(a20*b03-a21*b01+a22*b00)*det;
  return o;
}
function tp(m,v){const x=v[0],y=v[1],z=v[2];const w=m[3]*x+m[7]*y+m[11]*z+m[15];return[(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,(m[2]*x+m[6]*y+m[10]*z+m[14])/w,w]}
function persp(fov,asp,n,f){const t=1/Math.tan(fov*D2R/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o}
function ortho(l,r,b,t,n,f){const o=m4();o[0]=2/(r-l);o[5]=2/(t-b);o[10]=-2/(f-n);o[12]=-(r+l)/(r-l);o[13]=-(t+b)/(t-b);o[14]=-(f+n)/(f-n);return o}
const FLIPZ=(()=>{const o=m4();o[10]=-1;return o})();
const norm=v=>{const l=Math.hypot(v[0],v[1],v[2])||1;return[v[0]/l,v[1]/l,v[2]/l]};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
/* 카메라: 위치 · 회전 → 뷰 행렬 (Z 뒤집기 포함) · 투영 */
function camMats(c,W,H){
  const world=trs(c.pos,c.rot,[1,1,1]),view=mul(FLIPZ,inv(world)),asp=W/Math.max(1,H);
  const proj=c.ortho?ortho(-c.size*asp,c.size*asp,-c.size,c.size,c.near||.1,c.far||500):persp(c.fov||60,asp,c.near||.1,c.far||500);
  const vp=mul(proj,view);return{view,proj,vp,ivp:inv(vp),world};
}
/* 화면 점(px) → 세계 광선 */
function ray(M,sx,sy,W,H){const nx=sx/W*2-1,ny=1-sy/H*2;const a=tp(M.ivp,[nx,ny,-1]),b=tp(M.ivp,[nx,ny,1]);return{o:[a[0],a[1],a[2]],d:norm([b[0]-a[0],b[1]-a[1],b[2]-a[2]])}}
/* 세계 점 → 화면 점 (뒤에 있으면 null) */
function project(M,v,W,H){const x=v[0],y=v[1],z=v[2],m=M.vp;const cw=m[3]*x+m[7]*y+m[11]*z+m[15];if(cw<=1e-4)return null;
  const cx=(m[0]*x+m[4]*y+m[8]*z+m[12])/cw,cy=(m[1]*x+m[5]*y+m[9]*z+m[13])/cw;return[(cx+1)/2*W,(1-cy)/2*H,cw]}
const MATH={m4,mul,inv,trs,rot3,m3v,tp,persp,ortho,camMats,ray,project,norm,cross,dot,D2R};

/* ---------------- 기본 도형 ---------------- */
function geo(){return{p:[],n:[],u:[],i:[]}}
function addQuadGrid(G,o,ax,ay,nrm,sx,sy){ /* 평면 격자 하나 (o: 모서리, ax·ay: 두 변) */
  const b=G.p.length/3;
  for(let j=0;j<=sy;j++)for(let i=0;i<=sx;i++){const u=i/sx,v=j/sy;G.p.push(o[0]+ax[0]*u+ay[0]*v,o[1]+ax[1]*u+ay[1]*v,o[2]+ax[2]*u+ay[2]*v);G.n.push(...nrm);G.u.push(u,1-v)}
  for(let j=0;j<sy;j++)for(let i=0;i<sx;i++){const a=b+j*(sx+1)+i,c=a+sx+1;G.i.push(a,a+1,c+1,a,c+1,c)}
}
function mkCube(){const G=geo(),h=.5;
  addQuadGrid(G,[-h,-h,-h],[1,0,0],[0,1,0],[0,0,-1],1,1);addQuadGrid(G,[h,-h,h],[-1,0,0],[0,1,0],[0,0,1],1,1);
  addQuadGrid(G,[h,-h,-h],[0,0,1],[0,1,0],[1,0,0],1,1);addQuadGrid(G,[-h,-h,h],[0,0,-1],[0,1,0],[-1,0,0],1,1);
  addQuadGrid(G,[-h,h,-h],[1,0,0],[0,0,1],[0,1,0],1,1);addQuadGrid(G,[-h,-h,h],[1,0,0],[0,0,-1],[0,-1,0],1,1);return G}
function mkSphere(r,seg,ring,cy,stretch){ /* stretch: 캡슐용 (위·아래 반구를 벌림) */
  const G=geo();
  for(let j=0;j<=ring;j++){const v=j/ring,th=v*Math.PI,st=Math.sin(th),ct=Math.cos(th);
    for(let i=0;i<=seg;i++){const u=i/seg,ph=u*Math.PI*2,x=-Math.cos(ph)*st,z=Math.sin(ph)*st,y=ct;
      let py=y*r;if(stretch)py+=(j<=ring/2?stretch:-stretch);
      G.p.push(x*r,py+(cy||0),z*r);G.n.push(x,y,z);G.u.push(u,1-v)}}
  for(let j=0;j<ring;j++)for(let i=0;i<seg;i++){const a=j*(seg+1)+i,b=a+seg+1;G.i.push(a,b,a+1,a+1,b,b+1)}
  return G;
}
function mkCylinder(){const G=geo(),seg=32,r=.5,h=1;
  const b0=0;for(let j=0;j<=1;j++)for(let i=0;i<=seg;i++){const u=i/seg,a=u*Math.PI*2,x=Math.cos(a),z=Math.sin(a);G.p.push(x*r,j?h:-h,z*r);G.n.push(x,0,z);G.u.push(u,j)}
  for(let i=0;i<seg;i++){const a=b0+i,b=a+seg+1;G.i.push(a,b,a+1,a+1,b,b+1)}
  for(const s of[1,-1]){const c=G.p.length/3;G.p.push(0,s*h,0);G.n.push(0,s,0);G.u.push(.5,.5);
    for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2,x=Math.cos(a),z=Math.sin(a);G.p.push(x*r,s*h,z*r);G.n.push(0,s,0);G.u.push(.5+x*.5,.5+z*.5)}
    for(let i=0;i<seg;i++)G.i.push(c,c+1+i,c+2+i)}
  return G}
function mkPlane(){const G=geo();addQuadGrid(G,[-5,0,-5],[10,0,0],[0,0,10],[0,1,0],10,10);
  /* 평면 텍스처는 위에서 볼 때 바로 보이게 */
  for(let k=0;k<G.u.length;k+=2)G.u[k+1]=1-G.u[k+1];return G}
function mkQuad(){const G=geo();addQuadGrid(G,[-.5,-.5,0],[1,0,0],[0,1,0],[0,0,-1],1,1);return G}
/* 도형마다 로컬 경계 상자 (고르기 · 선택 상자) */
const SHAPES={
  cube:{mk:mkCube,b:[[-.5,-.5,-.5],[.5,.5,.5]]},
  sphere:{mk:()=>mkSphere(.5,32,20),b:[[-.5,-.5,-.5],[.5,.5,.5]]},
  capsule:{mk:()=>mkSphere(.5,32,20,0,.5),b:[[-.5,-1,-.5],[.5,1,.5]]},
  cylinder:{mk:mkCylinder,b:[[-.5,-1,-.5],[.5,1,.5]]},
  plane:{mk:mkPlane,b:[[-5,-.01,-5],[5,.01,5]]},
  quad:{mk:mkQuad,b:[[-.5,-.5,-.01],[.5,.5,.01]]}};

/* ---------------- 셰이더 ---------------- */
const VS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec2 aU;
uniform mat4 uVP,uM;uniform mat3 uNM;uniform vec4 uUV;
out vec3 vW;out vec3 vN;out vec2 vU;
void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=uNM*aN;vU=uUV.xy+aU*uUV.zw;gl_Position=uVP*w;}`;
const FS=`#version 300 es
precision highp float;precision highp sampler2DShadow;
in vec3 vW;in vec3 vN;in vec2 vU;out vec4 o;
uniform vec3 uCol;uniform float uGloss;uniform sampler2D uTex;uniform int uHasTex;uniform int uUnlit;
uniform vec3 uCam;uniform vec3 uSkyT,uSkyH,uSkyG;uniform float uAmb;
uniform int uNL;uniform vec4 uLP[8];uniform vec4 uLD[8];uniform vec4 uLC[8];
uniform sampler2DShadow uSh;uniform mat4 uShM;uniform int uHasSh;uniform float uShTex;
vec3 lin(vec3 c){return pow(c,vec3(2.2));}
float shadow(vec3 w,vec3 n,vec3 L){
  vec4 s=uShM*vec4(w+n*0.04,1.);vec3 q=s.xyz/s.w*.5+.5;
  if(q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z>1.)return 1.;
  float b=0.0015,t=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)t+=texture(uSh,vec3(q.xy+vec2(x,y)/uShTex,q.z-b));
  return t/9.;
}
void main(){
  vec4 base=vec4(lin(uCol),1.);
  if(uHasTex==1){vec4 t=texture(uTex,vU);if(t.a<.5)discard;base*=vec4(lin(t.rgb),1.);}
  if(uUnlit==1){o=vec4(pow(base.rgb,vec3(1./2.2)),1.);return;}
  vec3 N=normalize(vN),V=normalize(uCam-vW);if(dot(N,V)<0.)N=-N;
  /* 주변광: 위를 보면 하늘 색, 아래를 보면 땅 색 */
  vec3 amb=mix(lin(uSkyG),lin(uSkyT)*.6+lin(uSkyH)*.4,N.y*.5+.5)*uAmb;
  vec3 c=base.rgb*amb;
  for(int i=0;i<8;i++){if(i>=uNL)break;
    vec3 L;float at=1.;
    if(uLP[i].w==0.){L=-uLD[i].xyz;}
    else{vec3 d=uLP[i].xyz-vW;float r=length(d);L=d/max(r,1e-4);float R=max(uLD[i].w,.01);at=clamp(1.-r/R,0.,1.);at*=at;
      if(uLP[i].w==2.){float cs=dot(-L,normalize(uLD[i].xyz));float ca=uLC[i].w;at*=smoothstep(ca,ca+.06,cs);}}
    float nd=max(dot(N,L),0.);if(nd<=0.)continue;
    float sh=(i==0&&uHasSh==1&&uLP[i].w==0.)?shadow(vW,N,L):1.;
    vec3 H=normalize(L+V);float sp=pow(max(dot(N,H),0.),8.+uGloss*120.)*uGloss*.8;
    c+=(base.rgb*nd+vec3(sp))*lin(uLC[i].rgb)*at*sh;
  }
  o=vec4(pow(c,vec3(1./2.2)),1.);
}`;
const SKY_FS=`#version 300 es
precision highp float;in vec2 vQ;out vec4 o;uniform mat4 uIVP;uniform vec3 uSkyT,uSkyH,uSkyG,uSun;uniform int uSunOn;uniform vec3 uSolid;uniform int uMode;
void main(){
  if(uMode==1){o=vec4(uSolid,1.);return;}
  vec4 a=uIVP*vec4(vQ,-1.,1.),b=uIVP*vec4(vQ,1.,1.);vec3 d=normalize(b.xyz/b.w-a.xyz/a.w);
  float h=d.y;vec3 c;
  if(h>=0.){c=mix(uSkyH,uSkyT,pow(clamp(h,0.,1.),.45));}
  else{c=mix(uSkyH*.92+uSkyG*.08,uSkyG,smoothstep(0.,.035,-h));}
  if(uSunOn==1&&h>-.02){float s=max(dot(d,-uSun),0.);c+=vec3(1.,.95,.85)*(pow(s,900.)*1.6+pow(s,60.)*.12);}
  o=vec4(c,1.);
}`;
const QUAD_VS=`#version 300 es
layout(location=0) in vec2 aQ;out vec2 vQ;void main(){vQ=aQ;gl_Position=vec4(aQ,0.,1.);}`;
/* 편집용 바닥 격자: y=0 평면, 화면 미분으로 굵기를 고르게, 멀수록 흐리게 */
const GRID_VS=`#version 300 es
layout(location=0) in vec2 aQ;uniform mat4 uVP;uniform vec3 uC;uniform float uS;out vec3 vW;
void main(){vec3 w=vec3(uC.x+aQ.x*uS,0.,uC.z+aQ.y*uS);vW=w;gl_Position=uVP*vec4(w,1.);}`;
const GRID_FS=`#version 300 es
precision highp float;in vec3 vW;out vec4 o;uniform vec3 uCam;uniform float uFade;
float line(vec2 p,float s){vec2 g=abs(fract(p/s-.5)-.5)/fwidth(p/s);return 1.-min(min(g.x,g.y),1.);}
void main(){
  float d=length(vW.xz-uCam.xz),f=1.-smoothstep(uFade*.35,uFade,d);
  float a=line(vW.xz,1.)*.22+line(vW.xz,10.)*.35;
  vec3 c=vec3(.62);
  float ax=1.-min(abs(vW.z)/fwidth(vW.z),1.),az=1.-min(abs(vW.x)/fwidth(vW.x),1.);
  if(ax>0.){c=mix(c,vec3(.86,.3,.32),ax);a=max(a,ax*.85);}
  if(az>0.){c=mix(c,vec3(.33,.55,.92),az);a=max(a,az*.85);}
  o=vec4(c,a*f);if(o.a<.01)discard;
}`;
const DEPTH_VS=`#version 300 es
layout(location=0) in vec3 aP;uniform mat4 uVP,uM;void main(){gl_Position=uVP*uM*vec4(aP,1.);}`;
const DEPTH_FS=`#version 300 es
precision mediump float;out vec4 o;void main(){o=vec4(1.);}`;
const OUTL_FS=`#version 300 es
precision highp float;in vec2 vQ;out vec4 o;uniform sampler2D uMask;uniform vec2 uPx;uniform vec3 uC;
void main(){vec2 uv=vQ*.5+.5;float c=texture(uMask,uv).r;if(c>.5)discard;float m=0.;
  for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){if(abs(x)+abs(y)>3)continue;m=max(m,texture(uMask,uv+vec2(x,y)*uPx).r);}
  if(m<.5)discard;o=vec4(uC,1.);}`;

function compile(gl,vs,fs){
  const mk=(t,s)=>{const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh};
  const p=gl.createProgram();gl.attachShader(p,mk(gl.VERTEX_SHADER,vs));gl.attachShader(p,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const U={};const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const a=gl.getActiveUniform(p,i),k=a.name.replace(/\[0\]$/,'');U[k]=gl.getUniformLocation(p,a.name)}
  return{p,U};
}
const hex=(h,d)=>{const m=/^#?([0-9a-f]{6})$/i.exec(String(h||''));if(!m)return d||[1,1,1];const n=parseInt(m[1],16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};

let okCache=null;
function ok(){if(okCache!=null)return okCache;try{const c=document.createElement('canvas');okCache=!!c.getContext('webgl2')}catch(e){okCache=false}return okCache}

function create(){
  const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;
  const gl=canvas.getContext('webgl2',{antialias:true,alpha:false,premultipliedAlpha:false});
  if(!gl)return null;
  const P=compile(gl,VS,FS),SKY=compile(gl,QUAD_VS,SKY_FS),GRID=compile(gl,GRID_VS,GRID_FS),DEP=compile(gl,DEPTH_VS,DEPTH_FS),OUT=compile(gl,QUAD_VS,OUTL_FS);
  /* 도형 버퍼 */
  const meshes={};
  for(const k in SHAPES){const G=SHAPES[k].mk(),vao=gl.createVertexArray();gl.bindVertexArray(vao);
    const buf=(data,loc,n)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,0,0)};
    buf(G.p,0,3);buf(G.n,1,3);buf(G.u,2,2);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(G.i),gl.STATIC_DRAW);
    meshes[k]={vao,n:G.i.length}}
  const qvao=gl.createVertexArray();gl.bindVertexArray(qvao);{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0)}
  gl.bindVertexArray(null);
  /* 그림자 지도 */
  const SH=2048,shTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,shTex);gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT24,SH,SH);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const shFb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shFb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shTex,0);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  /* 선택 외곽선용 마스크 */
  let mk={w:0,h:0,tex:null,fb:null,rb:null};
  function maskFor(w,h){if(mk.w===w&&mk.h===h)return mk;if(mk.tex){gl.deleteTexture(mk.tex);gl.deleteFramebuffer(mk.fb);gl.deleteRenderbuffer(mk.rb)}
    const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const fb=gl.createFramebuffer(),rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);
    gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,rb);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);mk={w,h,tex:t,fb,rb};return mk}
  /* 텍스처 (스프라이트 조각) */
  const texC=new Map(),white=(()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));return t})();
  function texOf(t){
    if(!t||!t.key)return null;let e=texC.get(t.key);if(e&&e.src===t.src&&e.ver===t.ver)return e.tex;
    const src=t.src;if(!src)return null;if(src.complete===false||(src.naturalWidth===0&&src.width===0))return null;
    const r=t.r||{x:0,y:0,w:src.naturalWidth||src.width,h:src.naturalHeight||src.height};
    const c=document.createElement('canvas');c.width=Math.max(1,r.w);c.height=Math.max(1,r.h);const g=c.getContext('2d');g.imageSmoothingEnabled=false;try{g.drawImage(src,r.x,r.y,r.w,r.h,0,0,r.w,r.h)}catch(_){return null}
    const tex=e&&e.tex||gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    const wr=t.repeat?gl.REPEAT:gl.CLAMP_TO_EDGE;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,wr);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,wr);
    texC.set(t.key,{tex,src,ver:t.ver});return tex;
  }
  const nm3=M=>{ /* 모델 행렬 → 법선 행렬 (역전치 3×3) */
    const a=M[0],b=M[1],c=M[2],d=M[4],e=M[5],f=M[6],g=M[8],h=M[9],i=M[10];
    const A=e*i-f*h,B=-(d*i-f*g),C=d*h-e*g,det=a*A+b*B+c*C||1;
    return new Float32Array([A/det,-(b*i-c*h)/det,(b*f-c*e)/det, B/det,(a*i-c*g)/det,-(a*f-c*d)/det, C/det,-(a*h-b*g)/det,(a*e-b*d)/det]);
  };
  /* frame = {W,H, cam:{pos,rot,fov,ortho,size,near,far}, items:[{id,shape,M,color,gloss,tex,unlit,cast}], lights:[{kind,pos,dir,color,intensity,range,angle,shadow}],
             sky:{top,hor,gnd,mode:'sky'|'color',color}, amb, grid, sel:Set(id), selColor, focus:[x,y,z] (그림자 범위 가운데)} */
  function render(F){
    const W=Math.max(1,Math.round(F.W)),H=Math.max(1,Math.round(F.H));
    if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
    const M=camMats(F.cam,W,H),sky=F.sky||{},sT=hex(sky.top,[.36,.53,.78]),sH=hex(sky.hor,[.8,.85,.9]),sG=hex(sky.gnd,[.4,.37,.35]);
    const lights=(F.lights||[]).slice(0,8),items=F.items||[];
    /* 1) 그림자 지도 (첫 번째 방향 빛) */
    const sun=lights.find(l=>l.kind==='directional');let shM=null;
    if(sun&&sun.shadow&&lights[0]===sun){
      const c=F.focus||[0,0,0],R=F.shRange||30,d=norm(sun.dir),up=Math.abs(d[1])>.95?[0,0,1]:[0,1,0];
      const z=[-d[0],-d[1],-d[2]],x=norm(cross(up,z)),y=cross(z,x),eye=[c[0]-d[0]*R*2,c[1]-d[1]*R*2,c[2]-d[2]*R*2];
      const V=new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
      shM=mul(ortho(-R,R,-R,R,.1,R*4),V);
      gl.bindFramebuffer(gl.FRAMEBUFFER,shFb);gl.viewport(0,0,SH,SH);gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
      gl.useProgram(DEP.p);gl.uniformMatrix4fv(DEP.U.uVP,false,shM);
      for(const it of items){if(it.cast===false||it.tex&&it.shape==='quad')continue;const me=meshes[it.shape];if(!me)continue;gl.uniformMatrix4fv(DEP.U.uM,false,it.M);gl.bindVertexArray(me.vao);gl.drawElements(gl.TRIANGLES,me.n,gl.UNSIGNED_SHORT,0)}
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    }
    /* 2) 하늘 */
    gl.viewport(0,0,W,H);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);
    gl.useProgram(SKY.p);gl.uniformMatrix4fv(SKY.U.uIVP,false,M.ivp);gl.uniform3fv(SKY.U.uSkyT,sT);gl.uniform3fv(SKY.U.uSkyH,sH);gl.uniform3fv(SKY.U.uSkyG,sG);
    gl.uniform1i(SKY.U.uMode,sky.mode==='color'?1:0);gl.uniform3fv(SKY.U.uSolid,hex(sky.color,[.19,.3,.47]));
    gl.uniform1i(SKY.U.uSunOn,sun?1:0);gl.uniform3fv(SKY.U.uSun,sun?norm(sun.dir):[0,-1,0]);
    gl.bindVertexArray(qvao);gl.drawArrays(gl.TRIANGLES,0,6);
    gl.depthMask(true);gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    /* 3) 오브젝트 */
    gl.useProgram(P.p);const U=P.U;
    gl.uniformMatrix4fv(U.uVP,false,M.vp);gl.uniform3fv(U.uCam,F.cam.pos);gl.uniform3fv(U.uSkyT,sT);gl.uniform3fv(U.uSkyH,sH);gl.uniform3fv(U.uSkyG,sG);gl.uniform1f(U.uAmb,F.amb==null?1:F.amb);
    const LP=new Float32Array(32),LD=new Float32Array(32),LC=new Float32Array(32);
    lights.forEach((l,i)=>{const k=l.kind==='directional'?0:l.kind==='spot'?2:1,d=norm(l.dir||[0,-1,0]),c=hex(l.color),it=l.intensity==null?1:l.intensity;
      LP.set([l.pos?l.pos[0]:0,l.pos?l.pos[1]:0,l.pos?l.pos[2]:0,k],i*4);LD.set([d[0],d[1],d[2],l.range||10],i*4);
      const ki=Math.pow(Math.max(0,it),1/2.2);LC.set([c[0]*ki,c[1]*ki,c[2]*ki,Math.cos((l.angle||30)/2*D2R)],i*4)});
    gl.uniform1i(U.uNL,lights.length);gl.uniform4fv(U.uLP,LP);gl.uniform4fv(U.uLD,LD);gl.uniform4fv(U.uLC,LC);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,shTex);gl.uniform1i(U.uSh,1);gl.uniform1i(U.uHasSh,shM?1:0);gl.uniform1f(U.uShTex,SH);
    if(shM)gl.uniformMatrix4fv(U.uShM,false,shM);
    gl.activeTexture(gl.TEXTURE0);gl.uniform1i(U.uTex,0);
    for(const it of items){const me=meshes[it.shape];if(!me)continue;
      gl.uniformMatrix4fv(U.uM,false,it.M);gl.uniformMatrix3fv(U.uNM,false,nm3(it.M));gl.uniform3fv(U.uCol,hex(it.color,[.8,.8,.82]));gl.uniform1f(U.uGloss,it.gloss==null?.2:it.gloss);
      const t=texOf(it.tex);gl.bindTexture(gl.TEXTURE_2D,t||white);gl.uniform1i(U.uHasTex,t?1:0);gl.uniform1i(U.uUnlit,it.unlit?1:0);
      gl.uniform4fv(U.uUV,it.uv||[0,0,1,1]);
      gl.bindVertexArray(me.vao);gl.drawElements(gl.TRIANGLES,me.n,gl.UNSIGNED_SHORT,0)}
    /* 4) 편집용 격자 */
    if(F.grid){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
      gl.useProgram(GRID.p);const S=Math.max(60,(F.gridFade||80));gl.uniformMatrix4fv(GRID.U.uVP,false,M.vp);gl.uniform3fv(GRID.U.uC,[Math.round(F.cam.pos[0]),0,Math.round(F.cam.pos[2])]);gl.uniform1f(GRID.U.uS,S);gl.uniform3fv(GRID.U.uCam,F.cam.pos);gl.uniform1f(GRID.U.uFade,S*.9);
      gl.bindVertexArray(qvao);gl.drawArrays(gl.TRIANGLES,0,6);gl.depthMask(true);gl.disable(gl.BLEND)}
    /* 5) 선택 외곽선 */
    if(F.sel&&F.sel.size){const sel=items.filter(it=>F.sel.has(it.id));
      if(sel.length){const K=maskFor(W,H);gl.bindFramebuffer(gl.FRAMEBUFFER,K.fb);gl.viewport(0,0,W,H);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);
        gl.useProgram(DEP.p);gl.uniformMatrix4fv(DEP.U.uVP,false,M.vp);for(const it of sel){const me=meshes[it.shape];if(!me)continue;gl.uniformMatrix4fv(DEP.U.uM,false,it.M);gl.bindVertexArray(me.vao);gl.drawElements(gl.TRIANGLES,me.n,gl.UNSIGNED_SHORT,0)}
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);gl.useProgram(OUT.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,K.tex);gl.uniform1i(OUT.U.uMask,0);
        gl.uniform2f(OUT.U.uPx,1/W,1/H);gl.uniform3fv(OUT.U.uC,hex(F.selColor||'#f28c28'));gl.bindVertexArray(qvao);gl.drawArrays(gl.TRIANGLES,0,6);gl.enable(gl.DEPTH_TEST)}}
    gl.bindVertexArray(null);
    return M;
  }
  return{canvas,render,gl};
}
/* 광선 ↔ 아이템 (로컬 경계 상자) · 가장 가까운 거리 */
function hitItem(it,R){
  const S=SHAPES[it.shape];if(!S)return null;const I=inv(it.M);
  const o=tp(I,R.o),e=tp(I,[R.o[0]+R.d[0],R.o[1]+R.d[1],R.o[2]+R.d[2]]),d=[e[0]-o[0],e[1]-o[1],e[2]-o[2]];
  let t0=-Infinity,t1=Infinity;
  for(let k=0;k<3;k++){const a=S.b[0][k],b=S.b[1][k];if(Math.abs(d[k])<1e-9){if(o[k]<a||o[k]>b)return null;continue}
    let u=(a-o[k])/d[k],v=(b-o[k])/d[k];if(u>v){const t=u;u=v;v=t}t0=Math.max(t0,u);t1=Math.min(t1,v);if(t0>t1)return null}
  if(t1<0)return null;const t=t0>=0?t0:t1;
  /* 로컬 t → 세계 거리 */
  const lp=[o[0]+d[0]*t,o[1]+d[1]*t,o[2]+d[2]*t],wp=tp(it.M,lp);return Math.hypot(wp[0]-R.o[0],wp[1]-R.o[1],wp[2]-R.o[2]);
}
window.R3D={create,ok,math:MATH,shapes:SHAPES,hitItem,hex};
})();
