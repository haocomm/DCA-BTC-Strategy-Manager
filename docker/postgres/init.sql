-- PostgreSQL initialization script for DCA Strategy Manager
-- This script runs when the database container is first created

-- Create additional extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
-- These will be created after Prisma creates the tables

-- Example: Create index for strategy execution queries
-- CREATE INDEX IF NOT EXISTS idx_executions_strategy_timestamp ON executions(strategy_id, timestamp DESC);

-- Example: Create index for user sessions
-- CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id, expires_at);

-- Example: Create index for notifications
-- CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- Set up timezone
SET timezone = 'UTC';

-- Grant permissions (if using a different user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dca_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dca_user;