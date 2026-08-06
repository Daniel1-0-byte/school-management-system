import React from 'react';

export interface ReportCardData {
  // School Info
  schoolName: string;
  schoolLogo: string | null;
  schoolAddress: string | null;
  schoolPhone: string | null;
  schoolEmail: string | null;
  schoolWebsite: string | null;

  // Student Info
  studentName: string;
  studentId: string;
  className: string;
  streamName: string;
  academicYear: string;
  termName: string;

  // Academic Performance
  subjects: Array<{
    name: string;
    score: number;
    maxScore?: number;
    grade: string;
  }>;
  totalScore: number;
  averageScore: number;
  letterGrade: string;
  ranking: number | null;
  classSize: number | null;

  // Attendance
  attendance?: {
    present: number;
    absent: number;
    total: number;
  };

  // Comments
  teacherComment: string | null;

  // Staff
  classTeacherName: string | null;
  headteacherName: string;
  headteacherSignature: string | null;

  // Generated Date
  generatedDate: string;
}

interface ProfessionalReportCardProps {
  data: ReportCardData;
  isPrinting?: boolean;
}

export function ProfessionalReportCard({ data, isPrinting = false }: ProfessionalReportCardProps) {
  const attendancePercentage = data.attendance
    ? ((data.attendance.present / data.attendance.total) * 100).toFixed(1)
    : null;

  return (
    <div
      className={`${isPrinting ? 'print:bg-white' : 'bg-white'} w-full max-w-4xl mx-auto`}
      style={{
        fontFamily: 'Arial, sans-serif',
        pageBreakAfter: 'always',
        padding: isPrinting ? '40px' : '0',
      }}
    >
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .report-card-container {
            max-width: 100%;
            margin: 0;
            padding: 20px;
          }
        }
      `}</style>

      <div className="report-card-container space-y-6" style={{ minHeight: '297mm', width: '210mm' }}>
        {/* Header Section */}
        <div className="border-b-2 border-gray-300 pb-6">
          <div className="flex items-start gap-6 mb-4">
            {/* Logo */}
            {data.schoolLogo && (
              <div className="flex-shrink-0">
                <img
                  src={data.schoolLogo}
                  alt="School Logo"
                  style={{
                    maxWidth: '80px',
                    maxHeight: '80px',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}

            {/* School Info */}
            <div className="flex-1 text-center">
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#000' }}>
                {data.schoolName}
              </h1>
              {data.schoolAddress && (
                <p style={{ fontSize: '12px', margin: '2px 0', color: '#333' }}>{data.schoolAddress}</p>
              )}
              <div style={{ fontSize: '11px', margin: '2px 0', color: '#333' }}>
                {data.schoolPhone && <span>{data.schoolPhone}</span>}
                {data.schoolPhone && data.schoolEmail && <span> | </span>}
                {data.schoolEmail && <span>{data.schoolEmail}</span>}
              </div>
              {data.schoolWebsite && (
                <p style={{ fontSize: '11px', margin: '2px 0', color: '#333' }}>{data.schoolWebsite}</p>
              )}
            </div>
          </div>

          {/* Report Title */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0', color: '#000' }}>
              STUDENT REPORT CARD
            </h2>
            <p style={{ fontSize: '12px', margin: '4px 0 0 0', color: '#666' }}>
              Academic Year: {data.academicYear} | Term: {data.termName}
            </p>
          </div>
        </div>

        {/* Student Information Section */}
        <div>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#000' }}>
            STUDENT INFORMATION
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              padding: '12px',
              backgroundColor: '#f9f9f9',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          >
            <div>
              <p style={{ fontSize: '10px', color: '#666', margin: '0 0 2px 0' }}>Student Name</p>
              <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                {data.studentName}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: '#666', margin: '0 0 2px 0' }}>Student ID / Admission Number</p>
              <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                {data.studentId}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: '#666', margin: '0 0 2px 0' }}>Class</p>
              <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                {data.className}
                {data.streamName && ` - ${data.streamName}`}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: '#666', margin: '0 0 2px 0' }}>Generated Date</p>
              <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                {data.generatedDate}
              </p>
            </div>
          </div>
        </div>

        {/* Attendance Section */}
        {data.attendance && (
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#000' }}>
              ATTENDANCE
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                padding: '12px',
                backgroundColor: '#f0f8ff',
                border: '1px solid #b0d4ff',
                borderRadius: '4px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#666', margin: '0 0 4px 0' }}>Present</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                  {data.attendance.present}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#666', margin: '0 0 4px 0' }}>Absent</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                  {data.attendance.absent}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#666', margin: '0 0 4px 0' }}>Total Days</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                  {data.attendance.total}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#666', margin: '0 0 4px 0' }}>Percentage</p>
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    margin: '0',
                    color: parseFloat(attendancePercentage || '0') >= 75 ? '#008000' : '#dd0000',
                  }}
                >
                  {attendancePercentage}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Academic Performance Section */}
        <div>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#000' }}>
            ACADEMIC PERFORMANCE
          </h3>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #ddd',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#e8e8e8' }}>
                <th
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    border: '1px solid #ddd',
                    color: '#000',
                  }}
                >
                  Subject
                </th>
                <th
                  style={{
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    border: '1px solid #ddd',
                    color: '#000',
                  }}
                >
                  Score
                </th>
                <th
                  style={{
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    border: '1px solid #ddd',
                    color: '#000',
                  }}
                >
                  Grade
                </th>
              </tr>
            </thead>
            <tbody>
              {data.subjects.map((subject, index) => (
                <tr key={subject.name} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                  <td
                    style={{
                      padding: '8px',
                      fontSize: '11px',
                      border: '1px solid #ddd',
                      color: '#000',
                    }}
                  >
                    {subject.name}
                  </td>
                  <td
                    style={{
                      padding: '8px',
                      textAlign: 'center',
                      fontSize: '11px',
                      border: '1px solid #ddd',
                      color: '#000',
                      fontWeight: '500',
                    }}
                  >
                    {subject.score}
                    {subject.maxScore && `/${subject.maxScore}`}
                  </td>
                  <td
                    style={{
                      padding: '8px',
                      textAlign: 'center',
                      fontSize: '11px',
                      border: '1px solid #ddd',
                      fontWeight: 'bold',
                      color: '#000',
                    }}
                  >
                    {subject.grade}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr' + (data.ranking ? ' 1fr' : '') + (data.classSize ? ' 1fr' : ''),
              gap: '12px',
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
            }}
          >
            <div>
              <p style={{ fontSize: '10px', color: '#666', margin: '0 0 2px 0' }}>Total Score</p>
              <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                {data.totalScore}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: '#666', margin: '0 0 2px 0' }}>Average Score</p>
              <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                {data.averageScore.toFixed(2)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: '#666', margin: '0 0 2px 0' }}>Overall Grade</p>
              <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                {data.letterGrade}
              </p>
            </div>
            {data.ranking && (
              <div>
                <p style={{ fontSize: '10px', color: '#666', margin: '0 0 2px 0' }}>Class Ranking</p>
                <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                  {data.ranking}
                  {data.classSize && ` / ${data.classSize}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Teacher Comment */}
        {data.teacherComment && (
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#000' }}>
              TEACHER&apos;S COMMENT
            </h3>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                minHeight: '40px',
              }}
            >
              <p style={{ fontSize: '11px', margin: '0', color: '#333', lineHeight: '1.4' }}>
                {data.teacherComment}
              </p>
            </div>
          </div>
        )}

        {/* Footer Section */}
        <div style={{ marginTop: '24px', borderTop: '2px solid #ddd', paddingTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Class Teacher */}
            <div>
              <p style={{ fontSize: '10px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#000' }}>
                CLASS TEACHER
              </p>
              <p style={{ fontSize: '12px', margin: '0 0 30px 0', color: '#000' }}>
                {data.classTeacherName || 'Not Assigned'}
              </p>
              <div style={{ borderTop: '1px solid #000', height: '0' }} />
            </div>

            {/* Headteacher */}
            <div>
              <p style={{ fontSize: '10px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#000' }}>
                HEADTEACHER
              </p>

              {/* Signature Image */}
              {data.headteacherSignature && (
                <div style={{ marginBottom: '12px', minHeight: '30px' }}>
                  <img
                    src={data.headteacherSignature}
                    alt="Headteacher Signature"
                    style={{
                      maxHeight: '30px',
                      maxWidth: '120px',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              )}

              <p style={{ fontSize: '12px', margin: '0', color: '#000' }}>{data.headteacherName}</p>
              <div style={{ borderTop: '1px solid #000', marginTop: '30px' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
