// Logic smoke checks with a DOM/canvas test double. This is not visual/browser QA.
import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const memory=new Map(),nodes=new Map();
const ctx2=new Proxy({createLinearGradient:()=>({addColorStop(){}}),measureText:s=>({width:s.length*10})},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const node=()=>({innerHTML:'',textContent:'',style:{},value:'',width:1280,height:720,classList:{toggle(){}},getContext:()=>ctx2,showModal(){},close(){},setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:1280,height:720})});
const doc={body:node(),querySelector:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)}};
const window={DMS_OFFLINE:true,DMS_LOGO:'data:image/jpeg;base64,x'};
const context=vm.createContext({console,document:doc,window,location:{protocol:'file:'},localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},crypto,structuredClone,setTimeout:()=>1,clearTimeout(){},confirm:()=>true,Image:class{},Blob,URL});
for(const name of ['seed.js','app.js'])vm.runInContext(fs.readFileSync(new URL('../web/'+name,import.meta.url),'utf8'),context);
for(const screen of ['home','templates','festivals','favourites','editor','voice','projects','downloads','subscription','profile','help']){await vm.runInContext(`go('${screen}')`,context);assert.ok(doc.querySelector('#main').innerHTML.length>50);}
await vm.runInContext("choose('festival-0');draft.headline='Festival test';saveProject()",context);
assert.equal(JSON.parse(memory.get('dms-projects'))[0].headline,'Festival test');
await vm.runInContext("draft.headline='Different';openProject(projects[0].id)",context);assert.equal(vm.runInContext('draft.headline',context),'Festival test');
vm.runInContext("sameDesign()",context);assert.equal(vm.runInContext('draft.id',context),undefined);
vm.runInContext("draft.format='9:16';draw()",context);assert.equal(doc.querySelector('#canvas').width,720);assert.equal(doc.querySelector('#canvas').height,1280);
vm.runInContext("filter='Breaking News';page='templates';go('festivals')",context);assert.equal(vm.runInContext('filter',context),'');
console.log('Frontend logic smoke checks passed: all routes, draft persistence/reopen, duplicate identity, portrait dimensions, category reset. No browser rendering tested.');
