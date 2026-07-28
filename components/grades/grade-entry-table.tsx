'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

interface GradeEntryTableProps {
  grades: GradeEntry[];
  onUpdateGrade: (
    studentId: string,
    field: 'class_score' | 'exam_score' | 'remarks',
    value: string | number | null
  ) => void;
}

export function GradeEntryTable({ grades, onUpdateGrade }: GradeEntryTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const getGradeColor = (grade: string | null) => {
    switch (grade) {
      case 'A':
        return 'bg-green-100 text-green-800';
      case 'B':
        return 'bg-blue-100 text-blue-800';
      case 'C':
        return 'bg-yellow-100 text-yellow-800';
      case 'D':
        return 'bg-orange-100 text-orange-800';
      case 'F':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground w-8">
                {/* Expand button column */}
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Student Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                Admission Number
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">
                Class Score
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">
                Exam Score
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">
                Total Score
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">
                Grade
              </th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade, index) => (
              <React.Fragment key={grade.student_id}>
                {/* Main Row */}
                <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <button
                      onClick={() =>
                        setExpandedRow(expandedRow === grade.student_id ? null : grade.student_id)
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {expandedRow === grade.student_id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {grade.student_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {grade.admission_number}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={grade.class_score ?? ''}
                      onChange={(e) =>
                        onUpdateGrade(
                          grade.student_id,
                          'class_score',
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="—"
                      className="w-16 px-2 py-1 text-center text-sm bg-background border border-border rounded focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={grade.exam_score ?? ''}
                      onChange={(e) =>
                        onUpdateGrade(
                          grade.student_id,
                          'exam_score',
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="—"
                      className="w-16 px-2 py-1 text-center text-sm bg-background border border-border rounded focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-foreground">
                    {grade.total_score ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {grade.grade ? (
                      <span
                        className={`inline-block px-3 py-1 rounded font-bold text-sm ${getGradeColor(
                          grade.grade
                        )}`}
                      >
                        {grade.grade}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>

                {/* Expanded Row - Remarks */}
                {expandedRow === grade.student_id && (
                  <tr className="border-b border-border bg-muted/20">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">
                          Remarks / Comments
                        </label>
                        <textarea
                          value={grade.remarks ?? ''}
                          onChange={(e) =>
                            onUpdateGrade(grade.student_id, 'remarks', e.target.value)
                          }
                          placeholder="Add remarks or comments for this student..."
                          className="w-full px-3 py-2 text-sm bg-background border border-border rounded focus:outline-none focus:border-primary resize-none"
                          rows={2}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="bg-muted/30 px-6 py-3 border-t border-border">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Students</p>
            <p className="text-lg font-bold text-foreground">{grades.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">With Class Scores</p>
            <p className="text-lg font-bold text-foreground">
              {grades.filter((g) => g.class_score !== null).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">With Exam Scores</p>
            <p className="text-lg font-bold text-foreground">
              {grades.filter((g) => g.exam_score !== null).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fully Scored</p>
            <p className="text-lg font-bold text-foreground">
              {grades.filter((g) => g.class_score !== null && g.exam_score !== null).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
