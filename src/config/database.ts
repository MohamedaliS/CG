import dotenv from 'dotenv';

dotenv.config();

export const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'certificate_gen',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: '0.0.0.0',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_change_this_in_production',
    expiresIn: '7d',
  },
  app: {
    domain: process.env.DOMAIN || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development',
  },
};
