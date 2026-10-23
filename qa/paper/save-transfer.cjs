const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(__dirname+'/../../index.html','utf8');
function boot({source=html,store={},failKey=null}={}){
 const errors=[],downloads=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/navigation/.test(e.message))errors.push(e.message);});
 const dom=new JSDOM(source,{url:'http://localhost:8797',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=()=>({matches:false,addEventListener(){}});w.HTMLCanvasElement.prototype.getContext=()=>null;w.HTMLElement.prototype.scrollIntoView=()=>{};
  for(const [k,v] of Object.entries(store))w.localStorage.setItem(k,v);
  w.URL.createObjectURL=blob=>{downloads.push({blob});return 'blob:save-test';};w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){downloads[downloads.length-1].name=this.download;};
  const original=w.Storage.prototype.setItem;w.Storage.prototype.setItem=function(k,v){if(k===failKey){failKey=null;throw new Error('storage blocked');}return original.call(this,k,v);};
 }});return {dom,w:dom.window,d:dom.window.document,errors,downloads};
}
function fresh(b){b.w.BrokerGame.setHeadless(true);b.w.BrokerGame.newGame('存档验收',null,'steady',120);b.w.BrokerGame.setHeadless(false);b.w.renderAll();b.d.querySelector('#guide').classList.remove('show');b.w.save();}
function readBlob(w,blob){return new Promise((resolve,reject)=>{const r=new w.FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsText(blob);});}
async function select(b,text){b.w.readGameBackup(new b.w.File([text],'存档.json',{type:'application/json'}));await new Promise(r=>setTimeout(r,30));}
const stored=b=>[b.w.localStorage.getItem('yjzq_save'),b.w.localStorage.getItem('yjzq_meta')];
let count=0;async function test(name,fn){await fn();count++;console.log('PASS',name);}
(async()=>{
 let raw,meta,backup;
 await test('正常设置可见入口，导出保留存档和图鉴原始字节及随机状态',async()=>{
  const b=boot();fresh(b);meta=JSON.stringify({runs:3,endings:{win:1},ach:{a:1},talents:{x:2},exp:8});b.w.localStorage.setItem('yjzq_meta',meta);const legacy=JSON.parse(stored(b)[0]);delete legacy.business;b.w.localStorage.setItem('yjzq_save',JSON.stringify(legacy));raw=stored(b)[0];b.w.showSettings();
  const entry=[...b.d.querySelectorAll('#mOpts button')].find(x=>x.textContent.includes('存档导入'));assert(entry);entry.click();assert(!b.d.querySelector('#saveTools').hidden);
  b.d.querySelector('#saveExport').click();backup=await readBlob(b.w,b.downloads[0].blob);const o=JSON.parse(backup);assert.equal(o.save,raw);assert.equal(o.meta,meta);assert.deepEqual(stored(b),[raw,meta]);assert(b.downloads[0].name.endsWith('.json'));assert.deepEqual(b.errors,[]);b.dom.window.close();
 });
 await test('导入先预览且不改数据，确认后保留导入前备份并可重新载入',async()=>{
  const b=boot();fresh(b);const s=b.w.BrokerGame.getState();s.cash=54321;s.month=25;b.w.save();const before=stored(b);b.w.showSaveTools();await select(b,backup);
  assert(!b.d.querySelector('#saveImportConfirm').hidden,b.d.querySelector('#saveStatus').textContent);assert(b.d.querySelector('#savePreview').textContent.includes('第1年1月'));assert.deepEqual(stored(b),before);b.w.confirmGameImport();assert.deepEqual(stored(b),[raw,meta]);assert.equal(JSON.parse(b.w.localStorage.getItem('yjzq_import_backup')).save,before[0]);
  const next=boot({store:{yjzq_save:stored(b)[0],yjzq_meta:stored(b)[1]}});assert.equal(next.w.BrokerGame.getState().month,1);assert.equal(next.d.documentElement.dataset.boot,'ready');assert.deepEqual(next.errors,[]);next.dom.window.close();b.dom.window.close();
 });
 await test('兼容旧版原始 JSON，保留当前图鉴且不消耗随机序列',async()=>{
  const b=boot({store:{yjzq_save:raw,yjzq_meta:meta}});const rng=b.w.eval('RNG_STATE');b.w.showSaveTools();await select(b,raw);assert.equal(b.w.eval('RNG_STATE'),rng);assert(b.d.querySelector('#savePreview').textContent.includes('旧版原始存档'));b.w.confirmGameImport();assert.deepEqual(stored(b),[raw,meta]);b.dom.window.close();
 });
 await test('错误 JSON、其他游戏、无效字段和不完整行情均不覆盖原档',async()=>{
  const b=boot({store:{yjzq_save:raw,yjzq_meta:meta}});b.w.showSaveTools();const broken=JSON.parse(raw);broken.index='bad';const fields=JSON.parse(raw);fields.lastDelta=null;const cycle=JSON.parse(raw);cycle.cycle.rets=[0];
  for(const text of ['{bad','{"foo":1}',JSON.stringify(broken),JSON.stringify(fields),JSON.stringify(cycle),backup.replace('"version": 1','"version": 9')]){await select(b,text);assert(b.d.querySelector('#saveImportConfirm').hidden);assert(b.d.querySelector('#saveStatus').textContent.includes('无法导入'));assert.deepEqual(stored(b),[raw,meta]);}
  b.dom.window.close();
 });
 await test('恢复入口能找回原始坏档，原始坏档也能完整导出',async()=>{
  const original='{broken-save',b=boot({store:{yjzq_save:original,yjzq_meta:meta}});b.d.querySelector('#bootError button[onclick="showSaveTools()"]' ).click();assert(!b.d.querySelector('#saveTools').hidden);b.w.exportGameBackup();assert.equal(JSON.parse(await readBlob(b.w,b.downloads[0].blob)).save,original);
  await select(b,backup);b.w.confirmGameImport();assert.equal(stored(b)[0],raw);b.w.showSaveTools();b.w.previewPreviousSave();b.w.confirmGameImport();assert.deepEqual(stored(b),[original,meta]);b.dom.window.close();
 });
 await test('存储写入失败回滚，备份失败时也不覆盖当前存档',async()=>{
  for(const failKey of ['yjzq_import_backup','yjzq_meta']){const b=boot({store:{yjzq_save:raw,yjzq_meta:meta},failKey});b.w.showSaveTools();const changed=JSON.parse(backup);changed.save=changed.save.replace('35000','45678');await select(b,JSON.stringify(changed));b.w.confirmGameImport();assert.deepEqual(stored(b),[raw,meta]);assert(b.d.querySelector('#saveStatus').textContent.includes('导入未完成'));b.dom.window.close();}
 });
 await test('主游戏脚本失效时仍能从工具栏打开存档并导出',async()=>{
  const source=html.replace(/<script>[\s\S]*?<\/script>/,'<script>function {</script>'),b=boot({source,store:{yjzq_save:raw,yjzq_meta:meta}});
  b.d.querySelector('.toolbar button[onclick*="showSaveTools"]').click();assert(!b.d.querySelector('#saveTools').hidden);b.w.exportGameBackup();assert.equal(JSON.parse(await readBlob(b.w,b.downloads[0].blob)).save,raw);b.dom.window.close();
 });
 await test('月末处理中可导出结算前进度，阻止导入覆盖待处理事项',async()=>{
  const b=boot({store:{yjzq_save:raw,yjzq_meta:meta}});b.w.eval('resolvingMonth=true');b.w.showSaveTools();b.w.exportGameBackup();assert.equal(JSON.parse(await readBlob(b.w,b.downloads[0].blob)).save,raw);await select(b,backup);b.w.confirmGameImport();assert.deepEqual(stored(b),[raw,meta]);assert(b.d.querySelector('#saveStatus').textContent.includes('月末'));b.dom.window.close();
 });
 console.log(count+' save transfer checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
