import { openStore } from './store.js';
import { createApp } from './app.js';
import { integer,secret,requireSecret } from './config.js';
requireSecret();
const store=await openStore();
const app=await createApp({store,secret,origin:process.env.ALLOWED_ORIGIN || 'http://localhost:3000',maxInflight:integer('MAX_INFLIGHT',64),rps:integer('PER_SOCKET_RPS',5),maxConnections:integer('MAX_CONNECTIONS',6000)});
app.http.listen(integer('PORT',3000,1,65535),process.env.HOST || '127.0.0.1',()=>console.log('Members server ready'));
let stopping=false;
async function stop(){if(stopping)return;stopping=true;const deadline=setTimeout(()=>process.exit(1),10000);deadline.unref();await app.close();clearTimeout(deadline);}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
