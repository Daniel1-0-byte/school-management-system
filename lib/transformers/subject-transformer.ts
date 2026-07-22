import type { Subject } from '@/types';

export type SubjectRecord = {
  id: string;
  school_id: string;
  subject_code: string;
  subject_name: string;
  description: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
};

export type { Subject };

export class SubjectTransformer {
  static toUI(record: SubjectRecord): Subject {
    return {
      id: record.id,
      subjectCode: record.subject_code,
      subjectName: record.subject_name,
      description: record.description,
      status: record.status,
      schoolId: record.school_id,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  static toUIList(records: SubjectRecord[]): Subject[] {
    return records.map(this.toUI);
  }

  static fromUI(data: Partial<Subject>): Partial<SubjectRecord> {
    return {
      subject_code: data.subjectCode,
      subject_name: data.subjectName,
      description: data.description,
      status: data.status,
    };
  }

  static displayName(subject: Subject): string {
    return subject.subjectName || subject.subjectCode || 'N/A';
  }
}
