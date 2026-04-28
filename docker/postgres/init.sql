-- Creates three logical databases with dedicated users, each isolated.
-- Demonstrates bounded-context DB ownership without running 3 containers.

-- ── Order Service ──────────────────────────────────────────────────────
CREATE USER order_svc WITH ENCRYPTED PASSWORD 'order_pw';
CREATE DATABASE order_db OWNER order_svc;
GRANT ALL PRIVILEGES ON DATABASE order_db TO order_svc;

-- ── Tracking Service ───────────────────────────────────────────────────
CREATE USER tracking_svc WITH ENCRYPTED PASSWORD 'tracking_pw';
CREATE DATABASE tracking_db OWNER tracking_svc;
GRANT ALL PRIVILEGES ON DATABASE tracking_db TO tracking_svc;

-- ── Notification Service ───────────────────────────────────────────────
CREATE USER notification_svc WITH ENCRYPTED PASSWORD 'notification_pw';
CREATE DATABASE notification_db OWNER notification_svc;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO notification_svc;
