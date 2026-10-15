import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Server } from 'socket.io';
import { verify,cursor } from './auth.js';
export async function createApp({store,secret,origin,maxInflight=64,rps=5,maxConnections=6000}) {
  const page = await readFile(new URL('../public/Members.html',import.meta.url));
  let active=0,closing=false;
  const stats={requests:0,errors:0,rejected:0};
  const http=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    if(req.url==='/health/live') {res.end('ok');return;}
    if(req.url==='/health/ready') {
      try {if(closing)throw Error();await store.ping();res.end('ok');} catch {res.statusCode=503;res.end('unavailable');}return;
    }
    if(req.method==='GET' && ['/', '/Members.html'].includes(req.url)) {res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(page);return;}
    res.statusCode=404;res.end();
  });
  const io=new Server(http,{transports:['websocket'],maxHttpBufferSize:8192,perMessageDeflate:false,pingInterval:25000,pingTimeout:20000,
    allowRequest:(req,cb)=>cb(null,!closing && io.engine.clientsCount<maxConnections && (!req.headers.origin || req.headers.origin===origin))});
  io.use((socket,next)=>{try{socket.data.claims=verify(socket.handshake.auth.token,secret);next();}catch{next(Error('UNAUTHORIZED'));}});
  io.on('connection',socket=>{
    let busy=false,tokens=rps,last=Date.now();
    socket.on('member:next',async(payload,ack)=>{
      if(typeof ack!=='function')return;
      const now=Date.now();tokens=Math.min(rps,tokens+(now-last)*rps/1000);last=now;
      if(tokens<1){stats.rejected++;ack({ok:false,code:'RATE_LIMIT'});return;}tokens--;
      if(closing || busy || active>=maxInflight){stats.rejected++;ack({ok:false,code:'BUSY'});return;}
      if(socket.data.claims.exp<=now/1000){ack({ok:false,code:'TOKEN_EXPIRED'});socket.disconnect(true);return;}
      let after;try{after=cursor(payload?.after);}catch{ack({ok:false,code:'INVALID_CURSOR'});return;}
      busy=true;active++;stats.requests++;
      try {
        const member=await store.next(socket.data.claims.tenant,after);
        if(socket.connected)ack({ok:true,member,nextCursor:member?.id || after,done:member===null});
      } catch {stats.errors++;if(socket.connected)ack({ok:false,code:'STORE_UNAVAILABLE'});}
      finally{busy=false;active--;}
    });
  });
  const metrics=setInterval(()=>console.log(JSON.stringify({event:'metrics',pid:process.pid,connections:io.engine.clientsCount,active,...stats,rss:process.memoryUsage().rss})),10000);metrics.unref();
  return {http,io,async close(){closing=true;clearInterval(metrics);await new Promise(resolve=>io.close(resolve));while(active)await new Promise(r=>setTimeout(r,20));await store.close();}};
}
