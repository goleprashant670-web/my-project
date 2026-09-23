import {spawn} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dms-admin-'));const cwd=path.resolve(import.meta.dirname,'../backend');
const env={...process.env,DATA_DIR:temp,PORT:'8107',ADMIN_EMAIL:'admin@example.test',ADMIN_PASSWORD:'Test-admin-password-12345'};
const boot=spawn(process.execPath,['server.mjs','--create-admin'],{cwd,env});await new Promise((r,j)=>boot.on('exit',c=>c===0?r():j(Error('bootstrap'))));
const server=spawn(process.execPath,['server.mjs'],{cwd,env});let count=0;const base='http://127.0.0.1:8107';
async function req(p,method='GET',data,cookie){const r=await fetch(base+p,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});const text=await r.text();let b;try{b=JSON.parse(text)}catch{b=text}return {status:r.status,data:b,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
function check(ok,label){assert.ok(ok,label);count++;console.log('PASS '+label)}
try{for(let n=0;n<50;n++){try{await fetch(base+'/api/health');break}catch{await new Promise(r=>setTimeout(r,100))}}
 const member=await req('/api/auth/register','POST',{name:'User',email:'user@example.test',password:'Long-user-password-123'});
 check((await req('/api/admin-auth/login','POST',{email:'user@example.test',password:'Long-user-password-123'})).status===403,'ordinary user rejected by admin login');
 const admin=await req('/api/admin-auth/login','POST',{email:env.ADMIN_EMAIL,password:env.ADMIN_PASSWORD});
 check(admin.status===200&&admin.cookie.startsWith('dms_admin_session='),'separate admin cookie issued');
 check((await req('/api/admin/templates','GET',null,member.cookie)).status===401,'user cookie cannot authorize admin app');
 check((await req('/api/me','GET',null,admin.cookie)).status===401,'admin cookie does not sign into user app');
 check((await req('/admin/')).status===200,'separate admin page served');
 const js=await req('/app.js');check(!js.data.includes('admin-json')&&!js.data.includes('downloadJSON')&&!js.data.includes("['admin'"),'user interface has no admin or JSON controls');
 check((await req('/assets/media/clip-1.mp4')).status===404,'reference media not publicly served');
 const t={name:'Test template',category:'Breaking News',headline:'Hello DMS',format:'9:16',color:'#123456',active:true,premium:false};
 check((await req('/api/admin/templates/test','PUT',t,admin.cookie)).status===200,'publish template');
 check((await req('/api/config')).data.templates.some(t=>t.id==='test'),'template visible to user catalog');
 check((await req('/api/admin/templates/test','PUT',{...t,background:'data:image/png;base64,eA=='},admin.cookie)).status===400,'invalid image rejected');
 check((await req('/api/admin/templates/test','PUT',{...t,active:false},admin.cookie)).status===200,'disable template');
 check(!(await req('/api/config')).data.templates.some(t=>t.id==='test'),'disabled template removed from catalog');
 const plan={name:'Test plan',price:49900,days:30,voiceLimit:20,exportLimit:50,resolution:1080,premium:true,watermark:false,active:true};
 check((await req('/api/admin/plans/test','PUT',plan,admin.cookie)).status===200,'plan saved');
 check((await req('/api/config')).data.plans.find(p=>p.id==='test').price===49900,'dynamic price visible to app');
 check((await req('/api/admin/plans/test','PUT',{...plan,price:0},admin.cookie)).status===400,'active unpriced paid plan rejected');
 await req('/api/admin-auth/logout','POST',{},admin.cookie);check((await req('/api/admin-auth/me','GET',null,admin.cookie)).status===401,'admin logout revokes session');
 console.log(`${count} admin checks passed.`);
}finally{server.kill();await new Promise(r=>server.once('exit',r));fs.rmSync(temp,{recursive:true,force:true});}
