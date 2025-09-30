import puppeteer, { PDFOptions } from 'puppeteer';
import path from 'path';

export class PDFGenerator {
  
  static async generatePDFFromImage(imageBuffer: Buffer, participantName: string): Promise<Buffer> {
    let browser;
    
    try {
      // Launch puppeteer browser
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Convert image buffer to base64
      const imageBase64 = imageBuffer.toString('base64');
      const imageDataUrl = `data:image/png;base64,${imageBase64}`;

      // Create HTML content with the image
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Certificate - ${participantName}</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: white;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .certificate {
              max-width: 100%;
              max-height: 100vh;
              object-fit: contain;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .certificate {
                width: 100%;
                height: auto;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <img class="certificate" src="${imageDataUrl}" alt="Certificate for ${participantName}" />
        </body>
        </html>
      `;

      // Set page content
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      });

      return Buffer.from(pdfBuffer);

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF from image');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  static async generatePDFFromHTML(htmlContent: string, options?: PDFOptions): Promise<Buffer> {
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const defaultOptions: PDFOptions = {
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      };

      const pdfBuffer = await page.pdf({ ...defaultOptions, ...options });
      return Buffer.from(pdfBuffer);

    } catch (error) {
      console.error('Error generating PDF from HTML:', error);
      throw new Error('Failed to generate PDF from HTML');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  static async generateMultiplePDFs(
    imageBuffers: { participantName: string; imageBuffer: Buffer }[]
  ): Promise<{ participantName: string; pdfBuffer: Buffer }[]> {
    const results: { participantName: string; pdfBuffer: Buffer }[] = [];
    
    // Process PDFs in batches to avoid memory issues
    const batchSize = 5;
    for (let i = 0; i < imageBuffers.length; i += batchSize) {
      const batch = imageBuffers.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ({ participantName, imageBuffer }) => {
        try {
          const pdfBuffer = await this.generatePDFFromImage(imageBuffer, participantName);
          return { participantName, pdfBuffer };
        } catch (error) {
          console.error(`Error generating PDF for ${participantName}:`, error);
          throw error;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  static async optimizePDF(pdfBuffer: Buffer): Promise<Buffer> {
    // For now, just return the buffer as-is
    // In the future, could use PDF optimization libraries
    return pdfBuffer;
  }

  static validatePDFBuffer(pdfBuffer: Buffer): boolean {
    // Check if buffer starts with PDF header
    const pdfHeader = Buffer.from('%PDF');
    return pdfBuffer.subarray(0, 4).equals(pdfHeader);
  }
}
