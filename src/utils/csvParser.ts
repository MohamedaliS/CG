import csv from 'csv-parser';
import { Readable } from 'stream';

export class CSVParser {
  
  static async parseParticipantNames(csvBuffer: Buffer): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const results: string[] = [];
      const errors: string[] = [];
      
      // Create readable stream from buffer
      const stream = Readable.from(csvBuffer);
      
      stream
        .pipe(csv({ headers: false })) // No headers expected, just names
        .on('data', (data) => {
          try {
            // Get the first column value (participant name)
            const name = Object.values(data)[0] as string;
            
            if (name && typeof name === 'string') {
              const trimmedName = name.trim();
              if (trimmedName.length > 0) {
                results.push(trimmedName);
              }
            }
          } catch (error) {
            errors.push(`Error parsing row: ${JSON.stringify(data)}`);
          }
        })
        .on('end', () => {
          if (errors.length > 0) {
            console.warn('CSV parsing warnings:', errors);
          }
          
          // Remove duplicates and filter out empty names
          const uniqueNames = [...new Set(results)]
            .filter(name => name && name.trim().length > 0)
            .map(name => name.trim());
          
          resolve(uniqueNames);
        })
        .on('error', (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        });
    });
  }

  static async parseParticipantNamesWithHeaders(csvBuffer: Buffer, nameColumn: string = 'name'): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const results: string[] = [];
      const errors: string[] = [];
      
      // Create readable stream from buffer
      const stream = Readable.from(csvBuffer);
      
      stream
        .pipe(csv())
        .on('data', (data) => {
          try {
            const name = data[nameColumn] || data.name || data.Name || data.NAME;
            
            if (name && typeof name === 'string') {
              const trimmedName = name.trim();
              if (trimmedName.length > 0) {
                results.push(trimmedName);
              }
            } else {
              // Try to get first column if name column not found
              const firstValue = Object.values(data)[0] as string;
              if (firstValue && typeof firstValue === 'string') {
                const trimmedName = firstValue.trim();
                if (trimmedName.length > 0) {
                  results.push(trimmedName);
                }
              }
            }
          } catch (error) {
            errors.push(`Error parsing row: ${JSON.stringify(data)}`);
          }
        })
        .on('end', () => {
          if (errors.length > 0) {
            console.warn('CSV parsing warnings:', errors);
          }
          
          // Remove duplicates and filter out empty names
          const uniqueNames = [...new Set(results)]
            .filter(name => name && name.trim().length > 0)
            .map(name => name.trim());
          
          resolve(uniqueNames);
        })
        .on('error', (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        });
    });
  }

  static validateCSVFormat(csvBuffer: Buffer): Promise<{ valid: boolean; message?: string; rowCount?: number }> {
    return new Promise((resolve) => {
      let rowCount = 0;
      let hasValidData = false;
      
      const stream = Readable.from(csvBuffer);
      
      stream
        .pipe(csv({ headers: false }))
        .on('data', (data) => {
          rowCount++;
          
          // Check if at least one column has data
          const values = Object.values(data);
          if (values.some(value => value && typeof value === 'string' && value.trim().length > 0)) {
            hasValidData = true;
          }
        })
        .on('end', () => {
          if (rowCount === 0) {
            resolve({ valid: false, message: 'CSV file is empty' });
          } else if (!hasValidData) {
            resolve({ valid: false, message: 'CSV file contains no valid participant names' });
          } else {
            resolve({ valid: true, rowCount });
          }
        })
        .on('error', (error) => {
          resolve({ valid: false, message: `Invalid CSV format: ${error.message}` });
        });
    });
  }

  static createSampleCSV(): string {
    const sampleData = [
      'John Doe',
      'Jane Smith',
      'Mike Johnson',
      'Sarah Wilson',
      'David Brown'
    ];
    
    return sampleData.join('\n');
  }

  static createSampleCSVWithHeaders(): string {
    const headers = 'name';
    const sampleData = [
      'John Doe',
      'Jane Smith', 
      'Mike Johnson',
      'Sarah Wilson',
      'David Brown'
    ];
    
    return headers + '\n' + sampleData.join('\n');
  }
}
