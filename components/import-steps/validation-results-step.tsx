import React from 'react';
import { AlertCircle, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { ValidationResult, ValidationError } from '@/lib/import-export/types';

interface ValidationResultsStepProps {
  validationResult: ValidationResult;
  onDownloadErrors: () => void;
}

export function ValidationResultsStep({
  validationResult,
  onDownloadErrors,
}: ValidationResultsStepProps) {
  const stats = [
    { label: 'Total Rows', value: validationResult.rowsToCreate.length + validationResult.rowsToUpdate.length + validationResult.rowsSkipped.length + validationResult.rowsWithErrors.length, color: 'text-muted-foreground' },
    { label: 'Valid Rows', value: validationResult.rowsToCreate.length + validationResult.rowsToUpdate.length, color: 'text-primary' },
    { label: 'Rows with Errors', value: validationResult.rowsWithErrors.length, color: validationResult.rowsWithErrors.length > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { label: 'Rows Skipped', value: validationResult.rowsSkipped.length, color: 'text-yellow-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Step 2: Validation Results</h3>
        <p className="text-sm text-muted-foreground">
          Review the validation results before proceeding
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Overall Status */}
      <div
        className={`flex items-start gap-3 p-4 rounded-lg ${
          validationResult.isValid
            ? 'bg-muted border border-border'
            : 'bg-destructive/10 border border-destructive/20'
        }`}
      >
        {validationResult.isValid ? (
          <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
        )}
        <div>
          <p
            className={`font-semibold ${
              validationResult.isValid ? 'text-foreground' : 'text-foreground'
            }`}
          >
            {validationResult.isValid
              ? 'Validation Passed'
              : `Validation Failed - ${validationResult.totalErrors} errors found`}
          </p>
          {!validationResult.isValid && (
            <p className="text-sm text-destructive mt-1">
              Please fix the errors below before importing
            </p>
          )}
        </div>
      </div>

      {/* Errors */}
      {validationResult.rowsWithErrors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Errors ({validationResult.rowsWithErrors.length})
            </h4>
            <button
              onClick={onDownloadErrors}
              className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              Download Report
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto border rounded-lg">
            {validationResult.rowsWithErrors.slice(0, 10).map((item, idx) => (
              <div key={idx} className="p-3 border-b last:border-b-0 bg-background">
                <p className="text-xs font-semibold text-destructive mb-1">
                  Row {validationResult.rowsWithErrors.indexOf(item) + 2}
                </p>
                <ul className="space-y-1">
                  {item.errors.map((error, errIdx) => (
                    <li key={errIdx} className="text-xs">
                      <span className="font-semibold">{error.column}:</span>{' '}
                      {error.error}
                      {error.suggestion && (
                        <span className="text-muted-foreground ml-1">
                          ({error.suggestion})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {validationResult.rowsWithErrors.length > 10 && (
              <div className="p-3 text-xs text-muted-foreground text-center">
                ... and {validationResult.rowsWithErrors.length - 10} more errors
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {validationResult.warnings.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            Warnings ({validationResult.warnings.length})
          </h4>
          <div className="max-h-32 overflow-y-auto space-y-2">
            {validationResult.warnings.slice(0, 5).map((warning, idx) => (
              <div
                key={idx}
                className="text-xs p-2 bg-yellow-50 border border-yellow-200 rounded"
              >
                <span className="font-semibold text-yellow-700">Row {warning.rowNumber}:</span>{' '}
                <span className="text-yellow-600">{warning.message}</span>
              </div>
            ))}
            {validationResult.warnings.length > 5 && (
              <p className="text-xs text-muted-foreground">
                ... and {validationResult.warnings.length - 5} more warnings
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
