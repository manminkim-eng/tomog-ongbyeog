// 스모크: 로드 · 콘솔 오류 · 중력식 · 캔틸레버 · 앵커식 계산 · A4 · 가로 넘침 · 매뉴얼 버튼 (1440 · 390)
const {chromium}=require('playwright');const {setup,server}=require('./serve.js');const path=require('path');
const out=process.argv[2]||'/tmp';
(async()=>{const repo=path.resolve(__dirname,'../..');const srv=await server(repo,8917);const b=await chromium.launch();const R=[];
for(const w of [1440,390]){const ctx=await b.newContext({viewport:{width:w,height:900},serviceWorkers:'block'});await setup(ctx);const pg=await ctx.newPage();const errs=[];
 pg.on('pageerror',e=>errs.push('PE '+e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('CE '+m.text())});
 await pg.goto('http://127.0.0.1:8917/index.html');await pg.waitForFunction(()=>window.RWENG,null,{timeout:20000});await pg.waitForTimeout(600);
 const res={};
 for(const [tab,key] of [['gravity','G'],['cantilever','C_RES'],['anchored','AN_RES']]){
   await pg.evaluate(t=>{switchTab(t);calcCurrent();},tab);await pg.waitForTimeout(250);
   res[tab]=await pg.evaluate(k=>{const r=window[k].result;return {all:r.allPass,Fo:r.Fs_o!=null?+r.Fs_o.toFixed(3):null,Fs:r.Fs_s!=null?+r.Fs_s.toFixed(3):null,qmax:r.qmax!=null?+r.qmax.toFixed(1):null,Treq:r.Treq!=null?+r.Treq.toFixed(1):null,Ta:r.Ta!=null?+r.Ta.toFixed(1):null}},key);
   await pg.screenshot({path:out+'/'+tab+'_'+w+'.png',fullPage:true});
   await pg.evaluate(()=>{switchTab('a4preview');});await pg.waitForTimeout(300);
   res[tab].a4=await pg.evaluate(()=>{const t=document.getElementById('a4iso-content').innerText;return {kds:/KDS 11 80 05|KDS 11 60 00/.test(t),old:/KDS 11 80 10|KDS 11 50 15|KDS 14 20 54|구조물기초설계기준|제60조/.test(t)}});
   await pg.screenshot({path:out+'/a4_'+tab+'_'+w+'.png',fullPage:true});
 }
 const alpha=await pg.evaluate(()=>document.getElementById('g-alpha').value);
 const ov=await pg.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 const man=await pg.evaluate(()=>{const a=document.getElementById('mm-manual-btn');return a?getComputedStyle(a).color+'|'+getComputedStyle(a).marginLeft:null});
 const oldTxt=await pg.evaluate(()=>/KDS 11 80 10|KDS 11 50 15|KDS 14 20 54|구조물기초설계기준|제60조/.test(document.body.innerText));
 R.push({w,res,alpha,ov,man,oldTxt,errs});await ctx.close();}
console.log(JSON.stringify(R,null,1));await b.close();srv.close();})();
