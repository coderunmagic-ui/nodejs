import { readFileSync } from 'node:fs';
export function integer(name, fallback, min = 1, max = 1000000) {
  const n = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(n) || n < min || n > max) throw Error(`Invalid ${name}`);
  return n;
}
const bool = n => { const v = process.env[n] ?? 'false'; if (!['true','false'].includes(v)) throw Error(`Invalid ${n}`); return v === 'true'; };
const pem = n => process.env[n] ? readFileSync(process.env[n]) : undefined;
export function tls(prefix) {
  if (!bool(`${prefix}_TLS`)) return undefined;
  return { rejectUnauthorized:true, minVersion:'TLSv1.2', ca:pem(`${prefix}_TLS_CA`), cert:pem(`${prefix}_TLS_CERT`), key:pem(`${prefix}_TLS_KEY`), servername:process.env[`${prefix}_TLS_SERVERNAME`] || undefined };
}
export const backend = process.env.DATA_BACKEND || 'mariadb';
if (!['mariadb','redis'].includes(backend)) throw Error('DATA_BACKEND must be mariadb or redis');
export const secret = process.env.TOKEN_SECRET || '';
export function requireSecret() { if (secret.length < 32 || secret.startsWith('replace-')) throw Error('Set a random TOKEN_SECRET (32+ characters)'); }
export const dbOptions = () => ({
  host:process.env.DB_HOST || '127.0.0.1', port:integer('DB_PORT',3306,1,65535),
  socketPath:process.env.DB_SOCKET_PATH || undefined,
  user:process.env.DB_USER, password:process.env.DB_PASSWORD, database:process.env.DB_DATABASE,
  connectionLimit:integer('DB_CONNECTION_LIMIT',20), connectTimeout:integer('DB_CONNECT_TIMEOUT_MS',5000),
  socketTimeout:integer('DB_SOCKET_TIMEOUT_MS',5000), acquireTimeout:integer('DB_ACQUIRE_TIMEOUT_MS',3000), idleTimeout:integer('DB_IDLE_TIMEOUT_SECONDS',60),
  ssl:tls('DB'), charset:'utf8mb4', timezone:'Z', bigIntAsNumber:false
});
export const redisOptions = () => {
  const secure = tls('REDIS');
  if (secure && process.env.REDIS_SOCKET_PATH) throw Error('Redis TLS and Unix socket are mutually exclusive');
  return {
    username:process.env.REDIS_USERNAME || undefined, password:process.env.REDIS_PASSWORD || undefined,
    database:integer('REDIS_DB',0,0,1024), disableOfflineQueue:true,
    commandOptions:{timeout:integer('REDIS_COMMAND_TIMEOUT_MS',3000)},
    commandsQueueMaxLength:integer('REDIS_MAX_COMMAND_QUEUE',256),
    socket:{ ...(process.env.REDIS_SOCKET_PATH ? {path:process.env.REDIS_SOCKET_PATH} : {host:process.env.REDIS_HOST || '127.0.0.1',port:integer('REDIS_PORT',6379,1,65535)}),
      ...(secure ? {tls:true,...secure} : {}), connectTimeout:integer('REDIS_CONNECT_TIMEOUT_MS',5000),
      reconnectStrategy: retries => Math.min(100 * 2 ** Math.min(retries,5),integer('REDIS_RECONNECT_MAX_MS',3000)) + Math.floor(Math.random()*100)
    }
  };
};
