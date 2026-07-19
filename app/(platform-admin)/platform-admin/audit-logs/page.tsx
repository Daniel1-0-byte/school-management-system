'use client';

import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, LogIn, LogOut, Shield, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { AuditLog, PaginatedResponse } from '@/types';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch audit logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          ...(action && { action }),
          ...(targetType && { targetType }),
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        });

        const response = await fetch(
          `/api/platform-admin/audit-logs?${params.toString()}`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch audit logs');
        }

        const data: PaginatedResponse<AuditLog> = await response.json();
        setLogs(data.data);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [page, pageSize, action, targetType, startDate, endDate]);

  const getActionIcon = (actionName: string) => {
    if (actionName.includes('login') && actionName.includes('success'))
      return <LogIn className="w-4 h-4 text-green-500" />;
    if (actionName.includes('login') && actionName.includes('failed'))
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (actionName.includes('logout'))
      return <LogOut className="w-4 h-4 text-blue-500" />;
    if (actionName.includes('2fa'))
      return <Shield className="w-4 h-4 text-purple-500" />;
    if (actionName.includes('created') || actionName.includes('approved'))
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <AlertCircle className="w-4 h-4 text-gray-500" />;
  };

  const formatAction = (actionName: string) => {
    return actionName
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/platform-admin/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'csv',
          filters: { action, targetType, startDate, endDate },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-logs.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground mt-2">Monitor system activity and security events</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Download className="w-5 h-5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
          >
            <option value="">All Actions</option>
            <option value="school_created">School Created</option>
            <option value="school_updated">School Updated</option>
            <option value="school_deleted">School Deleted</option>
            <option value="school_request_approved">Request Approved</option>
            <option value="school_request_rejected">Request Rejected</option>
            <option value="user_suspended">User Suspended</option>
            <option value="user_deactivated">User Deactivated</option>
          </select>

          <select
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
          >
            <option value="">All Types</option>
            <option value="school">School</option>
            <option value="user">User</option>
            <option value="school_request">School Request</option>
            <option value="admin">Admin</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Action</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Target</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Resource</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">IP Address</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="font-medium text-foreground">{formatAction(log.action)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <span className="inline-flex px-2 py-1 bg-muted/50 rounded text-xs font-medium">
                        {log.targetType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {log.targetName || log.targetId?.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                      {log.ipAddress || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} logs
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * pageSize >= total}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
