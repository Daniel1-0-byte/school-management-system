'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { ReportCard } from '@/components/report-card';
import { SchoolService } from '@/lib/services/school-service';
import type { Student } from '@/lib/transformers/student-transformer';

export default function ReportCardsPage() {
  const params = useParams();
  const schoolId = params.schoolId as string;
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportCardData, setReportCardData] = useState<any>(null);
  const [showReportCard, setShowReportCard] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    fetchStudents();
  }, [schoolId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const result = await SchoolService.getStudents(schoolId, {
        page: 1,
        pageSize: 100,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setStudents(result.students);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReportCard = async () => {
    if (!selectedStudent || !selectedTerm) {
      setError('Please select both student and term');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/school/report-cards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          school_id: schoolId,
          student_id: selectedStudent.id,
          term_id: selectedTerm,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to generate report card');
        return;
      }

      const data = await response.json();
      setReportCardData(data);
      setShowReportCard(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        {!showReportCard ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground">Report Cards</h1>
              <p className="text-muted-foreground mt-2">Generate and view student report cards</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-200 rounded-lg text-red-600">
                {error}
              </div>
            )}

            {/* Selection Form */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Select Student</label>
                  <select
                    value={selectedStudent?.id || ''}
                    onChange={(e) => {
                      const student = students.find((s) => s.id === e.target.value);
                      setSelectedStudent(student || null);
                    }}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="">Choose a student...</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.firstName} {student.lastName} (ID: {student.registrationNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Select Term</label>
                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="">Choose a term...</option>
                    <option value="term-1">Term 1</option>
                    <option value="term-2">Term 2</option>
                    <option value="term-3">Term 3</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateReportCard}
                disabled={loading || !selectedStudent || !selectedTerm}
                className="w-full px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Generate Report Card
                  </>
                )}
              </button>
            </div>

            {/* Previous Report Cards List */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Recent Report Cards</h2>
              <div className="bg-muted/50 border border-border rounded-lg p-6 text-center text-muted-foreground">
                <p>No report cards generated yet. Create one using the form above.</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowReportCard(false)}
              className="mb-4 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground"
            >
              ← Back to Report Cards
            </button>

            {reportCardData && (
              <ReportCard
                studentName={`${reportCardData.student.firstName} ${reportCardData.student.lastName}`}
                studentId={reportCardData.student.id}
                className={reportCardData.class.className}
                academicYear={reportCardData.academicYear}
                termName={reportCardData.term.name}
                subjects={reportCardData.subjects}
                attendance={reportCardData.attendance}
                overallGrade={reportCardData.overallGrade}
                remarks={reportCardData.remarks}
                generatedDate={new Date().toLocaleDateString()}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
