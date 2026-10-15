import { io } from 'socket.io-client';
import { issue } from '../src/auth.js';
import { integer,secret,requireSecret } from '../src/config.js';
requireSecret();
const count=integer('LOAD_CLIENTS',100), ramp=integer('LOAD_RAMP_PER_SECOND',20), duration=integer('LOAD_DURATION_SECONDS',60), interval=integer('LOAD_INTERVAL_MS',1000,0);
const sockets=[],hist=new Uint32Array(10001);let connected=0,peak=0,ok=0,errors=0,reconnects=0,ended=false;
const token=issue({sub:'load',tenant:process.env.TENANT_ID || 'demo',scope:'members:read',exp:Math.floor(Date.now()/1000)+Math.ceil(count/ramp)+duration+600},secret);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function add(){const s=io(process.env.LOAD_URL || 'http://localhost:3000',{transports:['websocket'],auth:{token},reconnectionDelayMax:10000});sockets.push(s);let running=false,seen=false;
 s.on('connect',()=>{connected++;peak=Math.max(peak,connected);if(seen)reconnects++;seen=true;run();});
 s.on('disconnect',()=>connected--);s.on('connect_error',()=>errors++);
 async function run(){if(running)return;running=true;let after='0';while(!ended&&s.connected){const start=performance.now();try{const r=await s.timeout(5000).emitWithAck('member:next',{after});if(r.ok){ok++;hist[Math.min(10000,Math.floor(performance.now()-start))]++;after=r.done?'0':r.nextCursor;}else errors++;}catch{errors++;}await sleep(interval || 1);}running=false;}
}
const log=setInterval(()=>console.log(JSON.stringify({connected,peak,ok,errors,reconnects})),10000);
for(let created=0;created<count;){for(let j=0;j<ramp&&created<count;j++,created++)add();await sleep(1000);}
console.log('Ramp complete; steady-state phase starts');const initialOk=ok;const start=Date.now();await sleep(duration*1000);ended=true;clearInterval(log);for(const s of sockets)s.disconnect();
function pct(p){let n=0;for(let i=0;i<hist.length;i++){n+=hist[i];if(n>=ok*p)return i;}return 0;}
console.log(JSON.stringify({target:count,peak,ok,errors,reconnects,steadyRps:(ok-initialOk)/((Date.now()-start)/1000),p95ms:pct(.95),p99ms:pct(.99)}));
