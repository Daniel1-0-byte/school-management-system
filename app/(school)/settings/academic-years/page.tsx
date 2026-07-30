import React from 'react';
import { Calendar } from 'lucide-react';
import { AcademicYearsManagement } from '@/components/academic-years-management';

export default function AcademicYearsPage() {
  return (
    <main className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Academic Years & Terms</h1>
        </div>
        <p className="text-muted-foreground">
          Manage academic years and automatically create terms for your school's calendar.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> When you create an academic year, three terms (Term 1, 2, and 3) are automatically created
          with evenly divided dates. You can edit these dates or add additional terms as needed.
        </p>
      </div>

      {/* Academic Years Management Component */}
      <AcademicYearsManagement />
    </main>
  );
}
