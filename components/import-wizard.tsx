'use client';

import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ModuleConfig, FileFormat, DuplicateStrategy, ValidationResult, ImportResult } from '@/lib/import-export/types';
import { ImportExportService } from '@/lib/services/import-export-service';
import { FileUploadStep } from './import-steps/file-upload-step';
import { ValidationResultsStep } from './import-steps/validation-results-step';
import { PreviewStep } from './import-steps/preview-step';
import { DuplicateStrategyStep } from './import-steps/duplicate-strategy-step';
import { ProgressStep } from './import-steps/progress-step';

interface ImportWizardProps {
  schoolId: string;
  moduleName: string;
  config: ModuleConfig;
  onSuccess?: (result: ImportResult) => void;
  onClose?: () => void;
  existingRecords?: any[];
}

export function ImportWizard({
  schoolId,
  moduleName,
  config,
  onSuccess,
  onClose,
  existingRecords,
}: ImportWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FileFormat>('csv');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [fileData, setFileData] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('insert_new_only');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setUploadError(undefined);
    setIsLoading(true);

    try {
      const result = await ImportExportService.parseUploadedFile(file, config);
      
      if (result.errors.length > 0) {
        setUploadError(result.errors.join('; '));
        setIsLoading(false);
        return;
      }

      setFileData(result.data);
      setIsLoading(false);
      setStep(2);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to parse file');
      setIsLoading(false);
    }
  }, [config]);

  const handleValidate = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = ImportExportService.validateImport(fileData, config, existingRecords);
      setValidationResult(result);
      setStep(3);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setIsLoading(false);
    }
  }, [fileData, config, existingRecords]);

  const handleExecuteImport = useCallback(async () => {
    if (!validationResult) return;

    setIsProcessing(true);
    setProgress(0);
    setStep(6);

    try {
      const result = await ImportExportService.executeBulkImport(
        schoolId,
        moduleName,
        validationResult,
        config
      );

      setProgress(100);
      setImportResult(result);
      setIsProcessing(false);

      if (result.success && onSuccess) {
        setTimeout(() => {
          onSuccess(result);
        }, 1000);
      }
    } catch (error) {
      setIsProcessing(false);
      setImportResult({
        success: false,
        totalProcessed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: fileData.length,
        errors: [
          {
            rowNumber: 0,
            column: 'system',
            value: null,
            error: error instanceof Error ? error.message : 'Import failed',
          },
        ],
        warnings: [],
        timestamp: new Date().toISOString(),
      });
    }
  }, [validationResult, schoolId, moduleName, config, fileData, onSuccess]);

  const handleDownloadTemplate = useCallback(() => {
    ImportExportService.downloadTemplate(config, selectedFormat);
  }, [config, selectedFormat]);

  const handleDownloadErrors = useCallback(() => {
    if (validationResult) {
      ImportExportService.downloadErrorReport(validationResult);
    }
  }, [validationResult]);

  const canProceedToNext = useCallback(() => {
    switch (step) {
      case 1:
        return selectedFile !== null && !isLoading;
      case 2:
        return fileData.length > 0 && !isLoading;
      case 3:
        return validationResult?.isValid || false;
      case 4:
        return true;
      case 5:
        return !isProcessing;
      default:
        return false;
    }
  }, [step, selectedFile, fileData, validationResult, isLoading, isProcessing]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-xl font-bold">Import {config.moduleName}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Step {step} of 5: {['Upload', 'Validate', 'Preview', 'Strategy', 'Confirm'][step - 1]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <FileUploadStep
              onFileSelect={handleFileSelect}
              onFormatChange={setSelectedFormat}
              selectedFile={selectedFile}
              selectedFormat={selectedFormat}
              isLoading={isLoading}
              error={uploadError}
            />
          )}

          {step === 2 && fileData.length > 0 && (
            <ValidationResultsStep
              validationResult={validationResult || { isValid: false, rowsToCreate: [], rowsToUpdate: [], rowsSkipped: [], rowsWithErrors: [], totalErrors: 0, totalWarnings: 0, warnings: [] }}
              onDownloadErrors={handleDownloadErrors}
            />
          )}

          {step === 3 && validationResult && (
            <PreviewStep validationResult={validationResult} config={config} />
          )}

          {step === 4 && (
            <DuplicateStrategyStep
              config={config}
              selectedStrategy={duplicateStrategy}
              onStrategyChange={setDuplicateStrategy}
            />
          )}

          {step === 5 && validationResult && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Step 5: Confirm Import</h3>
                <p className="text-sm text-muted-foreground">
                  Ready to proceed with the import?
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold text-sm mb-3">Import Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Module:</span>
                      <p className="font-semibold">{config.moduleName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Strategy:</span>
                      <p className="font-semibold capitalize">{duplicateStrategy.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">To Create:</span>
                      <p className="font-semibold text-green-600">{validationResult.rowsToCreate.length}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">To Update:</span>
                      <p className="font-semibold text-amber-600">{validationResult.rowsToUpdate.length}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  This action will import the data into your system. You can review and edit individual records after import if needed.
                </p>
              </div>
            </div>
          )}

          {step === 6 && (
            <ProgressStep
              isProcessing={isProcessing}
              progress={progress}
              importResult={importResult || undefined}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="text-sm px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Download Template
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                if (step === 1) {
                  onClose?.();
                } else if (step === 2 && !validationResult) {
                  setStep(1);
                } else if (step === 3 || step === 4) {
                  setStep(step - 1);
                } else {
                  onClose?.();
                }
              }}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              disabled={isProcessing}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step < 5 && (
              <button
                onClick={() => {
                  if (step === 1) {
                    handleValidate();
                  } else if (step === 2) {
                    setStep(3);
                  } else if (step === 3) {
                    setStep(4);
                  } else if (step === 4) {
                    setStep(5);
                  }
                }}
                disabled={!canProceedToNext()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 5 && (
              <button
                onClick={handleExecuteImport}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Importing...' : 'Import Now'}
              </button>
            )}

            {step === 6 && importResult && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
