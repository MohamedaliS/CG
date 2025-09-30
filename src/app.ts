import Fastify from 'fastify';
import { config } from './config/database';
import { serverConfig, registerPlugins } from './config/server';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import templateRoutes from './routes/templates';
import certificateRoutes from './routes/certificates';
import verificationRoutes from './routes/verification';

// Initialize Fastify
const fastify = Fastify(serverConfig);

// Register error handler
fastify.setErrorHandler(errorHandler);

// Health check route
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Initialize application
async function buildApp() {
  try {
    // Register plugins
    await registerPlugins(fastify);

    // Register routes
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(templateRoutes, { prefix: '/api' });
    await fastify.register(certificateRoutes, { prefix: '/api' });
    await fastify.register(verificationRoutes);

    // Dashboard route (protected)
    fastify.get('/dashboard', {
      preHandler: [async (request, reply) => {
        try {
          // Check for token in Authorization header first
          const authHeader = request.headers.authorization;
          let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
          
          // If no header token, check cookies
          if (!token && request.headers.cookie) {
            const cookies = request.headers.cookie.split(';');
            const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
            token = authCookie ? authCookie.split('=')[1] : null;
          }
          
          if (!token) {
            return reply.redirect('/login');
          }

          const decoded = fastify.jwt.verify(token);
          (request as any).user = decoded;
        } catch (error) {
          return reply.redirect('/login');
        }
      }],
      handler: async (request, reply) => {
        return (reply as any).view('dashboard/index', {
          title: 'Dashboard',
          user: (request as any).user
        });
      }
    });

    // Auth pages
    fastify.get('/login', async (request, reply) => {
      return (reply as any).view('auth/login', {
        title: 'Login'
      });
    });

    fastify.get('/register', async (request, reply) => {
      return (reply as any).view('auth/register', {
        title: 'Register'
      });
    });

    // Template selection page (protected)
    fastify.get('/templates/select', {
      preHandler: [async (request, reply) => {
        try {
          // Check for token in Authorization header first
          const authHeader = request.headers.authorization;
          let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
          
          // If no header token, check cookies
          if (!token && request.headers.cookie) {
            const cookies = request.headers.cookie.split(';');
            const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
            token = authCookie ? authCookie.split('=')[1] : null;
          }
          
          if (!token) {
            return reply.redirect('/login');
          }

          const decoded = fastify.jwt.verify(token);
          (request as any).user = decoded;
        } catch (error) {
          return reply.redirect('/login');
        }
      }],
      handler: async (request, reply) => {
        return (reply as any).view('templates/select', {
          title: 'Select Template',
          user: (request as any).user
        });
      }
    });

    // Template customization page (protected)
    fastify.get('/templates/customize', {
      preHandler: [async (request, reply) => {
        try {
          // Check for token in Authorization header first
          const authHeader = request.headers.authorization;
          let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
          
          // If no header token, check cookies
          if (!token && request.headers.cookie) {
            const cookies = request.headers.cookie.split(';');
            const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
            token = authCookie ? authCookie.split('=')[1] : null;
          }
          
          if (!token) {
            return reply.redirect('/login');
          }

          const decoded = fastify.jwt.verify(token);
          (request as any).user = decoded;
        } catch (error) {
          return reply.redirect('/login');
        }
      }],
      handler: async (request, reply) => {
        return (reply as any).view('templates/customize', {
          title: 'Customize Template',
          user: (request as any).user
        });
      }
    });

    // Root redirect
    fastify.get('/', async (request, reply) => {
      return reply.redirect('/dashboard');
    });

    return fastify;
  } catch (error) {
    console.error('Error building app:', error);
    process.exit(1);
  }
}

// Start server
async function start() {
  try {
    const app = await buildApp();
    
    await app.listen({
      port: config.server.port,
      host: config.server.host
    });

    console.log(`🚀 Server running at http://${config.server.host}:${config.server.port}`);
    console.log(`📊 Health check: http://${config.server.host}:${config.server.port}/health`);
    console.log(`🔍 Verification: http://${config.server.host}:${config.server.port}/verify`);
    
    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      try {
        await app.close();
        console.log('Server closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Only start if this file is run directly
if (require.main === module) {
  start();
}

export { buildApp, start };
export default fastify;
