'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ClassForm } from '@/components/class-form';
import { SchoolService } from '@/lib/services/school-service';
import type { Class } from '@/lib/transformers/class-transformer';

export default function EditClassPage() {
  const router = useRouter();
  const params = useParams();
  const schoolId = params.schoolId as string;
  const classId = params.classId as string;

  const [classData, setClassData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const result = await SchoolService.getClass(schoolId, classId);
        if (result.error) {
          console.error('[v0] Error fetching class:', result.error);
        } else {
          setClassData(result.class || null);
        }
      } catch (err) {
        console.error('[v0] Failed to load class:', err);
      } finally {
        setLoading(false);
      }
    };

    if (schoolId && classId) {
      fetchClass();
    }
  }, [schoolId, classId]);

  const handleSubmit = async (data: Partial<Class>) => {
    if (!schoolId || !classId) throw new Error('Missing IDs');

    const result = await SchoolService.updateClass(schoolId, classId, data);
    if (result.error) throw new Error(result.error);

    router.push(`/school/${schoolId}/classes`);
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
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Class</h1>
          <p className="text-muted-foreground mt-1">Update class information</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <ClassForm class={classData || undefined} loading={loading} onSubmit={handleSubmit} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
