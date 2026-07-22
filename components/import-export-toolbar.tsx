'use client';

import React, { useState } from 'react';
import { Download, Upload, MoreVertical, Copy, Archive, Trash2 } from 'lucide-react';
import { ModuleConfig, BulkOperationType } from '@/lib/import-export/types';
import { ImportWizard } from './import-wizard';
import { ExportDialog } from './export-dialog';
import { ImportExportService } from '@/lib/services/import-export-service';

interface ImportExportToolbarProps {
  schoolId: string;
  moduleName: string;
  config: ModuleConfig;
  selectedRows?: string[];
  onImportSuccess?: () => void;
  onBulkActionComplete?: () => void;
  hasFilters?: boolean;
  existingRecords?: any[];
}

export function ImportExportToolbar({
  schoolId,
  moduleName,
  config,
  selectedRows = [],
  onImportSuccess,
  onBulkActionComplete,
  hasFilters,
  existingRecords,
}: ImportExportToolbarProps) {
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkOperation = async (operation: BulkOperationType) => {
    if (!selectedRows.length) {
      alert('Please select at least one record');
      return;
    }

    if (!confirm(`Are you sure you want to ${operation} these ${selectedRows.length} record(s)?`)) {
      return;
    }

    setIsProcessing(true);
    setShowBulkMenu(false);

    try {
      const result = await ImportExportService.executeBulkOperation(schoolId, moduleName, {
        operationType: operation,
        targetIds: selectedRows,
      });

      if (result.success) {
        alert(`${operation.replace(/_/g, ' ')}: ${result.succeeded} succeeded${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
        onBulkActionComplete?.();
      } else {
        alert('Operation failed. Please try again.');
      }
    } catch (error) {
      console.error('[v0] Bulk operation error:', error);
      alert('Operation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const availableBulkOps = config.supportsBulkOps || [];

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Import Button */}
        <button
          onClick={() => setShowImportWizard(true)}
          className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
        >
          <Upload className="w-4 h-4" />
          Import
        </button>

        {/* Export Button */}
        <button
          onClick={() => setShowExportDialog(true)}
          className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Export
        </button>

        {/* Template Download */}
        <button
          onClick={() => ImportExportService.downloadTemplate(config, 'csv')}
          className="inline-flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <Copy className="w-4 h-4" />
          Template
        </button>

        {/* Bulk Actions Menu */}
        {selectedRows.length > 0 && availableBulkOps.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowBulkMenu(!showBulkMenu)}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
            >
              <MoreVertical className="w-4 h-4" />
              Bulk Actions ({selectedRows.length})
            </button>

            {showBulkMenu && (
              <div className="absolute right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 min-w-40">
                {availableBulkOps.map((op) => {
                  let icon = null;
                  let label = op.replace(/_/g, ' ');

                  switch (op) {
                    case 'delete':
                      icon = <Trash2 className="w-4 h-4 text-red-600" />;
                      break;
                    case 'archive':
                      icon = <Archive className="w-4 h-4" />;
                      break;
                    case 'activate':
                      label = 'Activate';
                      icon = <Copy className="w-4 h-4 text-green-600" />;
                      break;
                    case 'deactivate':
                      label = 'Deactivate';
                      icon = <Copy className="w-4 h-4" />;
                      break;
                    default:
                      icon = <MoreVertical className="w-4 h-4" />;
                  }

                  return (
                    <button
                      key={op}
                      onClick={() => handleBulkOperation(op as BulkOperationType)}
                      disabled={isProcessing}
                      className="w-full text-left px-4 py-2 hover:bg-muted transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      {icon}
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showImportWizard && (
        <ImportWizard
          schoolId={schoolId}
          moduleName={moduleName}
          config={config}
          existingRecords={existingRecords}
          onSuccess={() => {
            setShowImportWizard(false);
            onImportSuccess?.();
          }}
          onClose={() => setShowImportWizard(false)}
        />
      )}

      {showExportDialog && (
        <ExportDialog
          schoolId={schoolId}
          moduleName={moduleName}
          config={config}
          selectedIds={selectedRows.length > 0 ? selectedRows : undefined}
          hasFilters={hasFilters}
          onSuccess={() => {
            setShowExportDialog(false);
          }}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </>
  );
}
