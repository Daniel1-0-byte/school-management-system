'use client';

import React, { useState } from 'react';
import { Download, Filter, TrendingUp, Award } from 'lucide-react';

export default function AcademicReportPage() {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const classes = [
    { id: 'class-1', name: 'Class 1-A' },
    { id: 'class-2', name: 'Class 2-B' },
    { id: 'class-3', name: 'Class 3-A' },
  ];

  const subjects = [
    { id: 'math', name: 'Mathematics' },
    { id: 'english', name: 'English' },
    { id: 'science', name: 'Science' },
  ];

  const reportData = [
    { name: 'Aarjav Patel', rollNo: '001', math: 85, english: 78, science: 88, average: 83.67, grade: 'A' },
    { name: 'Bhavna Sharma', rollNo: '002', math: 92, english: 89, science: 94, average: 91.67, grade: 'A+' },
    { name: 'Chirag Desai', rollNo: '003', math: 76, english: 72, science: 79, average: 75.67, grade: 'B' },
    { name: 'Divya Nair', rollNo: '004', math: 88, english: 85, science: 90, average: 87.67, grade: 'A' },
    { name: 'Esha Gupta', rollNo: '005', math: 95, english: 92, science: 96, average: 94.33, grade: 'A+' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Academic Performance Report</h1>
          <p className="text-muted-foreground mt-1">Analyze student grades and academic progress</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Class Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Class Average</p>
          <p className="text-3xl font-bold text-foreground">84.2%</p>
          <p className="text-xs text-green-600 mt-1">+2.5% from last month</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Highest Score</p>
          <p className="text-3xl font-bold text-foreground">96</p>
          <p className="text-xs text-muted-foreground mt-1">By Esha Gupta</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">A+ Students</p>
          <p className="text-3xl font-bold text-foreground">8</p>
          <p className="text-xs text-muted-foreground mt-1">16% of class</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-muted-foreground text-sm mb-2">Improvement</p>
          <p className="text-3xl font-bold text-foreground">12%</p>
          <p className="text-xs text-green-600 mt-1">Average improvement</p>
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Grade Distribution</h3>
          <div className="space-y-3">
            {[
              { grade: 'A+', count: 8, color: 'bg-green-500' },
              { grade: 'A', count: 15, color: 'bg-blue-500' },
              { grade: 'B+', count: 12, color: 'bg-yellow-500' },
              { grade: 'B', count: 10, color: 'bg-orange-500' },
              { grade: 'C', count: 3, color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.grade} className="flex items-center gap-4">
                <span className="font-bold text-foreground w-8">{item.grade}</span>
                <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${item.color} transition-all`}
                    style={{ width: `${(item.count / 50) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Subject Performance</h3>
          <div className="space-y-3">
            {subjects.map((subject) => {
              const avg = Math.floor(Math.random() * 30) + 70;
              return (
                <div key={subject.id} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-foreground w-20">{subject.name}</span>
                  <div className="flex-1 h-6 bg-muted rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-foreground w-12 text-right">{avg}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Student Details Table */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Student Performance Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Student Name</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Roll No</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Math</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">English</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Science</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Average</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Grade</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((student) => (
                <tr key={student.rollNo} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{student.name}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{student.rollNo}</td>
                  <td className="px-4 py-3 text-center">{student.math}</td>
                  <td className="px-4 py-3 text-center">{student.english}</td>
                  <td className="px-4 py-3 text-center">{student.science}</td>
                  <td className="px-4 py-3 text-center font-semibold text-foreground">
                    {student.average.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      student.grade === 'A+' ? 'bg-green-500/20 text-green-600' :
                      student.grade === 'A' ? 'bg-blue-500/20 text-blue-600' :
                      'bg-yellow-500/20 text-yellow-600'
                    }`}>
                      <Award className="w-3 h-3" />
                      {student.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
