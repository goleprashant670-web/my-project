// TEST ONLY. Never preload this file in the deployed service.
const actualFetch=globalThis.fetch;const requests=new Map();let next=0;
globalThis.fetch=async(url,options={})=>{
 const target=String(url);
 if(target.startsWith('https://verify.twilio.com/')){
  const params=new URLSearchParams(options.body);
  if(target.endsWith('/Verifications')){const sid='VE'+String(++next).padStart(32,'0');requests.set(sid,params.get('To'));return Response.json({sid,status:'pending'});}
  const sid=params.get('VerificationSid');if(!requests.has(sid))return Response.json({}, {status:404});
  if(params.get('Code')==='446699'){requests.delete(sid);return Response.json({status:'approved'});}return Response.json({status:'pending'});
 }
 throw new Error('Unexpected outbound request in provider test: '+target);
};
