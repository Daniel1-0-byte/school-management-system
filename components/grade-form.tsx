'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SchoolService } from '@/lib/services/school-service';
import type { Class } from '@/lib/transformers/class-transformer';
import type { Subject } from '@/lib/transformers/subject-transformer';
import type { Student } from '@/lib/transformers/student-transformer';

interface GradeRecord {
  studentId: string;
  studentName: string;
  marks: number;
  grade: string;
}

interface GradeFormProps {
  schoolId: string;
  onSuccess?: () => void;
}

export function GradeForm({ schoolId, onSuccess }: GradeFormProps) {
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [assessmentType, setAssessmentType] = useState('exam');

  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch classes and subjects on mount
  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const [classesResult, subjectsResult] = await Promise.all([
          SchoolService.getClasses(schoolId, { pageSize: 100 }),
          SchoolService.getSubjects(schoolId, { pageSize: 100 }),
        ]);

        if (classesResult.error) throw new Error(classesResult.error);
        if (subjectsResult.error) throw new Error(subjectsResult.error);

        setClasses(classesResult.classes);
        setSubjects(subjectsResult.subjects);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [schoolId]);

  // Fetch students when class changes
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setGrades([]);
      return;
    }

    const fetch = async () => {
      try {
        setLoading(true);
        const result = await SchoolService.getStudents(schoolId, { pageSize: 100 });
        if (result.error) throw new Error(result.error);

        const classStudents = result.students.filter((s) => s.classId === classId);
        setStudents(classStudents);
        setGrades(
          classStudents.map((s) => ({
            studentId: s.id,
            studentName: `${s.firstName} ${s.lastName}`,
            marks: 0,
            grade: '',
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch students');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [classId, schoolId]);

  const calculateGrade = (marks: number): string => {
    if (marks >= 90) return 'A';
    if (marks >= 80) return 'B';
    if (marks >= 70) return 'C';
    if (marks >= 60) return 'D';
    return 'F';
  };

  const updateGrade = (studentId: string, marks: number) => {
    const grade = calculateGrade(marks);
    setGrades((prev) =>
      prev.map((g) =>
        g.studentId === studentId ? { ...g, marks, grade } : g
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !subjectId || grades.length === 0) {
      setError('Please select a class, subject, and ensure students are loaded');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`/api/school/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          school_id: schoolId,
          class_id: classId,
          subject_id: subjectId,
          assessment_type: assessmentType,
          records: grades.filter((g) => g.marks > 0),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit grades');
      }

      setSuccess(true);
      setGrades([]);
      setClassId('');
      setSubjectId('');

      if (onSuccess) onSuccess();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit grades');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Enter Grades</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4 flex gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-600">Grades submitted successfully</p>
          </div>
        )}
      </div>

      {/* Selection Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Class</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={loading || submitting}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">Select a class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.className}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={loading || submitting}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">Select a subject</option>
            {subjects.map((subj) => (
              <option key={subj.id} value={subj.id}>
                {subj.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Assessment Type</label>
          <select
            value={assessmentType}
            onChange={(e) => setAssessmentType(e.target.value)}
            disabled={submitting}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="exam">Exam</option>
            <option value="quiz">Quiz</option>
            <option value="assignment">Assignment</option>
            <option value="project">Project</option>
          </select>
        </div>
      </div>

      {/* Grade Entry */}
      {grades.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Enter Marks (0-100)</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {grades.map((grade) => (
              <div key={grade.studentId} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <span className="flex-1 text-sm font-medium text-foreground">{grade.studentName}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={grade.marks || ''}
                    onChange={(e) => updateGrade(grade.studentId, parseInt(e.target.value) || 0)}
                    disabled={submitting}
                    placeholder="Marks"
                    className="w-20 px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                  />
                  <span className="w-12 text-sm font-semibold text-primary text-center">{grade.grade || '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Submit Button */}
      {grades.length > 0 && (
        <button
          type="submit"
          disabled={submitting || loading}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Submit Grades
        </button>
      )}
    </form>
  );
}
