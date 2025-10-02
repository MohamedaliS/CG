import { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastifyFormbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import fastifyCors from '@fastify/cors';
import ejs from 'ejs';
import path from 'path';

export const serverConfig = {
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
      target: 'pino-pretty'
    } : undefined,
  },
  disableRequestLogging: process.env.NODE_ENV === 'production',
  bodyLimit: 50 * 1024 * 1024, // 50MB for large logo images in base64
};

export async function registerPlugins(fastify: FastifyInstance) {
  // Form data support for login/register forms
  await fastify.register(fastifyFormbody);

  // JWT Authentication
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_change_this_in_production',
  });

  // Multipart form data (file uploads)
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB to match bodyLimit
      files: 1,
      fieldSize: 50 * 1024 * 1024, // 50MB for base64 image data
    },
  });

  // Static file serving
  await fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public'),
    prefix: '/public/',
  });

  // EJS templating
  await fastify.register(fastifyView, {
    engine: {
      ejs: ejs,
    },
    root: path.join(process.cwd(), 'views'),
    layout: 'layouts/main',
    options: {
      async: true,
    },
  });

  // CORS
  await fastify.register(fastifyCors, {
    origin: true,
  });
}
