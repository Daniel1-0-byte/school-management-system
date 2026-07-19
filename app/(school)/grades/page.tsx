'use client';

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2, BookOpen, TrendingUp } from 'lucide-react';

interface StudentGrade {
  studentId: string;
  studentName: string;
  marksObtained: number;
  totalMarks: number;
  grade: string;
  remarks: string;
}

const calculateGrade = (marks: number, totalMarks: number): string => {
  const percentage = (marks / totalMarks) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  return 'F';
};

export default function GradesPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [examType, setExamType] = useState('mid-term');
  const [totalMarks, setTotalMarks] = useState('100');
  const [students, setStudents] = useState<StudentGrade[]>([]);

  const classes = [
    { id: 'class-1', name: 'Class 1-A' },
    { id: 'class-2', name: 'Class 2-B' },
    { id: 'class-3', name: 'Class 3-A' },
  ];

  const subjects = [
    { id: 'math', name: 'Mathematics' },
    { id: 'english', name: 'English' },
    { id: 'science', name: 'Science' },
    { id: 'hindi', name: 'Hindi' },
    { id: 'social', name: 'Social Studies' },
  ];

  const examTypes = [
    { id: 'unit-test', name: 'Unit Test' },
    { id: 'mid-term', name: 'Mid-Term' },
    { id: 'final', name: 'Final Exam' },
    { id: 'practical', name: 'Practical' },
  ];

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      // Mock loading students
      const mockStudents: StudentGrade[] = [
        { studentId: '1', studentName: 'Aarjav Patel', marksObtained: 0, totalMarks: parseInt(totalMarks), grade: '', remarks: '' },
        { studentId: '2', studentName: 'Bhavna Sharma', marksObtained: 0, totalMarks: parseInt(totalMarks), grade: '', remarks: '' },
        { studentId: '3', studentName: 'Chirag Desai', marksObtained: 0, totalMarks: parseInt(totalMarks), grade: '', remarks: '' },
      ];
      setStudents(mockStudents);
    }
  }, [selectedClass, selectedSubject, totalMarks]);

  const updateGrade = (studentId: string, field: string, value: any) => {
    setStudents(
      students.map((s) => {
        if (s.studentId === studentId) {
          const updated = { ...s, [field]: value };
          if (field === 'marksObtained') {
            updated.grade = calculateGrade(parseInt(value), s.totalMarks);
          }
          return updated;
        }
        return s;
      })
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/school/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          subjectId: selectedSubject,
          examType,
          totalMarks: parseInt(totalMarks),
          grades: students,
        }),
      });

      if (!response.ok) throw new Error('Failed to save grades');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Grades</h1>
        <p className="text-muted-foreground mt-1">Enter and manage student grades</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Class Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Exam Type</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              {examTypes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Total Marks */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Total Marks</label>
          <input
            type="number"
            value={totalMarks}
            onChange={(e) => setTotalMarks(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {!selectedClass || !selectedSubject ? (
          <div className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Please select a class and subject to enter grades</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No students in this class</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Student Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Marks Obtained</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Grade</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.studentId} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{student.studentName}</td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        max={totalMarks}
                        value={student.marksObtained}
                        onChange={(e) => updateGrade(student.studentId, 'marksObtained', e.target.value)}
                        className="w-24 px-3 py-1 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
                      />
                      <span className="ml-2 text-muted-foreground text-sm">/ {totalMarks}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                        <TrendingUp className="w-4 h-4" />
                        {student.grade || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        placeholder="Add remarks..."
                        value={student.remarks}
                        onChange={(e) => updateGrade(student.studentId, 'remarks', e.target.value)}
                        className="w-40 px-3 py-1 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save Button */}
      {students.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Grades</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
