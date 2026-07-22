export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'late';
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'late';
  remarks?: string;
}

export class AttendanceTransformer {
  static toUI(record: AttendanceRecord): Attendance {
    return {
      id: record.id,
      studentId: record.student_id,
      classId: record.class_id,
      date: record.date,
      status: record.status,
      remarks: record.remarks,
    };
  }

  static toUIList(records: AttendanceRecord[]): Attendance[] {
    return records.map((r) => this.toUI(r));
  }

  static fromUI(data: Partial<Attendance>): Partial<AttendanceRecord> {
    return {
      ...(data.id && { id: data.id }),
      ...(data.studentId && { student_id: data.studentId }),
      ...(data.classId && { class_id: data.classId }),
      ...(data.date && { date: data.date }),
      ...(data.status && { status: data.status }),
      ...(data.remarks && { remarks: data.remarks }),
    };
  }

  static getStatusColor(status: string): string {
    switch (status) {
      case 'present':
        return 'bg-green-500/20 text-green-600';
      case 'absent':
        return 'bg-red-500/20 text-red-600';
      case 'leave':
        return 'bg-yellow-500/20 text-yellow-600';
      case 'late':
        return 'bg-orange-500/20 text-orange-600';
      default:
        return 'bg-gray-500/20 text-gray-600';
    }
  }

  static getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
