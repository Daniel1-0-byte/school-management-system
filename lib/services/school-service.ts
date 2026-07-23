/**
 * School Service
 * Orchestrates all data operations for school modules
 * Uses ApiClient for HTTP + Transformers for data mapping
 */

import { apiClient, type ApiResponse } from './api-client';
import { StudentTransformer, type StudentRecord } from '@/lib/transformers/student-transformer';
import { StaffTransformer, type StaffRecord, type Staff } from '@/lib/transformers/staff-transformer';
import { ClassTransformer, type ClassRecord, type Class } from '@/lib/transformers/class-transformer';
import { AcademicYearTransformer, type AcademicYearRecord, type AcademicYear } from '@/lib/transformers/academic-year-transformer';
import { TermTransformer, type TermRecord, type Term } from '@/lib/transformers/term-transformer';
import { SubjectTransformer, type SubjectRecord, type Subject } from '@/lib/transformers/subject-transformer';
import { GuardianTransformer, type GuardianRecord, type Guardian } from '@/lib/transformers/guardian-transformer';
import { AttendanceTransformer, type AttendanceRecord, type Attendance } from '@/lib/transformers/attendance-transformer';
import { GradeTransformer, type GradeRecord, type Grade } from '@/lib/transformers/grade-transformer';
import { TeacherAssignmentTransformer, type TeacherAssignmentRecord, type TeacherAssignment } from '@/lib/transformers/teacher-assignment-transformer';
import { NotificationTransformer, type NotificationRecord, type Notification } from '@/lib/transformers/notification-transformer';
import type { Student } from '@/types';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface StudentListParams extends PaginationParams {
  search?: string;
  status?: 'active' | 'inactive' | 'graduated';
}

export class SchoolService {
  /**
   * STUDENTS - READ
   */
  static async getStudents(
    schoolId: string,
    params: StudentListParams = {}
  ): Promise<{ students: Student[]; total: number; error?: string }> {
    const response = await apiClient.get<{ data: StudentRecord[]; total: number }>('/students', {
      school_id: schoolId,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      ...(params.search && { search: params.search }),
      ...(params.status && { status: params.status }),
    });

    if (response.error) {
      return { students: [], total: 0, error: response.error };
    }

    return {
      students: StudentTransformer.toUIList(response.data || []),
      total: response.total || 0,
    };
  }

  /**
   * STUDENTS - READ ONE
   */
  static async getStudent(schoolId: string, studentId: string): Promise<{ student?: Student; error?: string }> {
    const response = await apiClient.get<StudentRecord>(`/students/${studentId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      student: response.data ? StudentTransformer.toUI(response.data) : undefined,
    };
  }

  /**
   * STUDENTS - CREATE
   */
  static async createStudent(
    schoolId: string,
    data: Partial<Student>
  ): Promise<{ student?: Student; error?: string }> {
    const payload = {
      school_id: schoolId,
      ...StudentTransformer.fromUI(data),
    };

    const response = await apiClient.post<StudentRecord>('/students', payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      student: response.data ? StudentTransformer.toUI(response.data) : undefined,
    };
  }

  /**
   * STUDENTS - UPDATE
   */
  static async updateStudent(
    schoolId: string,
    studentId: string,
    data: Partial<Student>
  ): Promise<{ student?: Student; error?: string }> {
    const payload = StudentTransformer.fromUI(data);

    const response = await apiClient.put<StudentRecord>(`/students/${studentId}`, payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      student: response.data ? StudentTransformer.toUI(response.data) : undefined,
    };
  }

  /**
   * STUDENTS - DELETE
   */
  static async deleteStudent(schoolId: string, studentId: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiClient.delete<void>(`/students/${studentId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  }

  /**
   * STUDENTS - BULK CREATE (from CSV/JSON/Excel)
   */
  static async bulkCreateStudents(
    schoolId: string,
    students: Partial<Student>[]
  ): Promise<{ created: number; errors: Array<{ row: number; error: string }>; error?: string }> {
    const payload = {
      students: students.map((s) => StudentTransformer.fromUI(s)),
    };

    const response = await apiClient.post<{ created: number; errors: Array<{ row: number; error: string }> }>(
      '/students/bulk',
      payload,
      { school_id: schoolId }
    );

    if (response.error) {
      return { created: 0, errors: [], error: response.error };
    }

    return {
      created: response.data?.created || 0,
      errors: response.data?.errors || [],
    };
  }

  /**
   * STUDENTS - EXPORT
   */
  static async exportStudents(
    schoolId: string,
    format: 'csv' | 'json' = 'csv'
  ): Promise<{ url?: string; error?: string }> {
    try {
      const params = new URLSearchParams({
        school_id: schoolId,
        format,
      });

      // Generate download URL for browser
      const url = `/api/school/students/bulk?${params.toString()}`;
      return { url };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to export students',
      };
    }
  }

  /**
   * STAFF - READ
   */
  static async getStaff(
    schoolId: string,
    params: PaginationParams = {}
  ): Promise<{ staff: Staff[]; total: number; error?: string }> {
    const response = await apiClient.get<{ data: StaffRecord[]; total: number }>('/staff', {
      school_id: schoolId,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    });

    if (response.error) {
      return { staff: [], total: 0, error: response.error };
    }

    return {
      staff: StaffTransformer.toUIList(response.data || []),
      total: response.total || 0,
    };
  }

  /**
   * STAFF - READ ONE
   */
  static async getStaffMember(schoolId: string, staffId: string): Promise<{ staff?: Staff; error?: string }> {
    const response = await apiClient.get<StaffRecord>(`/staff/${staffId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      staff: response.data ? StaffTransformer.toUI(response.data) : undefined,
    };
  }

  /**
   * STAFF - CREATE
   */
  static async createStaff(schoolId: string, data: Partial<Staff>): Promise<{ staff?: Staff; error?: string }> {
    const payload = {
      school_id: schoolId,
      ...StaffTransformer.fromUI(data),
    };

    const response = await apiClient.post<StaffRecord>('/staff', payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      staff: response.data ? StaffTransformer.toUI(response.data) : undefined,
    };
  }

  /**
   * STAFF - UPDATE
   */
  static async updateStaff(
    schoolId: string,
    staffId: string,
    data: Partial<Staff>
  ): Promise<{ staff?: Staff; error?: string }> {
    const payload = StaffTransformer.fromUI(data);

    const response = await apiClient.put<StaffRecord>(`/staff/${staffId}`, payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      staff: response.data ? StaffTransformer.toUI(response.data) : undefined,
    };
  }

  /**
   * STAFF - DELETE
   */
  static async deleteStaff(schoolId: string, staffId: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiClient.delete<void>(`/staff/${staffId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  }

  /**
   * STAFF - BULK CREATE
   */
  static async bulkCreateStaff(
    schoolId: string,
    staffList: Partial<Staff>[]
  ): Promise<{ created: number; errors: Array<{ row: number; error: string }>; error?: string }> {
    const payload = {
      staff: staffList.map((s) => StaffTransformer.fromUI(s)),
    };

    const response = await apiClient.post<{ created: number; errors: Array<{ row: number; error: string }> }>(
      '/staff/bulk',
      payload,
      { school_id: schoolId }
    );

    if (response.error) {
      return { created: 0, errors: [], error: response.error };
    }

    return {
      created: response.data?.created || 0,
      errors: response.data?.errors || [],
    };
  }

  /**
   * STAFF - EXPORT
   */
  static async exportStaff(schoolId: string, format: 'csv' | 'json' = 'csv'): Promise<{ url?: string; error?: string }> {
    try {
      const params = new URLSearchParams({
        school_id: schoolId,
        format,
      });

      const url = `/api/school/staff/bulk?${params.toString()}`;
      return { url };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to export staff',
      };
    }
  }

  /**
   * CLASSES - READ
   */
  static async getClasses(
    schoolId: string,
    params: PaginationParams = {}
  ): Promise<{ classes: Class[]; total: number; error?: string }> {
    const response = await apiClient.get<{ data: ClassRecord[]; total: number }>('/classes', {
      school_id: schoolId,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    });

    if (response.error) {
      return { classes: [], total: 0, error: response.error };
    }

    return {
      classes: ClassTransformer.toUIList(response.data || []),
      total: response.total || 0,
    };
  }

  /**
   * CLASSES - READ ONE
   */
  static async getClass(schoolId: string, classId: string): Promise<{ class?: Class; error?: string }> {
    const response = await apiClient.get<ClassRecord>(`/classes/${classId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      class: response.data ? ClassTransformer.toUI(response.data) : undefined,
    };
  }

  /**
   * CLASSES - CREATE
   */
  static async createClass(schoolId: string, data: Partial<Class>): Promise<{ class?: Class; error?: string }> {
    const payload = {
      school_id: schoolId,
      ...ClassTransformer.fromUI(data),
    };

    const response = await apiClient.post<ClassRecord>('/classes', payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      class: response.data ? ClassTransformer.toUI(response.data) : undefined,
    };
  }

  /**
   * CLASSES - UPDATE
   */
  static async updateClass(schoolId: string, classId: string, data: Partial<Class>): Promise<{ class?: Class; error?: string }> {
    const payload = ClassTransformer.fromUI(data);

    const response = await apiClient.put<ClassRecord>(`/classes/${classId}`, payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      class: response.data ? ClassTransformer.toUI(response.data) : undefined,
    };
  }

  /**
   * CLASSES - DELETE
   */
  static async deleteClass(schoolId: string, classId: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiClient.delete<void>(`/classes/${classId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  }

  /**
   * CLASSES - BULK CREATE
   */
  static async bulkCreateClasses(
    schoolId: string,
    classList: Partial<Class>[]
  ): Promise<{ created: number; errors: Array<{ row: number; error: string }>; error?: string }> {
    const payload = {
      classes: classList.map((c) => ClassTransformer.fromUI(c)),
    };

    const response = await apiClient.post<{ created: number; errors: Array<{ row: number; error: string }> }>(
      '/classes/bulk',
      payload,
      { school_id: schoolId }
    );

    if (response.error) {
      return { created: 0, errors: [], error: response.error };
    }

    return {
      created: response.data?.created || 0,
      errors: response.data?.errors || [],
    };
  }

  /**
   * CLASSES - EXPORT
   */
  static async exportClasses(schoolId: string, format: 'csv' | 'json' = 'csv'): Promise<{ url?: string; error?: string }> {
    try {
      const params = new URLSearchParams({
        school_id: schoolId,
        format,
      });

      const url = `/api/school/classes/bulk?${params.toString()}`;
      return { url };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to export classes',
      };
    }
  }

  /**
   * ACADEMIC YEARS - CRUD
   */
  static async getAcademicYears(schoolId: string, params: PaginationParams = {}): Promise<{ years: AcademicYear[]; total: number; error?: string }> {
    const response = await apiClient.get<{ data: AcademicYearRecord[]; total: number }>('/academic-years', {
      school_id: schoolId,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    });

    if (response.error) {
      return { years: [], total: 0, error: response.error };
    }

    return {
      years: AcademicYearTransformer.toUIList(response.data || []),
      total: response.total || 0,
    };
  }

  static async createAcademicYear(schoolId: string, data: Partial<AcademicYear>): Promise<{ year?: AcademicYear; error?: string }> {
    const payload = {
      school_id: schoolId,
      ...AcademicYearTransformer.fromUI(data),
    };

    const response = await apiClient.post<AcademicYearRecord>('/academic-years', payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      year: response.data ? AcademicYearTransformer.toUI(response.data) : undefined,
    };
  }

  static async updateAcademicYear(schoolId: string, yearId: string, data: Partial<AcademicYear>): Promise<{ year?: AcademicYear; error?: string }> {
    const payload = AcademicYearTransformer.fromUI(data);

    const response = await apiClient.put<AcademicYearRecord>(`/academic-years/${yearId}`, payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      year: response.data ? AcademicYearTransformer.toUI(response.data) : undefined,
    };
  }

  static async deleteAcademicYear(schoolId: string, yearId: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiClient.delete<void>(`/academic-years/${yearId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  }

  /**
   * TERMS - CRUD
   */
  static async getTerms(schoolId: string, params: PaginationParams = {}): Promise<{ terms: Term[]; total: number; error?: string }> {
    const response = await apiClient.get<{ data: TermRecord[]; total: number }>('/terms', {
      school_id: schoolId,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    });

    if (response.error) {
      return { terms: [], total: 0, error: response.error };
    }

    return {
      terms: TermTransformer.toUIList(response.data || []),
      total: response.total || 0,
    };
  }

  static async createTerm(schoolId: string, data: Partial<Term>): Promise<{ term?: Term; error?: string }> {
    const payload = {
      school_id: schoolId,
      ...TermTransformer.fromUI(data),
    };

    const response = await apiClient.post<TermRecord>('/terms', payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      term: response.data ? TermTransformer.toUI(response.data) : undefined,
    };
  }

  static async updateTerm(schoolId: string, termId: string, data: Partial<Term>): Promise<{ term?: Term; error?: string }> {
    const payload = TermTransformer.fromUI(data);

    const response = await apiClient.put<TermRecord>(`/terms/${termId}`, payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      term: response.data ? TermTransformer.toUI(response.data) : undefined,
    };
  }

  static async deleteTerm(schoolId: string, termId: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiClient.delete<void>(`/terms/${termId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  }

  /**
   * SUBJECTS - CRUD
   */
  static async getSubjects(schoolId: string, params: PaginationParams = {}): Promise<{ subjects: Subject[]; total: number; error?: string }> {
    const response = await apiClient.get<{ data: SubjectRecord[]; total: number }>('/subjects', {
      school_id: schoolId,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    });

    if (response.error) {
      return { subjects: [], total: 0, error: response.error };
    }

    return {
      subjects: SubjectTransformer.toUIList(response.data || []),
      total: response.total || 0,
    };
  }

  static async createSubject(schoolId: string, data: Partial<Subject>): Promise<{ subject?: Subject; error?: string }> {
    const payload = {
      school_id: schoolId,
      ...SubjectTransformer.fromUI(data),
    };

    const response = await apiClient.post<SubjectRecord>('/subjects', payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      subject: response.data ? SubjectTransformer.toUI(response.data) : undefined,
    };
  }

  static async updateSubject(schoolId: string, subjectId: string, data: Partial<Subject>): Promise<{ subject?: Subject; error?: string }> {
    const payload = SubjectTransformer.fromUI(data);

    const response = await apiClient.put<SubjectRecord>(`/subjects/${subjectId}`, payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      subject: response.data ? SubjectTransformer.toUI(response.data) : undefined,
    };
  }

  static async deleteSubject(schoolId: string, subjectId: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiClient.delete<void>(`/subjects/${subjectId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  }

  /**
   * GUARDIANS - CRUD
   */
  static async getGuardians(schoolId: string, params: PaginationParams = {}): Promise<{ guardians: Guardian[]; total: number; error?: string }> {
    const response = await apiClient.get<{ data: GuardianRecord[]; total: number }>('/guardians', {
      school_id: schoolId,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    });

    if (response.error) {
      return { guardians: [], total: 0, error: response.error };
    }

    return {
      guardians: GuardianTransformer.toUIList(response.data || []),
      total: response.total || 0,
    };
  }

  static async createGuardian(schoolId: string, data: Partial<Guardian>): Promise<{ guardian?: Guardian; error?: string }> {
    const payload = {
      school_id: schoolId,
      ...GuardianTransformer.fromUI(data),
    };

    const response = await apiClient.post<GuardianRecord>('/guardians', payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      guardian: response.data ? GuardianTransformer.toUI(response.data) : undefined,
    };
  }

  static async updateGuardian(schoolId: string, guardianId: string, data: Partial<Guardian>): Promise<{ guardian?: Guardian; error?: string }> {
    const payload = GuardianTransformer.fromUI(data);

    const response = await apiClient.put<GuardianRecord>(`/guardians/${guardianId}`, payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      guardian: response.data ? GuardianTransformer.toUI(response.data) : undefined,
    };
  }

  static async deleteGuardian(schoolId: string, guardianId: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiClient.delete<void>(`/guardians/${guardianId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  }

  /**
   * DASHBOARD - Statistics and Analytics
   */
  static async getDashboardStats(schoolId: string): Promise<{
    totalStudents: number;
    totalStaff: number;
    totalClasses: number;
    averageAttendance: number;
    error?: string;
  }> {
    try {
      const [studentsResult, staffResult, classesResult, attendanceResult] = await Promise.all([
        apiClient.get<{ count: number }>('/students/stats', { school_id: schoolId }),
        apiClient.get<{ count: number }>('/staff/stats', { school_id: schoolId }),
        apiClient.get<{ count: number }>('/classes/stats', { school_id: schoolId }),
        apiClient.get<{ average: number }>('/attendance/average', { school_id: schoolId }),
      ]);

      return {
        totalStudents: studentsResult.data?.count || 0,
        totalStaff: staffResult.data?.count || 0,
        totalClasses: classesResult.data?.count || 0,
        averageAttendance: attendanceResult.data?.average || 0,
      };
    } catch (err) {
      return {
        totalStudents: 0,
        totalStaff: 0,
        totalClasses: 0,
        averageAttendance: 0,
        error: err instanceof Error ? err.message : 'Failed to fetch dashboard stats',
      };
    }
  }

  static async getEnrollmentTrend(
    schoolId: string,
    months: number = 6
  ): Promise<{ data?: { month: string; value: number }[]; error?: string }> {
    try {
      const response = await apiClient.get<{ data: { month: string; value: number }[] }>(
        `/analytics/enrollment-trend`,
        {
          school_id: schoolId,
          months: months.toString(),
        }
      );

      if (response.error) {
        return { error: response.error };
      }

      return { data: response.data || [] };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to fetch enrollment trend',
      };
    }
  }

  static async getAttendanceByClass(schoolId: string): Promise<{
    data?: { className: string; rate: number }[];
    error?: string;
  }> {
    try {
      const response = await apiClient.get<{ data: { className: string; rate: number }[] }>(
        `/analytics/attendance-by-class`,
        {
          school_id: schoolId,
        }
      );

      if (response.error) {
        return { error: response.error };
      }

      return { data: response.data || [] };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to fetch attendance by class',
      };
    }
  }

  /**
   * ATTENDANCE - CRUD
   */
  static async getAttendance(schoolId: string, params: PaginationParams = {}): Promise<{ attendance: Attendance[]; total: number; error?: string }> {
    const response = await apiClient.get<{ data: AttendanceRecord[]; total: number }>('/attendance', {
      school_id: schoolId,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    });

    if (response.error) {
      return { attendance: [], total: 0, error: response.error };
    }

    return {
      attendance: AttendanceTransformer.toUIList(response.data || []),
      total: response.total || 0,
    };
  }

  static async createAttendance(schoolId: string, data: Partial<Attendance>): Promise<{ attendance?: Attendance; error?: string }> {
    const payload = {
      school_id: schoolId,
      ...AttendanceTransformer.fromUI(data),
    };

    const response = await apiClient.post<AttendanceRecord>('/attendance', payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      attendance: response.data ? AttendanceTransformer.toUI(response.data) : undefined,
    };
  }

  static async updateAttendance(schoolId: string, attendanceId: string, data: Partial<Attendance>): Promise<{ attendance?: Attendance; error?: string }> {
    const payload = AttendanceTransformer.fromUI(data);

    const response = await apiClient.put<AttendanceRecord>(`/attendance/${attendanceId}`, payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      attendance: response.data ? AttendanceTransformer.toUI(response.data) : undefined,
    };
  }

  static async deleteAttendance(schoolId: string, attendanceId: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiClient.delete<void>(`/attendance/${attendanceId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  }

  static async bulkAttendance(schoolId: string, records: Array<{ studentId: string; date: string; status: string }>): Promise<{ count?: number; error?: string }> {
    try {
      const response = await fetch('/api/school/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          school_id: schoolId,
          records,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return { error: data.error || 'Failed to bulk insert attendance' };
      }

      const data = await response.json();
      return { count: data.count };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Failed to bulk insert attendance',
      };
    }
  }

  /**
   * GRADES - CRUD
   */
  static async getGrades(schoolId: string, params: PaginationParams = {}): Promise<{ grades: Grade[]; total: number; error?: string }> {
    const response = await apiClient.get<{ data: GradeRecord[]; total: number }>('/grades', {
      school_id: schoolId,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    });

    if (response.error) {
      return { grades: [], total: 0, error: response.error };
    }

    return {
      grades: GradeTransformer.toUIList(response.data || []),
      total: response.total || 0,
    };
  }

  static async createGrade(schoolId: string, data: Partial<Grade>): Promise<{ grade?: Grade; error?: string }> {
    const payload = {
      school_id: schoolId,
      ...GradeTransformer.fromUI(data),
    };

    const response = await apiClient.post<GradeRecord>('/grades', payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      grade: response.data ? GradeTransformer.toUI(response.data) : undefined,
    };
  }

  static async updateGrade(schoolId: string, gradeId: string, data: Partial<Grade>): Promise<{ grade?: Grade; error?: string }> {
    const payload = GradeTransformer.fromUI(data);

    const response = await apiClient.put<GradeRecord>(`/grades/${gradeId}`, payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      grade: response.data ? GradeTransformer.toUI(response.data) : undefined,
    };
  }

  static async deleteGrade(schoolId: string, gradeId: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiClient.delete<void>(`/grades/${gradeId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  }

  /**
   * TEACHER ASSIGNMENTS - CRUD
   */
  static async getTeacherAssignments(schoolId: string, params: PaginationParams = {}): Promise<{ assignments: TeacherAssignment[]; total: number; error?: string }> {
    const response = await apiClient.get<{ data: TeacherAssignmentRecord[]; total: number }>('/teacher-assignments', {
      school_id: schoolId,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    });

    if (response.error) {
      return { assignments: [], total: 0, error: response.error };
    }

    return {
      assignments: TeacherAssignmentTransformer.toUIList(response.data || []),
      total: response.total || 0,
    };
  }

  static async createTeacherAssignment(schoolId: string, data: Partial<TeacherAssignment>): Promise<{ assignment?: TeacherAssignment; error?: string }> {
    const payload = {
      school_id: schoolId,
      ...TeacherAssignmentTransformer.fromUI(data),
    };

    const response = await apiClient.post<TeacherAssignmentRecord>('/teacher-assignments', payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      assignment: response.data ? TeacherAssignmentTransformer.toUI(response.data) : undefined,
    };
  }

  static async updateTeacherAssignment(schoolId: string, assignmentId: string, data: Partial<TeacherAssignment>): Promise<{ assignment?: TeacherAssignment; error?: string }> {
    const payload = TeacherAssignmentTransformer.fromUI(data);

    const response = await apiClient.put<TeacherAssignmentRecord>(`/teacher-assignments/${assignmentId}`, payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      assignment: response.data ? TeacherAssignmentTransformer.toUI(response.data) : undefined,
    };
  }

  static async deleteTeacherAssignment(schoolId: string, assignmentId: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiClient.delete<void>(`/teacher-assignments/${assignmentId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  }

  /**
   * NOTIFICATIONS - CRUD
   */
  static async getNotifications(schoolId: string, params: PaginationParams = {}): Promise<{ notifications: Notification[]; total: number; error?: string }> {
    const response = await apiClient.get<{ data: NotificationRecord[]; total: number }>('/notifications', {
      school_id: schoolId,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    });

    if (response.error) {
      return { notifications: [], total: 0, error: response.error };
    }

    return {
      notifications: NotificationTransformer.toUIList(response.data || []),
      total: response.total || 0,
    };
  }

  static async createNotification(schoolId: string, data: Partial<Notification>): Promise<{ notification?: Notification; error?: string }> {
    const payload = {
      school_id: schoolId,
      ...NotificationTransformer.fromUI(data),
    };

    const response = await apiClient.post<NotificationRecord>('/notifications', payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      notification: response.data ? NotificationTransformer.toUI(response.data) : undefined,
    };
  }

  static async updateNotification(schoolId: string, notificationId: string, data: Partial<Notification>): Promise<{ notification?: Notification; error?: string }> {
    const payload = NotificationTransformer.fromUI(data);

    const response = await apiClient.put<NotificationRecord>(`/notifications/${notificationId}`, payload, {
      school_id: schoolId,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      notification: response.data ? NotificationTransformer.toUI(response.data) : undefined,
    };
  }

  static async deleteNotification(schoolId: string, notificationId: string): Promise<{ success: boolean; error?: string }> {
    const response = await apiClient.delete<void>(`/notifications/${notificationId}`, {
      school_id: schoolId,
    });

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  }

  static async sendNotification(schoolId: string, data: {
    recipientId: string;
    type: 'success' | 'warning' | 'info' | 'error';
    title: string;
    message: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/school/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          school_id: schoolId,
          recipient_id: data.recipientId,
          type: data.type,
          title: data.title,
          message: data.message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to send notification' };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send notification',
      };
    }
  }

  /**
   * STREAMS - GET ALL (Phase 3)
   * Fetch all class streams for a school
   * Used during student admission to select stream enrollment
   */
  static async getStreams(
    schoolId: string,
    activeOnly: boolean = true
  ): Promise<{ streams: any[]; error?: string }> {
    try {
      const response = await fetch(
        `/api/school/streams?activeOnly=${activeOnly}`,
        {
          credentials: 'include',
          headers: {
            'X-School-Id': schoolId,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return { streams: [], error: error.error || 'Failed to fetch streams' };
      }

      const { data } = await response.json();
      return { streams: data || [] };
    } catch (err) {
      console.error('[v0] SchoolService.getStreams error:', err);
      return {
        streams: [],
        error: err instanceof Error ? err.message : 'Failed to fetch streams',
      };
    }
  }
}
