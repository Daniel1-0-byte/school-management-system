'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, Printer, Download, ArrowLeft } from 'lucide-react';
import { ProfessionalReportCard, type ReportCardData } from '@/components/reports/professional-report-card';

export default function ReportCardPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const studentId = searchParams.get('student_id');
  const termId = searchParams.get('term_id');
  const academicYearId = searchParams.get('academic_year_id');

  useEffect(() => {
    if (!studentId || !termId || !academicYearId) {
      setError('Missing required parameters');
      setIsLoading(false);
      return;
    }

    loadReportCard();
  }, [studentId, termId, academicYearId]);

  const loadReportCard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        student_id: studentId!,
        term_id: termId!,
        academic_year_id: academicYearId!,
      });

      const response = await fetch(`/api/school/reports/report-cards/detail?${params}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load report card');
      }

      const data: ReportCardData = await response.json();
      setReportCard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report card');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 1000);
  };

  const handleDownloadPDF = async () => {
    try {
      // Note: In a production system, you would use a library like jsPDF or html2pdf
      // For now, we'll trigger the browser's print-to-PDF functionality
      window.print();
    } catch (err) {
      console.error('[v0] PDF download error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading report card...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md space-y-4">
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 flex gap-4">
            <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-2">Error Loading Report Card</h3>
              <p className="text-sm text-destructive/80 mb-4">{error}</p>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 no-print">
      {/* Toolbar - Hidden in print */}
      <div className="sticky top-0 z-10 bg-card border-b border-border no-print">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-semibold">Report Card Preview</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 text-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Report Card Preview */}
      <div className="p-4 no-print">
        <div className="max-w-4xl mx-auto">
          {reportCard && <ProfessionalReportCard data={reportCard} />}
        </div>
      </div>

      {/* Print Version */}
      <style>{`
        @media print {
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
