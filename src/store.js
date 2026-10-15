import mariadb from 'mariadb';
import { createClient } from 'redis';
import { backend, dbOptions, redisOptions, integer } from './config.js';
export const redisKeys = tenant => [`members:{${tenant}}:ids`,`members:{${tenant}}:data`];
export async function openStore() {
  if (backend === 'mariadb') {
    const pool = mariadb.createPool(dbOptions());
    const query = (sql,values=[]) => pool.query({sql,timeout:integer('DB_QUERY_TIMEOUT_MS',3000)},values);
    await query('SELECT 1');
    return { query, async next(tenant,after) {
      const rows = await query('SELECT id, display_name FROM members WHERE tenant_id=? AND id>? ORDER BY id LIMIT 1',[tenant,after]);
      return rows.length ? {id:String(rows[0].id),displayName:rows[0].display_name} : null;
    }, ping:()=>query('SELECT 1'), close:()=>pool.end() };
  }
  const client = createClient(redisOptions());
  client.on('error',()=>console.error(JSON.stringify({event:'redis_error'})));
  // Native per-command timeout + bounded queue; reconnection stays enabled.
  const run = fn => fn();
  await Promise.race([client.connect(), new Promise((_,reject)=>{const timer=setTimeout(()=>{if(client.isOpen)client.destroy();reject(Error('REDIS_CONNECT_TIMEOUT'));},integer('REDIS_CONNECT_TIMEOUT_MS',5000));timer.unref();client.once('ready',()=>clearTimeout(timer));})]);
  return {client,run, async next(tenant,after) {
    const raw = await run(()=>client.eval(`local ids=redis.call('ZRANGEBYSCORE',KEYS[1],'('..ARGV[1],'+inf','LIMIT',0,1)
      if #ids==0 then return false end
      local row=redis.call('HGET',KEYS[2],ids[1])
      if not row then return redis.error_reply('MEMBER_INDEX_INCONSISTENT') end
      return row`,{keys:redisKeys(tenant),arguments:[after]}));
    return raw ? JSON.parse(raw) : null;
  },ping:()=>run(()=>client.ping()),close:async()=>{if(client.isOpen)client.destroy();} };
}
