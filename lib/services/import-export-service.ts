import { ModuleConfig, FileFormat, ValidationResult, ImportResult, ExportOptions, BulkOperationRequest, BulkOperationResult } from '@/lib/import-export/types';
import { parseCSV, convertToCSV, validateCSVFile } from '@/lib/import-export/csv';
import { TemplateGenerator } from '@/lib/import-export/template-generator';
import { ImportValidator } from '@/lib/import-export/validators';

/**
 * Central service for all import/export operations
 * Orchestrates validation, preview, bulk operations, and export
 */

export class ImportExportService {
  /**
   * Parse uploaded file and validate headers
   */
  static async parseUploadedFile(file: File, config: ModuleConfig): Promise<{
    data: any[];
    headers: string[];
    errors: string[];
  }> {
    const fileValidation = validateCSVFile(file);
    if (!fileValidation.valid) {
      return {
        data: [],
        headers: [],
        errors: [fileValidation.error || 'Invalid file'],
      };
    }

    let data: any[] = [];
    let headers: string[] = [];
    const errors: string[] = [];

    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const result = await parseCSV(file);
      data = result.data;
      headers = result.meta.fields || [];

      if (result.errors.length > 0) {
        errors.push(...result.errors.map((e) => `Row ${e.row}: ${e.message}`));
      }
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const result = await this.parseExcel(file);
      data = result.data;
      headers = result.headers;
    } else {
      return {
        data: [],
        headers: [],
        errors: ['Unsupported file format'],
      };
    }

    // Validate headers
    const headerValidation = ImportValidator.validateHeaders(headers, config);
    if (!headerValidation.valid) {
      errors.push(...headerValidation.errors);
    }

    return { data, headers, errors };
  }

  /**
   * Parse Excel file
   */
  private static async parseExcel(file: File): Promise<{ data: any[]; headers: string[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet);
          const headers = Object.keys(rows[0] || {});

          resolve({ data: rows, headers });
        } catch (error) {
          reject(new Error('Failed to parse Excel file'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Validate imported data against module configuration
   */
  static validateImport(data: any[], config: ModuleConfig, existingRecords?: any[]): ValidationResult {
    return ImportValidator.validateData(data, config, existingRecords);
  }

  /**
   * Generate import preview
   */
  static generatePreview(validationResult: ValidationResult): { totalRows: number; validRows: number; rowsWithErrors: number; rowsToCreate: number; rowsToUpdate: number; rowsSkipped: number } {
    return {
      totalRows: validationResult.rowsToCreate.length + validationResult.rowsToUpdate.length + validationResult.rowsSkipped.length + validationResult.rowsWithErrors.length,
      validRows: validationResult.rowsToCreate.length + validationResult.rowsToUpdate.length,
      rowsWithErrors: validationResult.rowsWithErrors.length,
      rowsToCreate: validationResult.rowsToCreate.length,
      rowsToUpdate: validationResult.rowsToUpdate.length,
      rowsSkipped: validationResult.rowsSkipped.length,
    };
  }

  /**
   * Execute bulk import with transaction safety
   */
  static async executeBulkImport(
    schoolId: string,
    moduleName: string,
    validationResult: ValidationResult,
    config: ModuleConfig
  ): Promise<ImportResult> {
    try {
      const rowsToProcess = [...validationResult.rowsToCreate, ...validationResult.rowsToUpdate];

      if (rowsToProcess.length === 0) {
        return {
          success: true,
          totalProcessed: 0,
          created: 0,
          updated: 0,
          skipped: validationResult.rowsSkipped.length,
          failed: validationResult.rowsWithErrors.length,
          errors: validationResult.rowsWithErrors.flatMap((r) => r.errors),
          warnings: validationResult.warnings,
          timestamp: new Date().toISOString(),
        };
      }

      const response = await fetch(`/api/school/import-export/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          school_id: schoolId,
          module_name: moduleName,
          rows_to_create: validationResult.rowsToCreate,
          rows_to_update: validationResult.rowsToUpdate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const data = await response.json();

      return {
        success: true,
        totalProcessed: data.created + data.updated,
        created: data.created,
        updated: data.updated,
        skipped: validationResult.rowsSkipped.length,
        failed: validationResult.rowsWithErrors.length,
        errors: validationResult.rowsWithErrors.flatMap((r) => r.errors),
        warnings: validationResult.warnings,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        totalProcessed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: validationResult.rowsWithErrors.length + validationResult.rowsToCreate.length + validationResult.rowsToUpdate.length,
        errors: [
          {
            rowNumber: 0,
            column: 'system',
            value: null,
            error: error instanceof Error ? error.message : 'Unknown error occurred during import',
          },
        ],
        warnings: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Export data to specified format
   */
  static async exportData(
    schoolId: string,
    moduleName: string,
    options: ExportOptions,
    config: ModuleConfig
  ): Promise<{ data: any[]; headers: string[] }> {
    const response = await fetch(`/api/school/import-export/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        school_id: schoolId,
        module_name: moduleName,
        scope: options.scope,
        filters: options.filters,
        selected_ids: options.selectedIds,
      }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const data = await response.json();
    const headers = config.columns.map((col) => col.csvHeader);

    if (options.format === 'csv') {
      const csv = convertToCSV(data.records, headers);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${moduleName.toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } else if (options.format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data.records);
      XLSX.utils.book_append_sheet(wb, ws, 'Export');
      XLSX.writeFile(wb, `${moduleName.toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    return { data: data.records, headers };
  }

  /**
   * Execute bulk operations
   */
  static async executeBulkOperation(
    schoolId: string,
    moduleName: string,
    request: BulkOperationRequest
  ): Promise<BulkOperationResult> {
    try {
      const response = await fetch(`/api/school/import-export/bulk-operation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          school_id: schoolId,
          module_name: moduleName,
          operation_type: request.operationType,
          target_ids: request.targetIds,
          update_data: request.updateData,
          assignment_target: request.assignmentTarget,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Operation failed');
      }

      const data = await response.json();

      return {
        success: true,
        processed: data.processed,
        succeeded: data.succeeded,
        failed: data.failed,
        errors: data.errors || [],
      };
    } catch (error) {
      return {
        success: false,
        processed: 0,
        succeeded: 0,
        failed: request.targetIds.length,
        errors: [
          {
            id: 'system',
            error: error instanceof Error ? error.message : 'Operation failed',
          },
        ],
      };
    }
  }

  /**
   * Download template
   */
  static downloadTemplate(config: ModuleConfig, format: FileFormat = 'csv'): void {
    if (format === 'csv') {
      TemplateGenerator.downloadCSVTemplate(config);
    } else if (format === 'xlsx') {
      TemplateGenerator.downloadExcelTemplate(config);
    }
  }

  /**
   * Download error report
   */
  static downloadErrorReport(validationResult: ValidationResult): void {
    if (validationResult.rowsWithErrors.length > 0) {
      const errors = validationResult.rowsWithErrors.flatMap((r) => r.errors);
      ImportValidator.downloadErrorReport(errors);
    }
  }
}
