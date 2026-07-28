'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, AlertCircle, Book } from 'lucide-react';
import { AssessmentSelector } from '@/components/grades/assessment-selector';
import { GradeDashboard } from '@/components/grades/grade-dashboard';

export default function GradesPage() {
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset selection when academic year or stream changes
  useEffect(() => {
    setSelectedAssessment('');
    setError(null);
  }, [selectedAcademicYear, selectedStream]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Book className="w-8 h-8" />
            Grade Entry
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter and manage student grades for assessments
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Assessment Selection Panel */}
      <AssessmentSelector
        selectedAcademicYear={selectedAcademicYear}
        setSelectedAcademicYear={setSelectedAcademicYear}
        selectedStream={selectedStream}
        setSelectedStream={setSelectedStream}
        selectedAssessment={selectedAssessment}
        setSelectedAssessment={setSelectedAssessment}
        onError={setError}
      />

      {/* Grade Dashboard - Only show if assessment is selected */}
      {selectedAssessment && (
        <GradeDashboard
          assessmentId={selectedAssessment}
          streamId={selectedStream}
          onError={setError}
        />
      )}

      {/* Empty State */}
      {!selectedAssessment && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Book className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Assessment Selected
          </h3>
          <p className="text-muted-foreground mb-4">
            Select an assessment to begin entering grades
          </p>
        </div>
      )}
    </div>
  );
}
