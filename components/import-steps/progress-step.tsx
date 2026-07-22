import React from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ImportResult } from '@/lib/import-export/types';

interface ProgressStepProps {
  isProcessing: boolean;
  progress: number;
  importResult?: ImportResult;
}

export function ProgressStep({
  isProcessing,
  progress,
  importResult,
}: ProgressStepProps) {
  if (!isProcessing && !importResult) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {isProcessing ? 'Processing Import...' : 'Import Complete'}
        </h3>
      </div>

      {isProcessing && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-sm font-medium">Processing your data...</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {importResult && !isProcessing && (
        <div className="space-y-4">
          {importResult.success ? (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Import Successful</p>
                <p className="text-sm text-green-800 mt-1">
                  {importResult.created} created, {importResult.updated} updated,{' '}
                  {importResult.skipped} skipped
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900">Import Failed</p>
                <p className="text-sm text-red-800 mt-1">{importResult.errors[0]?.error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Processed</p>
              <p className="text-xl font-bold">{importResult.totalProcessed}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center border border-green-200">
              <p className="text-xs text-green-700">Created</p>
              <p className="text-xl font-bold text-green-600">{importResult.created}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-center border border-amber-200">
              <p className="text-xs text-amber-700">Updated</p>
              <p className="text-xl font-bold text-amber-600">{importResult.updated}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-200">
              <p className="text-xs text-blue-700">Skipped</p>
              <p className="text-xl font-bold text-blue-600">{importResult.skipped}</p>
            </div>
          </div>

          {importResult.warnings.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {importResult.warnings.length} warning(s) during import
            </div>
          )}
        </div>
      )}
    </div>
  );
}
