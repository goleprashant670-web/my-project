import {spawn,execFileSync} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dms-media-test-'));const cwd=path.resolve(import.meta.dirname,'../backend');const port='8103';
const child=spawn(process.execPath,['server.mjs'],{cwd,env:{...process.env,PORT:port,DATA_DIR:dir,PUBLIC_ORIGIN:'http://localhost:'+port},stdio:'pipe'});let errors='';child.stderr.on('data',b=>errors+=b);let count=0;
const base='http://127.0.0.1:'+port;
async function api(url,method='GET',data,token){const response=await fetch(base+'/api'+url,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});return {status:response.status,body:await response.json()};}
function check(ok,name){assert.ok(ok,name+'\n'+errors);count++;console.log('PASS '+name)}
const ff=(args)=>execFileSync('ffmpeg',['-v','error','-y',...args]);
async function upload(file,mime,token){const response=await fetch(base+'/api/media?name='+path.basename(file),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':mime},body:fs.readFileSync(file)});return {status:response.status,body:await response.json()};}
try{
 await new Promise((resolve,reject)=>{let n=0;const t=setInterval(async()=>{try{await fetch(base+'/api/health');clearInterval(t);resolve()}catch{if(++n>60){clearInterval(t);reject(new Error('server unavailable'))}}},100)});
 const a=await api('/auth/register','POST',{name:'Video QA',email:'video@example.test',password:'video-test-pass-123456'}),b=await api('/auth/register','POST',{name:'Other',email:'other@example.test',password:'video-test-pass-123456'});const token=a.body.token;
 ff(['-f','lavfi','-i','color=c=blue:s=320x180:r=30','-f','lavfi','-i','sine=frequency=220:sample_rate=48000','-t','2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',path.join(dir,'blue.mp4')]);
 ff(['-f','lavfi','-i','color=c=red:s=240x320:r=25','-t','2','-c:v','libx264','-pix_fmt','yuv420p',path.join(dir,'red.mp4')]);
 ff(['-f','lavfi','-i','sine=frequency=660:sample_rate=48000','-t','1.5',path.join(dir,'voice.wav')]);
 ff(['-f','lavfi','-i','sine=frequency=110:sample_rate=48000','-t','1',path.join(dir,'music.wav')]);
 execFileSync('python',['-c',`from PIL import Image,ImageDraw\nim=Image.new('RGBA',(1280,720),(0,0,0,0));d=ImageDraw.Draw(im);d.rectangle((0,0,1280,65),fill='white');d.text((30,20),'DMS NEWS VIDEO ENGINE TEST',fill='black');d.rectangle((0,660,1280,720),fill=(220,30,60,255));im.save('${dir}/overlay.png')\nt=Image.new('RGBA',(600,36),(0,0,0,0));ImageDraw.Draw(t).text((10,10),'DMS SCROLLING TICKER',fill='white');t.save('${dir}/ticker.png')`]);
 const video=await upload(path.join(dir,'blue.mp4'),'video/mp4',token),silent=await upload(path.join(dir,'red.mp4'),'video/mp4',token),voice=await upload(path.join(dir,'voice.wav'),'audio/wav',token),music=await upload(path.join(dir,'music.wav'),'audio/wav',token);
 check(video.status===201&&video.body.hasVideo&&video.body.hasAudio,'authenticated video upload and stream detection');check(silent.status===201&&!silent.body.hasAudio,'silent video accepted');check(voice.status===201&&music.status===201,'audio upload');
 check((await fetch(base+video.body.url,{headers:{Authorization:'Bearer '+b.body.token}})).status===404,'other user cannot read uploaded media');
 fs.writeFileSync(path.join(dir,'invalid.mp4'),'not a movie');check((await upload(path.join(dir,'invalid.mp4'),'video/mp4',token)).status===400,'invalid media rejected');
 const image='data:image/png;base64,'+fs.readFileSync(path.join(dir,'overlay.png')).toString('base64');
 const tickerImage='data:image/png;base64,'+fs.readFileSync(path.join(dir,'ticker.png')).toString('base64');
 const request={image,format:'mp4',timeline:true,templateId:'news-0',name:'Video composition QA',clips:[{mediaId:video.body.id,start:.25,duration:1},{mediaId:silent.body.id,start:.5,duration:1.25}],introId:silent.body.id,introDuration:.5,outroId:video.body.id,outroDuration:.5,narrationId:voice.body.id,musicId:music.body.id,clipVolume:.2,voiceVolume:.8,musicVolume:.1,tickerImage};
 const result=await api('/exports','POST',request,token);check(result.status===201,'trimmed clips + intro/outro + narration/music render');
 const media=await fetch(base+result.body.url,{headers:{Authorization:'Bearer '+token}});const output=path.join(dir,'result.mp4');fs.writeFileSync(output,Buffer.from(await media.arrayBuffer()));
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output]));check(Math.abs(Number(probe.format.duration)-3.25)<.2,'composed duration matches all trimmed segments');check(probe.streams.some(x=>x.codec_type==='audio')&&probe.streams.some(x=>x.width===1280&&x.height===720),'audio track and 720p output');
 // Decode center pixels to prove the underlying moving-video timeline is used, not only the poster.
 const pixel=t=>{const bytes=execFileSync('ffmpeg',['-v','error','-ss',String(t),'-i',output,'-frames:v','1','-vf','crop=2:2:640:360,scale=1:1','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);return [...bytes.subarray(0,3)]};
 const blue=pixel(1),red=pixel(2);check(blue[2]>blue[0]+80&&red[0]>red[2]+80,'video sequence visibly changes in correct order');
 check((await api('/exports','POST',{...request,clips:[{mediaId:video.body.id,start:0,duration:1}]},b.body.token)).status===404,'cross-user media composition rejected');
 check((await api('/exports','POST',{...request,clips:[{mediaId:video.body.id,start:999,duration:1}]},token)).status===400,'invalid trim range rejected');
 const poster=await api('/exports','POST',{image,format:'mp4',timeline:true,duration:1,narrationId:voice.body.id,musicId:music.body.id},token);check(poster.status===201,'graphic-only composition with audio');
 const ticker=await api('/exports','POST',{image,format:'mp4',timeline:true,duration:1,ticker:'DMS NEWS ticker'},token);check(ticker.status===201,'text ticker fallback');
 if(process.env.DMS_QA_OUTPUT){fs.copyFileSync(output,process.env.DMS_QA_OUTPUT);}
 console.log(count+' media checks passed.');
}finally{child.kill();await new Promise(r=>child.once('exit',r));fs.rmSync(dir,{recursive:true,force:true});}
