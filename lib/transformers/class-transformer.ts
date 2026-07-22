/**
 * Class Transformer
 * Converts database records (snake_case) to UI model (camelCase)
 */

export interface ClassRecord {
  id: string;
  school_id: string;
  class_name: string;
  grade_level: string;
  section: string;
  class_teacher_id?: string;
  capacity?: number;
  academic_year_id?: string;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  schoolId: string;
  className: string;
  gradeLevel: string;
  section: string;
  classTeacherId?: string;
  capacity?: number;
  academicYearId?: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export class ClassTransformer {
  /**
   * Transform single record
   */
  static toUI(record: ClassRecord): Class {
    return {
      id: record.id,
      schoolId: record.school_id,
      className: record.class_name || '',
      gradeLevel: record.grade_level || '',
      section: record.section || '',
      classTeacherId: record.class_teacher_id,
      capacity: record.capacity,
      academicYearId: record.academic_year_id,
      status: record.status,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Transform multiple records
   */
  static toUIList(records: ClassRecord[]): Class[] {
    return records.map((record) => this.toUI(record));
  }

  /**
   * Transform UI model to database record for submission
   */
  static fromUI(cls: Partial<Class>): Partial<ClassRecord> {
    return {
      class_name: cls.className,
      grade_level: cls.gradeLevel,
      section: cls.section,
      class_teacher_id: cls.classTeacherId,
      capacity: cls.capacity,
      academic_year_id: cls.academicYearId,
      status: cls.status,
    };
  }

  /**
   * Get display name (e.g., "10-A" or "Grade 10 Section A")
   */
  static displayName(cls: Class): string {
    if (cls.className) {
      return cls.className;
    }
    const parts = [];
    if (cls.gradeLevel) parts.push(`Grade ${cls.gradeLevel}`);
    if (cls.section) parts.push(`Section ${cls.section}`);
    return parts.join(' ') || 'Unnamed Class';
  }

  /**
   * Get short identifier
   */
  static shortId(cls: Class): string {
    if (cls.gradeLevel && cls.section) {
      return `${cls.gradeLevel}-${cls.section}`;
    }
    return cls.id.substring(0, 8);
  }

  /**
   * Get capacity info
   */
  static capacityInfo(cls: Class, enrolled?: number): string {
    if (!cls.capacity) return 'No limit';
    if (!enrolled) return `${cls.capacity} seats`;
    return `${enrolled}/${cls.capacity}`;
  }
}
