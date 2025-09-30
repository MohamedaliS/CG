import { FastifyInstance } from 'fastify';
import { VerificationService } from '../services/verificationService';
import { optionalAuth } from '../middleware/auth';
import { ApiResponse } from '../types';

export default async function verificationRoutes(fastify: FastifyInstance) {

  // Public certificate verification (API endpoint)
  fastify.get('/api/verify/:certificateId', {
    handler: async (request, reply) => {
      try {
        const { certificateId } = request.params as { certificateId: string };
        
        // Get client IP for logging
        const clientIP = request.ip || 'unknown';
        const userAgent = request.headers['user-agent'] || 'unknown';

        // Check rate limiting (if implemented)
        const rateLimitOk = await VerificationService.checkRateLimit(clientIP);
        if (!rateLimitOk) {
          return reply.status(429).send({
            success: false,
            error: 'Too many verification requests. Please try again later.',
          } as ApiResponse);
        }

        // Verify certificate
        const result = await VerificationService.verifyCertificate(certificateId);

        // Log verification attempt
        await VerificationService.logVerificationAttempt(
          certificateId,
          clientIP,
          userAgent,
          result.valid
        );

        if (result.valid && result.certificate) {
          const formattedCertificate = VerificationService.formatCertificateForDisplay(result.certificate);
          
          return reply.send({
            success: true,
            data: {
              valid: true,
              certificate: formattedCertificate,
              verificationDate: new Date().toISOString(),
            },
            message: result.message,
          } as ApiResponse);
        } else {
          return reply.status(404).send({
            success: false,
            data: {
              valid: false,
              verificationDate: new Date().toISOString(),
            },
            message: result.message,
          } as ApiResponse);
        }

      } catch (error) {
        console.error('Verification error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Verification service temporarily unavailable',
          message: 'Please try again later',
        } as ApiResponse);
      }
    }
  });

  // Public certificate verification page (HTML)
  fastify.get('/verify/:certificateId', {
    preHandler: [optionalAuth],
    handler: async (request, reply) => {
      try {
        const { certificateId } = request.params as { certificateId: string };
        
        // Verify certificate
        const result = await VerificationService.verifyCertificate(certificateId);

        let certificateData = null;
        if (result.valid && result.certificate) {
          certificateData = VerificationService.formatCertificateForDisplay(result.certificate);
        }

        return reply.view('verification/verify', {
          title: 'Certificate Verification',
          certificateId,
          valid: result.valid,
          certificate: certificateData,
          message: result.message,
          verificationDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        });

      } catch (error) {
        console.error('Verification page error:', error);
        return reply.view('verification/verify', {
          title: 'Certificate Verification',
          certificateId: (request.params as { certificateId: string }).certificateId,
          valid: false,
          certificate: null,
          message: 'An error occurred while verifying the certificate.',
          verificationDate: new Date().toLocaleDateString()
        });
      }
    }
  });

  // Verification landing page
  fastify.get('/verify', {
    preHandler: [optionalAuth],
    handler: async (request, reply) => {
      return reply.view('verification/verify', {
        title: 'Certificate Verification',
        certificateId: null,
        valid: null,
        certificate: null,
        message: 'Enter a certificate ID to verify its authenticity.',
        verificationDate: null
      });
    }
  });

  // Bulk verification (for API users)
  fastify.post('/api/verify/bulk', {
    handler: async (request, reply) => {
      try {
        const { certificate_ids } = request.body as { certificate_ids: string[] };
        
        if (!Array.isArray(certificate_ids) || certificate_ids.length === 0) {
          return reply.status(400).send({
            success: false,
            error: 'certificate_ids array is required',
          } as ApiResponse);
        }

        if (certificate_ids.length > 100) {
          return reply.status(400).send({
            success: false,
            error: 'Maximum 100 certificates can be verified at once',
          } as ApiResponse);
        }

        const results = await Promise.all(
          certificate_ids.map(async (id) => {
            const result = await VerificationService.verifyCertificate(id);
            return {
              certificate_id: id,
              valid: result.valid,
              message: result.message,
              certificate: result.valid && result.certificate ? 
                VerificationService.formatCertificateForDisplay(result.certificate) : null
            };
          })
        );

        return reply.send({
          success: true,
          data: results,
          message: `Verified ${certificate_ids.length} certificates`,
        } as ApiResponse);

      } catch (error) {
        console.error('Bulk verification error:', error);
        return reply.status(500).send({
          success: false,
          error: 'Bulk verification failed',
          message: 'Please try again later',
        } as ApiResponse);
      }
    }
  });

  // Get certificate verification statistics (for certificate owners)
  fastify.get('/api/certificates/:certificateId/stats', {
    handler: async (request, reply) => {
      try {
        const { certificateId } = request.params as { certificateId: string };
        
        const stats = await VerificationService.getCertificateVerificationHistory(certificateId);
        
        return reply.send({
          success: true,
          data: stats,
          message: 'Certificate statistics retrieved successfully',
        } as ApiResponse);

      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: 'Failed to retrieve certificate statistics',
        } as ApiResponse);
      }
    }
  });
}
