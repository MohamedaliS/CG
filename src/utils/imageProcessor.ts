import sharp from 'sharp';
import path from 'path';
import { QRCodeGenerator } from './qrCodeGenerator';
import { TemplateWithDefault } from '../types/template';
import { TemplateService } from '../services/templateService';

export interface CertificateImageOptions {
  participantName: string;
  eventName: string;
  organizationName: string;
  certificateId: string;
  template: TemplateWithDefault;
}

export class ImageProcessor {
  
  static async generateCertificateImage(options: CertificateImageOptions): Promise<Buffer> {
    try {
      const { participantName, eventName, organizationName, certificateId, template } = options;

      // Get base template image path
      const templateImagePath = TemplateService.getTemplateImagePath(template);
      
      // Load base template image
      let image = sharp(templateImagePath);
      
      // Get image metadata to determine dimensions
      const metadata = await image.metadata();
      const imageWidth = metadata.width || 1024;
      const imageHeight = metadata.height || 768;

      // Generate QR code
      const qrCodeBuffer = await QRCodeGenerator.generateQRCode(certificateId);

      // Create SVG text elements
      const participantNameSvg = this.createTextSvg(
        participantName,
        template.text_x_position,
        template.text_y_position,
        template.font_size,
        template.font_color,
        template.font_family,
        'middle'
      );

      const eventNameSvg = this.createTextSvg(
        `Certificate of Completion for ${eventName}`,
        template.text_x_position,
        template.text_y_position - 80,
        Math.round(template.font_size * 0.6),
        template.font_color,
        template.font_family,
        'middle'
      );

      const organizationNameSvg = this.createTextSvg(
        `Issued by ${organizationName}`,
        template.text_x_position,
        template.text_y_position + 60,
        Math.round(template.font_size * 0.5),
        template.font_color,
        template.font_family,
        'middle'
      );

      // Resize QR code to fit
      const qrCodeSize = 120;
      const resizedQRCode = await sharp(qrCodeBuffer)
        .resize(qrCodeSize, qrCodeSize)
        .png()
        .toBuffer();

      // Composite all elements
      const composite: sharp.OverlayOptions[] = [
        // Event name (above participant name)
        {
          input: Buffer.from(eventNameSvg),
          top: 0,
          left: 0,
        },
        // Participant name (main text)
        {
          input: Buffer.from(participantNameSvg),
          top: 0,
          left: 0,
        },
        // Organization name (below participant name)
        {
          input: Buffer.from(organizationNameSvg),
          top: 0,
          left: 0,
        },
        // QR code (bottom right)
        {
          input: resizedQRCode,
          top: imageHeight - qrCodeSize - 30,
          left: imageWidth - qrCodeSize - 30,
        },
      ];

      // Add logo if present
      if (template.logo_path) {
        try {
          const logoBuffer = await sharp(template.logo_path)
            .resize(150, 100, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .png()
            .toBuffer();

          composite.push({
            input: logoBuffer,
            top: 30,
            left: Math.round((imageWidth - 150) / 2), // Center horizontally
          });
        } catch (error) {
          console.warn('Could not load logo, skipping:', error);
        }
      }

      // Apply all composites
      const finalImage = await image
        .composite(composite)
        .png()
        .toBuffer();

      return finalImage;

    } catch (error) {
      console.error('Error generating certificate image:', error);
      throw new Error('Failed to generate certificate image');
    }
  }

  private static createTextSvg(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    color: string,
    fontFamily: string,
    textAnchor: 'start' | 'middle' | 'end' = 'middle'
  ): string {
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return `
      <svg width="1024" height="768" xmlns="http://www.w3.org/2000/svg">
        <text
          x="${x}"
          y="${y}"
          font-family="${fontFamily}"
          font-size="${fontSize}"
          fill="${color}"
          text-anchor="${textAnchor}"
          font-weight="bold"
        >${escapedText}</text>
      </svg>
    `;
  }

  static async resizeImage(
    inputBuffer: Buffer,
    width: number,
    height: number
  ): Promise<Buffer> {
    return await sharp(inputBuffer)
      .resize(width, height, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .png()
      .toBuffer();
  }

  static async optimizeImage(inputBuffer: Buffer, quality: number = 80): Promise<Buffer> {
    return await sharp(inputBuffer)
      .jpeg({ quality, progressive: true })
      .toBuffer();
  }

  static async convertToPNG(inputBuffer: Buffer): Promise<Buffer> {
    return await sharp(inputBuffer)
      .png()
      .toBuffer();
  }

  static async getImageMetadata(inputBuffer: Buffer): Promise<sharp.Metadata> {
    return await sharp(inputBuffer).metadata();
  }

  static async validateImageDimensions(
    inputBuffer: Buffer,
    minWidth: number = 800,
    minHeight: number = 600
  ): Promise<{ valid: boolean; message?: string; metadata?: sharp.Metadata }> {
    try {
      const metadata = await this.getImageMetadata(inputBuffer);
      
      if (!metadata.width || !metadata.height) {
        return { valid: false, message: 'Could not determine image dimensions' };
      }

      if (metadata.width < minWidth || metadata.height < minHeight) {
        return {
          valid: false,
          message: `Image dimensions ${metadata.width}x${metadata.height} are too small. Minimum required: ${minWidth}x${minHeight}`,
          metadata
        };
      }

      return { valid: true, metadata };
    } catch (error) {
      return { valid: false, message: `Error reading image: ${error}` };
    }
  }
}
