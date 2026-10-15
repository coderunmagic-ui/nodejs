Node.js 會員逐筆讀取系統

30,000 同時連線的可水平擴充架構。此專案不是已通過 30,000 人實機壓測的容量保證。


## 完整 MariaDB 連線參數

| 參數 | 範例／預設 | 用途 |
|---|---|---|
| DATA_BACKEND | mariadb | 選擇 MariaDB |
| DB_HOST | 127.0.0.1 | IPv4、IPv6（例如 ::1）或網域 |
| DB_PORT | 3306 | TCP 連接埠 |
| DB_SOCKET_PATH | 空白 | Unix socket 路徑；使用時取代 TCP，例如 /run/mysqld/mysqld.sock |
| DB_USER | members_app | 資料庫帳號 |
| DB_PASSWORD | change-me | 改為實際密碼，含 #、空白時使用引號 |
| DB_DATABASE | members_demo | 資料庫名稱 |
| DB_CONNECTION_LIMIT | 20 | 每個 Node.js 程序的最大連線池數 |
| DB_CONNECT_TIMEOUT_MS | 5000 | 建立連線逾時，毫秒 |
| DB_ACQUIRE_TIMEOUT_MS | 3000 | 等待池連線逾時，毫秒 |
| DB_IDLE_TIMEOUT_SECONDS | 60 | 閒置池連線回收秒數，應小於資料庫 wait_timeout |
| DB_QUERY_TIMEOUT_MS | 3000 | SQL 執行逾時，毫秒 |
| DB_SOCKET_TIMEOUT_MS | 5000 | 網路 socket 無回應逾時，毫秒 |
| DB_TLS | false | true 啟用 TLS |
| DB_TLS_CA | 空白 | 私有 CA 的 PEM 路徑；空白使用系統信任來源 |
| DB_TLS_CERT | 空白 | 選用的用戶端憑證 PEM 路徑 |
| DB_TLS_KEY | 空白 | 用戶端私鑰 PEM 路徑 |
| DB_TLS_SERVERNAME | 空白 | TLS 憑證對應 DNS 名稱，例如 db.example.com |
