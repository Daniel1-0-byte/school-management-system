/**
 * Staff Transformer
 * Converts database records (snake_case) to UI model (camelCase)
 */

export interface StaffRecord {
  id: string;
  school_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: 'teacher' | 'admin' | 'staff';
  department?: string;
  qualification?: string;
  experience_years?: number;
  date_of_joining?: string;
  status: 'active' | 'inactive' | 'on_leave';
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  schoolId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'teacher' | 'admin' | 'staff';
  department?: string;
  qualification?: string;
  experienceYears?: number;
  dateOfJoining?: string;
  status: 'active' | 'inactive' | 'on_leave';
  createdAt: string;
  updatedAt: string;
}

export class StaffTransformer {
  /**
   * Transform single record
   */
  static toUI(record: StaffRecord): Staff {
    return {
      id: record.id,
      schoolId: record.school_id,
      userId: record.user_id,
      firstName: record.first_name || '',
      lastName: record.last_name || '',
      email: record.email || '',
      phone: record.phone,
      role: record.role,
      department: record.department,
      qualification: record.qualification,
      experienceYears: record.experience_years,
      dateOfJoining: record.date_of_joining,
      status: record.status,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Transform multiple records
   */
  static toUIList(records: StaffRecord[]): Staff[] {
    return records.map((record) => this.toUI(record));
  }

  /**
   * Transform UI model to database record for submission
   */
  static fromUI(staff: Partial<Staff>): Partial<StaffRecord> {
    return {
      first_name: staff.firstName,
      last_name: staff.lastName,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      department: staff.department,
      qualification: staff.qualification,
      experience_years: staff.experienceYears,
      date_of_joining: staff.dateOfJoining,
      status: staff.status,
    };
  }

  /**
   * Get display name
   */
  static displayName(staff: Staff): string {
    return `${staff.firstName} ${staff.lastName}`.trim() || 'Unknown Staff';
  }

  /**
   * Get initials for avatar
   */
  static initials(staff: Staff): string {
    const names = `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
    if (!names) return '?';
    return names
      .split(' ')
      .map((n) => n.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  /**
   * Get role display label
   */
  static roleLabel(role: string): string {
    const labels: Record<string, string> = {
      teacher: 'Teacher',
      admin: 'Admin',
      staff: 'Staff',
    };
    return labels[role] || role;
  }
}
