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
    classScore?: number;
    examScore?: number;
    position?: number | null;
    remarks?: string | null;
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
  conduct: string | null;
  interest: string | null;
  strength: string | null;
  improvement: string | null;

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
  const getGradeColor = (grade: string) => {
    const normalizedGrade = grade.toUpperCase();
    if (normalizedGrade.startsWith('A')) return '#15803d';
    if (normalizedGrade.startsWith('B')) return '#2563eb';
    if (normalizedGrade.startsWith('C')) return '#b45309';
    return '#dc2626';
  };

  const attendancePercentage = data.attendance && data.attendance.total > 0
    ? ((data.attendance.present / data.attendance.total) * 100).toFixed(1)
    : null;

  return (
    <div
      className={`${isPrinting ? 'print:bg-white' : 'bg-white'} report-card-printable w-full max-w-4xl mx-auto`}
      style={{
        fontFamily: 'Arial, sans-serif',
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
          html, body {
            width: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          body { font-size: 11px; }
          .no-print { display: none !important; }
          .report-card-printable {
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .report-card-container {
            width: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: Arial, sans-serif !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .report-card-container > div,
          .report-card-signatures,
          table {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          table { font-size: 10px; }
          th, td { padding: 6px !important; }
          h1 { font-size: 21px !important; }
          h2 { font-size: 16px !important; }
          h3 { font-size: 11px !important; }
          .report-card-container { line-height: 1.2; }
          .report-card-container > div { margin-bottom: 6px; }
          .report-card-info { padding: 13px 18px !important; }
          .report-card-comment { padding: 9px 18px 6px !important; margin-bottom: 4px !important; }
          .report-card-signatures { margin-top: 16px !important; padding-top: 12px !important; }
          .report-card-summary p:first-child { color: #dbe7f3 !important; }
          .report-card-summary p:last-child { color: #fff !important; font-size: 15px !important; }
          .report-card-header { padding: 19px 26px 17px !important; }
          .report-card-summary { padding: 11px 16px !important; }
          .report-card-narrative-grid { gap: 6px !important; }
          .report-card-narratives > h3 { margin-bottom: 5px !important; }
          .report-card-narrative-grid > div { padding: 6px 9px !important; }
          .report-card-header, .report-card-summary { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }

        @media screen and (max-width: 640px) {
          .report-card-container {
            width: 100% !important;
            overflow: hidden;
          }
          .report-card-header {
            padding: 14px 12px !important;
          }
          .report-card-header-grid {
            grid-template-columns: 42px minmax(0, 1fr) 42px !important;
            gap: 8px !important;
          }
          .report-card-header-grid > div:first-child,
          .report-card-header-grid > div:last-child {
            width: 42px !important;
            height: 42px !important;
          }
          .report-card-header-grid > div:first-child {
            width: 42px !important;
            height: 42px !important;
          }
          .report-card-header img {
            max-width: 42px !important;
            max-height: 42px !important;
          }
          .report-card-header h1 {
            font-size: clamp(17px, 5vw, 24px) !important;
            line-height: 1.15 !important;
          }
          .report-card-header p {
            font-size: 9px !important;
            overflow-wrap: anywhere;
          }
          .report-card-info {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
            padding: 12px !important;
          }
          .report-card-container table {
            display: block;
            overflow-x: auto;
            width: 100%;
            white-space: nowrap;
          }
          .report-card-container th,
          .report-card-container td {
            padding: 7px 6px !important;
          }
          .report-card-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
          .report-card-summary p {
            overflow-wrap: anywhere;
          }
          .report-card-comment {
            padding: 11px 12px !important;
          }
          .report-card-signatures > div {
            grid-template-columns: 1fr !important;
            gap: 18px !important;
          }
        }
      `}</style>

      <div className="report-card-container" style={{ minHeight: '0', width: '100%' }}>
        {/* Header Section */}
        <div className="report-card-header" style={{ backgroundColor: '#1e3a5f', color: '#fff', padding: '18px 22px 16px', borderRadius: '3px', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
          <div className="report-card-header-grid" style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) 72px', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '72px', height: '72px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {data.schoolLogo && (
                <img src={data.schoolLogo} alt="School Logo" style={{ maxWidth: '72px', maxHeight: '72px', objectFit: 'contain' }} />
              )}
            </div>
            <div style={{ minWidth: 0, textAlign: 'center' }}>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '27px', fontWeight: 'bold', margin: '0 0 5px', color: '#fff' }}>{data.schoolName}</h1>
              {data.schoolAddress && <p style={{ fontSize: '11px', margin: '2px 0', color: '#dbe7f3' }}>{data.schoolAddress}</p>}
              <p style={{ fontSize: '10px', margin: '2px 0', color: '#dbe7f3' }}>
                {data.schoolPhone}{data.schoolPhone && data.schoolEmail ? '  |  ' : ''}{data.schoolEmail}
              </p>
            </div>
            <div aria-hidden="true" />
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '10px 0 8px' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '19px', letterSpacing: '3px', fontWeight: 'bold', margin: '0', color: '#1e3a5f' }}>STUDENT REPORT CARD</h2>
          <p style={{ fontSize: '10px', margin: '4px 0 0', color: '#64748b' }}>Academic Year: {data.academicYear} | Term: {data.termName}</p>
        </div>

        {/* Student Information Section */}
        <div>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#000' }}>
            STUDENT INFORMATION
          </h3>
          <div
            className="report-card-info"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px 18px',
              padding: '13px 16px',
              backgroundColor: '#f8f9fb',
              border: '1px solid #dbe3ec',
              borderLeft: '4px solid #1e3a5f',
              borderRadius: '3px',
            }}
          >
            <div>
              <p style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 3px 0' }}>Student Name</p>
              <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                {data.studentName}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 3px 0' }}>Student ID / Admission Number</p>
              <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                {data.studentId}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 3px 0' }}>Class</p>
              <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                {data.className}
                {data.streamName && ` - ${data.streamName}`}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 3px 0' }}>Generated Date</p>
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
            {data.attendance.total === 0 ? (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#f0f8ff',
                  border: '1px solid #b0d4ff',
                  borderRadius: '4px',
                  color: '#666',
                  fontSize: '11px',
                  textAlign: 'center',
                }}
              >
                No attendance recorded
              </div>
            ) : (
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
            )}
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
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#1e3a5f', color: '#fff', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
                <th
                  style={{
                    padding: '8px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    borderBottom: '1px solid rgba(255,255,255,0.25)',
                    color: '#fff',
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
                    borderBottom: '1px solid rgba(255,255,255,0.25)',
                    color: '#fff',
                  }}
                >
                  SBA
                </th>
                <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}>Exam</th>
                <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}>Total</th>
                <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}>Grade</th>
                <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}>Position</th>
                <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}>Remarks
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
textAlign: 'right',
                      fontSize: '11px',
                      borderBottom: '1px solid #e2e8f0',
                      color: '#000',
                      fontWeight: '500',
                    }}
                  >
                    {subject.classScore ?? subject.score}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '11px', borderBottom: '1px solid #e2e8f0', color: '#000' }}>{subject.examScore ?? 0}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontSize: '11px', borderBottom: '1px solid #e2e8f0', color: '#000', fontWeight: 'bold' }}>{subject.score}</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: getGradeColor(subject.grade) }}>{subject.grade}</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px', borderBottom: '1px solid #e2e8f0', color: '#000' }}>{subject.position ?? '—'}</td>
                  <td style={{ padding: '8px', textAlign: 'left', fontSize: '10px', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>{subject.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary Stats */}
          <div
            className="report-card-summary"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr' + (data.ranking ? ' 1fr' : '') + (data.classSize ? ' 1fr' : ''),
              gap: '12px',
              marginTop: '12px',
              padding: '12px',
              background: 'linear-gradient(135deg, #1e3a5f 0%, #28527f 100%)',
              border: 'none',
              borderRadius: '3px',
              color: '#fff',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            }}
          >
            <div>
              <p style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 3px 0' }}>Total Score</p>
              <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                {data.totalScore}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 3px 0' }}>Average Score</p>
              <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                {data.averageScore.toFixed(2)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 3px 0' }}>Overall Grade</p>
              <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0', color: '#000' }}>
                {data.letterGrade}
              </p>
              </div>
            {data.ranking && (
              <div>
                <p style={{ fontSize: '9px', color: '#dbe7f3', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 3px 0' }}>Class Ranking</p>
                <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0', color: '#fff' }}>
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
              className="report-card-comment"
              style={{
                padding: '12px 16px',
                backgroundColor: '#f8fafc',
                border: '1px solid #dbe3ec',
                borderLeft: '4px solid #1e3a5f',
                borderRadius: '3px',
                minHeight: '40px',
                position: 'relative',
              }}
            >
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'italic', margin: '0', paddingLeft: '12px', color: '#334155', lineHeight: '1.4' }}>
                {data.teacherComment}
              </p>
            </div>
          </div>
        )}

        {/* GES Narrative Sections */}
        {(data.conduct || data.interest || data.strength || data.improvement) && (
          <div className="report-card-narratives">
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#000' }}>GENERAL EVALUATION</h3>
            <div className="report-card-narrative-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                ['CONDUCT', data.conduct],
                ['INTEREST', data.interest],
                ['STRENGTH', data.strength],
                ['AREA FOR IMPROVEMENT', data.improvement],
              ].filter(([, value]) => value).map(([label, value]) => (
                <div key={label} style={{ padding: '9px 12px', backgroundColor: '#f8fafc', border: '1px solid #dbe3ec', borderLeft: '3px solid #1e3a5f', borderRadius: '3px' }}>
                  <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#1e3a5f', margin: '0 0 3px' }}>{label}</p>
                  <p style={{ fontSize: '10px', color: '#334155', margin: 0, lineHeight: 1.3 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Section */}
        <div
          className="report-card-signatures"
          style={{ marginTop: '24px', borderTop: '2px solid #ddd', paddingTop: '16px' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Class Teacher */}
            <div>
              <p style={{ fontSize: '10px', fontWeight: 'bold', margin: '0 0 28px 0', color: '#1e3a5f', letterSpacing: '0.8px' }}>
                CLASS TEACHER
              </p>
              <div style={{ borderTop: '1px solid #334155', marginBottom: '5px' }} />
              <p style={{ fontSize: '11px', margin: '0', color: '#000' }}>
                {data.classTeacherName || 'Not Assigned'}
              </p>
            </div>

            {/* Headteacher */}
            <div>
              <p style={{ fontSize: '10px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#1e3a5f', letterSpacing: '0.8px' }}>
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

              <div style={{ borderTop: '1px solid #334155', marginTop: '26px', marginBottom: '5px' }} />
              <p style={{ fontSize: '11px', margin: '0', color: '#000' }}>{data.headteacherName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
