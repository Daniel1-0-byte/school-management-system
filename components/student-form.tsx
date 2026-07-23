'use client';

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2 } from 'lucide-react';
import type { Student } from '@/types';
import { StudentValidator, type StudentCreateInput } from '@/lib/validators/student-validator';
import { SchoolService } from '@/lib/services/school-service';

interface StudentFormProps {
  student?: Student;
  loading?: boolean;
  onSubmit: (data: StudentCreateInput) => Promise<void>;
  submitLabel?: string;
}

export function StudentForm({ student, loading = false, onSubmit, submitLabel = 'Save Student' }: StudentFormProps) {
  const [formData, setFormData] = useState<StudentCreateInput>({
    firstName: '',
    lastName: '',
    dateOfBirth: undefined,
    admissionNumber: undefined,
    currentClassId: undefined,
    currentStreamId: undefined, // Phase 3
    parentalStatus: undefined,
    medicalNotes: undefined,
    allergies: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [streams, setStreams] = useState<any[]>([]); // Phase 3: School streams
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Phase 3: Fetch streams on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get school ID from session
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          const sid = data.session?.schoolId;
          if (sid) {
            setSchoolId(sid);
            
            // Fetch streams
            setLoadingStreams(true);
            const result = await SchoolService.getStreams(sid, true);
            if (!result.error && result.streams) {
              setStreams(result.streams);
            }
          }
        }
      } catch (err) {
        console.error('[v0] Failed to load streams:', err);
      } finally {
        setLoadingStreams(false);
      }
    };

    fetchData();

    if (student) {
      setFormData({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        dateOfBirth: student.dateOfBirth,
        admissionNumber: student.admissionNumber,
        currentClassId: student.currentClassId,
        currentStreamId: student.currentStreamId, // Phase 3
        parentalStatus: student.parentalStatus,
        medicalNotes: student.medicalNotes,
        allergies: student.allergies,
      });
    }
  }, [student]);

  const validateField = (name: string, value: unknown) => {
    const testData = { ...formData, [name]: value };
    const result = student 
      ? StudentValidator.validateUpdate(testData)
      : StudentValidator.validateCreate(testData);
    
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
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value || undefined }));
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setSubmitError(null);

      // Validate all fields
      const validation = student
        ? StudentValidator.validateUpdate(formData)
        : StudentValidator.validateCreate(formData);

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
        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            First Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="Enter first name"
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.firstName ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.firstName && <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Last Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Enter last name"
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.lastName ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.lastName && <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>}
        </div>

        {/* Admission Number */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Admission Number</label>
          <input
            type="text"
            name="admissionNumber"
            value={formData.admissionNumber || ''}
            onChange={handleChange}
            placeholder="E.g., ADM-2024-001"
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.admissionNumber ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.admissionNumber && <p className="text-sm text-red-600 mt-1">{errors.admissionNumber}</p>}
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Date of Birth</label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth || ''}
            onChange={handleChange}
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.dateOfBirth ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.dateOfBirth && <p className="text-sm text-red-600 mt-1">{errors.dateOfBirth}</p>}
        </div>

        {/* Stream Selection - Phase 3 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Class Stream <span className="text-red-600">*</span>
          </label>
          <select
            name="currentStreamId"
            value={formData.currentStreamId || ''}
            onChange={handleChange}
            disabled={loadingStreams || streams.length === 0}
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.currentStreamId ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            } ${loadingStreams ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">
              {loadingStreams ? 'Loading streams...' : 'Select a stream'}
            </option>
            {streams.map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.name} {stream.section ? `- Section ${stream.section}` : ''}
              </option>
            ))}
          </select>
          {errors.currentStreamId && <p className="text-sm text-red-600 mt-1">{errors.currentStreamId}</p>}
          {!loadingStreams && streams.length === 0 && (
            <p className="text-sm text-yellow-600 mt-1">No streams available. Create streams in the Classes section first.</p>
          )}
        </div>

        {/* Parental Status */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Parental Status</label>
          <select
            name="parentalStatus"
            value={formData.parentalStatus || ''}
            onChange={handleChange}
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.parentalStatus ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          >
            <option value="">Select status</option>
            <option value="both_parents">Both Parents</option>
            <option value="single_mother">Single Mother</option>
            <option value="single_father">Single Father</option>
            <option value="orphan">Orphan</option>
            <option value="guardian">Guardian</option>
          </select>
          {errors.parentalStatus && <p className="text-sm text-red-600 mt-1">{errors.parentalStatus}</p>}
        </div>
      </div>

      {/* Medical Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Medical Notes</label>
        <textarea
          name="medicalNotes"
          value={formData.medicalNotes || ''}
          onChange={handleChange}
          placeholder="Any medical conditions, allergies, etc."
          rows={3}
          className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none resize-none ${
            errors.medicalNotes ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
          }`}
        />
        {errors.medicalNotes && <p className="text-sm text-red-600 mt-1">{errors.medicalNotes}</p>}
      </div>

      {/* Allergies */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Allergies</label>
        <textarea
          name="allergies"
          value={formData.allergies || ''}
          onChange={handleChange}
          placeholder="List any known allergies"
          rows={2}
          className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none resize-none ${
            errors.allergies ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
          }`}
        />
        {errors.allergies && <p className="text-sm text-red-600 mt-1">{errors.allergies}</p>}
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
