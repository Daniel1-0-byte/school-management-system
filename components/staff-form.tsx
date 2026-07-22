'use client';

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2 } from 'lucide-react';
import { StaffValidator, type StaffCreateInput } from '@/lib/validators/staff-validator';
import { StaffTransformer, type Staff } from '@/lib/transformers/staff-transformer';

interface StaffFormProps {
  staff?: Staff;
  loading?: boolean;
  onSubmit: (data: StaffCreateInput) => Promise<void>;
  submitLabel?: string;
}

export function StaffForm({ staff, loading = false, onSubmit, submitLabel = 'Save Staff' }: StaffFormProps) {
  const [formData, setFormData] = useState<StaffCreateInput>({
    firstName: '',
    lastName: '',
    email: '',
    phone: undefined,
    role: 'teacher',
    department: undefined,
    qualification: undefined,
    experienceYears: undefined,
    dateOfJoining: undefined,
    status: 'active',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (staff) {
      setFormData({
        firstName: staff.firstName || '',
        lastName: staff.lastName || '',
        email: staff.email || '',
        phone: staff.phone,
        role: staff.role || 'teacher',
        department: staff.department,
        qualification: staff.qualification,
        experienceYears: staff.experienceYears,
        dateOfJoining: staff.dateOfJoining,
        status: staff.status,
      });
    }
  }, [staff]);

  const validateField = (name: string, value: unknown) => {
    const testData = { ...formData, [name]: value };
    const result = staff ? StaffValidator.validateUpdate(testData) : StaffValidator.validateCreate(testData);

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

      const validation = staff ? StaffValidator.validateUpdate(formData) : StaffValidator.validateCreate(formData);

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

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Email <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="staff@school.com"
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.email ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone || ''}
            onChange={handleChange}
            placeholder="+91-9876543210"
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.phone ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Role <span className="text-red-600">*</span>
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.role ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          >
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
          {errors.role && <p className="text-sm text-red-600 mt-1">{errors.role}</p>}
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
            <option value="on_leave">On Leave</option>
          </select>
          {errors.status && <p className="text-sm text-red-600 mt-1">{errors.status}</p>}
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Department</label>
          <input
            type="text"
            name="department"
            value={formData.department || ''}
            onChange={handleChange}
            placeholder="E.g., Mathematics, Science"
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.department ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.department && <p className="text-sm text-red-600 mt-1">{errors.department}</p>}
        </div>

        {/* Qualification */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Qualification</label>
          <input
            type="text"
            name="qualification"
            value={formData.qualification || ''}
            onChange={handleChange}
            placeholder="E.g., B.A., B.Sc., M.A."
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.qualification ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.qualification && <p className="text-sm text-red-600 mt-1">{errors.qualification}</p>}
        </div>

        {/* Experience Years */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Experience (Years)</label>
          <input
            type="number"
            name="experienceYears"
            value={formData.experienceYears || ''}
            onChange={handleChange}
            placeholder="0"
            min="0"
            max="100"
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.experienceYears ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.experienceYears && <p className="text-sm text-red-600 mt-1">{errors.experienceYears}</p>}
        </div>

        {/* Date of Joining */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Date of Joining</label>
          <input
            type="date"
            name="dateOfJoining"
            value={formData.dateOfJoining || ''}
            onChange={handleChange}
            className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
              errors.dateOfJoining ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
            }`}
          />
          {errors.dateOfJoining && <p className="text-sm text-red-600 mt-1">{errors.dateOfJoining}</p>}
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
