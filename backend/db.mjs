import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
export async function connect(dir) {
 if(process.env.DATABASE_URL){
  const {Pool}=await import('pg');const pool=new Pool({connectionString:process.env.DATABASE_URL});
  const sql=s=>{let i=0;return s.replace(/\?/g,()=>'$'+(++i));};
  const methods=client=>({exec:s=>client.query(s),all:async(s,...p)=>(await client.query(sql(s),p)).rows,get:async(s,...p)=>(await client.query(sql(s),p)).rows[0],run:(s,...p)=>client.query(sql(s),p)});
  return {...methods(pool),transaction:async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(methods(c));await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}};
 }
 fs.mkdirSync(dir,{recursive:true});const db=new DatabaseSync(path.join(dir,'dms.sqlite'));
 db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
 const direct={exec:async s=>db.exec(s),all:async(s,...p)=>db.prepare(s).all(...p),get:async(s,...p)=>db.prepare(s).get(...p),run:async(s,...p)=>db.prepare(s).run(...p)};
 let pending=Promise.resolve();const queue=fn=>{const task=pending.then(fn);pending=task.catch(()=>{});return task;};
 return {...Object.fromEntries(Object.entries(direct).map(([k,fn])=>[k,(...args)=>queue(()=>fn(...args))])),transaction:fn=>queue(async()=>{db.exec('BEGIN IMMEDIATE');try{const result=await fn(direct);db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}})};
}
