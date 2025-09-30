import QRCode from 'qrcode';
import { config } from '../config/database';

export class QRCodeGenerator {
  
  static async generateQRCode(certificateId: string): Promise<Buffer> {
    try {
      const verificationUrl = `${config.app.domain}/verify/${certificateId}`;
      
      const qrCodeBuffer = await QRCode.toBuffer(verificationUrl, {
        type: 'png',
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      return qrCodeBuffer;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  static async generateQRCodeDataURL(certificateId: string): Promise<string> {
    try {
      const verificationUrl = `${config.app.domain}/verify/${certificateId}`;
      
      const qrCodeDataURL = await QRCode.toDataURL(verificationUrl, {
        type: 'image/png',
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code data URL:', error);
      throw new Error('Failed to generate QR code data URL');
    }
  }

  static getVerificationUrl(certificateId: string): string {
    return `${config.app.domain}/verify/${certificateId}`;
  }
}
