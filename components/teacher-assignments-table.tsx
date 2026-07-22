'use client';

import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { TeacherAssignment } from '@/lib/transformers/teacher-assignment-transformer';

interface TeacherAssignmentsTableProps {
  assignments: TeacherAssignment[];
  onEdit: (assignment: TeacherAssignment) => void;
  onDelete: (id: string) => void;
}

export function TeacherAssignmentsTable({
  assignments,
  onEdit,
  onDelete,
}: TeacherAssignmentsTableProps) {
  if (assignments.length === 0) {
    return (
      <div className="bg-muted/50 border border-border rounded-lg p-8 text-center text-muted-foreground">
        <p>No teacher assignments found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-semibold text-foreground">Teacher</th>
            <th className="text-left py-3 px-4 font-semibold text-foreground">Subject</th>
            <th className="text-left py-3 px-4 font-semibold text-foreground">Class</th>
            <th className="text-left py-3 px-4 font-semibold text-foreground">Academic Year</th>
            <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
            <th className="text-right py-3 px-4 font-semibold text-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => (
            <tr
              key={assignment.id}
              className="border-b border-border hover:bg-muted/50 transition-colors"
            >
              <td className="py-3 px-4 text-foreground">{assignment.teacherName}</td>
              <td className="py-3 px-4 text-foreground">{assignment.subjectName}</td>
              <td className="py-3 px-4 text-foreground">{assignment.className}</td>
              <td className="py-3 px-4 text-foreground">{assignment.academicYearName}</td>
              <td className="py-3 px-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    assignment.status === 'active'
                      ? 'bg-green-500/20 text-green-600'
                      : 'bg-gray-500/20 text-gray-600'
                  }`}
                >
                  {assignment.status}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onEdit(assignment)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => onDelete(assignment.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
