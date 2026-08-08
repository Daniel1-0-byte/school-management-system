'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, FileText, Edit2, Printer, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BulkGenerateDialog } from './bulk-generate-dialog';

interface Student {
  student_id: string;
  name: string;
  admission_number: string;
  status: 'completed' | 'pending';
  report_card: any | null;
}

interface ReportCardsResponse {
  students: Student[];
  classSize: number;
  streamName: string;
  termStartDate: string;
  termEndDate: string;
}

interface ReportCardsTabProps {
  academicYearId: string;
  termId: string;
  streamId: string;
}

export function ReportCardsTab({
  academicYearId,
  termId,
  streamId,
}: ReportCardsTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportCardsResponse | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [streamName, setStreamName] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/school/reports/report-cards?academic_year_id=${academicYearId}&term_id=${termId}&stream_id=${streamId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch report cards data');
        }

        const result = await response.json();
        setData(result);
        setStreamName(result.streamName || '');
      } catch (err) {
        console.error('[v0] Report cards fetch error:', err);
        setError('Failed to load report cards. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [academicYearId, termId, streamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading report cards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 flex gap-4">
        <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold text-destructive mb-2">Unable to Load Report Cards</h3>
          <p className="text-sm text-destructive/80">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.students.length === 0) {
    return (
      <div className="bg-muted border border-border rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground mb-4">No students enrolled in this class for the selected term.</p>
      </div>
    );
  }

  if (selectedStudent) {
    const student = data.students.find(s => s.student_id === selectedStudent);
    if (!student) {
      return <div>Student not found</div>;
    }

    return (
      <ReportCardEditor
        student={student}
        classSize={data.classSize}
        streamName={data.streamName}
        termStartDate={data.termStartDate}
        termEndDate={data.termEndDate}
        academicYearId={academicYearId}
        termId={termId}
        streamId={streamId}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  const completedCount = data.students.filter(s => s.status === 'completed').length;
  const pendingCount = data.students.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Total Students</p>
          <p className="text-3xl font-bold text-foreground">{data.students.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Completed</p>
          <p className="text-3xl font-bold text-green-600">{completedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Pending</p>
          <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
        </div>
      </div>

      {/* Bulk Generation Button */}
      {completedCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowBulkDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            Generate All Report Cards
          </button>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Report Cards</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Student</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Admission No</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Average</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Grade</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Position</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((student) => (
                <tr key={student.student_id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{student.name}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{student.admission_number}</td>
                  <td className="px-4 py-3 text-center text-foreground">
                    {student.report_card?.average_score ? student.report_card.average_score.toFixed(2) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground">
                    {student.report_card?.letter_grade || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground">
                    {student.report_card?.ranking || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        student.status === 'completed'
                          ? 'bg-green-500/20 text-green-600'
                          : 'bg-amber-500/20 text-amber-600'
                      }`}
                    >
                      {student.status === 'completed' ? 'Completed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-2">
                      {student.status === 'completed' && (
                        <a
                          href={
                            student.report_card?.preview_url ||
                            `/reports/preview?student_id=${encodeURIComponent(student.student_id)}&term_id=${encodeURIComponent(termId)}&academic_year_id=${encodeURIComponent(academicYearId)}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
                        >
                          <Printer className="w-4 h-4" />
                          View / Print
                        </a>
                      )}
                      <button
                        onClick={() => setSelectedStudent(student.student_id)}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                      >
                        <Edit2 className="w-4 h-4" />
                        {student.status === 'completed' ? 'Edit' : 'Create'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Generate Dialog */}
      <BulkGenerateDialog
        isOpen={showBulkDialog}
        streamId={streamId}
        streamName={streamName}
        termId={termId}
        termName={data?.termStartDate ? 'Term' : 'Unknown'}
        academicYearId={academicYearId}
        academicYearName={academicYearId}
        onClose={() => setShowBulkDialog(false)}
        onGenerated={() => {
          setShowBulkDialog(false);
        }}
      />
    </div>
  );
}

// Report Card Editor Component
interface ReportCardEditorProps {
  student: Student;
  classSize: number;
  streamName: string;
  termStartDate: string;
  termEndDate: string;
  academicYearId: string;
  termId: string;
  streamId: string;
  onBack: () => void;
}

interface StudentDetailData {
  attendance: {
    workingDays: number;
    presentDays: number;
    absentDays: number;
  };
  subjectGrades: Array<{
    subject_id: string;
    subject_name: string;
    class_score: number;
    exam_score: number;
    total_score: number;
    remarks: string;
  }>;
  overallAverage: number;
}

function ReportCardEditor({
  student,
  classSize,
  streamName,
  termStartDate,
  termEndDate,
  academicYearId,
  termId,
  streamId,
  onBack,
}: ReportCardEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetailData | null>(null);

  // Form state
  const [totalMarks, setTotalMarks] = useState(student.report_card?.total_score || 0);
  const [averageScore, setAverageScore] = useState(student.report_card?.average_score || 0);
  const [letterGrade, setLetterGrade] = useState(student.report_card?.letter_grade || '');
  const [ranking, setRanking] = useState(student.report_card?.ranking || '');
  const [teacherComment, setTeacherComment] = useState(student.report_card?.teacher_comment || '');
  const [principalSignature, setPrincipalSignature] = useState(student.report_card?.principal_signature || false);
  const [subjectRemarks, setSubjectRemarks] = useState<Record<string, string>>({});

  // Fetch student detail data on mount
  useEffect(() => {
    const fetchStudentDetail = async () => {
      try {
        const response = await fetch(
          `/api/school/reports/report-cards/student-detail?student_id=${student.student_id}&term_id=${termId}&academic_year_id=${academicYearId}&stream_id=${streamId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch student details');
        }

        const data: StudentDetailData = await response.json();
        setStudentDetail(data);

        // Auto-populate average from grades if not already set
        if (!student.report_card?.average_score && data.overallAverage) {
          setAverageScore(parseFloat(data.overallAverage as any));
        }

        // Auto-populate total from grades
        const subjectTotal = data.subjectGrades.reduce((sum, s) => sum + s.total_score, 0);
        if (!student.report_card?.total_score && subjectTotal > 0) {
          setTotalMarks(subjectTotal);
        }
      } catch (err) {
        console.error('[v0] Fetch student detail error:', err);
        setError('Failed to load student performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDetail();
  }, [student.student_id, termId, academicYearId, streamId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/school/reports/report-cards/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.student_id,
          academicYearId,
          termId,
          totalScore: totalMarks,
          averageScore,
          letterGrade,
          ranking: ranking ? parseInt(ranking) : null,
          teacherComment,
          principalSignature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save report card');
      }

      setSuccessMessage('Report card saved successfully');
      setTimeout(() => onBack(), 2000);
    } catch (err) {
      console.error('[v0] Save report card error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save report card');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading student report card...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="px-4 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors text-sm font-medium"
      >
        ← Back to Report Cards
      </button>

      {/* Student Header */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Report Card</h2>
            <p className="text-sm text-muted-foreground">
              {new Date(termStartDate).toLocaleDateString()} - {new Date(termEndDate).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            {printing ? 'Printing...' : 'Print'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Student Name</p>
            <p className="text-lg font-semibold text-foreground">{student.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Admission Number</p>
            <p className="text-lg font-semibold text-foreground">{student.admission_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Class / Stream</p>
            <p className="text-lg font-semibold text-foreground">{streamName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Class Size</p>
            <p className="text-lg font-semibold text-foreground">{classSize}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      {/* Attendance Section */}
      {studentDetail && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Attendance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">Total School Days</p>
              <p className="text-2xl font-bold text-foreground">{studentDetail.attendance.workingDays}</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4">
              <p className="text-sm text-green-600 mb-2">Days Present</p>
              <p className="text-2xl font-bold text-green-600">{studentDetail.attendance.presentDays}</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4">
              <p className="text-sm text-red-600 mb-2">Days Absent</p>
              <p className="text-2xl font-bold text-red-600">{studentDetail.attendance.absentDays}</p>
            </div>
          </div>
        </div>
      )}

      {/* Academic Performance Section */}
      {studentDetail && studentDetail.subjectGrades.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Academic Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Subject</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">Class Score</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">Exam Score</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">Total</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {studentDetail.subjectGrades.map((subject) => (
                  <tr key={subject.subject_id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{subject.subject_name}</td>
                    <td className="px-4 py-3 text-center text-foreground">{subject.class_score.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center text-foreground">{subject.exam_score.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground">{subject.total_score.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={subjectRemarks[subject.subject_id] || ''}
                        onChange={(e) => setSubjectRemarks(prev => ({ ...prev, [subject.subject_id]: e.target.value }))}
                        className="w-full px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:border-primary"
                      >
                        <option value="">Select</option>
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Needs Improvement">Needs Improvement</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <label className="block text-sm font-semibold text-foreground mb-2">Total Marks</label>
          <input
            type="number"
            value={totalMarks}
            onChange={(e) => setTotalMarks(Number(e.target.value))}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            placeholder="Enter total marks"
          />
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <label className="block text-sm font-semibold text-foreground mb-2">Average Score</label>
          <input
            type="number"
            step="0.01"
            value={averageScore}
            onChange={(e) => setAverageScore(Number(e.target.value))}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            placeholder="Enter average score"
          />
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <label className="block text-sm font-semibold text-foreground mb-2">Letter Grade</label>
          <select
            value={letterGrade}
            onChange={(e) => setLetterGrade(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">Select Grade</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
            <option value="F">F</option>
          </select>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <label className="block text-sm font-semibold text-foreground mb-2">Class Position</label>
          <input
            type="number"
            min="1"
            value={ranking}
            onChange={(e) => setRanking(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            placeholder="Enter position (1-50)"
          />
        </div>
      </div>

      {/* Teacher Comment */}
      <div className="bg-card border border-border rounded-lg p-6">
        <label className="block text-sm font-semibold text-foreground mb-2">Teacher&apos;s Remark</label>
        <textarea
          value={teacherComment}
          onChange={(e) => setTeacherComment(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          placeholder="Enter teacher's remarks about student performance..."
        />
      </div>

      {/* Principal Signature */}
      <div className="bg-card border border-border rounded-lg p-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={principalSignature}
            onChange={(e) => setPrincipalSignature(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <span className="text-sm font-semibold text-foreground">Principal Signature / Sign-off</span>
        </label>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 no-print">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Save Report Card
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        @media print {
          .no-print {
            display: none;
          }

          body {
            background: white;
            color: black;
          }

          .bg-card {
            background: white;
            border: 1px solid #ccc;
            page-break-inside: avoid;
          }

          .text-foreground {
            color: black;
          }

          .text-muted-foreground {
            color: #666;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: avoid;
          }

          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }

          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }

          select {
            border: none;
            background: transparent;
            padding: 0;
          }

          h2, h3 {
            page-break-after: avoid;
          }

          .space-y-6 > * + * {
            margin-top: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
