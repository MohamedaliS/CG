import { CertificateQueries } from '../database/queries';
import { VerificationResult, CertificateWithUser } from '../types/certificate';

export class VerificationService {
  
  static async verifyCertificate(certificateId: string): Promise<VerificationResult> {
    try {
      // Basic UUID format validation
      if (!this.isValidUUID(certificateId)) {
        return {
          valid: false,
          message: 'Invalid certificate ID format'
        };
      }

      // Look up certificate in database
      const certificate = await CertificateQueries.findById(certificateId);
      
      if (!certificate) {
        return {
          valid: false,
          message: 'Certificate not found. This certificate may not exist or may have been revoked.'
        };
      }

      if (!certificate.is_active) {
        return {
          valid: false,
          message: 'This certificate has been revoked and is no longer valid.'
        };
      }

      return {
        valid: true,
        certificate,
        message: 'Certificate is valid and authentic.'
      };

    } catch (error) {
      console.error('Certificate verification error:', error);
      return {
        valid: false,
        message: 'An error occurred while verifying the certificate. Please try again later.'
      };
    }
  }

  static async getCertificateDetails(certificateId: string): Promise<CertificateWithUser | null> {
    try {
      if (!this.isValidUUID(certificateId)) {
        return null;
      }

      const certificate = await CertificateQueries.findById(certificateId);
      return certificate || null;

    } catch (error) {
      console.error('Error getting certificate details:', error);
      return null;
    }
  }

  static async getCertificateVerificationHistory(certificateId: string): Promise<{
    verificationCount: number;
    lastVerified: Date | null;
  }> {
    // This would require a verification_logs table to track verification attempts
    // For now, return default values
    return {
      verificationCount: 0,
      lastVerified: null
    };
  }

  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static formatCertificateForDisplay(certificate: CertificateWithUser): {
    participantName: string;
    eventName: string;
    organizationName: string;
    generatedDate: string;
    certificateId: string;
  } {
    return {
      participantName: certificate.participant_name,
      eventName: certificate.event_name,
      organizationName: certificate.organization_name,
      generatedDate: certificate.generated_at.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      certificateId: certificate.id
    };
  }

  static generateVerificationQRCodeText(certificateId: string, domain: string): string {
    return `${domain}/verify/${certificateId}`;
  }

  // Additional security methods could include:
  
  static async logVerificationAttempt(
    certificateId: string, 
    ipAddress: string, 
    userAgent: string, 
    success: boolean
  ): Promise<void> {
    // This would log verification attempts to a verification_logs table
    // For security auditing and analytics
    try {
      // Implementation would go here
      console.log(`Verification attempt: ${certificateId}, IP: ${ipAddress}, Success: ${success}`);
    } catch (error) {
      console.error('Error logging verification attempt:', error);
    }
  }

  static async checkRateLimit(ipAddress: string): Promise<boolean> {
    // This would implement rate limiting to prevent abuse
    // For now, always return true (no rate limiting)
    return true;
  }
}
