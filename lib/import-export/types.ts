import { z } from 'zod';

/**
 * Core types for the universal import/export system
 * Used across all modules to ensure consistency
 */

export type FileFormat = 'csv' | 'xlsx' | 'xls' | 'ods';
export type DuplicateStrategy = 'skip' | 'overwrite' | 'update' | 'insert_new_only';
export type BulkOperationType = 'delete' | 'archive' | 'activate' | 'deactivate' | 'update' | 'assign_class' | 'assign_subject' | 'assign_teacher';
export type ExportScope = 'current_page' | 'filtered' | 'selected' | 'entire';

export interface ColumnDefinition {
  csvHeader: string;
  displayName: string;
  description: string;
  required: boolean;
  dataType: 'string' | 'number' | 'date' | 'email' | 'phone' | 'enum' | 'uuid' | 'boolean';
  maxLength?: number;
  enumValues?: string[];
  format?: string;
  example: string;
  relationship?: {
    table: string;
    column: string;
    displayColumn: string;
  };
}

export interface ModuleConfig {
  moduleName: string;
  columns: ColumnDefinition[];
  sampleData: Record<string, any>[];
  primaryKey: string;
  duplicateCheckFields: string[];
  supportsUpdate: boolean;
  supportsBulkOps: BulkOperationType[];
}

export interface ValidationError {
  rowNumber: number;
  column: string;
  value: any;
  error: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  rowsToCreate: any[];
  rowsToUpdate: any[];
  rowsSkipped: any[];
  rowsWithErrors: Array<{ row: any; errors: ValidationError[] }>;
  totalErrors: number;
  totalWarnings: number;
  warnings: Array<{
    rowNumber: number;
    message: string;
  }>;
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  rowsWithErrors: number;
  rowsToCreate: number;
  rowsToUpdate: number;
  rowsSkipped: number;
  duplicateStrategy: DuplicateStrategy;
  estimatedDuration: string;
}

export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: ValidationError[];
  warnings: Array<{
    rowNumber: number;
    message: string;
  }>;
  timestamp: string;
}

export interface ExportOptions {
  format: FileFormat;
  scope: ExportScope;
  includeDocumentation: boolean;
  selectedIds?: string[];
  filters?: Record<string, any>;
}

export interface BulkOperationRequest {
  operationType: BulkOperationType;
  targetIds: string[];
  updateData?: Record<string, any>;
  assignmentTarget?: string;
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

export interface TemplateMetadata {
  moduleName: string;
  generatedAt: string;
  version: string;
  columnCount: number;
  sampleRowCount: number;
}

export interface ImportWizardState {
  step: number;
  fileSelected: boolean;
  fileFormat: FileFormat;
  fileData: any[];
  columnMapping: Record<string, string>;
  duplicateStrategy: DuplicateStrategy;
  validationResult: ValidationResult | null;
  preview: ImportPreview | null;
  isProcessing: boolean;
  progress: number;
}

export interface ColumnMapping {
  csvColumn: string;
  appColumn: string | null;
  isRequired: boolean;
  isMapped: boolean;
}
