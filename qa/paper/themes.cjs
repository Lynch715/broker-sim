const fs=require('fs'),assert=require('assert');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(__dirname+'/../../index.html','utf8');
function boot({save,meta,dark=false}={}){
 const errors=[],v=new VirtualConsole();v.on('jsdomError',e=>{if(!e.message.includes('navigation'))errors.push(e.message);});
 const dom=new JSDOM(html,{url:'http://localhost:8797',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:v,beforeParse(w){
  w.matchMedia=()=>({matches:dark,addListener(){}});
  w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>null;
  if(save)w.localStorage.setItem('yjzq_save',save);if(meta)w.localStorage.setItem('yjzq_meta',meta);
 }});return {dom,w:dom.window,d:dom.window.document,errors};
}
let count=0;function test(name,fn){fn();count++;console.log('PASS',name);}
const b=boot();b.d.querySelector('#guide .start').click();b.d.querySelector('#mOpts button').click();b.d.querySelector('#mOpts button').click();b.w.save();
const raw=b.w.localStorage.getItem('yjzq_save'),state=JSON.stringify(b.w.BrokerGame.getState()),rng=b.w.eval('RNG_STATE');
const ids=['auto','paper','sand','indigo','jade','violet','rose','ink','ocean'];
const oldMeta=JSON.parse(b.w.eval('JSON.stringify(META)'));oldMeta.ach={kept:true};oldMeta.talents={kept:2};oldMeta.exp=123;
b.w.localStorage.setItem('yjzq_meta',JSON.stringify(oldMeta));b.w.loadMeta();
test('色卡按钮可逐套切换，保留进度、随机序列及图鉴天赋',()=>{
 for(const id of ids){
  b.w.showSkin();const options=[...b.d.querySelectorAll('#mOpts button')];assert.equal(options.length,10);assert.equal(b.d.querySelectorAll('.skin-swatch').length,9);
  options[ids.indexOf(id)].click();assert.equal(b.w.curSkin(),id);assert.equal(b.d.body.dataset.theme,['ink','ocean'].includes(id)?'dark':'light');assert.equal(b.d.body.dataset.paper,id==='auto'?'paper':id);
  assert.equal(JSON.stringify(b.w.BrokerGame.getState()),state);assert.equal(b.w.eval('RNG_STATE'),rng);assert.equal(b.w.localStorage.getItem('yjzq_save'),raw);
  const meta=JSON.parse(b.w.localStorage.getItem('yjzq_meta'));assert.deepEqual({...meta,skin:oldMeta.skin},oldMeta);
  assert.deepEqual(b.errors,[]);assert.equal(b.d.querySelectorAll('#mOpts button[aria-pressed="true"]').length,1,id);
 }
});
test('所有配色重新载入后保留选择与原有游戏进度',()=>{
 for(const id of ids){const next=boot({save:raw,meta:JSON.stringify({...oldMeta,skin:id})});assert.equal(next.w.curSkin(),id);assert.equal(next.w.BrokerGame.getState().month,JSON.parse(raw).month);assert.equal(next.w.localStorage.getItem('yjzq_save'),raw);assert.deepEqual(next.errors,[]);next.dom.window.close();}
});
test('跟随系统进入深色，手选浅色可覆盖系统深色',()=>{
 const next=boot({meta:JSON.stringify({...oldMeta,skin:'auto'}),dark:true});assert.equal(next.d.body.dataset.theme,'dark');next.w.setSkin('jade');assert.equal(next.d.body.dataset.theme,'light');assert.equal(next.d.body.dataset.paper,'jade');next.dom.window.close();
});
test('旧配色标识及未知配色回退兼容，其他弹窗不残留色卡样式',()=>{
 for(const id of ['paper','sand','ink','unknown']){const next=boot({meta:JSON.stringify({...oldMeta,skin:id})});assert.equal(next.w.curSkin(),id==='unknown'?'auto':id);next.dom.window.close();}
 b.w.showSkin();b.w.showSettings();assert(!b.d.querySelector('#mOpts').classList.contains('skin-options'));assert.equal(b.d.querySelectorAll('.skin-swatch').length,0);assert.deepEqual(b.errors,[]);
});
test('配色菜单后可正常打开种子输入弹窗',()=>{
 b.w.showSkin();b.w.askSeed(null);assert(b.d.querySelector('#seedInput'));assert(!b.d.querySelector('#mOpts').classList.contains('skin-options'));assert.equal(b.d.querySelectorAll('.skin-swatch').length,0);assert.equal(JSON.stringify(b.w.BrokerGame.getState()),state);assert.deepEqual(b.errors,[]);
});
test('账面说明随页面滚动收起，不遮挡后续操作且不改变存档',()=>{
 const stat=b.d.querySelector('.stat');b.w.tapTip(stat);assert(stat.classList.contains('tipOn'));
 b.w.dispatchEvent(new b.w.Event('scroll'));assert(!stat.classList.contains('tipOn'));assert.equal(b.w.localStorage.getItem('yjzq_save'),raw);assert.equal(b.w.eval('RNG_STATE'),rng);
});
b.dom.window.close();console.log(count+' theme checks passed');
