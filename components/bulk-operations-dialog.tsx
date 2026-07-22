'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import { BulkOperationType } from '@/lib/import-export/types';
import { ImportExportService } from '@/lib/services/import-export-service';

interface BulkOperationsDialogProps {
  schoolId: string;
  moduleName: string;
  operation: BulkOperationType;
  selectedIds: string[];
  onSuccess?: (result: any) => void;
  onClose?: () => void;
}

export function BulkOperationsDialog({
  schoolId,
  moduleName,
  operation,
  selectedIds,
  onSuccess,
  onClose,
}: BulkOperationsDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  const getOperationDetails = () => {
    const details: Record<string, { title: string; warning: string; confirmText: string; icon: 'warning' | 'info' }> = {
      delete: {
        title: 'Delete Records',
        warning: 'This action cannot be undone. All selected records will be permanently deleted.',
        confirmText: 'Delete All',
        icon: 'warning',
      },
      archive: {
        title: 'Archive Records',
        warning: 'Archived records will be marked as inactive and hidden from normal views.',
        confirmText: 'Archive All',
        icon: 'info',
      },
      activate: {
        title: 'Activate Records',
        warning: 'This will mark all selected records as active.',
        confirmText: 'Activate All',
        icon: 'info',
      },
      deactivate: {
        title: 'Deactivate Records',
        warning: 'This will mark all selected records as inactive.',
        confirmText: 'Deactivate All',
        icon: 'info',
      },
      update: {
        title: 'Update Records',
        warning: 'This will update all selected records with the provided changes.',
        confirmText: 'Update All',
        icon: 'info',
      },
      assign_class: {
        title: 'Assign Class',
        warning: 'This will assign all selected records to the specified class.',
        confirmText: 'Assign Class',
        icon: 'info',
      },
      assign_subject: {
        title: 'Assign Subject',
        warning: 'This will assign all selected records to the specified subject.',
        confirmText: 'Assign Subject',
        icon: 'info',
      },
      assign_teacher: {
        title: 'Assign Teacher',
        warning: 'This will assign all selected records to the specified teacher.',
        confirmText: 'Assign Teacher',
        icon: 'info',
      },
    };

    return details[operation] || { title: 'Operation', warning: '', confirmText: 'Confirm', icon: 'info' as const };
  };

  const details = getOperationDetails();

  const handleExecute = async () => {
    setIsProcessing(true);

    try {
      const result = await ImportExportService.executeBulkOperation(schoolId, moduleName, {
        operationType: operation,
        targetIds: selectedIds,
      });

      setResult(result);
      setShowResults(true);
      onSuccess?.(result);
    } catch (error) {
      setResult({
        success: false,
        processed: selectedIds.length,
        succeeded: 0,
        failed: selectedIds.length,
        errors: [
          {
            id: 'system',
            error: error instanceof Error ? error.message : 'Operation failed',
          },
        ],
      });
      setShowResults(true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">{details.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!showResults ? (
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              {/* Warning Icon */}
              {details.icon === 'warning' && (
                <div className="flex gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">Destructive Action</p>
                    <p className="text-sm text-muted-foreground mt-1">{details.warning}</p>
                  </div>
                </div>
              )}
              {details.icon === 'info' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">{details.warning}</p>
                </div>
              )}
            </div>

            {/* Record Count */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Selected Records</p>
              <p className="text-lg font-semibold">{selectedIds.length}</p>
            </div>

            {/* Confirmation */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Type your confirmation:</p>
              <p className="text-sm text-muted-foreground">
                Please type <span className="font-mono bg-muted px-2 py-1 rounded text-xs">confirm</span> to proceed.
              </p>
              <ConfirmationInput
                onConfirm={handleExecute}
                disabled={isProcessing}
              />
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {result.success ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900">Operation Completed</p>
                    <p className="text-sm text-green-700 mt-1">
                      {result.succeeded} record{result.succeeded !== 1 ? 's' : ''} processed successfully.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-900">Operation Failed</p>
                    <p className="text-sm text-red-700 mt-1">
                      {result.failed} record{result.failed !== 1 ? 's' : ''} failed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Results Summary */}
            <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processed:</span>
                <span className="font-semibold">{result.processed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Succeeded:</span>
                <span className="font-semibold text-green-600">{result.succeeded}</span>
              </div>
              {result.failed > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="font-semibold text-red-600">{result.failed}</span>
                </div>
              )}
            </div>

            {/* Errors */}
            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <p className="text-sm font-semibold">Errors:</p>
                {result.errors.map((error: any, idx: number) => (
                  <div key={idx} className="text-xs bg-red-50 border border-red-200 rounded p-2 text-red-900">
                    {error.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t p-4 flex gap-3">
          {!showResults ? (
            <>
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  details.confirmText
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmationInput({ onConfirm, disabled }: { onConfirm: () => void; disabled: boolean }) {
  const [input, setInput] = useState('');

  return (
    <>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && input.toLowerCase() === 'confirm' && !disabled) {
            onConfirm();
          }
        }}
        placeholder="Type 'confirm' here"
        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        disabled={disabled}
      />
      <button
        onClick={onConfirm}
        disabled={input.toLowerCase() !== 'confirm' || disabled}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        Confirm Operation
      </button>
    </>
  );
}
