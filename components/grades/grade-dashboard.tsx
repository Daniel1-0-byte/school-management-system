'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Save, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { GradeEntryTable } from './grade-entry-table';

interface GradeDashboardProps {
  subjectId: string;
  streamId: string;
  onError: (error: string | null) => void;
}

interface GradeEntry {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  class_score: number | null;
  exam_score: number | null;
  total_score: number | null;
  grade: string | null;
  remarks: string | null;
}

interface GradingPolicy {
  class_score_weight: number;
  exam_score_weight: number;
}

export function GradeDashboard({
  subjectId,
  streamId,
  onError,
}: GradeDashboardProps) {
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [gradingPolicy, setGradingPolicy] = useState<GradingPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch grades and grading policy on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        onError(null);

        // Fetch grades for this subject/stream combination
        const gradesResponse = await fetch(
          `/api/school/grade-entries?subject_id=${subjectId}&stream_id=${streamId}`
        );
        if (!gradesResponse.ok) throw new Error('Failed to fetch grades');
        const gradesData = await gradesResponse.json();
        setGrades(gradesData.data || []);

        // Fetch grading policy
        const policyResponse = await fetch('/api/school/grading-policies');
        if (policyResponse.ok) {
          const policyData = await policyResponse.json();
          setGradingPolicy(policyData.data || null);
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Failed to load grades');
      } finally {
        setLoading(false);
      }
    };

    if (subjectId && streamId) {
      fetchData();
    }
  }, [subjectId, streamId, onError]);

  // Calculate total score and grade based on policy
  const calculateTotalAndGrade = (classScore: number | null, examScore: number | null) => {
    if (!gradingPolicy) return { total: null, grade: null };

    const classComponent = classScore ? (classScore * gradingPolicy.class_score_weight) / 100 : 0;
    const examComponent = examScore ? (examScore * gradingPolicy.exam_score_weight) / 100 : 0;
    const total = classComponent + examComponent;

    // Simple grade scale (A: 80+, B: 70+, C: 60+, D: 50+, F: <50)
    let grade = 'F';
    if (total >= 80) grade = 'A';
    else if (total >= 70) grade = 'B';
    else if (total >= 60) grade = 'C';
    else if (total >= 50) grade = 'D';

    return { total: Math.round(total), grade };
  };

  // Update grade entry
  const updateGrade = (
    studentId: string,
    field: 'class_score' | 'exam_score' | 'remarks',
    value: string | number | null
  ) => {
    setGrades((prev) =>
      prev.map((grade) => {
        if (grade.student_id !== studentId) return grade;

        const updated = { ...grade, [field]: value };

        // Auto-calculate total and grade if scores change
        if (field === 'class_score' || field === 'exam_score') {
          const { total, grade: newGrade } = calculateTotalAndGrade(
            field === 'class_score' ? (value as number) : updated.class_score,
            field === 'exam_score' ? (value as number) : updated.exam_score
          );
          updated.total_score = total;
          updated.grade = newGrade;
        }

        return updated;
      })
    );
    setHasChanges(true);
  };

  // Save all grades
  const handleSaveGrades = async () => {
    try {
      setSaving(true);
      onError(null);

      const response = await fetch('/api/school/grade-entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: assessmentId,
          entries: grades.map((g) => ({
            student_id: g.student_id,
            assessment_id: assessmentId,
            class_score: g.class_score,
            exam_score: g.exam_score,
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to save grades');

      setHasChanges(false);
      onError(null);
      alert('Grades saved successfully!');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
        <p className="text-muted-foreground">Loading grades...</p>
      </div>
    );
  }

  if (!grades.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Students</h3>
        <p className="text-muted-foreground">No students found for this assessment</p>
      </div>
    );
  }

  const completedCount = grades.filter((g) => g.class_score || g.exam_score).length;
  const progressPercentage = (completedCount / grades.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Grade Entry Progress</h3>
          <span className="text-sm text-muted-foreground">
            {completedCount} of {grades.length} students
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Progress Details */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Completed</p>
            <p className="text-xl font-bold text-foreground">{completedCount}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Remaining</p>
            <p className="text-xl font-bold text-foreground">{grades.length - completedCount}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Progress</p>
            <p className="text-xl font-bold text-foreground">{Math.round(progressPercentage)}%</p>
          </div>
        </div>
      </div>

      {/* Grading Policy Info */}
      {gradingPolicy && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Total Score = (Class Score × {gradingPolicy.class_score_weight}%) + (Exam Score × {gradingPolicy.exam_score_weight}%)
          </p>
        </div>
      )}

      {/* Grade Entry Table */}
      <GradeEntryTable
        grades={grades}
        onUpdateGrade={updateGrade}
      />

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        {hasChanges && (
          <p className="text-sm text-amber-600 flex items-center gap-2 mr-auto">
            <Clock className="w-4 h-4" />
            You have unsaved changes
          </p>
        )}
        <button
          onClick={handleSaveGrades}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Grades</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
