export interface GradeRecord {
  id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  academic_year_id: string;
  term_id: string;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade: string;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  classId: string;
  academicYearId: string;
  termId: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
}

export class GradeTransformer {
  static toUI(record: GradeRecord): Grade {
    return {
      id: record.id,
      studentId: record.student_id,
      subjectId: record.subject_id,
      classId: record.class_id,
      academicYearId: record.academic_year_id,
      termId: record.term_id,
      marksObtained: record.marks_obtained,
      totalMarks: record.total_marks,
      percentage: record.percentage,
      grade: record.grade,
    };
  }

  static toUIList(records: GradeRecord[]): Grade[] {
    return records.map((r) => this.toUI(r));
  }

  static fromUI(data: Partial<Grade>): Partial<GradeRecord> {
    return {
      ...(data.id && { id: data.id }),
      ...(data.studentId && { student_id: data.studentId }),
      ...(data.subjectId && { subject_id: data.subjectId }),
      ...(data.classId && { class_id: data.classId }),
      ...(data.academicYearId && { academic_year_id: data.academicYearId }),
      ...(data.termId && { term_id: data.termId }),
      ...(data.marksObtained !== undefined && { marks_obtained: data.marksObtained }),
      ...(data.totalMarks && { total_marks: data.totalMarks }),
      ...(data.percentage !== undefined && { percentage: data.percentage }),
      ...(data.grade && { grade: data.grade }),
    };
  }

  static getGradeColor(grade: string): string {
    const gradeMap: { [key: string]: string } = {
      A: 'bg-green-500/20 text-green-600',
      B: 'bg-blue-500/20 text-blue-600',
      C: 'bg-yellow-500/20 text-yellow-600',
      D: 'bg-orange-500/20 text-orange-600',
      F: 'bg-red-500/20 text-red-600',
    };
    return gradeMap[grade] || 'bg-gray-500/20 text-gray-600';
  }
}
