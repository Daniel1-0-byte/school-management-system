'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Book } from 'lucide-react';
import { SubjectSelector } from '@/components/grades/subject-selector';
import { GradeDashboard } from '@/components/grades/grade-dashboard';

export default function GradesPage() {
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Reset error when selection changes
  useEffect(() => {
    setError(null);
  }, [selectedAcademicYear, selectedTerm, selectedStream, selectedSubject]);

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
            Enter student grades for class and exam scores
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

      {/* Subject Selection Panel */}
      <SubjectSelector
        selectedAcademicYear={selectedAcademicYear}
        setSelectedAcademicYear={setSelectedAcademicYear}
        selectedStream={selectedStream}
        setSelectedStream={setSelectedStream}
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
        selectedTerm={selectedTerm}
        setSelectedTerm={setSelectedTerm}
        onError={setError}
      />

      {/* Grade Dashboard - Only show if subject is selected */}
      {selectedSubject && (
        <GradeDashboard
          subjectId={selectedSubject}
          streamId={selectedStream}
          termId={selectedTerm}
          onError={setError}
        />
      )}

      {/* Empty State */}
      {!selectedSubject && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Book className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Subject Selected
          </h3>
          <p className="text-muted-foreground mb-4">
            Select a subject to begin entering grades for the class
          </p>
        </div>
      )}
    </div>
  );
}
