import { FastifyInstance } from 'fastify';
import { CertificateService } from '../services/certificateService';
import { authenticateToken } from '../middleware/auth';
import { validateGenerateCertificates } from '../middleware/validation';
import { ApiResponse, GenerateCertificatesRequest } from '../types';

export default async function certificateRoutes(fastify: FastifyInstance) {

  // Generate certificates (manual participant list)
  fastify.post('/certificates/generate', {
    preHandler: [authenticateToken, validateGenerateCertificates],
    handler: async (request, reply) => {
      try {
        const generateRequest = request.body as GenerateCertificatesRequest;
        
        const result = await CertificateService.generateCertificates(
          request.user!.id,
          generateRequest
        );

        return reply.status(201).send({
          success: true,
          data: result,
          message: 'Certificates generated successfully',
        } as ApiResponse);

      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({
            success: false,
            error: 'Certificate generation failed',
            message: error.message,
          } as ApiResponse);
        }
        throw error;
      }
    }
  });

  // Generate certificates from CSV upload
  fastify.post('/certificates/generate/csv', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const data = await (request as any).file();
        
        if (!data) {
          return reply.status(400).send({
            success: false,
            error: 'No CSV file uploaded',
          } as ApiResponse);
        }

        // Get CSV buffer
        const csvBuffer = await data.toBuffer();

        // Get form fields
        const fields = data.fields as any;
        const eventName = (fields.event_name as any)?.value;
        const templateId = (fields.template_id as any)?.value;

        if (!eventName || !templateId) {
          return reply.status(400).send({
            success: false,
            error: 'Event name and template ID are required',
          } as ApiResponse);
        }

        const result = await CertificateService.generateCertificatesFromCSV(
          request.user!.id,
          eventName,
          templateId,
          csvBuffer
        );

        return reply.status(201).send({
          success: true,
          data: result,
          message: 'Certificates generated from CSV successfully',
        } as ApiResponse);

      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({
            success: false,
            error: 'CSV certificate generation failed',
            message: error.message,
          } as ApiResponse);
        }
        throw error;
      }
    }
  });

  // Get batch status
  fastify.get('/certificates/batch/:batchId', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const { batchId } = request.params as { batchId: string };
        const batch = await CertificateService.getBatchStatus(batchId);

        if (!batch || batch.user_id !== request.user!.id) {
          return reply.status(404).send({
            success: false,
            error: 'Batch not found',
          } as ApiResponse);
        }

        return reply.send({
          success: true,
          data: batch,
          message: 'Batch status retrieved successfully',
        } as ApiResponse);

      } catch (error) {
        throw error;
      }
    }
  });

  // Get user's generation batches
  fastify.get('/certificates/batches', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const batches = await CertificateService.getUserBatches(request.user!.id);

        return reply.send({
          success: true,
          data: batches,
          message: 'Batches retrieved successfully',
        } as ApiResponse);

      } catch (error) {
        throw error;
      }
    }
  });

  // Get certificates in a batch
  fastify.get('/certificates/batch/:batchId/certificates', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const { batchId } = request.params as { batchId: string };
        
        // Verify user owns this batch
        const batch = await CertificateService.getBatchStatus(batchId);
        if (!batch || batch.user_id !== request.user!.id) {
          return reply.status(404).send({
            success: false,
            error: 'Batch not found',
          } as ApiResponse);
        }

        const certificates = await CertificateService.getCertificatesByBatch(batchId);

        return reply.send({
          success: true,
          data: certificates,
          message: 'Batch certificates retrieved successfully',
        } as ApiResponse);

      } catch (error) {
        throw error;
      }
    }
  });

  // Get user's certificates
  fastify.get('/certificates', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const query = request.query as { limit?: string; offset?: string };
        const limit = parseInt(query.limit || '50');
        const offset = parseInt(query.offset || '0');

        const certificates = await CertificateService.getUserCertificates(
          request.user!.id,
          limit,
          offset
        );

        return reply.send({
          success: true,
          data: certificates,
          message: 'Certificates retrieved successfully',
        } as ApiResponse);

      } catch (error) {
        throw error;
      }
    }
  });

  // Download batch ZIP file
  fastify.get('/certificates/batch/:batchId/download', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const { batchId } = request.params as { batchId: string };
        
        const downloadInfo = await CertificateService.downloadBatchZip(
          batchId,
          request.user!.id
        );

        if (!downloadInfo) {
          return reply.status(404).send({
            success: false,
            error: 'Download not available',
          } as ApiResponse);
        }

        return reply
          .header('Content-Type', 'application/zip')
          .header('Content-Disposition', `attachment; filename="${downloadInfo.fileName}"`)
          .send(require('fs').createReadStream(downloadInfo.filePath));

      } catch (error) {
        if (error instanceof Error) {
          return reply.status(500).send({
            success: false,
            error: 'Download failed',
            message: error.message,
          } as ApiResponse);
        }
        throw error;
      }
    }
  });

  // Regenerate single certificate
  fastify.post('/certificates/:certificateId/regenerate', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const { certificateId } = request.params as { certificateId: string };
        
        const result = await CertificateService.regenerateCertificate(
          certificateId,
          request.user!.id
        );

        if (!result) {
          return reply.status(404).send({
            success: false,
            error: 'Certificate not found',
          } as ApiResponse);
        }

        const sanitizedName = result.certificate.participant_name
          .replace(/[^a-zA-Z0-9\s-]/g, '')
          .replace(/\s+/g, '_');

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="${sanitizedName}_certificate.pdf"`)
          .send(result.pdfBuffer);

      } catch (error) {
        if (error instanceof Error) {
          return reply.status(500).send({
            success: false,
            error: 'Certificate regeneration failed',
            message: error.message,
          } as ApiResponse);
        }
        throw error;
      }
    }
  });

  // Preview certificate
  fastify.post('/certificates/preview', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const { template_id, participant_name, event_name } = request.body as {
          template_id: string;
          participant_name?: string;
          event_name?: string;
        };

        if (!template_id) {
          return reply.status(400).send({
            success: false,
            error: 'Template ID is required',
          } as ApiResponse);
        }

        const imageBuffer = await CertificateService.previewCertificate(
          request.user!.id,
          template_id,
          participant_name,
          event_name
        );

        return reply
          .header('Content-Type', 'image/png')
          .send(imageBuffer);

      } catch (error) {
        if (error instanceof Error) {
          return reply.status(500).send({
            success: false,
            error: 'Certificate preview failed',
            message: error.message,
          } as ApiResponse);
        }
        throw error;
      }
    }
  });
}
