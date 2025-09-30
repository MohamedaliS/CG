import archiver from 'archiver';
import fs from 'fs/promises';
import path from 'path';

export class ZipCreator {
  
  static async createZipFromFiles(files: string[], outputPath: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        // Create write stream
        const output = require('fs').createWriteStream(outputPath);
        const archive = archiver('zip', {
          zlib: { level: 9 } // Maximum compression
        });

        // Handle errors
        output.on('error', reject);
        archive.on('error', reject);

        // Finalize the archive when done
        archive.on('end', () => {
          resolve(outputPath);
        });

        // Pipe archive data to the file
        archive.pipe(output);

        // Add files to archive
        for (const filePath of files) {
          try {
            await fs.access(filePath); // Check if file exists
            const fileName = path.basename(filePath);
            archive.file(filePath, { name: fileName });
          } catch (error) {
            console.warn(`File not found, skipping: ${filePath}`);
          }
        }

        // Finalize the archive
        await archive.finalize();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  static async createZipFromBuffers(
    fileBuffers: { name: string; buffer: Buffer }[], 
    outputPath: string
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        // Create write stream
        const output = require('fs').createWriteStream(outputPath);
        const archive = archiver('zip', {
          zlib: { level: 9 } // Maximum compression
        });

        // Handle errors
        output.on('error', reject);
        archive.on('error', reject);

        // Finalize the archive when done
        archive.on('end', () => {
          resolve(outputPath);
        });

        // Pipe archive data to the file
        archive.pipe(output);

        // Add buffers to archive
        for (const { name, buffer } of fileBuffers) {
          archive.append(buffer, { name });
        }

        // Finalize the archive
        await archive.finalize();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  static async createCertificateZip(
    certificateFiles: { participantName: string; pdfBuffer: Buffer }[],
    batchId: string,
    eventName: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedEventName = eventName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
    const zipFileName = `certificates_${sanitizedEventName}_${timestamp}.zip`;
    const outputPath = path.join(process.cwd(), 'certificates', batchId, zipFileName);

    const fileBuffers = certificateFiles.map(({ participantName, pdfBuffer }) => {
      const sanitizedName = participantName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
      return {
        name: `${sanitizedName}_certificate.pdf`,
        buffer: pdfBuffer
      };
    });

    await this.createZipFromBuffers(fileBuffers, outputPath);
    return outputPath;
  }

  static async getZipFileSize(zipPath: string): Promise<number> {
    try {
      const stats = await fs.stat(zipPath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  static async deleteZipFile(zipPath: string): Promise<void> {
    try {
      await fs.unlink(zipPath);
    } catch (error) {
      console.warn(`Could not delete zip file: ${zipPath}`, error);
    }
  }

  static generateDownloadUrl(zipPath: string, domain: string): string {
    const relativePath = path.relative(process.cwd(), zipPath);
    return `${domain}/download/${encodeURIComponent(relativePath)}`;
  }
}
