'use client';

import React from 'react';
import { formatDate } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import type { Grade } from '@/lib/transformers/grade-transformer';

interface GradeTableProps {
  grades: Grade[];
  loading?: boolean;
  onDelete?: (id: string) => Promise<void>;
}

export function GradeTable({ grades, loading = false, onDelete }: GradeTableProps) {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-green-500/10 text-green-600';
      case 'B':
        return 'bg-blue-500/10 text-blue-600';
      case 'C':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'D':
        return 'bg-orange-500/10 text-orange-600';
      case 'F':
        return 'bg-red-500/10 text-red-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">No grade records found</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Assessment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Marks</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Grade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
              {onDelete && <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {grades.map((grade, idx) => (
              <tr
                key={grade.id}
                className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30 hover:bg-muted/50'}
              >
                <td className="px-6 py-4 text-sm text-foreground">{grade.studentName || 'Unknown'}</td>
                <td className="px-6 py-4 text-sm text-foreground">{grade.subjectName || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-foreground capitalize">{grade.assessmentType || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-foreground font-medium">{grade.marks || 0}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-block px-3 py-1 rounded-full font-semibold ${getGradeColor(grade.grade)}`}>
                    {grade.grade || '-'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {grade.createdAt ? formatDate(grade.createdAt) : 'N/A'}
                </td>
                {onDelete && (
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => onDelete(grade.id)}
                      className="text-red-600 hover:text-red-700 transition-colors p-1"
                      title="Delete grade"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
