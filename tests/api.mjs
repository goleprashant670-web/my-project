import {spawn} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dms-test-'));const cwd=path.resolve(import.meta.dirname,'../backend');
const env={...process.env,DATA_DIR:temp,PORT:'8099',PUBLIC_ORIGIN:'http://localhost:8099',ADMIN_EMAIL:'admin@example.test',ADMIN_PASSWORD:'Long-random-test-password-987'};
const bootstrap=spawn(process.execPath,['server.mjs','--create-admin'],{cwd,env,stdio:'pipe'});await new Promise((ok,no)=>{bootstrap.on('exit',c=>c===0?ok():no(new Error('bootstrap failed')))});
const server=spawn(process.execPath,['server.mjs'],{cwd,env,stdio:'pipe'});let logs='';server.stderr.on('data',b=>logs+=b);
const base='http://127.0.0.1:8099/api';let tests=0;
async function request(route,method='GET',data,token,headers={}){const r=await fetch(base+route,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json()}}
const check=(condition,label)=>{assert.ok(condition,label);tests++;console.log('PASS '+label)};
try{
 await new Promise((ok,no)=>{let n=0;const timer=setInterval(async()=>{try{await fetch(base+'/health');clearInterval(timer);ok()}catch{if(++n>50){clearInterval(timer);no(new Error('server unavailable '+logs))}}},100)});
 const reg=await request('/auth/register','POST',{name:'Reporter',email:'reporter@example.test',password:'Long-password-123456'});check(reg.status===200,'registration');const token=reg.data.token;
 const reg2=await request('/auth/register','POST',{name:'Second',email:'second@example.test',password:'Long-password-123456'});const second=reg2.data.token;
 check((await request('/admin/users','GET',null,token)).status===403,'user cannot access admin');
 check((await request('/projects')).status===401,'projects require authentication');
 const project=await request('/projects','POST',{name:'Draft',headline:'Test'},token);check(project.status===200,'save project');
 check((await request('/projects/'+project.data.id,'PUT',{name:'Steal'},second)).status===404,'cross-account project write blocked');
 check((await request('/projects','GET',null,second)).data.length===0,'projects are private');
 check((await request('/projects','POST',{},token,{Origin:'https://evil.test'})).status===403,'cross-origin mutation blocked');
 check((await request('/ai/voice','POST',{script:'Hello'},token)).status===503,'unconfigured AI fails explicitly');
 check((await request('/payments/verify','POST',{razorpay_order_id:'bad',razorpay_payment_id:'bad',razorpay_signature:'f'.repeat(64)},token)).status===400,'forged payment rejected');
 check((await request('/payments/webhook','POST',{event:'payment.captured'},null,{'x-razorpay-signature':'a'.repeat(64)})).status===401,'forged webhook rejected');
 const login=await request('/auth/login','POST',{email:env.ADMIN_EMAIL,password:env.ADMIN_PASSWORD});const admin=login.data.token;check(login.status===200,'admin login');
 const config=(await request('/config')).data;check(config.templates.length===54,'21 news and 33 festival templates');
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5ZkAAAAASUVORK5CYII=';
 // FFmpeg generates valid PNG with known dimensions.
 await new Promise((ok,no)=>{const p=spawn('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=320x180','-frames:v','1',path.join(temp,'input.png')]);p.on('exit',c=>c===0?ok():no(new Error('fixture failed')))});
 const image='data:image/png;base64,'+fs.readFileSync(path.join(temp,'input.png')).toString('base64');
 const premium=await request('/exports','POST',{image,format:'png',templateId:'news-2'},token);check(premium.status===403,'premium export blocked for free user');
 const exp=await request('/exports','POST',{image,format:'png',templateId:'news-0'},token);check(exp.status===201,'PNG export with server watermark');
 check((await fetch('http://127.0.0.1:8099'+exp.data.url,{headers:{Authorization:'Bearer '+second}})).status===404,'export file isolated to owner');
 const vid=await request('/exports','POST',{image,format:'mp4',duration:1},token);check(vid.status===201,'MP4 rendered by FFmpeg');
 const free=config.plans.find(x=>x.id==='free');free.exportLimit=2;
 check((await request('/admin/plans/free','PUT',free,admin)).status===200,'dynamic plan update');
 check((await request('/exports','POST',{image,format:'png'},token)).status===403,'server export quota enforced');
 const settings={...config.settings,maintenance:true};await request('/admin/settings/app','PUT',settings,admin);
 check((await request('/projects','GET',null,token)).status===503,'maintenance blocks user APIs');
 check((await request('/admin/analytics','GET',null,admin)).status===200,'admin remains accessible during maintenance');
 await request('/admin/settings/app','PUT',{...settings,maintenance:false},admin);
 await request('/auth/logout','POST',{},token);check((await request('/me','GET',null,token)).status===401,'logout invalidates server session');
 console.log(`${tests} checks passed.`);
}finally{server.kill();await new Promise(r=>server.once('exit',r));fs.rmSync(temp,{recursive:true,force:true});}
