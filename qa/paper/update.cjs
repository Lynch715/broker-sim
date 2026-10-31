const fs=require('fs'),assert=require('assert');const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(__dirname+'/../../index.html','utf8');
function boot({url='http://localhost:49371/',sw=false,cacheKeys=['yjzq-old','yjzq-new','other-game'],fetcher,cacheFailure=false}={}){
 const errors=[],calls={fetch:[],updates:0,registered:0,puts:[],reload:[],deleted:0};const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/navigation/.test(e.message))errors.push(e.message);});
 const listeners=new Set();const worker={state:'installing',addEventListener:(n,f)=>listeners.add(f),removeEventListener:(n,f)=>listeners.delete(f)};
 const reg={installing:sw==='installing'?worker:null,waiting:null,update:async()=>{calls.updates++;if(sw==='installing')setTimeout(()=>{worker.state='activated';for(const fn of listeners)fn();},5);}};
 const dom=new JSDOM(html,{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=()=>({matches:false,addEventListener(){}});w.HTMLCanvasElement.prototype.getContext=()=>null;w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.fetch=async(url,options)=>{calls.fetch.push({url,options});return fetcher?fetcher():new Response(html+'\n<!-- latest-build -->',{status:200,headers:{'Content-Type':'text/html'}});};
  w.caches={keys:async()=>cacheKeys,open:async key=>({put:async(url,response)=>{if(cacheFailure)throw Error('cache quota');calls.puts.push({key,url,body:await response.text()});}}),delete:async()=>{calls.deleted++;}};
  if(sw)Object.defineProperty(w.navigator,'serviceWorker',{value:{controller:{},getRegistration:async()=>reg,register:async()=>{calls.registered++;return reg;}}});
 }});
 const w=dom.window,G=w.BrokerGame;G.setHeadless(true);G.newGame('update-check',null,'steady',120);G.setHeadless(false);w.renderAll();w.save();w.reopenUpdatedGame=url=>calls.reload.push(url);
 return {dom,w,d:w.document,G,calls,errors,reg};
}
let count=0;async function test(n,f){await f();count++;console.log('PASS',n);}
(async()=>{
 await test('设置页提供拉取更新，写入两代游戏缓存后只刷新一次',async()=>{
  const b=boot();b.w.showSettings();assert([...b.d.querySelectorAll('#mOpts button')].some(e=>e.textContent.startsWith('拉取更新')));
  const s=b.G.getState(),before=JSON.stringify(s);b.w.localStorage.setItem('yjzq_meta','{"exp":99}');b.w.localStorage.setItem('other-save','keep');
  assert(await b.w.pullGameUpdate());assert.equal(b.calls.fetch.length,1);assert.equal(b.calls.fetch[0].options.cache,'no-store');assert(b.calls.fetch[0].url.includes('__yjzq_update='));
  assert.deepEqual(b.calls.puts.map(p=>p.key),['yjzq-old','yjzq-new']);assert(b.calls.puts.every(p=>p.url==='http://localhost:49371/index.html'&&p.body.includes('latest-build')));
  assert.equal(b.calls.deleted,0);assert.equal(b.calls.reload.length,1);assert.equal(b.w.localStorage.getItem('yjzq_save'),before);assert.equal(b.w.localStorage.getItem('yjzq_meta'),'{"exp":99}');assert.equal(b.w.localStorage.getItem('other-save'),'keep');assert.deepEqual(b.errors,[]);b.dom.window.close();
 });
 await test('现有离线脚本更新并等待激活后刷新',async()=>{const b=boot({sw:'installing'});assert(await b.w.pullGameUpdate());assert.equal(b.calls.updates,1);assert.equal(b.calls.reload.length,1);b.dom.window.close();});
 await test('首次进入但还没有注册时建立本游戏离线缓存',async()=>{const b=boot({sw:true});b.w.navigator.serviceWorker.getRegistration=async()=>null;assert(await b.w.pullGameUpdate());assert(b.calls.registered>=1);assert.equal(b.calls.updates,1);b.dom.window.close();});
 await test('离线、错误状态和下载不完整均保留页面与存档',async()=>{
  for(const fetcher of [()=>Promise.reject(Error('offline')),()=>new Response('not found',{status:503}),()=>new Response('<html>yjzq_save BrokerGame',{status:200})]){
   const b=boot({fetcher}),raw=b.w.localStorage.getItem('yjzq_save');assert(!await b.w.pullGameUpdate());assert.equal(b.calls.reload.length,0);assert.equal(b.calls.puts.length,0);assert.equal(b.w.localStorage.getItem('yjzq_save'),raw);assert.equal(b.d.querySelector('#mTitle').textContent,'更新未完成');assert(b.d.querySelector('#mOpts').textContent.includes('重试拉取更新'));b.dom.window.close();
  }
 });
 await test('存档写入失败时不发请求、不刷新，并保留导出入口',async()=>{const b=boot(),raw=b.w.localStorage.getItem('yjzq_save');b.w.Storage.prototype.setItem=()=>{throw Error('storage blocked');};assert(!await b.w.pullGameUpdate());assert.equal(b.calls.fetch.length,0);assert.equal(b.calls.reload.length,0);assert.equal(b.w.localStorage.getItem('yjzq_save'),raw);assert(b.d.querySelector('#mOpts').textContent.includes('导出存档'));b.dom.window.close();});
 await test('缓存写入或离线脚本更新失败时不谎报成功',async()=>{for(const kind of ['cache','worker']){const b=boot({sw:kind==='worker',cacheFailure:kind==='cache'});if(kind==='worker')b.reg.update=async()=>{throw Error('worker failed');};assert(!await b.w.pullGameUpdate());assert.equal(b.calls.reload.length,0);assert.equal(b.d.querySelector('#mTitle').textContent,'更新未完成');b.dom.window.close();}});
 await test('连续点击只产生一次下载与一次刷新',async()=>{let resolve;const pending=new Promise(r=>resolve=r),b=boot({fetcher:()=>pending});const first=b.w.pullGameUpdate();assert(!await b.w.pullGameUpdate());assert.equal(b.calls.fetch.length,1);resolve(new Response(html));assert(await first);assert.equal(b.calls.reload.length,1);b.dom.window.close();});
 await test('月末处理中禁用更新，直接调用也不覆盖当前事项',async()=>{const b=boot();b.G.getState().energy=0;b.w.endMonth();assert(b.w.saveImportBusy());const title=b.d.querySelector('#mTitle').textContent;assert(!await b.w.pullGameUpdate());assert.equal(b.d.querySelector('#mTitle').textContent,title);assert.equal(b.calls.fetch.length,0);b.w.showSettings();assert([...b.d.querySelectorAll('#mOpts button')].find(x=>x.textContent.startsWith('拉取更新')).disabled);b.dom.window.close();});
 await test('浏览器缺少下载接口时给出提示，不尝试下载',async()=>{const b=boot();Object.defineProperty(b.w,'fetch',{value:undefined});assert(!await b.w.pullGameUpdate());assert.equal(b.calls.fetch.length,0);assert.equal(b.calls.reload.length,0);assert.equal(b.d.querySelector('#mTitle').textContent,'暂时无法自动更新');b.dom.window.close();});
 await test('备用中文入口也更新自身缓存并保留路径',async()=>{const b=boot({url:'http://localhost:49371/broker/模拟券商.html?old=1'});assert(await b.w.pullGameUpdate());assert(b.calls.puts.every(p=>decodeURI(p.url)==='http://localhost:49371/broker/模拟券商.html'));assert(decodeURI(b.calls.reload[0]).includes('/broker/模拟券商.html?__yjzq_update='));b.dom.window.close();});
 await test('下载等待有超时上限，不会无限停在加载页',async()=>{const b=boot();await assert.rejects(b.w.gameUpdateTimeout(new Promise(()=>{}),5),/下载超时/);b.dom.window.close();});
 await test('失败后可以重新拉取，成功后仍只刷新一次',async()=>{const b=boot({fetcher:()=>Promise.reject(Error('offline'))});assert(!await b.w.pullGameUpdate());b.w.fetch=async()=>new Response(html);assert(await b.w.pullGameUpdate());assert.equal(b.calls.reload.length,1);b.dom.window.close();});
 console.log(count+' update checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
