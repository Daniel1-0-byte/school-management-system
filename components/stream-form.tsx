'use client';

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';

const streamSchema = z.object({
  name: z.string().min(1, 'Stream name is required'),
  school_class_id: z.string().min(1, 'Class is required'),
  capacity: z.number().int().positive('Capacity must be a positive number').optional(),
});

type StreamFormData = z.infer<typeof streamSchema>;

interface SchoolClass {
  id: string;
  name: string;
  level: string;
}

interface StreamFormProps {
  streamId?: string;
  onSuccess?: () => void;
}

export function StreamForm({ streamId, onSuccess }: StreamFormProps) {
  const [formData, setFormData] = useState<StreamFormData>({
    name: '',
    school_class_id: '',
    capacity: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Get school ID from session first
  useEffect(() => {
    const getSchoolId = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          const sid = data.session?.schoolId || null;
          setSchoolId(sid);
        }
      } catch (err) {
        console.error('[v0] Error getting school ID:', err);
      }
    };

    getSchoolId();
  }, []);

  // Fetch school classes once schoolId is available
  useEffect(() => {
    if (!schoolId) return;

    const fetchClasses = async () => {
      try {
        const classesResponse = await fetch('/api/school/classes', { 
          credentials: 'include',
          headers: { 'X-School-Id': schoolId }
        });
        if (classesResponse.ok) {
          const classesData = await classesResponse.json();
          setSchoolClasses(classesData.data || []);
        }
      } catch (err) {
        console.error('[v0] Error fetching classes:', err);
      }
    };

    fetchClasses();
  }, [schoolId]);

  // Fetch stream details if editing (only when streamId and schoolId exist)
  useEffect(() => {
    if (!streamId || !schoolId) {
      setLoadingClasses(false);
      return;
    }

    const fetchStreamData = async () => {
      try {
        const streamResponse = await fetch(`/api/school/streams/${streamId}`, { 
          credentials: 'include',
          headers: { 'X-School-Id': schoolId }
        });
        if (streamResponse.ok) {
          const streamData = await streamResponse.json();
          if (streamData.data) {
            const stream = streamData.data;
            setFormData({
              name: stream.name || '',
              school_class_id: stream.school_class_id || '',
              capacity: stream.capacity || undefined,
            });
          }
        }
      } catch (err) {
        console.error('[v0] Error fetching stream data:', err);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchStreamData();
  }, [streamId, schoolId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'capacity' ? (value ? parseInt(value) : undefined) : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setError(null);

    try {
      const validated = streamSchema.parse(formData);

      if (!schoolId) {
        throw new Error('School not found');
      }

      setSaving(true);

      const method = streamId ? 'PATCH' : 'POST';
      const endpoint = streamId ? `/api/school/streams/${streamId}` : '/api/school/streams';

      const response = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-School-Id': schoolId,
        },
        body: JSON.stringify({
          name: validated.name,
          school_class_id: validated.school_class_id,
          capacity: validated.capacity || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save stream');
      }

      onSuccess?.();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          const path = error.path.join('.');
          newErrors[path] = error.message;
        });
        setErrors(newErrors);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save stream');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingClasses) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Stream Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Stream Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Stream A, Stream B"
          className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
            errors.name ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
          }`}
        />
        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
      </div>

      {/* Class Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Class <span className="text-red-600">*</span>
        </label>
        <select
          name="school_class_id"
          value={formData.school_class_id}
          onChange={handleChange}
          className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
            errors.school_class_id ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
          }`}
        >
          <option value="">Select a class</option>
          {schoolClasses.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
        {errors.school_class_id && <p className="text-sm text-red-600 mt-1">{errors.school_class_id}</p>}
      </div>

      {/* Capacity */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Capacity (Optional)</label>
        <input
          type="number"
          name="capacity"
          value={formData.capacity || ''}
          onChange={handleChange}
          placeholder="e.g., 50"
          min="1"
          className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
            errors.capacity ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
          }`}
        />
        {errors.capacity && <p className="text-sm text-red-600 mt-1">{errors.capacity}</p>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={saving}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            <span>{streamId ? 'Update Stream' : 'Create Stream'}</span>
          </>
        )}
      </button>
    </form>
  );
}
