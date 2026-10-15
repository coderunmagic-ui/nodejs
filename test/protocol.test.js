import test from 'node:test';import assert from 'node:assert/strict';
import {io} from 'socket.io-client';import {createApp} from '../src/app.js';import {issue,verify,cursor} from '../src/auth.js';
const secret='test-secret-012345678901234567890123456789';
const token=(tenant='demo',exp=Math.floor(Date.now()/1000)+60)=>issue({sub:'test',tenant,scope:'members:read',exp},secret);
test('reject tampering, expired token and unsafe cursor',()=>{assert.throws(()=>verify(token()+'x',secret));assert.throws(()=>verify(token('demo',1),secret));assert.throws(()=>cursor('9007199254740992'));assert.throws(()=>cursor('-1'));assert.equal(cursor('123'),'123');});
test('real Socket.IO protocol: one row, isolation, retry, EOF and auth',async()=>{
 const calls=[];const app=await createApp({secret,origin:'http://localhost',rps:100,store:{async next(tenant,after){calls.push(tenant);return tenant==='demo' && Number(after)<2?{id:String(Number(after)+1),displayName:'測試'}:null;},async ping(){},async close(){}}});
 await new Promise(r=>app.http.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${app.http.address().port}`;const clients=[];
 const connect=async t=>{const s=io(url,{transports:['websocket'],auth:{token:t},reconnection:false});clients.push(s);await new Promise((r,j)=>{s.once('connect',r);s.once('connect_error',j);});return s;};
 try{const s=await connect(token());const next=after=>s.timeout(1000).emitWithAck('member:next',{after});const a=await next('0');assert.equal(a.member.id,'1');assert.deepEqual(await next('0'),a);assert.equal((await next('1')).member.id,'2');assert.equal((await next('2')).done,true);assert.equal((await next('abc')).code,'INVALID_CURSOR');const other=await connect(token('other'));assert.equal((await other.timeout(1000).emitWithAck('member:next',{after:'0'})).done,true);assert.equal(calls.at(-1),'other');await assert.rejects(connect('bad'),/UNAUTHORIZED/);
 }finally{clients.forEach(s=>s.disconnect());await app.close();}
});
test('bounded concurrency rejects overlapping requests',async()=>{
 let release;const gate=new Promise(r=>release=r);const app=await createApp({secret,origin:'x',rps:100,maxInflight:1,store:{async next(){await gate;return null;},async ping(){},async close(){}}});await new Promise(r=>app.http.listen(0,'127.0.0.1',r));const s=io(`http://127.0.0.1:${app.http.address().port}`,{transports:['websocket'],auth:{token:token()},reconnection:false});
 try{await new Promise(r=>s.once('connect',r));const first=s.timeout(1000).emitWithAck('member:next',{after:'0'});const second=await s.timeout(1000).emitWithAck('member:next',{after:'0'});assert.equal(second.code,'BUSY');release();assert.equal((await first).done,true);}finally{release();s.disconnect();await app.close();}
});
