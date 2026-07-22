'use client';

import React from 'react';
import { formatDate } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { Attendance } from '@/lib/transformers/attendance-transformer';

interface AttendanceTableProps {
  records: Attendance[];
  loading?: boolean;
  onDelete?: (id: string) => Promise<void>;
}

export function AttendanceTable({ records, loading = false, onDelete }: AttendanceTableProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'leave':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const badgeClass =
      status === 'present'
        ? 'bg-green-500/10 text-green-600'
        : status === 'absent'
          ? 'bg-red-500/10 text-red-600'
          : 'bg-yellow-500/10 text-yellow-600';

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badgeClass}`}>
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">No attendance records found</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Class</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Notes</th>
              {onDelete && <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr
                key={record.id}
                className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30 hover:bg-muted/50'}
              >
                <td className="px-6 py-4 text-sm text-foreground">
                  {record.date ? formatDate(record.date) : 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-foreground">{record.studentName || 'Unknown'}</td>
                <td className="px-6 py-4 text-sm text-foreground">{record.className || 'N/A'}</td>
                <td className="px-6 py-4 text-sm">{getStatusBadge(record.status)}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{record.notes || '-'}</td>
                {onDelete && (
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => onDelete(record.id)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
