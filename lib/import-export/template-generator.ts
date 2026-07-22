import { ModuleConfig, ColumnDefinition, TemplateMetadata } from './types';
import { convertToCSV, downloadCSV } from './csv';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Generates import templates in various formats
 * Includes column definitions, sample data, and documentation
 */

export class TemplateGenerator {
  /**
   * Generate CSV template with headers and sample data
   */
  static generateCSVTemplate(config: ModuleConfig): string {
    const headers = config.columns.map((col) => col.csvHeader);
    return convertToCSV(config.sampleData, headers);
  }

  /**
   * Generate Excel template with multiple sheets
   * Sheet 1: Template with sample data
   * Sheet 2: Column descriptions and documentation
   */
  static generateExcelTemplate(config: ModuleConfig): XLSX.WorkBook {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Template with sample data
    const templateData = [
      config.columns.map((col) => col.csvHeader),
      ...config.sampleData.map((row) =>
        config.columns.map((col) => row[col.csvHeader] ?? '')
      ),
    ];

    const templateSheet = XLSX.utils.aoa_to_sheet(templateData);
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Import Template');

    // Sheet 2: Documentation
    const docData: any[][] = [
      ['Column Name', 'Display Name', 'Required', 'Data Type', 'Description', 'Accepted Values', 'Example'],
    ];

    config.columns.forEach((col) => {
      docData.push([
        col.csvHeader,
        col.displayName,
        col.required ? 'Yes' : 'No',
        col.dataType,
        col.description,
        col.enumValues ? col.enumValues.join('; ') : col.relationship ? `Link to ${col.relationship.table}` : '',
        col.example,
      ]);
    });

    const docSheet = XLSX.utils.aoa_to_sheet(docData);
    XLSX.utils.book_append_sheet(workbook, docSheet, 'Column Guide');

    // Set column widths
    docSheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 35 }, { wch: 40 }, { wch: 30 }];

    return workbook;
  }

  /**
   * Download CSV template
   */
  static downloadCSVTemplate(config: ModuleConfig, filename?: string): void {
    const csv = this.generateCSVTemplate(config);
    const name = filename || `${config.moduleName.toLowerCase()}_import_template.csv`;
    downloadCSV(csv, name);
  }

  /**
   * Download Excel template
   */
  static downloadExcelTemplate(config: ModuleConfig, filename?: string): void {
    const workbook = this.generateExcelTemplate(config);
    const name = filename || `${config.moduleName.toLowerCase()}_import_template.xlsx`;
    XLSX.writeFile(workbook, name);
  }

  /**
   * Generate README content for template
   */
  static generateReadme(config: ModuleConfig): string {
    const lines: string[] = [
      `# ${config.moduleName} Import Template`,
      '',
      `Generated: ${new Date().toISOString()}`,
      `Module: ${config.moduleName}`,
      '',
      '## Overview',
      `This template is for bulk importing ${config.moduleName.toLowerCase()} into the School Management System.`,
      '',
      '## Column Descriptions',
      '',
    ];

    config.columns.forEach((col) => {
      lines.push(`### ${col.csvHeader}`);
      lines.push(`**Display Name:** ${col.displayName}`);
      lines.push(`**Required:** ${col.required ? 'Yes' : 'No'}`);
      lines.push(`**Data Type:** ${col.dataType}`);
      lines.push(`**Description:** ${col.description}`);

      if (col.maxLength) {
        lines.push(`**Max Length:** ${col.maxLength} characters`);
      }

      if (col.enumValues) {
        lines.push(`**Accepted Values:** ${col.enumValues.join(', ')}`);
      }

      if (col.relationship) {
        lines.push(
          `**Relationship:** Must reference existing record in ${col.relationship.table} (${col.relationship.displayColumn})`
        );
      }

      lines.push(`**Example:** ${col.example}`);
      lines.push('');
    });

    lines.push('## Rules');
    lines.push('- Do not modify header row');
    lines.push('- Do not add extra columns');
    lines.push('- All required columns must have values');
    lines.push('- Dates must be in YYYY-MM-DD format');
    lines.push('- Enum values are case-sensitive');
    lines.push('- Duplicate records will be detected based on: ' + config.duplicateCheckFields.join(', '));
    lines.push('');

    lines.push('## Sample Data');
    lines.push(`The template includes ${config.sampleData.length} sample rows demonstrating correct format and values.`);
    lines.push('Delete these rows before importing your actual data.');
    lines.push('');

    lines.push('## Support');
    lines.push('If you encounter issues during import, refer to the error report for specific validation messages.');

    return lines.join('\n');
  }

  /**
   * Download README file
   */
  static downloadReadme(config: ModuleConfig, filename?: string): void {
    const content = this.generateReadme(config);
    const blob = new Blob([content], { type: 'text/markdown' });
    const name = filename || `${config.moduleName.toLowerCase()}_IMPORT_GUIDE.md`;
    saveAs(blob, name);
  }

  /**
   * Get template metadata
   */
  static getTemplateMetadata(config: ModuleConfig): TemplateMetadata {
    return {
      moduleName: config.moduleName,
      generatedAt: new Date().toISOString(),
      version: '1.0',
      columnCount: config.columns.length,
      sampleRowCount: config.sampleData.length,
    };
  }

  /**
   * Validate that column definition matches requirements
   */
  static validateColumnDefinition(column: ColumnDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!column.csvHeader) errors.push('csvHeader is required');
    if (!column.displayName) errors.push('displayName is required');
    if (!column.description) errors.push('description is required');
    if (!column.dataType) errors.push('dataType is required');
    if (!column.example) errors.push('example is required');

    if (column.dataType === 'enum' && (!column.enumValues || column.enumValues.length === 0)) {
      errors.push('enumValues required for enum dataType');
    }

    if (column.dataType === 'date' && !column.format) {
      errors.push('format required for date dataType');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate entire module configuration
   */
  static validateModuleConfig(config: ModuleConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.moduleName) errors.push('moduleName is required');
    if (!config.columns || config.columns.length === 0) errors.push('At least one column is required');
    if (!config.sampleData || config.sampleData.length === 0) errors.push('At least one sample row is required');
    if (!config.primaryKey) errors.push('primaryKey is required');
    if (!config.duplicateCheckFields || config.duplicateCheckFields.length === 0) {
      errors.push('duplicateCheckFields is required');
    }

    config.columns.forEach((col, idx) => {
      const colValidation = this.validateColumnDefinition(col);
      if (!colValidation.valid) {
        errors.push(`Column ${idx} (${col.csvHeader}): ${colValidation.errors.join('; ')}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
