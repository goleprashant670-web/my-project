import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
const error=(status,message)=>{throw Object.assign(new Error(message),{status});};
const allowedTypes=new Set(['video/mp4','video/webm','audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a','audio/ogg']);
function processMedia(command,args,timeout=180000){return new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:['ignore','pipe','pipe']});let stdout='',stderr='',finished=false;const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Media processing timed out'));},timeout);child.stdout.on('data',d=>{stdout+=d; if(stdout.length>2e6)child.kill('SIGKILL')});child.stderr.on('data',d=>stderr=(stderr+d).slice(-3000));child.once('error',e=>{clearTimeout(timer);reject(e)});child.once('close',code=>{clearTimeout(timer);if(finished)return;finished=true;code===0?resolve(stdout):reject(new Error('Media processing failed: '+stderr.slice(-800)))});});}
export async function probe(file){const info=JSON.parse(await processMedia('ffprobe',['-v','error','-protocol_whitelist','file,pipe','-show_entries','format=duration,format_name:stream=codec_type,codec_name,width,height','-of','json',file],10000));return info;}
const number=(x,min,max,fallback)=>Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):fallback;
export function mediaEngine({dir,db,put,list}){
 const mediaDir=path.join(dir,'media');
 async function owned(user,id){if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))error(400,'Invalid media ID');const row=await db.get('SELECT owner,body FROM records WHERE kind=? AND id=?','media',id);if(!row||row.owner!==user.id)error(404,'Media not found');const item=JSON.parse(row.body);return {...item,path:path.join(mediaDir,id+'.bin')};}
 async function upload(req,user,name){
  const type=String(req.headers['content-type']||'').split(';')[0];if(!allowedTypes.has(type))error(415,'Upload MP4/WebM video or MP3/WAV/M4A/OGG audio.');
  const current=await list('media',user.id);if(current.length>=50)error(403,'Media storage limit reached. Remove unused files first.');
  const id=crypto.randomUUID(),file=path.join(mediaDir,id+'.bin');await fs.mkdir(mediaDir,{recursive:true});const handle=await fs.open(file,'wx',0o600);let bytes=0;
  try{for await(const chunk of req){bytes+=chunk.length;if(bytes>64*1024*1024)error(413,'Maximum media size is 64 MB');await handle.write(chunk);}await handle.close();
   const info=await probe(file),duration=Number(info.format?.duration);const video=info.streams.find(s=>s.codec_type==='video'),audio=info.streams.find(s=>s.codec_type==='audio');
   if(!duration||duration>600||duration<.1||(!video&&!audio))error(400,'Upload valid media between 0.1 and 600 seconds.');
   if(video&&(video.width>4096||video.height>4096))error(400,'Video dimensions exceed 4096 pixels');
   if(!/(mov|mp4|matroska|webm|mp3|wav|ogg)/.test(info.format.format_name))error(415,'Unsupported media container');
   const item={id,name:String(name||'Uploaded media').slice(0,120),mime:type,bytes,duration,hasVideo:!!video,hasAudio:!!audio,width:video?.width||0,height:video?.height||0,created:new Date().toISOString(),url:'/api/media/'+id};await put('media',id,item,user.id);return item;
  }catch(e){await handle.close().catch(()=>{});await fs.unlink(file).catch(()=>{});if(e.status)throw e;error(400,'The file could not be read as supported media.');}
 }
 async function compose(user,body,input,output,plan,png){
  const jobDir=await fs.mkdtemp(path.join(dir,'render-'));
  try{
   const portrait=png.readUInt32BE(20)>png.readUInt32BE(16),r=plan.resolution;
   const ratio=png.readUInt32BE(16)/png.readUInt32BE(20);const w=portrait?r:Math.round(r*ratio/2)*2,h=portrait?Math.round(r/ratio/2)*2:r;
   let clips=Array.isArray(body.clips)?body.clips:[];if(clips.length>8)error(400,'Maximum 8 main clips per render');
   const segments=[];
   async function segment(spec,stage){const media=await owned(user,spec.mediaId);if(!media.hasVideo)error(400,'Timeline clips must contain video.');const start=number(spec.start,0,media.duration,0);const length=number(spec.duration,.1,Math.max(.1,media.duration-start),media.duration-start);if(media.duration-start<.1)error(400,'Clip starts after the end of the video.');segments.push({media,start,duration:length,stage});}
   if(body.introId)await segment({mediaId:body.introId,start:0,duration:Math.min(20,Number(body.introDuration)||5)},'intro');
   const introDuration=segments.reduce((a,x)=>a+x.duration,0);
   for(const item of clips)await segment(item,'main');
   if(!clips.length)segments.push({start:0,duration:number(body.duration,1,180,15),stage:'main'});
   const endOfMain=segments.reduce((a,x)=>a+x.duration,0);
   if(body.outroId)await segment({mediaId:body.outroId,start:0,duration:Math.min(20,Number(body.outroDuration)||5)},'outro');
   const total=segments.reduce((a,x)=>a+x.duration,0);if(total>180)error(400,'This renderer supports up to 180 seconds including intro/outro.');
   const narration=body.narrationId?await owned(user,body.narrationId):null,music=body.musicId?await owned(user,body.musicId):null;
   if(narration&&!narration.hasAudio||music&&!music.hasAudio)error(400,'Narration and music must contain an audio track.');
   const args=['-v','error','-y','-filter_complex_threads','1'];let index=0;
   for(const seg of segments){seg.index=index++;if(seg.media)args.push('-ss',String(seg.start),'-t',String(seg.duration),'-protocol_whitelist','file,pipe','-i',seg.media.path);else args.push('-loop','1','-framerate','30','-i',input);}
   const overlayIndex=index++;args.push('-loop','1','-framerate','30','-i',input);
   let tickerIndex;
   if(body.tickerImage){if(typeof body.tickerImage!=='string'||!body.tickerImage.startsWith('data:image/png;base64,'))error(400,'Invalid ticker image');const tick=Buffer.from(body.tickerImage.split(',')[1],'base64');if(tick.length<24||tick.length>2*1024*1024||tick.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||tick.readUInt32BE(16)>4096||tick.readUInt32BE(20)>512)error(400,'Invalid ticker dimensions');const file=path.join(jobDir,'ticker.png');await fs.writeFile(file,tick);tickerIndex=index++;args.push('-loop','1','-framerate','30','-i',file);}

   let narrationIndex,musicIndex;if(narration){narrationIndex=index++;args.push('-protocol_whitelist','file,pipe','-i',narration.path)}if(music){musicIndex=index++;args.push('-stream_loop','-1','-protocol_whitelist','file,pipe','-i',music.path)}
   const graph=[];
   for(let i=0;i<segments.length;i++){const s=segments[i];graph.push(`[${s.index}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,fps=30,trim=duration=${s.duration},setpts=PTS-STARTPTS,format=yuv420p[v${i}]`);graph.push(s.media?.hasAudio?`[${s.index}:a]atrim=duration=${s.duration},asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=duration=${s.duration}[a${i}]`:`anullsrc=r=48000:cl=stereo,atrim=duration=${s.duration},asetpts=PTS-STARTPTS[a${i}]`);}
   graph.push(segments.map((_,i)=>`[v${i}][a${i}]`).join('')+`concat=n=${segments.length}:v=1:a=1[basev][basea]`);
   graph.push(`[${overlayIndex}:v]scale=${w}:${h},format=rgba[overlay]`);
   const filters=[];
   if(body.ticker&&!body.tickerImage){const textfile=path.join(jobDir,'ticker.txt');await fs.writeFile(textfile,String(body.ticker).slice(0,500));const speed=number(body.tickerSpeed,20,300,75);filters.push(`drawtext=textfile='${textfile}':expansion=none:fontcolor=white:fontsize=${Math.round(w*.019)}:x=w-mod(t*${speed}\\,w+tw):y=h*0.945:enable='between(t,${introDuration},${endOfMain})'`);}
   if(plan.watermark)filters.push("drawtext=text='Created with DMS NEWS':fontcolor=white:fontsize=22:box=1:boxcolor=black@0.7:x=w-tw-24:y=h-th-20");
   graph.push(`[basev][overlay]overlay=0:0:enable='between(t,${introDuration},${endOfMain})'[overv]`);
   let visual='overv';if(tickerIndex!==undefined){const speed=number(body.tickerSpeed,20,300,75);graph.push(`[${tickerIndex}:v]scale=iw*${w/png.readUInt32BE(16)}:-1,format=rgba[ticker]`);graph.push(`[overv][ticker]overlay=x='W-mod(t*${speed},W+w)':y=H*0.935:enable='between(t,${introDuration},${endOfMain})'[tickv]`);visual='tickv';}
   graph.push(`[${visual}]${filters.length?filters.join(','):'null'}[outv]`);
   const originalVolume=number(body.clipVolume,0,1,narration?.id?.length?0.15:1);graph.push(`[basea]volume=${originalVolume}[original]`);const audios=['original'];
   if(narration){const rate=number(body.voiceSpeed,.5,2,1),volume=number(body.voiceVolume,0,1,1);graph.push(`[${narrationIndex}:a]asetpts=PTS-STARTPTS,atempo=${rate},volume=${volume},aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=${Math.round(introDuration*1000)}:all=1,apad,atrim=duration=${total}[narration]`);audios.push('narration');}
   if(music){const volume=number(body.musicVolume,0,1,.12);graph.push(`[${musicIndex}:a]asetpts=PTS-STARTPTS,volume=${volume},aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=duration=${total},afade=t=out:st=${Math.max(0,total-1)}:d=1[music]`);audios.push('music');}
   graph.push(audios.map(x=>'['+x+']').join('')+`amix=inputs=${audios.length}:duration=longest:normalize=0,alimiter=limit=0.95,atrim=duration=${total}[outa]`);
   args.push('-filter_complex',graph.join(';'),'-map','[outv]','-map','[outa]','-t',String(total),'-c:v','libx264','-preset','ultrafast','-crf','23','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',output);
   await processMedia('ffmpeg',args);return {duration:total,width:w,height:h,clips:clips.length};
  }finally{await fs.rm(jobDir,{recursive:true,force:true});}
 }
 return {owned,upload,compose};
}
