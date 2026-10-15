-- Run as DBA; replace password and restrict allowed source hosts for production.
CREATE DATABASE IF NOT EXISTS members_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE members_demo;
CREATE TABLE IF NOT EXISTS members (
 tenant_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 id BIGINT UNSIGNED NOT NULL,
 display_name VARCHAR(120) NOT NULL,
 PRIMARY KEY(tenant_id,id),
 CHECK(id<=9007199254740991)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE USER IF NOT EXISTS 'members_app'@'%' IDENTIFIED BY 'change-me';
GRANT SELECT ON members_demo.members TO 'members_app'@'%';
-- npm run seed requires a separate temporary user with CREATE, INSERT, UPDATE, SELECT.
-- Do not give production runtime account these write privileges.
