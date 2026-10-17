// 토목옹벽(옹벽 구조물 안전성 검토) 매뉴얼 화면 캡처 — usage: node capture_rw.js <repoDir> <outDir>
// 규격: 1440×900 · DSF 1.25 (영상용 좁은 화면: MM_VW=720 MM_VH=1280 MM_DSF=2) · serviceWorkers block · _marks.json · _example.json
const {chromium}=require(process.env.MM_PW||'playwright');const fs=require('fs');const path=require('path');const {setup,server}=require('./serve');
const repo=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
const VW=+(process.env.MM_VW||1440),VH=+(process.env.MM_VH||900),DSF=+(process.env.MM_DSF||1.25),PORT=8979;
const HIDE='#pwa-install-banner,#pwa-banner,.pwa-banner,.pwa-update-bar,#sw-update-bar,.toast,#fab-group,.bottom-bar,.net-toast,.pwa-done-toast{display:none!important} *{animation:none!important;transition:none!important} .main-wrap{padding-bottom:20px!important}';
const HELP=`window.__vis=e=>e&&e.getClientRects().length>0;
window.__find=sel=>{
 if(sel.startsWith('card:')){const t=sel.slice(5);return [...document.querySelectorAll('.card')].find(c=>__vis(c)&&c.querySelector('.card-tit')&&c.querySelector('.card-tit').textContent.includes(t))||null;}
 if(sel.startsWith('fg:')){const t=sel.slice(3);return [...document.querySelectorAll('.fgrp')].find(g=>__vis(g)&&g.querySelector('.flbl')&&g.querySelector('.flbl').textContent.includes(t))||null;}
 if(sel.startsWith('row:')){const [q,t]=sel.slice(4).split('|');return [...document.querySelectorAll(q+' tr')].find(g=>__vis(g)&&g.textContent.includes(t))||null;}
 if(sel.startsWith('nth:')){const [q,i]=sel.slice(4).split('|');return [...document.querySelectorAll(q)].filter(__vis)[+i]||null;}
 for(const s of sel.split(',')){const e=[...document.querySelectorAll(s)].find(__vis);if(e)return e;}return null;};
window.__date=()=>['g-date','c-date','an-date'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='2026-10-17';});
window.__set=(o)=>Object.keys(o).forEach(k=>{document.getElementById(k).value=o[k];});
window.__gA=()=>{switchTab('gravity');resetGravity();__set({'g-Df':'1.0'});__date();calcCurrent();};
window.__gB=()=>{__gA();__set({'g-Df':'0.5'});calcCurrent();};
window.__cA=()=>{switchTab('cantilever');resetCantilever();__set({'c-Df':'1.0'});__date();calcCurrent();};
window.__cB=()=>{__cA();__set({'c-B':'3.7'});calcCurrent();};
window.__anA=()=>{switchTab('anchored');resetAnchored();__set({'an-T':'100','an-La':'8.0','an-Lf':'5.0'});__date();calcCurrent();};
window.__anB=()=>{switchTab('anchored');resetAnchored();__date();calcCurrent();};
window.__a4=t=>{switchTab('a4preview');selectPreviewWall(t,'a4');window.scrollTo(0,0);};
window.__help=t=>{if(!_helpOpen)toggleHelp();switchHelpTab(t);};`;
const GA="__gA();window.scrollTo(0,0)";
const SHOTS=[
 {id:'s01_overview',pre:GA,clip:'viewport',m:[['nth:.tb|0','형식 탭 3개 + A4'],['#mm-manual-btn','📘 매뉴얼'],['.sum-bar','요약 바'],['nth:#panel-gravity .card|0','입력'],['#g-result-panel .result-hero','결과']]},
 {id:'s02_header',clip:'.hdr-shell',m:[['.hdr-h1','도구 이름 · Ver-5.1'],['#mm-manual-btn','📘 매뉴얼 — 탭 막대 끝'],['.hdr-right','KDS 11 80 05 · 11 60 00 (2025. 12. 24.)'],['.tab-bar-inner','형식 탭']]},
 {id:'s03_g_basic',clip:'nth:#panel-gravity .card|0',m:[['fg:현장명','현장명'],['fg:작성자','작성자'],['fg:작성일','작성일']]},
 {id:'s04_g_section',clip:'card:단면 제원',m:[['fg:옹벽 높이 H','높이 H'],['fg:저면폭 B','저면폭 B'],['fg:상단폭 a','상단폭 a'],['fg:배면 경사 θ','배면 경사 θ — 자동'],['fg:단위중량 γc','콘크리트 γc'],['fg:fck','fck — 단면설계 별도']]},
 {id:'s05_g_soil',clip:'nth:#panel-gravity .card|2',m:[['fg:단위중량 γs','뒤채움 γs'],['fg:내부마찰각','φ'],['fg:점착력','c — 특수설계'],['fg:배면경사각','배면 경사 β'],['fg:기초 마찰계수','μ'],['fg:허용지지력','qa = qu/3'],['fg:상재하중','상재하중 10 kN/m²'],['fg:근입깊이','근입깊이 ≥ 1.0 m']]},
 {id:'s06_g_hero',clip:'#g-result-panel .result-hero',to:'#g-result-panel .stat-grid',m:[['#g-result-panel .rh-num','전도 Fs'],['nth:#g-result-panel .sbox|0','활동'],['nth:#g-result-panel .sbox|1','전도'],['nth:#g-result-panel .sbox|2','지반반력'],['nth:#g-result-panel .sbox|3','근입깊이']]},
 {id:'s07_g_detail',clip:'card:안정 검토 상세',m:[['row:#g-result-panel|활동 Fs','활동 1.5'],['row:#g-result-panel|전도 Fs','전도 2.0'],['row:#g-result-panel|최대지반반력','qmax ≤ qa'],['row:#g-result-panel|편심','편심 — 참고'],['row:#g-result-panel|토압계수','Coulomb Ka']]},
 {id:'s08_g_df',pre:"__gB()",clip:'#g-result-panel .result-hero',to:'#g-result-panel .nb.red',post:"__gA()",m:[['nth:#g-result-panel .sbox|3','근입 0.5 m — NG'],['#g-result-panel .nb.red','보완 권고']]},
 {id:'s09_c_input',pre:"__cA()",clip:'nth:#panel-cantilever .card|0',m:[['fg:옹벽 높이','벽체 높이 H'],['fg:기초저면폭','저면폭 B'],['fg:전면 돌출','앞굽 bt'],['fg:기초 두께','저판 tf'],['fg:벽체 두께','벽체 tw'],['fg:허용지지력','qa = qu/3']]},
 {id:'s10_c_soil',clip:'nth:#panel-cantilever .card|1',m:[['fg:점착력','c'],['fg:배면경사각','β — Rankine 반영'],['fg:근입깊이','근입깊이'],['fg:fck','단면설계 별도']]},
 {id:'s11_c_ng',clip:'#c-result-panel .result-hero',to:'#c-result-panel .nb.red',m:[['nth:#c-result-panel .sbox|0','활동 1.446 — NG'],['#c-result-panel .nb.red','shear key · 저판 확대']]},
 {id:'s12_c_ok',pre:"__cB()",clip:'#c-result-panel .result-hero',to:'#c-result-panel .stat-grid',m:[['#c-result-panel .rh-num','전도 Fs'],['nth:#c-result-panel .sbox|0','활동 — B 3.7 m'],['nth:#c-result-panel .sbox|2','지반반력']]},
 {id:'s13_c_diagram',clip:'card:단면 다이어그램 (역T형)',m:[]},
 {id:'s14_an_input',pre:"__anA()",clip:'nth:#panel-anchored .card|0',m:[['fg:앵커 형식','앵커 형식'],['fg:설치각도','설치각 ≥ 10°'],['fg:수평간격','수평간격'],['fg:수직간격','연직간격'],['fg:설계앵커력','설계앵커력 T'],['fg:정착장','정착장 La']]},
 {id:'s15_an_cond',clip:'nth:#panel-anchored .card|1',m:[['fg:상재하중','상재하중'],['fg:앵커 직경','천공경 D'],['fg:자유장','자유장 ≥ 4.0 m'],['fg:극한주면마찰력','τu'],['fg:사용기간','가설 / 영구'],['fg:강연선 규격','강연선 규격'],['fg:강연선 개수','가닥 수']]},
 {id:'s16_an_hero',clip:'#an-result-panel .result-hero',to:'#an-result-panel .stat-grid',m:[['#an-result-panel .rh-num','T / Ta'],['nth:#an-result-panel .sbox|0','필요앵커력'],['nth:#an-result-panel .sbox|1','허용인발력'],['nth:#an-result-panel .sbox|2','허용인장력']]},
 {id:'s17_an_detail',clip:'card:앵커 검토 상세',m:[['row:#an-result-panel|필요앵커력','필요앵커력'],['row:#an-result-panel|허용인발력','Fs 2.5 (영구)'],['row:#an-result-panel|허용인장력','0.60Tu · 0.75Ty'],['row:#an-result-panel|자유장','자유장 4.0 m']]},
 {id:'s18_an_ng',pre:"__anB()",clip:'#an-result-panel .result-hero',to:'#an-result-panel .nb.amber',post:"__anA()",m:[['nth:#an-result-panel .sbox|1','인발 부족'],['nth:#an-result-panel .sbox|3','자유장 3.0 m'],['#an-result-panel .nb.red','보완 권고'],['#an-result-panel .nb.amber','전체 안정성 — 별도 해석']]},
 {id:'s19_a4bar',pre:"__gA();__cB();__anA();__a4('gravity')",wait:900,clip:'viewport',m:[['.preview-sel-bar','형식 선택'],['.mm-btn-print','인쇄 · PDF'],['#btn-jpg','JPG 저장'],['#a4iso-content','A4 보고서']]},
 {id:'s20_a4page',clip:'#a4iso-content',m:[]},
 {id:'s21_a4anchor',pre:"__a4('anchored')",wait:700,clip:'#a4iso-content',m:[]},
 {id:'s22_help_law',pre:"__help('law')",wait:500,fixed:true,clip:'#help-panel',m:[]},
 {id:'s23_help_formula',pre:"__help('formula')",wait:400,fixed:true,clip:'#help-panel',post:"toggleHelp();__gA()",m:[]},
];
(async()=>{
 const s=await server(repo,PORT);const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:VW,height:VH},deviceScaleFactor:DSF,serviceWorkers:'block',locale:'ko-KR'});await setup(ctx);
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>{errs.push('dialog '+d.message());d.dismiss();});
 await pg.goto(`http://127.0.0.1:${PORT}/index.html`);await pg.waitForFunction(()=>window.RWENG);await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(1200);
 await pg.addStyleTag({content:HIDE});await pg.evaluate(HELP);await pg.evaluate('__date()');await pg.waitForTimeout(300);
 const meta={};
 for(const S of SHOTS){
  if(S.pre){try{await pg.evaluate(S.pre);}catch(e){errs.push(S.id+' pre '+e.message);}}
  await pg.evaluate('__date()');
  await pg.waitForTimeout(S.wait||450);
  if(S.clip!=='viewport'&&!S.fixed){await pg.evaluate(c=>{const e=__find(c);if(e){window.scrollTo(0,e.getBoundingClientRect().top+scrollY-40);}},S.clip);await pg.waitForTimeout(350);}
  const info=await pg.evaluate(({S,VW,VH})=>{
   const abs=e=>{const r=e.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height};};
   let clip;
   if(S.clip==='viewport'){clip={x:0,y:scrollY,width:VW,height:VH};}
   else{const el=__find(S.clip);if(!el)return {err:'clip '+S.clip};const a=abs(el);const P=S.fixed?0:10;clip={x:Math.max(0,a.x-P),y:Math.max(0,a.y-P),width:a.w+2*P,height:a.h+2*P};
     if(S.to){const t=__find(S.to);if(t){const r=abs(t);clip.height=r.y+r.h+P-clip.y;}}}
   const marks=[];(S.m||[]).forEach(([sel,label],i)=>{const e=__find(sel);if(!e){marks.push({n:i+1,label,miss:sel});return;}const a=abs(e);
     marks.push({n:i+1,label,x:+((a.x-clip.x)/clip.width*100).toFixed(2),y:+((a.y-clip.y)/clip.height*100).toFixed(2),w:+(Math.min(a.w,clip.x+clip.width-a.x)/clip.width*100).toFixed(2),h:+(Math.min(a.h,clip.y+clip.height-a.y)/clip.height*100).toFixed(2)});});
   return {clip,marks};},{S,VW,VH});
  if(info.err){errs.push(S.id+' '+info.err);continue;}
  const c=info.clip;const cl={x:Math.max(0,c.x),y:Math.max(0,c.y),width:Math.min(c.width,VW-Math.max(0,c.x)),height:c.height};
  if(S.clip==='viewport'){await pg.screenshot({path:path.join(out,S.id+'.png'),clip:{x:0,y:0,width:VW,height:VH}});}
  else if(S.fixed){const sy=await pg.evaluate(()=>scrollY),sx=await pg.evaluate(()=>scrollX);await pg.screenshot({path:path.join(out,S.id+'.png'),clip:{x:Math.max(0,c.x-sx),y:Math.max(0,c.y-sy),width:Math.min(c.width,VW),height:Math.min(c.height,VH-Math.max(0,c.y-sy))}});}
  else{await pg.screenshot({path:path.join(out,S.id+'.png'),clip:cl,fullPage:true});}
  meta[S.id]={w:Math.round(cl.width),h:Math.round(Math.min(cl.height,S.fixed?VH:1e9)),marks:info.marks};
  if(S.post){try{await pg.evaluate(S.post);}catch(e){errs.push(S.id+' post '+e.message);}await pg.waitForTimeout(300);}
 }
 const EX=await pg.evaluate(()=>{const pk=r=>{const o={};['allPass','Fs_o','Fs_s','qmax','e','tri','Ka','Ea','Pv','SV','SH','Mr','Mo','theta','delta','Df','B','pass_o','pass_s','pass_b','pass_d','Treq','Tpull','Tten','Ta','Pu','T','La','Lf','n_rows','pass_req','pass_pull','pass_ten','pass_Lf','pass_La','pass_ang'].forEach(k=>{if(r[k]!==undefined)o[k]=r[k];});return o;};
  const o={};__gA();o.gA=pk(G.result);__gB();o.gB=pk(G.result);__cA();o.cA=pk(C_RES.result);__cB();o.cB=pk(C_RES.result);__anA();o.anA=pk(AN_RES.result);__anB();o.anB=pk(AN_RES.result);
  o.gOld={Fo:2.93,Fs:1.47,note:'v5.0 기본값 — 삼각형 도심 2/3 · 상재하중 전폭 · Rankine'};
  __gA();__cB();__anA();switchTab('gravity');return o;});
 fs.writeFileSync(path.join(out,'_example.json'),JSON.stringify(EX,null,1));
 const mctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block',isMobile:true,hasTouch:true,locale:'ko-KR'});await setup(mctx);
 const mp=await mctx.newPage();await mp.goto(`http://127.0.0.1:${PORT}/index.html`);await mp.waitForFunction(()=>window.RWENG);await mp.waitForTimeout(1200);await mp.addStyleTag({content:HIDE});await mp.evaluate(HELP);
 await mp.screenshot({path:path.join(out,'s24_mobile_main.png')});meta['s24_mobile_main']={w:390,h:844,marks:[]};
 await mp.evaluate(GA);await mp.waitForTimeout(500);await mp.evaluate(()=>{const e=document.querySelector('#g-result-panel .result-hero');window.scrollTo(0,e.getBoundingClientRect().top+scrollY-12);});await mp.waitForTimeout(400);
 await mp.screenshot({path:path.join(out,'s25_mobile_result.png')});meta['s25_mobile_result']={w:390,h:844,marks:[]};
 const mob=await mp.evaluate(()=>({page:document.documentElement.scrollWidth,vw:innerWidth}));
 fs.writeFileSync(path.join(out,'_marks.json'),JSON.stringify(meta,null,1));
 const miss=[];Object.entries(meta).forEach(([k,v])=>v.marks.forEach(m=>{if(m.miss)miss.push(k+':'+m.miss);else if(m.x<0||m.y<0||m.x+m.w>100.5||m.y+m.h>100.5||m.w<=0||m.h<=0)miss.push(k+':OUT '+m.label+' '+m.x+','+m.y+','+m.w+','+m.h);}));
 console.log(JSON.stringify({mobile:mob,sizes:Object.fromEntries(Object.entries(meta).map(([k,v])=>[k,v.w+'x'+v.h])),miss,errs:errs.slice(0,15)},null,1));
 await b.close();s.close();
})();
