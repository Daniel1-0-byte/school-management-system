'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Save, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Student } from '@/types';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Male',
    classId: '',
    rollNumber: '',
    status: 'active',
  });

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const response = await fetch(`/api/school/students/${studentId}`);
        if (!response.ok) throw new Error('Failed to fetch student');
        const data = await response.json();
        setStudent(data);
        setFormData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load student');
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [studentId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/school/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update student');
      router.push('/students');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Student Details</h1>
          <p className="text-muted-foreground mt-1">Edit student information</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-600">Error</p>
            <p className="text-sm text-red-600/80">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">First Name *</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Last Name *</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Date of Birth</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Class *</label>
            <select
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="">Select Class</option>
              <option value="class-1">Class 1</option>
              <option value="class-2">Class 2</option>
              <option value="class-3">Class 3</option>
            </select>
          </div>

          {/* Roll Number */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Roll Number</label>
            <input
              type="text"
              value={formData.rollNumber}
              onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="active">Active</option>
              <option value="graduated">Graduated</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
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
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
