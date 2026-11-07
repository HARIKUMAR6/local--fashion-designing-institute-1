// Brand consistency (computed-style ratios across every page/theme/dir/width) + Contact map load/interaction.
import fs from 'node:fs';
import { launch, newPage, sleep } from './cdp.mjs';
const ROOT = 'file:///D:/Nov/Nov%20slot%201/Fashion%20Designing%20Institute/';
const c = await launch(9921);
let fails = 0; const log = (ok, m) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); };
fs.mkdirSync('tests/screenshots/brand-map', { recursive: true });
const pages = ['index','home-2','about','courses','gallery','contact','login','dashboard/index'];
const measure = `(()=>[...document.querySelectorAll('.brand-lockup')].filter(l=>l.offsetParent!==null||getComputedStyle(l).position==='fixed').map(l=>{
 const n=l.querySelector('.brand-lockup__name'),e=l.querySelector('.brand-lockup__emblem'),cs=getComputedStyle(n),fs=parseFloat(cs.fontSize),r=l.getBoundingClientRect(),er=e.getBoundingClientRect(),em=n.querySelector('em');
 const ec=getComputedStyle(e);
 return {where:l.closest('header,footer,aside,.tb,.pl,main')?.tagName+(l.closest('.sb')?'.sb':l.closest('.tb')?'.tb':''),text:n.textContent.trim(),fam:cs.fontFamily.split(',')[0],wt:cs.fontWeight,ls:+(parseFloat(cs.letterSpacing)/fs).toFixed(3),emLs:+(parseFloat(getComputedStyle(em).letterSpacing)/fs).toFixed(3),emStyle:getComputedStyle(em).fontStyle,gap:+(parseFloat(getComputedStyle(l).columnGap)/fs).toFixed(3),ew:+(er.width/fs).toFixed(3),eh:+(er.height/fs).toFixed(3),ebg:ec.getPropertyValue('--emblem-bg').trim()||'',use:e.querySelector('use')?.getAttribute('href'),onscreen:r.width>0&&r.right>0&&r.left<innerWidth,fits:r.right<=innerWidth+0.5&&r.left>=-0.5,clipped:n.scrollWidth>n.clientWidth+1,fs:+fs.toFixed(1),nameColor:cs.color,href:l.getAttribute('href')};}))()`;
let ref = null; const seen = new Set();
for (const [w,h] of [[1440,900],[1100,800],[768,1024],[390,844]]) for (const [theme,dir] of [['light','ltr'],['dark','rtl']]) for (const pg of pages) {
  const p = await newPage(c.port);
  await p.viewport(w,h,w<768); await p.goto(ROOT+'about.html');
  await p.eval(`localStorage.clear();localStorage.setItem('atelier_elan_theme','${theme}');localStorage.setItem('atelier_elan_dir_mode','${dir}')`);
  await p.goto(ROOT+pg+'.html'); await sleep(400);
  const arr = await p.eval(measure);
  for (const m of arr.filter((x)=>x.onscreen)) {
    ref ??= m;
    const near=(a,b)=>Math.abs(a-b)<=0.02; const same = m.text==='ATELIER ÉLAN' && m.fam===ref.fam && m.wt===ref.wt && near(m.ls,ref.ls) && near(m.emLs,ref.emLs) && m.emStyle==='italic' && near(m.gap,ref.gap) && near(m.ew,ref.ew) && near(m.eh,ref.eh) && m.use && /#ae-(emblem|mark)/.test(m.use);
    const key = `${pg}|${m.where}|${w}|${theme}`;
    if (!same || !m.fits || m.clipped) log(false, `${pg} ${m.where} ${w}px ${theme}/${dir}: ${JSON.stringify(m)} vs ref ${JSON.stringify({ls:ref.ls,gap:ref.gap,ew:ref.ew,eh:ref.eh,fam:ref.fam,wt:ref.wt})}`);
    seen.add(key);
  }
  // identity of the emblem colours must not differ by place: --emblem-bg identical (empty = default burgundy) 
  const bgs = [...new Set(arr.filter((x)=>x.onscreen).map((m) => m.ebg))];
  if (bgs.length > 1) log(false, `${pg} ${w} ${theme}: emblem colour tokens differ ${bgs}`);
  const hrefs = arr.filter((x)=>x.onscreen).map((m) => m.href); if (!hrefs.every((x) => /index\.html$/.test(x))) log(false, `${pg}: lockup not linked to Home ${hrefs}`);
  if ((pg==='dashboard/index'||pg==='login') && ((w===1440&&theme==='light')||(w===390&&theme==='dark'))) await p.shot(`tests/screenshots/brand-map/${pg.replace('/','_')}-${w}-${theme}.png`, false);
  p.close();
}
log(true, `brand lockups compared: ${seen.size} page/location/size/theme combos (any mismatch is reported above as FAIL)`);

// ---------------- MAP ----------------
for (const [w,h,theme,dir] of [[1440,900,'light','ltr'],[768,1024,'dark','rtl'],[390,844,'light','ltr']]) {
  const p = await newPage(c.port); const resp = [];
  p.on((d) => { if (d.method==='Network.responseReceived') resp.push({u:d.params.response.url,s:d.params.response.status}); });
  await p.viewport(w,h,w<768); await p.goto(ROOT+'about.html');
  await p.eval(`localStorage.clear();localStorage.setItem('atelier_elan_theme','${theme}');localStorage.setItem('atelier_elan_dir_mode','${dir}')`);
  await p.goto(ROOT+'contact.html');
  await p.eval(`document.getElementById('map-slot').scrollIntoView({block:'center'})`); await sleep(6000);
  const m = await p.eval(`(()=>{const s=document.getElementById('map-slot'),f=s.querySelector('iframe'),r=f?.getBoundingClientRect(),sr=s.getBoundingClientRect();return {state:s.dataset.state,src:f?.src,title:f?.title,fw:Math.round(r?.width||0),fh:Math.round(r?.height||0),sw:Math.round(sr.width),sh:Math.round(sr.height),ovf:document.documentElement.scrollWidth-document.documentElement.clientWidth,cap:document.getElementById('map-caption').textContent,link:document.getElementById('map-link').href,pendingVisible:!!(document.getElementById('map-pending')&&!document.getElementById('map-pending').hidden),marker:/marker=/.test(f?.src||''),bodyHasPending:document.body.innerText.includes('Location pending confirmation')}})()`);
  const tag = `${w}px ${theme}/${dir}`;
  log(m.state==='area' && /openstreetmap\.org\/export\/embed\.html/.test(m.src), `${tag}: OSM iframe injected (state=${m.state})`);
  log(!m.marker && !m.pendingVisible && !m.bodyHasPending, `${tag}: no marker param, placeholder gone`);
  log(/Area map/.test(m.cap) && /not the institute/.test(m.cap), `${tag}: caption labels it a general area map`);
  log(Math.abs(m.sw-m.fw)<=2 && Math.abs(m.sh-m.fh)<=2 && m.fh>200 && m.ovf<=0, `${tag}: iframe fills frame ${m.fw}x${m.fh}, page overflow ${m.ovf}`);
  const embed = resp.find((r)=>/openstreetmap\.org\/export\/embed/.test(r.u));
  log(embed?.s===200, `${tag}: embed document HTTP ${embed?.s}`);
  await p.shot(`tests/screenshots/brand-map/map-${w}-${theme}-a.png`, false);
  if (w===1440) {
    const r = await p.eval(`(()=>{const r=document.querySelector('#map-slot iframe').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    await p.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:r.x,y:r.y,deltaX:0,deltaY:-600});
    await sleep(2500);
    await p.send('Input.dispatchMouseEvent',{type:'mousePressed',x:r.x,y:r.y,button:'left',clickCount:1});
    await p.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:r.x-200,y:r.y-80,button:'left'});
    await p.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:r.x-200,y:r.y-80,button:'left',clickCount:1});
    await sleep(2500);
    await p.shot(`tests/screenshots/brand-map/map-${w}-${theme}-b.png`, false);
  }
  p.close();
}
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails?1:0);
