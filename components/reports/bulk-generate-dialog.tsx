'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle, Download, Printer, X } from 'lucide-react';

interface StudentStatus {
  student_id: string;
  name: string;
  admission_number: string;
  has_report_card: boolean;
  is_complete: boolean;
  missing_requirements: string[];
}

interface BulkGenerateDialogProps {
  isOpen: boolean;
  streamId: string;
  streamName: string;
  termId: string;
  termName: string;
  academicYearId: string;
  academicYearName: string;
  onClose: () => void;
  onGenerated: () => void;
}

export function BulkGenerateDialog({
  isOpen,
  streamId,
  streamName,
  termId,
  termName,
  academicYearId,
  academicYearName,
  onClose,
  onGenerated,
}: BulkGenerateDialogProps) {
  const [step, setStep] = useState<'validate' | 'confirm' | 'generating' | 'complete'>('validate');
  const [validationData, setValidationData] = useState<{
    total_students: number;
    complete: number;
    incomplete: number;
    students: StudentStatus[];
  } | null>(null);
  const [reportUrls, setReportUrls] = useState<
    Array<{ student_id: string; student_name: string; preview_url: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleValidate = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/school/reports/report-cards/bulk-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream_id: streamId,
          term_id: termId,
          academic_year_id: academicYearId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Validation failed');
      }

      const data = await response.json();
      setValidationData(data);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setStep('generating');

      const response = await fetch('/api/school/reports/report-cards/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream_id: streamId,
          term_id: termId,
          academic_year_id: academicYearId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await response.json();
      setReportUrls(data.report_urls);
      setStep('complete');
      onGenerated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStep('confirm');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintAll = () => {
    // Open each report in a new window for printing
    reportUrls.forEach((report, index) => {
      setTimeout(() => {
        window.open(report.preview_url, `report-${report.student_id}`);
      }, index * 500); // Stagger opens to prevent browser blocking
    });
  };

  const handleClose = () => {
    setStep('validate');
    setValidationData(null);
    setReportUrls([]);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold text-foreground">
            {step === 'validate' && 'Validate Report Cards'}
            {step === 'confirm' && 'Review & Generate'}
            {step === 'generating' && 'Generating...'}
            {step === 'complete' && 'Complete'}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Context */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <p>
              <span className="font-medium text-foreground">Class:</span> {streamName}
            </p>
            <p>
              <span className="font-medium text-foreground">Term:</span> {termName}
            </p>
            <p>
              <span className="font-medium text-foreground">Academic Year:</span> {academicYearName}
            </p>
          </div>

          {/* Step: Validate */}
          {step === 'validate' && !validationData && (
            <div className="text-center py-8">
              {isLoading ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                  <p className="text-muted-foreground">Validating report cards...</p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-6">
                    This will check if all students have complete report card data.
                  </p>
                  <button
                    onClick={handleValidate}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Start Validation
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && validationData && (
            <>
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total Students</p>
                  <p className="text-2xl font-bold text-foreground">{validationData.total_students}</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Complete</p>
                  <p className="text-2xl font-bold text-green-600">{validationData.complete}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Incomplete</p>
                  <p className="text-2xl font-bold text-red-600">{validationData.incomplete}</p>
                </div>
              </div>

              {/* Incomplete Students */}
              {validationData.incomplete > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground text-sm">Incomplete Students</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {validationData.students
                      .filter(s => !s.is_complete)
                      .map(student => (
                        <div
                          key={student.student_id}
                          className="text-sm bg-muted/50 rounded p-3 space-y-1"
                        >
                          <p className="font-medium text-foreground">{student.name}</p>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {student.missing_requirements.map((req, idx) => (
                              <li key={idx}>• {req}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  onClick={() => setStep('validate')}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={validationData.incomplete > 0 || isLoading}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Generating...
                    </>
                  ) : (
                    'Generate All Report Cards'
                  )}
                </button>
              </div>
            </>
          )}

          {/* Step: Generating */}
          {step === 'generating' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-muted-foreground">Preparing report cards...</p>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && reportUrls.length > 0 && (
            <>
              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-600">Successfully Generated</p>
                  <p className="text-sm text-green-600/80">{reportUrls.length} report cards ready</p>
                </div>
              </div>

              {/* Report List */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {reportUrls.map(report => (
                  <div key={report.student_id} className="flex items-center justify-between bg-muted/50 rounded p-3">
                    <span className="text-sm text-foreground">{report.student_name}</span>
                    <a
                      href={report.preview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  onClick={handlePrintAll}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Print All
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
