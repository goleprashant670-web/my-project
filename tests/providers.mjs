import {providers} from '../backend/providers.mjs';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
let tests=0;const check=(ok,name)=>{assert.ok(ok,name);tests++;console.log('PASS '+name)};
const config={AZURE_SPEECH_ENDPOINT:'https://unit-test.cognitiveservices.azure.com',AZURE_SPEECH_KEY:'test-only-key'};let ssml='';
const provider=providers({env:config,request:async(url,opts)=>url.endsWith('/voices/list')?Response.json([{ShortName:'hi-IN-TestNeural',Gender:'Female',Locale:'hi-IN',StyleList:['gentle']} ]):(ssml=opts.body,new Response(Buffer.from('audio bytes')))});
const result=await provider.speech({script:'Hello <audio src="bad"> & test',language:'Hindi',gender:'Female',style:'Professional',speed:1.1,pitch:1,volume:1});check(result.voice==='hi-IN-TestNeural'&&result.audio.length>0,'voice selected from provider catalog');check(ssml.includes('&lt;audio')&&!ssml.includes('<audio src='),'script cannot inject SSML');
await assert.rejects(()=>provider.speech({script:'Test',language:'Hindi',gender:'Female',style:'Tense'}),e=>e.status===400);tests++;console.log('PASS unsupported voice style rejected');
await assert.rejects(()=>providers({env:{}}).speech({script:'Test'}),e=>e.status===503);tests++;console.log('PASS missing speech credentials fail explicitly');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dms-otp-test-'));const cwd=path.resolve(import.meta.dirname,'../backend'),port='8104';const server=spawn(process.execPath,['--import',path.join(import.meta.dirname,'provider-fixtures.mjs'),'server.mjs'],{cwd,env:{...process.env,PORT:port,DATA_DIR:dir,TWILIO_ACCOUNT_SID:'AC'+'1'.repeat(32),TWILIO_AUTH_TOKEN:'test-only-token',TWILIO_VERIFY_SERVICE_SID:'VA'+'2'.repeat(32)},stdio:'pipe'});let log='';server.stderr.on('data',x=>log+=x);
async function api(route,body,token){const r=await fetch('http://127.0.0.1:'+port+'/api'+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
try{
 await new Promise((ok,no)=>{let n=0;const t=setInterval(async()=>{try{await api('/health');clearInterval(t);ok()}catch{if(++n>50){clearInterval(t);no(new Error(log))}}},100)});
 check((await api('/auth/otp/send',{phone:'123'})).status===400,'invalid mobile format rejected');
 const sent=await api('/auth/otp/send',{phone:'+919999999999'});check(sent.status===200&&sent.data.challengeId&&!sent.data.code,'OTP challenge contains no code');
 check((await api('/auth/otp/send',{phone:'+919999999999'})).status===429,'OTP resend cooldown');
 check((await api('/auth/otp/check',{challengeId:sent.data.challengeId,code:'000000'})).status===401,'wrong OTP rejected');
 const login=await api('/auth/otp/check',{challengeId:sent.data.challengeId,code:'446699',name:'Mobile QA'});check(login.status===200&&login.data.user.role==='user'&&login.data.user.mobile==='+919999999999','verified OTP creates user session');
 const me=await api('/me',null,login.data.token);check(me.status===200&&me.data.user.mobile==='+919999999999','phone identity persists in authenticated profile');
 check((await api('/auth/otp/check',{challengeId:sent.data.challengeId,code:'446699'})).status===401,'consumed OTP cannot be replayed');
 check((await api('/admin/users',null,login.data.token)).status===403,'OTP cannot grant administrator role');
 console.log(tests+' provider checks passed using mocked services; no live SMS or AI requests were sent.');
}finally{server.kill();await new Promise(r=>server.once('exit',r));fs.rmSync(dir,{recursive:true,force:true});}
