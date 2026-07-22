'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StudentForm } from '@/components/student-form';
import { SchoolService } from '@/lib/services/school-service';
import type { StudentCreateInput } from '@/lib/validators/student-validator';

export default function AddStudentPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSchoolId = async () => {
      try {
        const response = await fetch('/api/auth/session', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setSchoolId(data.session?.schoolId || null);
        }
      } catch (err) {
        console.error('[v0] Failed to get school ID:', err);
      } finally {
        setLoading(false);
      }
    };
    getSchoolId();
  }, []);

  const handleSubmit = async (data: StudentCreateInput) => {
    if (!schoolId) throw new Error('School ID not found');

    const result = await SchoolService.createStudent(schoolId, data);
    if (result.error) throw new Error(result.error);

    // Show success toast and redirect
    router.push('/students');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
          <h1 className="text-3xl font-bold text-foreground">Add New Student</h1>
          <p className="text-muted-foreground mt-1">Enroll a new student to the school</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card border border-border rounded-lg p-6">
        <StudentForm onSubmit={handleSubmit} loading={loading} submitLabel="Add Student" />
      </div>
    </div>
  );
}
