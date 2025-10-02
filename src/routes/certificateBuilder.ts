import { FastifyInstance } from 'fastify';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../types';
import { PDFGenerator } from '../utils/pdfGenerator';
import { QRCodeGenerator } from '../utils/qrCodeGenerator';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export default async function certificateBuilderRoutes(fastify: FastifyInstance) {

  // Certificate Builder Main Page
  fastify.get('/builder', {
    preHandler: [async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
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
      return (reply as any).view('builder/index', {
        title: 'Certificate Builder',
        user: (request as any).user
      });
    }
  });

  // Upload logo for builder
  fastify.post('/builder/upload-logo', {
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

        const buffer = await data.toBuffer();
        const base64 = buffer.toString('base64');
        const mimeType = data.mimetype;
        const dataUrl = `data:${mimeType};base64,${base64}`;

        return reply.send({
          success: true,
          data: { logoImage: dataUrl },
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

  // Generate certificate preview
  fastify.post('/builder/preview', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      try {
        const config = request.body as any;
        
        // Generate HTML certificate
        const html = generateCertificateHTML(config);
        
        return reply.type('text/html').send(html);
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(500).send({
            success: false,
            error: 'Preview generation failed',
            message: error.message,
          } as ApiResponse);
        }
        throw error;
      }
    }
  });

  // Download certificate as PDF
  fastify.post('/builder/download', {
    preHandler: [async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
        if (!token && request.headers.cookie) {
          const cookies = request.headers.cookie.split(';');
          const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
          token = authCookie ? authCookie.split('=')[1] : null;
        }
        
        if (!token) {
          return reply.status(401).send({
            success: false,
            error: 'Authentication required'
          });
        }

        const decoded = fastify.jwt.verify(token);
        (request as any).user = decoded;
      } catch (error) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid or expired token'
        });
      }
    }],
    handler: async (request, reply) => {
      try {
        const config = request.body as any;
        const userId = (request as any).user?.id;
        
        console.log('PDF download request received with config:', JSON.stringify(config, null, 2));
        
        // Generate a unique certificate ID for verification
        const certificateId = uuidv4();
        
        // Generate QR code for verification
        const qrCodeDataURL = await QRCodeGenerator.generateQRCodeDataURL(certificateId);
        
        // Add QR code to config
        const configWithQR = {
          ...config,
          qrCodeDataURL,
          certificateId
        };
        
        // Generate full HTML for PDF
        const htmlContent = generateFullCertificateHTML(configWithQR);
        
        console.log('Generated HTML content for PDF with QR code');
        
        // Generate PDF
        const pdfBuffer = await PDFGenerator.generatePDFFromHTML(htmlContent, {
          format: 'A4',
          landscape: true,
          printBackground: true,
          margin: {
            top: '8mm',
            right: '8mm',
            bottom: '8mm',
            left: '8mm'
          },
          preferCSSPageSize: true,
          displayHeaderFooter: false
        });
        
        console.log('PDF generated successfully, buffer size:', pdfBuffer.length);
        
        // Set headers for file download
        const filename = `${config.recipientName || 'Certificate'}_${config.title || 'Certificate'}.pdf`.replace(/[^a-z0-9]/gi, '_');
        
        reply.header('Content-Type', 'application/pdf');
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
        reply.header('Content-Length', pdfBuffer.length);
        
        return reply.send(pdfBuffer);
      } catch (error) {
        console.error('Error generating PDF:', error);
        if (error instanceof Error) {
          return reply.status(500).send({
            success: false,
            error: 'PDF generation failed',
            message: error.message,
          } as ApiResponse);
        }
        throw error;
      }
    }
  });
}

// Helper function to generate certificate HTML
function generateCertificateHTML(config: any): string {
  const borderDesign = getBorderDesign(config);
  const logoHTML = getLogoHTML(config);
  const badgeHTML = getBadgeHTML(config);

  return `
    <div class="relative w-full h-full bg-white shadow-2xl overflow-hidden">
      ${borderDesign}
      ${logoHTML}
      
      <div class="relative z-10 h-full flex flex-col items-center justify-center p-16 text-center">
        <div class="mb-6">
          <h2 class="text-sm tracking-widest mb-2 uppercase opacity-70" style="font-family: ${config.fontFamily === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif'}; color: ${config.accentColor};">
            ${config.title}
          </h2>
          <div class="w-32 h-1 mx-auto mb-4" style="background-color: ${config.primaryColor};"></div>
        </div>

        <p class="text-xs mb-3 opacity-60" style="font-family: ${config.fontFamily === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif'}; color: ${config.accentColor};">
          ${config.subtitle}
        </p>

        <h1 class="text-5xl mb-6" style="font-family: ${config.fontFamily === 'serif' ? 'Brush Script MT, cursive' : 'Arial, sans-serif'}; color: ${config.accentColor}; font-weight: ${config.fontFamily === 'serif' ? 'normal' : 'bold'};">
          ${config.recipientName}
        </h1>

        <p class="text-sm max-w-2xl mb-8 leading-relaxed opacity-70" style="font-family: ${config.fontFamily === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif'}; color: ${config.accentColor};">
          ${config.description}
        </p>

        <div class="flex justify-between items-end w-full max-w-2xl mt-8">
          <div class="text-left">
            <div class="w-32 h-px mb-2" style="background-color: ${config.accentColor}; opacity: 0.3;"></div>
            <p class="text-xs opacity-50" style="color: ${config.accentColor};">DATE</p>
            <p class="text-sm" style="color: ${config.accentColor};">${config.date}</p>
          </div>
          
          <div class="text-right">
            <div class="w-32 h-px mb-2 ml-auto" style="background-color: ${config.accentColor}; opacity: 0.3;"></div>
            <p class="text-xs opacity-50" style="color: ${config.accentColor};">SIGNATURE</p>
            <p class="text-sm" style="color: ${config.accentColor}; font-family: ${config.fontFamily === 'serif' ? 'Brush Script MT, cursive' : 'Arial, sans-serif'};">
              ${config.signature}
            </p>
          </div>
        </div>
      </div>

      ${badgeHTML}
    </div>
  `;
}

// Helper function to generate full HTML document for PDF generation
function generateFullCertificateHTML(config: any): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificate - ${config.recipientName || 'Certificate'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          width: 279mm;  /* A4 landscape width minus margins */
          height: 194mm; /* A4 landscape height minus margins */
          font-family: ${config.fontFamily === 'serif' ? "'Playfair Display', serif" : "'Inter', sans-serif"};
          background: white;
          overflow: hidden;
          position: relative;
          margin: 0;
          padding: 0;
        }
        
        .certificate-container {
          width: 100%;
          height: 100%;
          position: relative;
          background: linear-gradient(135deg, ${config.primaryColor || '#0891b2'}08, ${config.secondaryColor || '#fbbf24'}08);
          border: 3px solid ${config.primaryColor || '#0891b2'};
          padding: 20mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
        
        .logo-container {
          position: absolute;
          top: 10mm;
          left: 10mm;
          max-height: 18mm;
          max-width: 35mm;
          z-index: 10;
        }
        
        .logo-container img {
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
        }
        
        .qr-container {
          position: absolute;
          top: 10mm;
          right: 10mm;
          width: 18mm;
          height: 18mm;
          z-index: 10;
        }
        
        .qr-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border: 1px solid #ddd;
          border-radius: 1mm;
        }
        
        .verification-text {
          position: absolute;
          top: 30mm;
          right: 10mm;
          font-size: 7px;
          color: #666;
          text-align: center;
          width: 18mm;
        }
        
        .certificate-header {
          margin-bottom: 10mm;
        }
        
        .title {
          color: ${config.primaryColor || '#0891b2'};
          font-size: 40px;
          margin-bottom: 6mm;
          font-weight: bold;
          letter-spacing: 1px;
        }
        
        .subtitle {
          font-size: 14px;
          margin-bottom: 10mm;
          color: #666;
          font-style: italic;
        }
        
        .recipient-section {
          margin-bottom: 10mm;
        }
        
        .recipient {
          color: ${config.secondaryColor || '#fbbf24'};
          font-size: 32px;
          margin-bottom: 5mm;
          font-weight: bold;
          border-bottom: 2px solid ${config.secondaryColor || '#fbbf24'};
          padding-bottom: 3mm;
          display: inline-block;
          min-width: 160mm;
        }
        
        .description {
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 12mm;
          max-width: 180mm;
          color: #444;
          text-align: justify;
        }
        
        .footer {
          position: absolute;
          bottom: 10mm;
          left: 20mm;
          right: 20mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .footer-item {
          text-align: center;
          color: #666;
          flex: 1;
        }
        
        .footer-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 2mm;
          font-weight: 600;
        }
        
        .footer-value {
          font-size: 12px;
          font-weight: 500;
          border-top: 2px solid ${config.primaryColor || '#0891b2'};
          padding-top: 2mm;
          min-width: 45mm;
        }
        
        .decorative-border {
          position: absolute;
          top: 6mm;
          left: 6mm;
          right: 6mm;
          bottom: 6mm;
          border: 1px solid ${config.primaryColor || '#0891b2'}40;
          pointer-events: none;
        }
        
        .corner-decoration {
          position: absolute;
          width: 12mm;
          height: 12mm;
          border: 2px solid ${config.secondaryColor || '#fbbf24'};
        }
        
        .corner-decoration.top-left {
          top: 0;
          left: 0;
          border-right: none;
          border-bottom: none;
        }
        
        .corner-decoration.top-right {
          top: 0;
          right: 0;
          border-left: none;
          border-bottom: none;
        }
        
        .corner-decoration.bottom-left {
          bottom: 0;
          left: 0;
          border-right: none;
          border-top: none;
        }
        
        .corner-decoration.bottom-right {
          bottom: 0;
          right: 0;
          border-left: none;
          border-top: none;
        }
        
        .certificate-id {
          position: absolute;
          bottom: 3mm;
          right: 6mm;
          font-size: 7px;
          color: #999;
          font-family: monospace;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .certificate-container {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        <div class="decorative-border">
          <div class="corner-decoration top-left"></div>
          <div class="corner-decoration top-right"></div>
          <div class="corner-decoration bottom-left"></div>
          <div class="corner-decoration bottom-right"></div>
        </div>
        
        ${config.logoUrl ? `<div class="logo-container"><img src="${config.logoUrl}" alt="Organization Logo"></div>` : ''}
        
        <div class="qr-container">
          <img src="${config.qrCodeDataURL || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjNjY2IiBzdHJva2Utd2lkdGg9IjEiLz48dGV4dCB4PSI0MCIgeT0iNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM2NjYiPlFSIENvZGU8L3RleHQ+PC9zdmc+'}" alt="Verification QR Code">
        </div>
        <div class="verification-text">Scan to verify</div>
        
        <div class="certificate-header">
          <h1 class="title">${config.title || 'Certificate of Achievement'}</h1>
          <p class="subtitle">This certificate is proudly presented to</p>
        </div>
        
        <div class="recipient-section">
          <h2 class="recipient">${config.recipientName || 'Recipient Name'}</h2>
        </div>
        
        <p class="description">${config.description || 'For outstanding performance and dedication in completing the advanced training program with exceptional results and demonstrating remarkable commitment to excellence.'}</p>
        
        <div class="footer">
          <div class="footer-item">
            <div class="footer-label">Date of Issue</div>
            <div class="footer-value">${config.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <div class="footer-item">
            <div class="footer-label">Signature</div>
            <div class="footer-value">${config.signature || 'Director Signature'}</div>
          </div>
        </div>
        
        ${config.certificateId ? `<div class="certificate-id">ID: ${config.certificateId.substring(0, 8)}</div>` : ''}
      </div>
    </body>
    </html>
  `;
}

function getBorderDesign(config: any): string {
  const { template, primaryColor, accentColor, secondaryColor, borderStyle } = config;
  
  if (borderStyle === 'modern' && template === 'modern') {
    return `
      <div class="absolute top-0 left-0 w-64 h-64 overflow-hidden">
        <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20" style="background-color: ${primaryColor};"></div>
      </div>
      <div class="absolute top-0 left-0 w-2 h-full" style="background-color: ${primaryColor};"></div>
      <div class="absolute top-0 left-0 bottom-0 w-24" style="background: linear-gradient(90deg, ${primaryColor}40 0%, transparent 100%);"></div>
    `;
  } else if (borderStyle === 'modern' && template === 'professional') {
    return `
      <div class="absolute top-0 left-0 right-0 h-16" style="background: linear-gradient(135deg, ${primaryColor} 0%, transparent 100%);"></div>
      <div class="absolute top-0 right-0 w-32 h-32" style="background: linear-gradient(225deg, ${accentColor} 0%, transparent 100%);"></div>
    `;
  } else if (borderStyle === 'modern' && template === 'bold') {
    return `
      <div class="absolute top-0 left-0 right-0 h-3" style="background-color: ${primaryColor};"></div>
      <div class="absolute bottom-0 left-0 right-0 h-3" style="background-color: ${primaryColor};"></div>
      <div class="absolute top-0 left-0 w-1/3 h-full opacity-10" style="background: linear-gradient(90deg, ${primaryColor} 0%, transparent 100%);"></div>
    `;
  } else if (borderStyle === 'modern' && template === 'vibrant') {
    return `
      <div class="absolute bottom-0 left-0 right-0 h-32">
        <div class="absolute bottom-0 left-0 w-1/3 h-full" style="background-color: ${primaryColor};"></div>
        <div class="absolute bottom-0 left-1/3 w-1/3 h-24" style="background-color: ${secondaryColor};"></div>
        <div class="absolute bottom-0 right-0 w-1/3 h-16" style="background-color: ${accentColor};"></div>
      </div>
    `;
  } else if (borderStyle === 'ornate') {
    return `
      <div class="absolute inset-4 border-2 opacity-30" style="border-color: ${primaryColor};">
        <div class="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2" style="border-color: ${primaryColor};"></div>
        <div class="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2" style="border-color: ${primaryColor};"></div>
        <div class="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2" style="border-color: ${primaryColor};"></div>
        <div class="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2" style="border-color: ${primaryColor};"></div>
      </div>
      <div class="absolute top-8 left-8 right-8 bottom-8 border opacity-20" style="border-color: ${secondaryColor};"></div>
    `;
  }
  return '';
}

function getLogoHTML(config: any): string {
  if (!config.showLogo) return '';

  const positions: Record<string, string> = {
    'top-left': 'top-6 left-6',
    'top-center': 'top-6 left-1/2 transform -translate-x-1/2',
    'top-right': 'top-6 right-6'
  };

  const sizes: Record<string, string> = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-20 h-20'
  };

  if (config.logoImage) {
    return `
      <div class="absolute ${positions[config.logoPosition]} z-20 flex flex-col items-center">
        <div class="${sizes[config.logoSize]} rounded-lg overflow-hidden bg-white shadow-lg border-2 border-white">
          <img src="${config.logoImage}" alt="Logo" class="w-full h-full object-contain">
        </div>
        ${config.logoText ? `<div class="mt-2 text-xs font-semibold" style="color: ${config.accentColor};">${config.logoText}</div>` : ''}
      </div>
    `;
  }

  return `
    <div class="absolute ${positions[config.logoPosition]} z-20 flex flex-col items-center">
      <div class="${sizes[config.logoSize]} rounded-full flex items-center justify-center border-4 border-white shadow-lg" style="background-color: ${config.primaryColor};">
        <span class="text-white font-bold text-lg">${config.logoText.slice(0, 2)}</span>
      </div>
      <div class="mt-2 text-xs font-semibold" style="color: ${config.accentColor};">${config.logoText}</div>
    </div>
  `;
}

function getBadgeHTML(config: any): string {
  if (!config.showBadge) return '';

  const icons: Record<string, string> = {
    award: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>',
    star: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>',
    shield: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>',
    trophy: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path>',
    medal: '<circle cx="12" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.5 14L7 22l5-3 5 3-1.5-8"></path>',
    crown: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l2 7 5-5 5 5 2-7-9 3-5-3zm0 18h14v-2H5v2z"></path>',
    sparkles: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>',
    check: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
    hexagon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2L2 7v10l10 5 10-5V7l-10-5z"></path>'
  };

  return `
    <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2">
      <div class="relative">
        <div class="w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-4 border-white" style="background-color: ${config.secondaryColor};">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${icons[config.badgeIcon] || icons.award}
          </svg>
        </div>
        <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div class="px-3 py-1 text-xs font-bold text-white rounded" style="background-color: ${config.secondaryColor};">
            ${config.badgeText}
          </div>
        </div>
      </div>
    </div>
  `;
}
