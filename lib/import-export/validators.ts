import { z } from 'zod';
import { ValidationError, ValidationResult, ModuleConfig, ColumnDefinition } from './types';

/**
 * Validation engine for import data
 * Validates data against column definitions and module configuration
 */

export class ImportValidator {
  /**
   * Build Zod schema from column definitions
   */
  static buildZodSchema(columns: ColumnDefinition[]): z.ZodSchema {
    const shapeObj: Record<string, z.ZodTypeAny> = {};

    columns.forEach((col) => {
      let schema: z.ZodTypeAny;

      switch (col.dataType) {
        case 'string':
          schema = z.string();
          if (col.maxLength) {
            schema = schema.max(col.maxLength);
          }
          break;

        case 'number':
          schema = z.coerce.number();
          break;

        case 'date':
          schema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
          break;

        case 'email':
          schema = z.string().email();
          break;

        case 'phone':
          schema = z.string().regex(/^\+?[\d\s\-()]{10,}$/, 'Invalid phone number format');
          break;

        case 'uuid':
          schema = z.string().uuid();
          break;

        case 'enum':
          schema = z.enum(col.enumValues as [string, ...string[]]);
          break;

        case 'boolean':
          schema = z.boolean();
          break;

        default:
          schema = z.string();
      }

      if (!col.required) {
        schema = schema.optional().nullable();
      }

      shapeObj[col.csvHeader] = schema;
    });

    return z.object(shapeObj);
  }

  /**
   * Validate a single row against column definitions
   */
  static validateRow(row: any, columns: ColumnDefinition[], rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const schema = this.buildZodSchema(columns);

    const result = schema.safeParse(row);

    if (!result.success) {
      result.error.errors.forEach((err) => {
        const columnName = err.path[0] as string;
        const column = columns.find((c) => c.csvHeader === columnName);

        errors.push({
          rowNumber,
          column: columnName,
          value: row[columnName],
          error: err.message,
          suggestion: this.getSuggestion(column, row[columnName]),
        });
      });
    }

    return errors;
  }

  /**
   * Validate entire dataset
   */
  static validateData(
    data: any[],
    config: ModuleConfig,
    existingRecords?: any[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: Array<{ rowNumber: number; message: string }> = [];
    const rowsToCreate: any[] = [];
    const rowsToUpdate: any[] = [];
    const rowsSkipped: any[] = [];

    const existingMap = new Map<string, any>();
    existingRecords?.forEach((record) => {
      const key = record[config.primaryKey];
      existingMap.set(String(key), record);
    });

    data.forEach((row, idx) => {
      const rowNumber = idx + 2; // +2 because headers are row 1, data starts at row 2

      // Skip empty rows
      if (!row || Object.values(row).every((v) => !v)) {
        rowsSkipped.push(row);
        return;
      }

      // Validate row structure
      const rowErrors = this.validateRow(row, config.columns, rowNumber);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        return;
      }

      // Check for required fields
      config.columns.forEach((col) => {
        if (col.required && (!row[col.csvHeader] || row[col.csvHeader].toString().trim() === '')) {
          errors.push({
            rowNumber,
            column: col.csvHeader,
            value: row[col.csvHeader],
            error: `${col.displayName} is required`,
          });
        }
      });

      // Check for duplicates within the import
      const primaryKeyValue = row[config.primaryKey];
      if (!primaryKeyValue) {
        errors.push({
          rowNumber,
          column: config.primaryKey,
          value: primaryKeyValue,
          error: 'Primary key is missing',
        });
        return;
      }

      // Check duplicate check fields
      config.duplicateCheckFields.forEach((field) => {
        const fieldValue = row[field];
        if (fieldValue) {
          const duplicates = data.filter(
            (r, i) => i < idx && r[field] === fieldValue
          );
          if (duplicates.length > 0) {
            warnings.push({
              rowNumber,
              message: `Duplicate ${field}: ${fieldValue} found in row(s) ${duplicates.map((_, i) => i + 2)}`,
            });
          }
        }
      });

      // Check if record exists
      const existsInSystem = existingMap.has(String(primaryKeyValue));

      if (existsInSystem) {
        if (config.supportsUpdate) {
          rowsToUpdate.push(row);
        } else {
          rowsSkipped.push(row);
          warnings.push({
            rowNumber,
            message: `Record with ${config.primaryKey} '${primaryKeyValue}' already exists and will be skipped`,
          });
        }
      } else {
        rowsToCreate.push(row);
      }
    });

    return {
      isValid: errors.length === 0,
      rowsToCreate,
      rowsToUpdate,
      rowsSkipped,
      rowsWithErrors: data
        .map((row, idx) => {
          const rowErrors = errors.filter((e) => e.rowNumber === idx + 2);
          return rowErrors.length > 0 ? { row, errors: rowErrors } : null;
        })
        .filter((x): x is { row: any; errors: ValidationError[] } => x !== null),
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      warnings,
    };
  }

  /**
   * Get suggestion for common errors
   */
  private static getSuggestion(column: ColumnDefinition | undefined, value: any): string | undefined {
    if (!column) return undefined;

    if (column.dataType === 'enum' && column.enumValues) {
      return `Expected one of: ${column.enumValues.join(', ')}`;
    }

    if (column.dataType === 'date') {
      return 'Use YYYY-MM-DD format (e.g., 2026-07-22)';
    }

    if (column.dataType === 'email') {
      return 'Provide a valid email address (e.g., user@domain.com)';
    }

    if (column.dataType === 'phone') {
      return 'Provide a valid phone number (e.g., +254712345678)';
    }

    if (column.maxLength) {
      return `Maximum ${column.maxLength} characters allowed`;
    }

    return undefined;
  }

  /**
   * Validate required columns are present in import data
   */
  static validateHeaders(headers: string[], config: ModuleConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const headerSet = new Set(headers.map((h) => h.toLowerCase()));

    // Check for required columns
    config.columns
      .filter((col) => col.required)
      .forEach((col) => {
        if (!headerSet.has(col.csvHeader.toLowerCase())) {
          errors.push(`Required column '${col.csvHeader}' is missing`);
        }
      });

    // Check for unknown columns
    headers.forEach((header) => {
      const exists = config.columns.some((col) => col.csvHeader.toLowerCase() === header.toLowerCase());
      if (!exists) {
        errors.push(`Unknown column '${header}' - this column will be ignored`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate error report content
   */
  static generateErrorReport(errors: ValidationError[]): string {
    const lines: string[] = ['Row Number,Column,Invalid Value,Expected Value,Reason'];

    errors.forEach((err) => {
      const row = [
        err.rowNumber,
        `"${err.column}"`,
        `"${err.value === null || err.value === undefined ? '' : err.value}"`,
        err.suggestion ? `"${err.suggestion}"` : '',
        `"${err.error}"`,
      ];
      lines.push(row.join(','));
    });

    return lines.join('\n');
  }

  /**
   * Download error report CSV
   */
  static downloadErrorReport(errors: ValidationError[], filename: string = 'import_errors.csv'): void {
    const content = this.generateErrorReport(errors);
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
}
