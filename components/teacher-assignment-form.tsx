'use client';

import React, { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { SchoolService } from '@/lib/services/school-service';

interface TeacherAssignmentFormProps {
  schoolId: string;
  onSuccess: () => void;
}

export function TeacherAssignmentForm({ schoolId, onSuccess }: TeacherAssignmentFormProps) {
  const [formData, setFormData] = useState({
    teacherId: '',
    subjectId: '',
    classId: '',
    academicYearId: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.teacherId || !formData.subjectId || !formData.classId || !formData.academicYearId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const result = await SchoolService.createTeacherAssignment(schoolId, {
        teacherId: formData.teacherId,
        subjectId: formData.subjectId,
        classId: formData.classId,
        academicYearId: formData.academicYearId,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setFormData({
          teacherId: '',
          subjectId: '',
          classId: '',
          academicYearId: '',
        });
        setTimeout(() => {
          onSuccess();
          setSuccess(false);
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-200 rounded-lg text-sm text-red-600 flex items-start justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-500/10 border border-green-200 rounded-lg text-sm text-green-600">
          Assignment created successfully!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Teacher</label>
          <select
            value={formData.teacherId}
            onChange={(e) => handleChange('teacherId', e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            required
          >
            <option value="">Select a teacher...</option>
            <option value="teacher-1">John Smith</option>
            <option value="teacher-2">Sarah Johnson</option>
            <option value="teacher-3">Michael Brown</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
          <select
            value={formData.subjectId}
            onChange={(e) => handleChange('subjectId', e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            required
          >
            <option value="">Select a subject...</option>
            <option value="subject-1">Mathematics</option>
            <option value="subject-2">English</option>
            <option value="subject-3">Science</option>
            <option value="subject-4">Social Studies</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Class</label>
          <select
            value={formData.classId}
            onChange={(e) => handleChange('classId', e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            required
          >
            <option value="">Select a class...</option>
            <option value="class-1">10-A</option>
            <option value="class-2">10-B</option>
            <option value="class-3">11-A</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Academic Year</label>
          <select
            value={formData.academicYearId}
            onChange={(e) => handleChange('academicYearId', e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            required
          >
            <option value="">Select academic year...</option>
            <option value="year-2024">2024-2025</option>
            <option value="year-2023">2023-2024</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating Assignment...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            Assign Teacher
          </>
        )}
      </button>
    </form>
  );
}
