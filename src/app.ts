import Fastify from 'fastify';
import { config } from './config/database';
import { serverConfig, registerPlugins } from './config/server';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import templateRoutes from './routes/templates';
import certificateRoutes from './routes/certificates';
import verificationRoutes from './routes/verification';
import enhancedTemplateRoutes from './routes/enhancedTemplates';

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
    await fastify.register(enhancedTemplateRoutes, { prefix: '/api' });
    await fastify.register(certificateRoutes, { prefix: '/api' });
    await fastify.register(verificationRoutes);

    // Register template preview route (without API prefix)
    await fastify.register(async function (fastify) {
      fastify.get('/templates/:id/preview', {
        handler: async (request, reply) => {
          try {
            const { id } = request.params as { id: string };
            const { TemplateService } = await import('./services/templateService');
            const template = await TemplateService.getDefaultTemplateById(id);
            
            if (!template) {
              return reply.status(404).send({
                success: false,
                error: 'Template not found',
              });
            }

            // Generate a preview image with sample content
            const previewBuffer = await TemplateService.generatePreviewImage(template);
            
            reply.type('image/png').send(previewBuffer);
          } catch (error) {
            fastify.log.error('Preview generation error:', error);
            return reply.status(500).send({
              success: false,
              error: 'Failed to generate preview',
            });
          }
        }
      });
    });

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

    // Certificates page (protected)
    fastify.get('/certificates', {
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
        return (reply as any).view('certificates/index', {
          title: 'My Certificates',
          user: (request as any).user
        });
      }
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
        const { id } = request.query as { id?: string };
        let selectedTemplate = null;
        
        if (id) {
          try {
            const { TemplateService } = await import('./services/templateService');
            selectedTemplate = await TemplateService.getDefaultTemplateById(id);
          } catch (error) {
            fastify.log.error('Error loading template for customization:', error);
          }
        }
        
        return (reply as any).view('templates/customize', {
          title: 'Customize Template',
          user: (request as any).user,
          selectedTemplate
        });
      }
    });

    // Enhanced Certificate Builder page (protected)
    fastify.get('/templates/builder', {
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
        try {
          const { TemplateService } = await import('./services/templateService');
          const templatePresets = TemplateService.getTemplatePresets();
          const colorPresets = TemplateService.getColorPresets();
          const badgeIcons = TemplateService.getBadgeIcons();
          const defaultConfig = TemplateService.getDefaultConfig();

          return (reply as any).view('templates/enhanced-builder', {
            title: 'Certificate Builder',
            templatePresets,
            colorPresets,
            badgeIcons,
            defaultConfig,
            user: (request as any).user
          });
        } catch (error) {
          fastify.log.error('Error loading certificate builder:', error);
          return reply.status(500).send('Internal Server Error');
        }
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
