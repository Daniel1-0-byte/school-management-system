'use client';

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2 } from 'lucide-react';
import { ClassValidator, type ClassCreateInput } from '@/lib/validators/class-validator';
import { ClassTransformer, type Class } from '@/lib/transformers/class-transformer';

interface ClassFormProps {
  classData?: Class;
  loading?: boolean;
  onSubmit: (data: ClassCreateInput) => Promise<void>;
  submitLabel?: string;
}

export function ClassForm({ classData, loading = false, onSubmit, submitLabel = 'Save Class' }: ClassFormProps) {
  const [formData, setFormData] = useState<ClassCreateInput>({
    className: '',
    gradeLevel: '',
    section: '',
    classTeacherId: undefined,
    capacity: undefined,
    academicYearId: undefined,
    status: 'active',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (classData) {
      setFormData({
        className: classData.className || '',
        gradeLevel: classData.gradeLevel || '',
        section: classData.section || '',
        classTeacherId: classData.classTeacherId,
        capacity: classData.capacity,
        academicYearId: classData.academicYearId,
        status: classData.status,
      });
    }
  }, [classData]);

  const validateField = (name: string, value: unknown) => {
    const testData = { ...formData, [name]: value };
    const result = classData ? ClassValidator.validateUpdate(testData) : ClassValidator.validateCreate(testData);

    if (result.success) {
      setErrors({ ...errors, [name]: '' });
    } else {
      const error = result.error.issues.find((i) => i.path[0] === name);
      if (error) {
        setErrors({ ...errors, [name]: error.message });
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? (value ? parseInt(value) : undefined) : value || undefined;
    setFormData((prev) => ({ ...prev, [name]: parsedValue }));
    validateField(name, parsedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setSubmitError(null);

      const validation = classData
        ? ClassValidator.validateUpdate(formData)
        : ClassValidator.validateCreate(formData);

      if (!validation.success) {
        const newErrors: Record<string, string> = {};
        validation.error.issues.forEach((issue) => {
          const path = String(issue.path[0]);
          newErrors[path] = issue.message;
        });
        setErrors(newErrors);
        return;
      }

      await onSubmit(formData);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-600">Error</p>
            <p className="text-sm text-red-600/80">{submitError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Class Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Class Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="className"
            value={formData.className}
            onChange={handleChange}
            placeholder="E.g., Class 10-A, Grade 10 Section A"
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.className ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.className && <p className="text-sm text-red-600 mt-1">{errors.className}</p>}
        </div>

        {/* Grade Level */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Grade Level <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="gradeLevel"
            value={formData.gradeLevel}
            onChange={handleChange}
            placeholder="E.g., 10, 11, 12, Preschool"
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.gradeLevel ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.gradeLevel && <p className="text-sm text-red-600 mt-1">{errors.gradeLevel}</p>}
        </div>

        {/* Section */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Section <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="section"
            value={formData.section}
            onChange={handleChange}
            placeholder="E.g., A, B, C, D"
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.section ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.section && <p className="text-sm text-red-600 mt-1">{errors.section}</p>}
        </div>

        {/* Capacity */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Capacity</label>
          <input
            type="number"
            name="capacity"
            value={formData.capacity || ''}
            onChange={handleChange}
            placeholder="Maximum number of students"
            min="1"
            max="500"
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.capacity ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.capacity && <p className="text-sm text-red-600 mt-1">{errors.capacity}</p>}
        </div>

        {/* Class Teacher ID */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Class Teacher</label>
          <input
            type="text"
            name="classTeacherId"
            value={formData.classTeacherId || ''}
            onChange={handleChange}
            placeholder="Teacher ID (optional)"
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.classTeacherId ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.classTeacherId && <p className="text-sm text-red-600 mt-1">{errors.classTeacherId}</p>}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.status ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
          {errors.status && <p className="text-sm text-red-600 mt-1">{errors.status}</p>}
        </div>

        {/* Academic Year ID */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-2">Academic Year ID</label>
          <input
            type="text"
            name="academicYearId"
            value={formData.academicYearId || ''}
            onChange={handleChange}
            placeholder="Academic Year ID (optional)"
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.academicYearId ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.academicYearId && <p className="text-sm text-red-600 mt-1">{errors.academicYearId}</p>}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <button
          type="submit"
          disabled={saving || loading}
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
              <span>{submitLabel}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
