import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import path from 'node:path';

export function openStore(dir) {
 mkdirSync(dir,{recursive:true});
 const db=new DatabaseSync(path.join(dir,'lanlao.sqlite'));
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,status TEXT NOT NULL,step TEXT NOT NULL DEFAULT 'upload',data TEXT NOT NULL DEFAULT '{}',message TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,job_id TEXT NOT NULL REFERENCES jobs(id),at INTEGER NOT NULL,status TEXT NOT NULL,message TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS budget_reservations(job_id TEXT PRIMARY KEY REFERENCES jobs(id),amount REAL NOT NULL,created INTEGER NOT NULL);`);
 return db;
}
export function updateJob(db,id,changes,{expectedStatus}={}){
 // The API and paid-generation CLI can access this database simultaneously.
 // Keep the terminal-state check, state write and audit event in one transaction.
 db.exec('BEGIN IMMEDIATE');
 try{
  const old=db.prepare('SELECT * FROM jobs WHERE id=?').get(id);
  if(!old||old.status==='DELETED'||old.status==='CANCELLED'||expectedStatus!==undefined&&old.status!==expectedStatus){db.exec('COMMIT');return false;}
  const next={...old,...changes},now=Date.now();
  db.prepare('UPDATE jobs SET status=?,step=?,data=?,message=?,updated=? WHERE id=?').run(next.status,next.step,typeof next.data==='string'?next.data:JSON.stringify(next.data),next.message,now,id);
  if(next.status!==old.status||next.message!==old.message)db.prepare('INSERT INTO events(job_id,at,status,message) VALUES(?,?,?,?)').run(id,now,next.status,next.message);
  db.exec('COMMIT');return true;
 }catch(error){db.exec('ROLLBACK');throw error;}
}
