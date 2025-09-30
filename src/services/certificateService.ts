import { v4 as uuidv4 } from 'uuid';
import { CertificateQueries, GenerationBatchQueries } from '../database/queries';
import { AuthService } from './authService';
import { TemplateService } from './templateService';
import { ImageProcessor } from '../utils/imageProcessor';
import { PDFGenerator } from '../utils/pdfGenerator';
import { ZipCreator } from '../utils/zipCreator';
import { CSVParser } from '../utils/csvParser';
import { 
  Certificate, 
  GenerationBatch, 
  GenerateCertificatesRequest, 
  CertificateGenerationResult 
} from '../types/certificate';
import { CONSTANTS } from '../config/constants';
import { config } from '../config/database';
import fs from 'fs/promises';
import path from 'path';

export class CertificateService {
  
  static async generateCertificates(
    userId: string,
    request: GenerateCertificatesRequest
  ): Promise<CertificateGenerationResult> {
    try {
      const { event_name, participant_names, template_id } = request;

      // Validate user can generate certificates
      const canGenerate = await AuthService.canGenerateCertificates(userId, participant_names.length);
      if (!canGenerate) {
        throw new Error(`Certificate limit exceeded. Free tier allows up to ${CONSTANTS.FREE_TIER_LIMIT} certificates.`);
      }

      // Get user information
      const user = await AuthService.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get template - try user template first, then default template
      let template = await TemplateService.getTemplateById(template_id);
      let isDefaultTemplate = false;
      
      if (!template) {
        // Try to get default template
        const defaultTemplate = await TemplateService.getDefaultTemplateById(template_id);
        if (defaultTemplate) {
          // Convert default template to template format for processing
          template = {
            id: defaultTemplate.id,
            user_id: userId,
            template_type: 'default' as const,
            default_template_id: defaultTemplate.id,
            custom_image_path: undefined,
            logo_path: undefined,
            primary_color: defaultTemplate.default_primary_color,
            text_x_position: defaultTemplate.default_text_x,
            text_y_position: defaultTemplate.default_text_y,
            font_size: defaultTemplate.default_font_size,
            font_color: defaultTemplate.default_font_color,
            font_family: 'Arial',
            created_at: new Date(),
            default_template: defaultTemplate
          };
          isDefaultTemplate = true;
        }
      }
      
      if (!template) {
        throw new Error('Template not found');
      }

      // Create generation batch
      const batchId = uuidv4();
      const batch = await GenerationBatchQueries.create({
        user_id: userId,
        event_name,
        participant_count: participant_names.length,
        status: CONSTANTS.BATCH_STATUS.PROCESSING
      });

      try {
        // Generate certificates
        const certificates: Certificate[] = [];
        const certificateFiles: { participantName: string; pdfBuffer: Buffer }[] = [];

        for (const participantName of participant_names) {
          // Create certificate record
          const certificate = await CertificateQueries.create({
            user_id: userId,
            participant_name: participantName,
            event_name,
            batch_id: batchId
          });

          certificates.push(certificate);

          // Generate certificate image
          const imageBuffer = await ImageProcessor.generateCertificateImage({
            participantName,
            eventName: event_name,
            organizationName: user.organization_name,
            certificateId: certificate.id,
            template
          });

          // Convert to PDF
          const pdfBuffer = await PDFGenerator.generatePDFFromImage(imageBuffer, participantName);
          
          certificateFiles.push({
            participantName,
            pdfBuffer
          });
        }

        // Create ZIP file
        const zipPath = await ZipCreator.createCertificateZip(
          certificateFiles,
          batchId,
          event_name
        );

        // Update batch status
        await GenerationBatchQueries.updateStatus(
          batch.id,
          CONSTANTS.BATCH_STATUS.COMPLETED,
          zipPath
        );

        // Update user certificate count
        await AuthService.incrementCertificateCount(userId, participant_names.length);

        // Generate download URL
        const downloadUrl = ZipCreator.generateDownloadUrl(zipPath, config.app.domain);

        return {
          batch_id: batchId,
          certificates,
          zip_file_path: zipPath,
          download_url: downloadUrl
        };

      } catch (error) {
        // Update batch status to failed
        await GenerationBatchQueries.updateStatus(
          batch.id,
          CONSTANTS.BATCH_STATUS.FAILED,
          null
        );
        throw error;
      }

    } catch (error) {
      console.error('Certificate generation failed:', error);
      throw error;
    }
  }

  static async generateCertificatesFromCSV(
    userId: string,
    eventName: string,
    templateId: string,
    csvBuffer: Buffer
  ): Promise<CertificateGenerationResult> {
    try {
      // Validate CSV format
      const validation = await CSVParser.validateCSVFormat(csvBuffer);
      if (!validation.valid) {
        throw new Error(validation.message || 'Invalid CSV format');
      }

      // Parse participant names
      const participantNames = await CSVParser.parseParticipantNames(csvBuffer);
      
      if (participantNames.length === 0) {
        throw new Error('No valid participant names found in CSV file');
      }

      // Generate certificates
      return await this.generateCertificates(userId, {
        event_name: eventName,
        participant_names: participantNames,
        template_id: templateId
      });

    } catch (error) {
      console.error('CSV certificate generation failed:', error);
      throw error;
    }
  }

  static async getBatchStatus(batchId: string): Promise<GenerationBatch | null> {
    return await GenerationBatchQueries.findById(batchId);
  }

  static async getUserBatches(userId: string): Promise<GenerationBatch[]> {
    return await GenerationBatchQueries.findByUserId(userId);
  }

  static async getCertificatesByBatch(batchId: string): Promise<Certificate[]> {
    return await CertificateQueries.findByBatchId(batchId);
  }

  static async getUserCertificates(userId: string, limit: number = 50, offset: number = 0): Promise<Certificate[]> {
    return await CertificateQueries.findByUserId(userId, limit, offset);
  }

  static async downloadBatchZip(batchId: string, userId: string): Promise<{ filePath: string; fileName: string } | null> {
    const batch = await GenerationBatchQueries.findById(batchId);
    
    if (!batch || batch.user_id !== userId) {
      return null;
    }

    if (batch.status !== CONSTANTS.BATCH_STATUS.COMPLETED || !batch.file_path) {
      return null;
    }

    // Check if file exists
    try {
      await fs.access(batch.file_path);
      const fileName = path.basename(batch.file_path);
      return {
        filePath: batch.file_path,
        fileName
      };
    } catch (error) {
      return null;
    }
  }

  static async regenerateCertificate(
    certificateId: string,
    userId: string
  ): Promise<{ pdfBuffer: Buffer; certificate: Certificate } | null> {
    try {
      // Get certificate
      const certificate = await CertificateQueries.findById(certificateId);
      if (!certificate || certificate.user_id !== userId) {
        return null;
      }

      // Get user information
      const user = await AuthService.getUserById(userId);
      if (!user) {
        return null;
      }

      // Get the template used for this certificate (you might need to store template_id in certificates table)
      // For now, let's get the user's most recent template
      const userTemplates = await TemplateService.getUserTemplates(userId);
      if (userTemplates.length === 0) {
        throw new Error('No template found for regeneration');
      }

      const template = userTemplates[0]; // Use most recent template

      // Generate certificate image
      const imageBuffer = await ImageProcessor.generateCertificateImage({
        participantName: certificate.participant_name,
        eventName: certificate.event_name,
        organizationName: user.organization_name,
        certificateId: certificate.id,
        template
      });

      // Convert to PDF
      const pdfBuffer = await PDFGenerator.generatePDFFromImage(
        imageBuffer, 
        certificate.participant_name
      );

      return {
        pdfBuffer,
        certificate
      };

    } catch (error) {
      console.error('Certificate regeneration failed:', error);
      throw error;
    }
  }

  static async previewCertificate(
    userId: string,
    templateId: string,
    participantName: string = 'John Doe',
    eventName: string = 'Sample Event'
  ): Promise<Buffer> {
    try {
      // Get user information
      const user = await AuthService.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get template - try user template first, then default template
      let template = await TemplateService.getTemplateById(templateId);
      
      if (!template) {
        // Try to get default template
        const defaultTemplate = await TemplateService.getDefaultTemplateById(templateId);
        if (defaultTemplate) {
          // Convert default template to template format for processing
          template = {
            id: defaultTemplate.id,
            user_id: userId,
            template_type: 'default' as const,
            default_template_id: defaultTemplate.id,
            custom_image_path: undefined,
            logo_path: undefined,
            primary_color: defaultTemplate.default_primary_color,
            text_x_position: defaultTemplate.default_text_x,
            text_y_position: defaultTemplate.default_text_y,
            font_size: defaultTemplate.default_font_size,
            font_color: defaultTemplate.default_font_color,
            font_family: 'Arial',
            created_at: new Date(),
            default_template: defaultTemplate
          };
        }
      }
      
      if (!template) {
        throw new Error('Template not found');
      }

      // Generate preview image (no QR code for preview)
      const tempCertificateId = 'preview-' + uuidv4();
      
      const imageBuffer = await ImageProcessor.generateCertificateImage({
        participantName,
        eventName,
        organizationName: user.organization_name,
        certificateId: tempCertificateId,
        template
      });

      return imageBuffer;

    } catch (error) {
      console.error('Certificate preview failed:', error);
      throw error;
    }
  }
}
