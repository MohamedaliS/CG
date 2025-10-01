-- Certificate Generator Database Setup
-- Run this script in PostgreSQL to create the database

-- Create database (run this as postgres superuser)
CREATE DATABASE certificate_generator;

-- Connect to the database
\c certificate_generator;

-- Create a user for the application (optional, or use existing postgres user)
-- CREATE USER cert_user WITH PASSWORD 'secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE certificate_generator TO cert_user;

-- The application will create the tables automatically via migrations
-- when you run: npm run db:migrate

-- Verify connection
SELECT 'Database setup complete!' as status;