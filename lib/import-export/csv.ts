import Papa from 'papaparse';
import { FileFormat } from './types';

/**
 * CSV parsing functionality
 * Handles reading CSV files with proper error handling and data transformation
 */

export interface ParseOptions {
  header: boolean;
  skipEmptyLines: boolean;
  dynamicTyping: boolean;
  encoding?: string;
}

export const defaultParseOptions: ParseOptions = {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: false,
  encoding: 'UTF-8',
};

/**
 * Parse CSV file and return structured data
 */
export function parseCSV(file: File, options: Partial<ParseOptions> = {}): Promise<{
  data: any[];
  errors: Array<{ message: string; row?: number }>;
  meta: { fields?: string[] };
}> {
  return new Promise((resolve, reject) => {
    const mergedOptions = { ...defaultParseOptions, ...options };

    Papa.parse(file, {
      header: mergedOptions.header,
      skipEmptyLines: mergedOptions.skipEmptyLines,
      dynamicTyping: mergedOptions.dynamicTyping,
      encoding: mergedOptions.encoding,
      complete: (results) => {
        const errors = results.errors.map((err) => ({
          message: err.message,
          row: err.row,
        }));

        resolve({
          data: results.data || [],
          errors,
          meta: {
            fields: results.meta.fields,
          },
        });
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Convert data array to CSV string
 */
export function convertToCSV(data: any[], headers: string[]): string {
  if (!data.length) return headers.join(',');

  const csvHeaders = headers.map((h) => `"${h}"`).join(',');
  const csvRows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Download CSV file to user's device
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Extract headers from CSV file
 */
export async function extractHeaders(file: File): Promise<string[]> {
  const result = await parseCSV(file, { header: true });
  return result.meta.fields || [];
}

/**
 * Validate that file is a valid CSV
 */
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
    return { valid: false, error: 'File must be a CSV file' };
  }

  const maxSizeMB = 50;
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  return { valid: true };
}

/**
 * Count rows in CSV file without parsing all data
 */
export async function countCSVRows(file: File): Promise<number> {
  const result = await parseCSV(file);
  return result.data.length;
}
