import { issue } from '../src/auth.js';
import { secret,requireSecret } from '../src/config.js';
requireSecret();
console.log(issue({sub:'demo-admin',tenant:process.env.TENANT_ID || 'demo',scope:'members:read',exp:Math.floor(Date.now()/1000)+3600},secret));
