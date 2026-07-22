'use client';

import React, { useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { ModuleConfig, FileFormat, ExportScope } from '@/lib/import-export/types';
import { ImportExportService } from '@/lib/services/import-export-service';

interface ExportDialogProps {
  schoolId: string;
  moduleName: string;
  config: ModuleConfig;
  selectedIds?: string[];
  hasFilters?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function ExportDialog({
  schoolId,
  moduleName,
  config,
  selectedIds,
  hasFilters,
  onClose,
  onSuccess,
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<FileFormat>('csv');
  const [selectedScope, setSelectedScope] = useState<ExportScope>('entire');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await ImportExportService.exportData(
        schoolId,
        moduleName,
        {
          format: selectedFormat,
          scope: selectedScope,
          includeDocumentation: false,
          selectedIds,
        },
        config
      );

      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('[v0] Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const scopeOptions: Array<{ value: ExportScope; label: string; description: string; enabled: boolean }> = [
    {
      value: 'current_page',
      label: 'Current Page',
      description: 'Export records from current page only',
      enabled: true,
    },
    {
      value: 'filtered',
      label: 'Filtered Data',
      description: 'Export all filtered records',
      enabled: hasFilters || false,
    },
    {
      value: 'selected',
      label: 'Selected Records',
      description: 'Export selected records only',
      enabled: (selectedIds?.length || 0) > 0,
    },
    {
      value: 'entire',
      label: 'Entire Module',
      description: 'Export all records for this module',
      enabled: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Export {config.moduleName}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(['csv', 'xlsx', 'ods'] as FileFormat[]).map((format) => (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={`px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
                    selectedFormat === format
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-muted'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedFormat === 'csv' && 'Lightweight format, works in Excel and Google Sheets'}
              {selectedFormat === 'xlsx' && 'Excel format with advanced features'}
              {selectedFormat === 'ods' && 'Open Document Format, universal compatibility'}
            </p>
          </div>

          {/* Scope Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold">Export Scope</label>
            <div className="space-y-2">
              {scopeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedScope(option.value)}
                  disabled={!option.enabled}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    !option.enabled
                      ? 'opacity-50 cursor-not-allowed bg-muted border-border'
                      : selectedScope === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={selectedScope === option.value && option.enabled}
                      disabled={!option.enabled}
                      readOnly
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              The exported file will include headers and be ready to re-import into this system.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
