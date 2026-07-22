'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ClassForm } from '@/components/class-form';
import { SchoolService } from '@/lib/services/school-service';
import type { Class } from '@/lib/transformers/class-transformer';

export default function CreateClassPage() {
  const router = useRouter();
  const params = useParams();
  const schoolId = params.schoolId as string;
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: Partial<Class>) => {
    if (!schoolId) throw new Error('School ID not found');

    const result = await SchoolService.createClass(schoolId, data);
    if (result.error) throw new Error(result.error);

    router.push(`/school/${schoolId}/classes`);
  };

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
          <h1 className="text-3xl font-bold text-foreground">Create New Class</h1>
          <p className="text-muted-foreground mt-1">Add a new class to your school</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <ClassForm onSubmit={handleSubmit} loading={loading} submitLabel="Create Class" />
      </div>
    </div>
  );
}
