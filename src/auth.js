import { createHmac, timingSafeEqual } from 'node:crypto';
const sign = (text, key) => createHmac('sha256',key).update(text).digest('base64url');
export function issue(claims,key) { const body = Buffer.from(JSON.stringify(claims)).toString('base64url'); return `${body}.${sign(body,key)}`; }
export function verify(token,key) {
  if (typeof token !== 'string' || token.length > 4096) throw Error('UNAUTHORIZED');
  const [body,sig,extra] = token.split('.');
  const expected = Buffer.from(sign(body || '',key)); const actual = Buffer.from(sig || '');
  if (extra || expected.length !== actual.length || !timingSafeEqual(expected,actual)) throw Error('UNAUTHORIZED');
  const c = JSON.parse(Buffer.from(body,'base64url').toString());
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(c.tenant || '') || typeof c.sub !== 'string' || !c.sub || !Number.isInteger(c.exp) || c.exp <= Date.now()/1000 || c.scope !== 'members:read') throw Error('UNAUTHORIZED');
  return c;
}
export function cursor(value) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,15})$/.test(value) || !Number.isSafeInteger(Number(value))) throw Error('INVALID_CURSOR');
  return value;
}
