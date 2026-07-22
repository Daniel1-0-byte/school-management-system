import type { StudentEnrollment } from '@/types';

export interface EnrollmentRecord {
  id: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  enrollment_date: string;
  status: 'active' | 'completed' | 'dropped';
  created_at: string;
  updated_at: string;
}

export interface Enrollment extends StudentEnrollment {
  id: string;
  studentId: string;
  classId: string;
  academicYearId: string;
  enrollmentDate: string;
  status: 'active' | 'completed' | 'dropped';
}

export class EnrollmentTransformer {
  static toUI(record: EnrollmentRecord): Enrollment {
    return {
      id: record.id,
      studentId: record.student_id,
      classId: record.class_id,
      academicYearId: record.academic_year_id,
      enrollmentDate: record.enrollment_date,
      status: record.status,
    };
  }

  static toUIList(records: EnrollmentRecord[]): Enrollment[] {
    return records.map((r) => this.toUI(r));
  }

  static fromUI(data: Partial<Enrollment>): Partial<EnrollmentRecord> {
    return {
      ...(data.id && { id: data.id }),
      ...(data.studentId && { student_id: data.studentId }),
      ...(data.classId && { class_id: data.classId }),
      ...(data.academicYearId && { academic_year_id: data.academicYearId }),
      ...(data.enrollmentDate && { enrollment_date: data.enrollmentDate }),
      ...(data.status && { status: data.status }),
    };
  }

  static displayName(enrollment: Enrollment): string {
    return `${enrollment.studentId}`;
  }

  static getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-600';
      case 'completed':
        return 'bg-blue-500/20 text-blue-600';
      case 'dropped':
        return 'bg-red-500/20 text-red-600';
      default:
        return 'bg-gray-500/20 text-gray-600';
    }
  }
}
