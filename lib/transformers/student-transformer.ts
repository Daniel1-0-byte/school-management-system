/**
 * Student Transformer
 * Converts database records (snake_case) to UI model (camelCase)
 */

import type { Student } from '@/types';

export interface StudentRecord {
  id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  admission_number?: string;
  current_class_id?: string;
  current_class_name?: string;
  status: 'active' | 'inactive' | 'graduated';
  parental_status?: string;
  medical_notes?: string;
  allergies?: string;
  created_at: string;
  updated_at: string;
}

export class StudentTransformer {
  /**
   * Transform single record
   */
  static toUI(record: StudentRecord): Student {
    return {
      id: record.id,
      schoolId: record.school_id,
      firstName: record.first_name || '',
      lastName: record.last_name || '',
      dateOfBirth: record.date_of_birth,
      admissionNumber: record.admission_number,
      currentClassId: record.current_class_id,
      currentClassName: record.current_class_name,
      status: record.status,
      parentalStatus: record.parental_status,
      medicalNotes: record.medical_notes,
      allergies: record.allergies,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Transform multiple records
   */
  static toUIList(records: StudentRecord[]): Student[] {
    return records.map((record) => this.toUI(record));
  }

  /**
   * Transform UI model to database record for submission
   */
  static fromUI(student: Partial<Student>): Partial<StudentRecord> {
    return {
      first_name: student.firstName,
      last_name: student.lastName,
      date_of_birth: student.dateOfBirth,
      admission_number: student.admissionNumber,
      current_class_id: student.currentClassId,
      current_class_name: student.currentClassName,
      status: student.status,
      parental_status: student.parentalStatus,
      medical_notes: student.medicalNotes,
      allergies: student.allergies,
    };
  }

  /**
   * Get display name
   */
  static displayName(student: Student): string {
    return `${student.firstName} ${student.lastName}`.trim() || 'Unknown Student';
  }

  /**
   * Get initials for avatar
   */
  static initials(student: Student): string {
    const names = `${student.firstName || ''} ${student.lastName || ''}`.trim();
    if (!names) return '?';
    return names
      .split(' ')
      .map((n) => n.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }
}
