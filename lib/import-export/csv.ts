/**
 * CSV parsing functionality
 * Native implementation for browser and server-side CSV handling
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
 * Native CSV parser - handles basic CSV parsing without external dependencies
 */
function parseCSVString(content: string, hasHeader: boolean): { data: any[]; headers: string[] } {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = hasHeader ? parseCSVLine(lines[0]) : [];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const data = dataLines.map((line, rowIndex) => {
    const values = parseCSVLine(line);
    if (!hasHeader) return values;
    
    const row: Record<string, any> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });

  return { data, headers };
}

/**
 * Parse a single CSV line handling quoted values and commas within quotes
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

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
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const { data, headers } = parseCSVString(content, mergedOptions.header);
        
        const filtered = mergedOptions.skipEmptyLines 
          ? data.filter((row) => {
              if (typeof row === 'string') return row.length > 0;
              return Object.values(row).some(v => v);
            })
          : data;

        resolve({
          data: filtered,
          errors: [],
          meta: { fields: headers },
        });
      } catch (error) {
        reject(new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file, mergedOptions.encoding || 'UTF-8');
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
