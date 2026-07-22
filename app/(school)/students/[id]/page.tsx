'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { Student } from '@/types';
import { StudentForm } from '@/components/student-form';
import { SchoolService } from '@/lib/services/school-service';
import type { StudentCreateInput } from '@/lib/validators/student-validator';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get school ID
        const sessionResponse = await fetch('/api/auth/session', { credentials: 'include' });
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          const sid = sessionData.session?.schoolId;
          setSchoolId(sid || null);

          if (sid) {
            // Fetch student data
            const result = await SchoolService.getStudent(sid, studentId);
            if (result.error) {
              console.error('[v0] Error fetching student:', result.error);
            } else {
              setStudent(result.student || null);
            }
          }
        }
      } catch (err) {
        console.error('[v0] Failed to load student:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  const handleSubmit = async (data: StudentCreateInput) => {
    if (!schoolId) throw new Error('School ID not found');

    const result = await SchoolService.updateStudent(schoolId, studentId, data);
    if (result.error) throw new Error(result.error);

    // Redirect to list
    router.push('/students');
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

      {/* Form */}
      <div className="bg-card border border-border rounded-lg p-6">
        <StudentForm student={student || undefined} loading={loading} onSubmit={handleSubmit} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
