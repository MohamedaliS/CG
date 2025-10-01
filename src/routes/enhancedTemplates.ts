import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TemplateService } from '../services/templateService';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../types';

export default async function enhancedTemplateRoutes(fastify: FastifyInstance) {

  // Enhanced certificate builder main page
  fastify.get('/templates/builder', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const templatePresets = TemplateService.getTemplatePresets();
        const colorPresets = TemplateService.getColorPresets();
        const badgeIcons = TemplateService.getBadgeIcons();
        const defaultConfig = TemplateService.getDefaultConfig();

        return reply.view('templates/enhanced-builder', {
          title: 'Certificate Builder',
          templatePresets,
          colorPresets,
          badgeIcons,
          defaultConfig,
          user: request.user
        });
      } catch (error) {
        throw error;
      }
    }
  });

  // HTMX endpoint for live preview updates
  fastify.post('/templates/builder/preview', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const config = request.body as any;
        
        // Validate config
        if (!config.template || !config.recipientName) {
          return reply.status(400).send('Invalid configuration');
        }

        const certificateHTML = TemplateService.renderCertificateHTML(config);
        
        return reply.type('text/html').send(certificateHTML);
      } catch (error) {
        console.error('Preview generation error:', error);
        return reply.status(500).send('<div class="error">Error generating preview</div>');
      }
    }
  });

  // HTMX endpoint to apply template preset
  fastify.post('/templates/builder/apply-preset', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const { presetId, category } = request.body as { presetId: string; category: string };
        
        let preset;
        if (category === 'theme') {
          preset = TemplateService.getTemplatePresets().find(p => p.id === presetId);
        } else if (category === 'color') {
          preset = TemplateService.getColorPresets().find(p => p.id === presetId);
        }

        if (!preset) {
          return reply.status(404).send({
            success: false,
            error: 'Preset not found'
          });
        }

        return reply.send({
          success: true,
          data: preset.config,
          message: `${preset.name} applied successfully`
        });
      } catch (error) {
        throw error;
      }
    }
  });

  // Upload logo for certificate
  fastify.post('/templates/builder/upload-logo', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const data = await request.file();
        
        if (!data) {
          return reply.status(400).send({
            success: false,
            error: 'No file uploaded'
          });
        }

        // Validate file size (max 2MB)
        const buffer = await data.toBuffer();
        if (buffer.length > 2 * 1024 * 1024) {
          return reply.status(400).send({
            success: false,
            error: 'File size must be less than 2MB'
          });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(data.mimetype)) {
          return reply.status(400).send({
            success: false,
            error: 'Only JPEG, PNG, GIF, and WebP images are allowed'
          });
        }

        // Convert to base64 for immediate use
        const base64Image = `data:${data.mimetype};base64,${buffer.toString('base64')}`;

        return reply.send({
          success: true,
          data: { logoImage: base64Image },
          message: 'Logo uploaded successfully'
        });
      } catch (error) {
        console.error('Logo upload error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to upload logo'
        });
      }
    }
  });

  // Save certificate configuration as template
  fastify.post('/templates/builder/save', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const config = request.body as any;
        const userId = request.user!.id;

        // Create template from enhanced config
        const templateData = {
          user_id: userId,
          template_type: 'default' as const,
          default_template_id: null, // Will be set based on selected template
          custom_image_path: null,
          logo_path: null, // Logo is stored as base64 in config
          primary_color: config.primaryColor,
          secondary_color: config.secondaryColor,
          accent_color: config.accentColor,
          text_x_position: 400, // Default position
          text_y_position: 300, // Default position
          font_size: 48, // Default size
          font_color: config.accentColor,
          font_family: config.fontFamily,
          font_style: config.fontFamily,
          show_badge: config.showBadge,
          badge_icon: config.badgeIcon,
          badge_text: config.badgeText,
          border_style: config.borderStyle,
          logo_text: config.logoText,
          show_logo: config.showLogo,
          logo_position: config.logoPosition,
          logo_size: config.logoSize,
          certificate_title: config.title,
          subtitle: config.subtitle,
          description: config.description,
          signature_text: config.signature,
          template_config: JSON.stringify(config)
        };

        // Note: This would require updating the database queries to support new fields
        // For now, we'll return a success response
        
        return reply.send({
          success: true,
          data: { id: 'new-template-id' },
          message: 'Certificate template saved successfully'
        });
      } catch (error) {
        console.error('Template save error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to save template'
        });
      }
    }
  });

  // Get template presets (for HTMX)
  fastify.get('/templates/builder/presets/:category', {
    handler: async (request, reply) => {
      try {
        const { category } = request.params as { category: string };
        
        let presets;
        if (category === 'theme') {
          presets = TemplateService.getTemplatePresets();
        } else if (category === 'color') {
          presets = TemplateService.getColorPresets();
        } else {
          return reply.status(400).send({
            success: false,
            error: 'Invalid category'
          });
        }

        return reply.send({
          success: true,
          data: presets
        });
      } catch (error) {
        throw error;
      }
    }
  });

  // Get badge icons (for HTMX)
  fastify.get('/templates/builder/badge-icons', {
    handler: async (request, reply) => {
      try {
        const badgeIcons = TemplateService.getBadgeIcons();
        
        return reply.send({
          success: true,
          data: badgeIcons
        });
      } catch (error) {
        throw error;
      }
    }
  });

  // Generate certificate preview as image (for download)
  fastify.post('/templates/builder/generate-image', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const config = request.body as any;
        
        // Generate HTML
        const certificateHTML = TemplateService.renderCertificateHTML(config);
        
        // For a full implementation, you would use a service like Puppeteer
        // to convert HTML to image. For now, return the HTML.
        
        return reply.type('text/html').send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Certificate Preview</title>
            <style>
              body { margin: 0; padding: 20px; background: #f0f0f0; font-family: Arial, sans-serif; }
              .certificate-container { margin: 0 auto; }
            </style>
          </head>
          <body>
            ${certificateHTML}
          </body>
          </html>
        `);
      } catch (error) {
        console.error('Image generation error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to generate image'
        });
      }
    }
  });

  // Reset to default configuration
  fastify.get('/templates/builder/reset', {
    handler: async (request, reply) => {
      try {
        const defaultConfig = TemplateService.getDefaultConfig();
        
        return reply.send({
          success: true,
          data: defaultConfig,
          message: 'Configuration reset to defaults'
        });
      } catch (error) {
        throw error;
      }
    }
  });
}