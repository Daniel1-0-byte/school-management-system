'use client';

import React from 'react';
import { Download, Printer } from 'lucide-react';

interface ReportCardProps {
  studentName: string;
  studentId: string;
  className: string;
  academicYear: string;
  termName: string;
  subjects: Array<{
    name: string;
    marks: number;
    grade: string;
    percentage: number;
  }>;
  attendance: {
    present: number;
    absent: number;
    total: number;
  };
  overallGrade: string;
  remarks?: string;
  generatedDate: string;
}

export function ReportCard({
  studentName,
  studentId,
  className,
  academicYear,
  termName,
  subjects,
  attendance,
  overallGrade,
  remarks,
  generatedDate,
}: ReportCardProps) {
  const attendancePercentage = ((attendance.present / attendance.total) * 100).toFixed(1);

  const handlePrint = () => {
    // Hide buttons for print
    const toolbar = document.getElementById('report-card-toolbar');
    if (toolbar) {
      toolbar.classList.add('hidden');
    }
    
    window.print();
    
    // Restore buttons after print dialog closes
    setTimeout(() => {
      if (toolbar) {
        toolbar.classList.remove('hidden');
      }
    }, 500);
  };

  const handleDownloadPDF = () => {
    // Use browser's print-to-PDF feature
    const toolbar = document.getElementById('report-card-toolbar');
    if (toolbar) {
      toolbar.classList.add('hidden');
    }
    
    window.print();
    
    setTimeout(() => {
      if (toolbar) {
        toolbar.classList.remove('hidden');
      }
    }, 500);
  };

  return (
    <div className="space-y-4">
      <div id="report-card-toolbar" className="flex justify-end gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      <div id="report-card-content" className="bg-card border border-border rounded-lg p-8 space-y-6 print:shadow-none">
        {/* Header */}
        <div className="text-center border-b border-border pb-6">
          <h1 className="text-2xl font-bold text-foreground">REPORT CARD</h1>
          <p className="text-sm text-muted-foreground mt-2">{academicYear} - {termName}</p>
        </div>

        {/* Student Information */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Student Name</p>
            <p className="text-lg font-medium text-foreground">{studentName}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Student ID</p>
            <p className="text-lg font-medium text-foreground">{studentId}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Class</p>
            <p className="text-lg font-medium text-foreground">{className}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Generated Date</p>
            <p className="text-lg font-medium text-foreground">{generatedDate}</p>
          </div>
        </div>

        {/* Attendance */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-3">Attendance</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Present</p>
              <p className="text-xl font-bold text-foreground">{attendance.present}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Absent</p>
              <p className="text-xl font-bold text-foreground">{attendance.absent}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Days</p>
              <p className="text-xl font-bold text-foreground">{attendance.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Percentage</p>
              <p className={`text-xl font-bold ${parseFloat(attendancePercentage) >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                {attendancePercentage}%
              </p>
            </div>
          </div>
        </div>

        {/* Academic Results */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">Academic Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-sm font-semibold text-foreground">Subject</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-foreground">Marks</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-foreground">Percentage</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-foreground">Grade</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => (
                  <tr key={subject.name} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-2 px-2 text-foreground">{subject.name}</td>
                    <td className="py-2 px-2 text-foreground font-medium">{subject.marks}</td>
                    <td className="py-2 px-2 text-foreground font-medium">{subject.percentage}%</td>
                    <td className="py-2 px-2">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-600">
                        {subject.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overall Performance */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overall Grade</p>
              <p className="text-lg font-semibold text-foreground">Grade: {overallGrade}</p>
            </div>
            <div className="text-4xl font-bold text-primary">{overallGrade}</div>
          </div>
        </div>

        {/* Remarks */}
        {remarks && (
          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Remarks</p>
            <p className="text-foreground">{remarks}</p>
          </div>
        )}

      </div>

      <style>{`
        @media print {
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          
          #report-card-toolbar {
            display: none !important;
          }
          
          #report-card-content {
            background: white;
            border: none;
            box-shadow: none;
            margin: 0;
            padding: 20mm;
            page-break-after: always;
            break-after: page;
          }
          
          @page {
            size: A4;
            margin: 20mm;
          }
          
          table {
            page-break-inside: avoid;
          }
          
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
