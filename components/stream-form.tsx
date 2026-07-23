'use client';

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2 } from 'lucide-react';
import { StreamService } from '@/lib/services/stream-service';
import { z } from 'zod';

const streamSchema = z.object({
  streamName: z.string().min(1, 'Stream name is required'),
  systemClassId: z.string().min(1, 'Class is required'),
  capacity: z.number().int().positive('Capacity must be a positive number').optional(),
});

type StreamFormData = z.infer<typeof streamSchema>;

interface StreamFormProps {
  streamId?: string;
  onSuccess?: () => void;
}

export function StreamForm({ streamId, onSuccess }: StreamFormProps) {
  const [formData, setFormData] = useState<StreamFormData>({
    streamName: '',
    systemClassId: '',
    capacity: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemClasses, setSystemClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);

  // Fetch system classes and current stream data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get school and academic year
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setSchoolId(data.session?.schoolId || null);
          setAcademicYearId(data.session?.academicYearId || null);
        }

        // Fetch system classes
        const classesResponse = await fetch('/api/curriculum/classes', { credentials: 'include' });
        if (classesResponse.ok) {
          const classesData = await classesResponse.json();
          setSystemClasses(classesData.data || []);
        }

        // If editing, fetch stream details
        if (streamId) {
          const streamResponse = await fetch(`/api/school/streams/${streamId}`, { credentials: 'include' });
          if (streamResponse.ok) {
            const streamData = await streamResponse.json();
            if (streamData.data) {
              // Handle both camelCase and snake_case responses
              const stream = streamData.data;
              setFormData({
                streamName: stream.streamName || stream.stream_name || '',
                systemClassId: stream.systemClassId || stream.system_class_id || '',
                capacity: stream.capacity || undefined,
              });
            }
          }
        }
      } catch (err) {
        console.error('[v0] Error fetching data:', err);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchData();
  }, [streamId]);

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

      if (!schoolId || !academicYearId) {
        throw new Error('School or academic year not found');
      }

      setSaving(true);

      const result = await StreamService.createStream({
        schoolId,
        academicYearId,
        systemClassId: validated.systemClassId,
        streamName: validated.streamName,
        capacity: validated.capacity,
      });

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess?.();
      }
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
          name="streamName"
          value={formData.streamName}
          onChange={handleChange}
          placeholder="e.g., Stream A, Stream B"
          className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
            errors.streamName ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
          }`}
        />
        {errors.streamName && <p className="text-sm text-red-600 mt-1">{errors.streamName}</p>}
      </div>

      {/* Class Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Class <span className="text-red-600">*</span>
        </label>
        <select
          name="systemClassId"
          value={formData.systemClassId}
          onChange={handleChange}
          className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none ${
            errors.systemClassId ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
          }`}
        >
          <option value="">Select a class</option>
          {systemClasses.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
        {errors.systemClassId && <p className="text-sm text-red-600 mt-1">{errors.systemClassId}</p>}
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
            <span>Create Stream</span>
          </>
        )}
      </button>
    </form>
  );
}
