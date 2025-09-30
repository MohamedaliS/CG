import { FastifyInstance } from 'fastify';
import { TemplateService } from '../services/templateService';
import { authenticateToken } from '../middleware/auth';
import { validateTemplateCustomization } from '../middleware/validation';
import { ApiResponse, TemplateCustomization } from '../types';
import { CONSTANTS } from '../config/constants';
import path from 'path';

export default async function templateRoutes(fastify: FastifyInstance) {

  // Get all default templates
  fastify.get('/templates/defaults', {
    handler: async (request, reply) => {
      try {
        const templates = await TemplateService.getDefaultTemplates();
        
        return reply.send({
          success: true,
          data: templates,
          message: 'Default templates retrieved successfully',
        } as ApiResponse);
      } catch (error) {
        throw error;
      }
    }
  });

  // Get user's custom templates
  fastify.get('/templates/user', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const templates = await TemplateService.getUserTemplates(request.user!.id);
        
        return reply.send({
          success: true,
          data: templates,
          message: 'User templates retrieved successfully',
        } as ApiResponse);
      } catch (error) {
        throw error;
      }
    }
  });

  // Get template by ID
  fastify.get('/templates/:id', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const template = await TemplateService.getTemplateById(id);
        
        if (!template) {
          return reply.status(404).send({
            success: false,
            error: 'Template not found',
          } as ApiResponse);
        }

        return reply.send({
          success: true,
          data: template,
          message: 'Template retrieved successfully',
        } as ApiResponse);
      } catch (error) {
        throw error;
      }
    }
  });

  // Customize template from default
  fastify.post('/templates/customize/default', {
    preHandler: [authenticateToken, validateTemplateCustomization],
    handler: async (request, reply) => {
      try {
        const body = request.body as any;
        const customization = {
          primary_color: body.primary_color,
          font_color: body.font_color,
          font_family: body.font_family,
          font_size: Number(body.font_size),
          text_x_position: Number(body.text_x_position),
          text_y_position: Number(body.text_y_position),
        } as TemplateCustomization;
        
        const defaultTemplateId = body.baseTemplateId;
        if (!defaultTemplateId) {
          return reply.status(400).send({
            success: false,
            error: 'Base template ID is required',
          } as ApiResponse);
        }

        const template = await TemplateService.createTemplateFromDefault(
          request.user!.id,
          defaultTemplateId,
          customization
        );

        return reply.status(201).send({
          success: true,
          data: template,
          message: 'Template customized successfully',
        } as ApiResponse);
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({
            success: false,
            error: 'Template customization failed',
            message: error.message,
          } as ApiResponse);
        }
        throw error;
      }
    }
  });

  // Upload custom template
  fastify.post('/templates/customize/custom', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const data = await request.file();
        
        if (!data) {
          return reply.status(400).send({
            success: false,
            error: 'No file uploaded',
          } as ApiResponse);
        }

        // Get file buffer
        const buffer = await data.toBuffer();
        
        // Validate image file
        await TemplateService.validateImageFile(buffer);

        // Save uploaded file
        const uploadDir = path.join(process.cwd(), CONSTANTS.UPLOAD_DIR, 'templates');
        const filePath = await TemplateService.saveUploadedFile(buffer, data.filename, uploadDir);

        // Get customization data from fields
        const fields = data.fields as any;
        const customization: TemplateCustomization = {
          primary_color: (fields.primary_color as any)?.value || CONSTANTS.DEFAULT_PRIMARY_COLOR,
          text_x_position: parseInt((fields.text_x_position as any)?.value) || 512,
          text_y_position: parseInt((fields.text_y_position as any)?.value) || 400,
          font_size: parseInt((fields.font_size as any)?.value) || CONSTANTS.DEFAULT_FONT_SIZE,
          font_color: (fields.font_color as any)?.value || CONSTANTS.DEFAULT_FONT_COLOR,
          font_family: (fields.font_family as any)?.value || CONSTANTS.DEFAULT_FONT_FAMILY,
        };

        const template = await TemplateService.createCustomTemplate(
          request.user!.id,
          filePath,
          customization
        );

        return reply.status(201).send({
          success: true,
          data: template,
          message: 'Custom template created successfully',
        } as ApiResponse);
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({
            success: false,
            error: 'Custom template creation failed',
            message: error.message,
          } as ApiResponse);
        }
        throw error;
      }
    }
  });

  // Upload logo for template
  fastify.post('/templates/upload-logo', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const data = await request.file();
        
        if (!data) {
          return reply.status(400).send({
            success: false,
            error: 'No file uploaded',
          } as ApiResponse);
        }

        // Get file buffer
        const buffer = await data.toBuffer();
        
        // Validate image file
        await TemplateService.validateImageFile(buffer, 5 * 1024 * 1024); // 5MB limit for logos

        // Save uploaded file
        const uploadDir = path.join(process.cwd(), CONSTANTS.UPLOAD_DIR, 'logos');
        const filePath = await TemplateService.saveUploadedFile(buffer, data.filename, uploadDir);

        return reply.send({
          success: true,
          data: { logo_path: filePath },
          message: 'Logo uploaded successfully',
        } as ApiResponse);
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({
            success: false,
            error: 'Logo upload failed',
            message: error.message,
          } as ApiResponse);
        }
        throw error;
      }
    }
  });

  // Get default template settings
  fastify.get('/templates/defaults/:id/settings', {
    handler: async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const defaultTemplate = await TemplateService.getDefaultTemplateById(id);
        
        if (!defaultTemplate) {
          return reply.status(404).send({
            success: false,
            error: 'Default template not found',
          } as ApiResponse);
        }

        const settings = TemplateService.getDefaultSettings(defaultTemplate);

        return reply.send({
          success: true,
          data: settings,
          message: 'Default settings retrieved successfully',
        } as ApiResponse);
      } catch (error) {
        throw error;
      }
    }
  });
}
