// 공용: 저장소를 로컬 서버로 띄우고 CDN(unpkg·cdnjs·jsdelivr)·구글폰트를 로컬 파일로 대체
// 경로 V(vendor)는 실행 환경에 맞게 수정 — npm pack 으로 받은 react·react-dom·@babel/standalone·html2canvas·pretendard·@fontsource/*
const http=require('http'),fs=require('fs'),path=require('path');
const V=process.env.MM_VENDOR||'/home/claude/vendor';
const dir=p=>V+'/'+fs.readdirSync(V).find(d=>d.startsWith(p)&&!d.endsWith('.tgz'));
const MAP={'html2canvas.min.js':dir('html2canvas-')+'/dist/html2canvas.min.js','react.production.min.js':dir('react-18')+'/package/umd/react.production.min.js','react-dom.production.min.js':dir('react-dom-')+'/package/umd/react-dom.production.min.js','babel.min.js':dir('babel-standalone-')+'/package/babel.min.js'};
const PRET=dir('pretendard-')+'/dist/web/static/';
const F=p=>'data:font/woff2;base64,'+fs.readFileSync(p).toString('base64');
const fo=(pkg,f)=>dir('fontsource-'+pkg+'-')+'/files/'+f;
function fontCSS(){return ['700','900'].map(w=>`@font-face{font-family:'Orbitron';src:url(${F(fo('orbitron','orbitron-latin-'+w+'-normal.woff2'))});font-weight:${w}}`).join('\n')+'\n'+
 ['400','600','700'].map(w=>`@font-face{font-family:'JetBrains Mono';src:url(${F(fo('jetbrains-mono','jetbrains-mono-latin-'+w+'-normal.woff2'))});font-weight:${w}}`).join('\n')+'\n'+
 ['400','500','600'].map(w=>`@font-face{font-family:'Source Code Pro';src:url(${F(fo('source-code-pro','source-code-pro-latin-'+w+'-normal.woff2'))});font-weight:${w}}`).join('\n')+'\n'+
 ['400','500'].map(w=>`@font-face{font-family:'DM Mono';src:url(${F(fo('dm-mono','dm-mono-latin-'+w+'-normal.woff2'))});font-weight:${w}}`).join('\n')+
 `\n@font-face{font-family:'Noto Sans KR';src:url(${F(path.join(__dirname,'..','assets','fonts','NotoSansKR-var.woff2'))}) format('woff2');font-weight:100 900}`;}
async function setup(ctx){
  let css='';try{css=fontCSS();}catch(e){css='';}
  await ctx.route(/fonts\.googleapis\.com\/css/, r=>r.fulfill({status:200,contentType:'text/css',body:css}));
  await ctx.route(/(unpkg\.com|cdnjs\.cloudflare\.com)/, r=>{const n=r.request().url().split('/').pop();const f=MAP[n];f?r.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:fs.readFileSync(f)}):r.abort();});
  await ctx.route(/cdn\.jsdelivr\.net\/gh\/orioncactus\/pretendard/, r=>{const u=r.request().url().split('/dist/web/static/')[1]||'';const f=PRET+u.split('?')[0];
    fs.existsSync(f)?r.fulfill({status:200,contentType:f.endsWith('.css')?'text/css':'font/woff2',headers:{'access-control-allow-origin':'*'},body:fs.readFileSync(f)}):r.abort();});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)(?!unpkg)(?!cdnjs)(?!cdn\.jsdelivr)(?!fonts\.googleapis)/, r=>r.abort());
}
function server(repo,port){return new Promise(res=>{const s=http.createServer((q,w)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
 fs.readFile(path.join(repo,p),(e,d)=>{if(e){w.writeHead(404);w.end();return;}const ext=path.extname(p);const ct={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.pdf':'application/pdf','.ico':'image/x-icon'}[ext]||'application/octet-stream';w.writeHead(200,{'Content-Type':ct});w.end(d);});});s.listen(port,()=>res(s));});}
module.exports={setup,server};
