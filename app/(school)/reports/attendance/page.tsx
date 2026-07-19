'use client';

import React, { useState } from 'react';
import { Calendar, Download, Filter, TrendingUp } from 'lucide-react';

export default function AttendanceReportPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const classes = [
    { id: 'class-1', name: 'Class 1-A', studentsPresent: 45, studentsAbsent: 5, attendanceRate: '90%' },
    { id: 'class-2', name: 'Class 2-B', studentsPresent: 42, studentsAbsent: 8, attendanceRate: '84%' },
    { id: 'class-3', name: 'Class 3-A', studentsPresent: 38, studentsAbsent: 2, attendanceRate: '95%' },
  ];

  const reportData = selectedClass
    ? classes.filter(c => c.id === selectedClass)
    : classes;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Attendance Report</h1>
          <p className="text-muted-foreground mt-1">View attendance trends and patterns</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          <Download className="w-5 h-5" />
          <span>Export PDF</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="">All Classes</option>
              <option value="class-1">Class 1-A</option>
              <option value="class-2">Class 2-B</option>
              <option value="class-3">Class 3-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportData.map((classItem) => (
          <div key={classItem.id} className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">{classItem.name}</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                <span className="text-sm text-green-600 font-medium">Present</span>
                <span className="text-2xl font-bold text-green-600">{classItem.studentsPresent}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                <span className="text-sm text-red-600 font-medium">Absent</span>
                <span className="text-2xl font-bold text-red-600">{classItem.studentsAbsent}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                <span className="text-sm text-blue-600 font-medium flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Rate
                </span>
                <span className="text-2xl font-bold text-blue-600">{classItem.attendanceRate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Details Table */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Attendance Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Total Students</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Present</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Absent</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Rate</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((day) => (
                <tr key={day} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">2024-01-{String(day).padStart(2, '0')}</td>
                  <td className="px-4 py-3 font-medium text-foreground">50</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/20 text-green-600 text-xs font-semibold">
                      {45 + Math.floor(Math.random() * 5)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-500/20 text-red-600 text-xs font-semibold">
                      {Math.floor(Math.random() * 5) + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{85 + Math.floor(Math.random() * 10)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
