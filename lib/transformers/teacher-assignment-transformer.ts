export interface TeacherAssignmentRecord {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  academic_year_id: string;
  is_class_teacher: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  academicYearId: string;
  isClassTeacher: boolean;
}

export class TeacherAssignmentTransformer {
  static toUI(record: TeacherAssignmentRecord): TeacherAssignment {
    return {
      id: record.id,
      teacherId: record.teacher_id,
      subjectId: record.subject_id,
      classId: record.class_id,
      academicYearId: record.academic_year_id,
      isClassTeacher: record.is_class_teacher,
    };
  }

  static toUIList(records: TeacherAssignmentRecord[]): TeacherAssignment[] {
    return records.map((r) => this.toUI(r));
  }

  static fromUI(data: Partial<TeacherAssignment>): Partial<TeacherAssignmentRecord> {
    return {
      ...(data.id && { id: data.id }),
      ...(data.teacherId && { teacher_id: data.teacherId }),
      ...(data.subjectId && { subject_id: data.subjectId }),
      ...(data.classId && { class_id: data.classId }),
      ...(data.academicYearId && { academic_year_id: data.academicYearId }),
      ...(data.isClassTeacher !== undefined && { is_class_teacher: data.isClassTeacher }),
    };
  }

  static displayName(assignment: TeacherAssignment): string {
    return `${assignment.teacherId} - ${assignment.subjectId}`;
  }
}
