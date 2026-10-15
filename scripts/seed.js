import { openStore,redisKeys } from '../src/store.js';
import { integer } from '../src/config.js';
const tenant=process.env.TENANT_ID || 'demo';
if(!/^[a-zA-Z0-9_-]{1,64}$/.test(tenant))throw Error('Invalid tenant');
const store=await openStore();
try {
 if(store.query)await store.query(`CREATE TABLE IF NOT EXISTS members (
 tenant_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id BIGINT UNSIGNED NOT NULL, display_name VARCHAR(120) NOT NULL,
 PRIMARY KEY(tenant_id,id), CHECK(id<=9007199254740991)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 for(let i=1;i<=integer('SEED_COUNT',1000);i++){
   const name=`會員 ${i}`;
   if(store.query)await store.query('INSERT INTO members(tenant_id,id,display_name) VALUES(?,?,?) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name)',[tenant,i,name]);
   else await store.run(()=>store.client.eval(`redis.call('ZADD',KEYS[1],ARGV[1],ARGV[1]);redis.call('HSET',KEYS[2],ARGV[1],ARGV[2]);return 1`,{keys:redisKeys(tenant),arguments:[String(i),JSON.stringify({id:String(i),displayName:name})]}));
 }
 console.log('Seed complete');
}finally{await store.close();}
