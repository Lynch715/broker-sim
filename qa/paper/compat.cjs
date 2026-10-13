const fs=require('fs'),assert=require('assert'),acorn=require('acorn');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(__dirname+'/../../index.html','utf8');
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS',name);};
function boot({source=html,save=null,media='legacy',canvas=false}={}){
 const errors=[],v=new VirtualConsole();v.on('jsdomError',e=>{if(!e.message.includes('navigation'))errors.push(e.message);});
 const dom=new JSDOM(source,{url:'http://localhost:8795',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:v,beforeParse(w){
  if(media==='absent')w.matchMedia=undefined;else w.matchMedia=()=>({matches:false,addListener(){}});
  w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.HTMLCanvasElement.prototype.getContext=()=>canvas?new Proxy({},{get:()=>()=>{}}):null;
  if(save!==null)w.localStorage.setItem('yjzq_save',save);
 }});return {dom,w:dom.window,d:dom.window.document,errors};
}
function started(opts){const b=boot(opts);b.d.querySelector('#guide .start').click();b.d.querySelector('#mOpts button').click();b.d.querySelector('#mOpts button').click();return b;}
test('全部内联脚本能按 ES2019 解析',()=>{for(const s of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))acorn.parse(s[1],{ecmaVersion:2019});});
test('旧版安卓主题接口可进入开场，无空壳或图标占位符',()=>{const b=boot();assert(b.d.querySelector('#guide').classList.contains('show'));assert.equal(b.d.documentElement.dataset.boot,'ready');assert(!b.d.querySelector('#app').textContent.includes('[icon:'));assert.deepEqual(b.errors,[]);b.dom.window.close();});
test('没有 matchMedia 或 Canvas 时仍可完成开局与经营',()=>{const b=started({media:'absent'});assert.equal(b.d.querySelectorAll('#statBar .stat').length,6);assert.equal(b.d.querySelectorAll('#actionBar .act').length,6);assert.equal(b.w.BrokerGame.getState().month,1);assert.deepEqual(b.errors,[]);b.dom.window.close();});
let lateSave;
test('员工、招聘、派主任均有固定头像，渲染不消耗行情随机数',()=>{const b=started(),G=b.w.BrokerGame;b.w.save();const rng=JSON.parse(b.w.localStorage.getItem('yjzq_save')).rngState;
 b.w.switchTab('team');const before=b.d.querySelector('[data-employee-avatar="陈斌"]').src;assert.equal(b.d.querySelectorAll('#panel [data-employee-avatar]').length,3);
 b.w.showHire();assert.equal(b.d.querySelectorAll('#mOpts [data-employee-avatar]').length,3);b.w.pickMgr(2);assert.equal(b.d.querySelectorAll('#mOpts [data-employee-avatar]').length,1);
 b.w.renderAll();b.w.save();assert.equal(JSON.parse(b.w.localStorage.getItem('yjzq_save')).rngState,rng);assert.equal(b.d.querySelector('[data-employee-avatar="陈斌"]').src,before);
 const s=G.getState();s.month=97;s.cash=54321;s.tab='team';s.business={levels:{advisory:2}};b.w.save();lateSave=b.w.localStorage.getItem('yjzq_save');assert.deepEqual(b.errors,[]);b.dom.window.close();});
test('第九年旧档补齐经营字段，保留进度金额与员工头像',()=>{const b=boot({save:lateSave});assert.equal(b.w.BrokerGame.getState().month,97);assert.equal(b.w.BrokerGame.getState().cash,54321);assert.equal(b.d.querySelector('#hYear').textContent,'9');assert.equal(b.d.querySelectorAll('#panel [data-employee-avatar]').length,3);
 for(const tab of ['outlets','team','npc','ib','prop','business','log']){b.w.switchTab(tab);assert(b.d.querySelector('#panel').textContent.length>0);}
 assert.deepEqual(b.errors,[]);b.dom.window.close();});
test('招聘入职和重新读档后仍是同一张脸',()=>{const b=started();b.w.showHire();const face=b.d.querySelector('#mOpts [data-employee-avatar]'),name=face.dataset.employeeAvatar,src=face.src;b.d.querySelector('#mOpts button').click();b.w.save();const save=b.w.localStorage.getItem('yjzq_save');b.dom.window.close();const next=boot({save});next.w.switchTab('team');assert.equal(next.d.querySelector(`[data-employee-avatar="${name}"]`).src,src);assert.deepEqual(next.errors,[]);next.dom.window.close();});
test('40个招聘名字均有独立头像，冉建国沿用原头像',()=>{const b=started();const result=b.w.eval(`({names:EMP_NAMES,faces:EMP_NAMES.map(name=>employeePortrait({name})),bound:employeePortrait({name:'冉建国',npcBound:'ran'}),original:art('portrait-ran')})`);assert.equal(new Set(result.names).size,40);assert.equal(new Set(result.faces.map(x=>x.match(/src="([^"]+)"/)[1])).size,40);assert(result.bound.includes(result.original));b.dom.window.close();});
test('损坏存档显示恢复入口且不覆盖原始进度',()=>{const raw='{broken-save',b=boot({save:raw});assert.equal(b.d.querySelector('#bootError').hidden,false);assert(!b.d.querySelector('#guide').classList.contains('show'));assert.equal(b.w.localStorage.getItem('yjzq_save'),raw);assert.equal(b.w.BrokerGame.getState(),null);b.dom.window.close();});
test('主脚本解析失败仍有独立恢复界面与原始存档',()=>{const source=html.replace(/<script>[\s\S]*?<\/script>/,'<script>function {</script>'),b=boot({source,save:lateSave});assert.equal(b.d.querySelector('#bootError').hidden,false);assert.equal(b.w.localStorage.getItem('yjzq_save'),lateSave);assert(!b.d.querySelector('#app').textContent.includes('[icon:'));b.dom.window.close();});
console.log(count+' compatibility and portrait checks passed');
