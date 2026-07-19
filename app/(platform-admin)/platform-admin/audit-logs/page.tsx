import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { Search, Download, Filter, LogIn, LogOut, Shield, AlertCircle, CheckCircle } from 'lucide-react';

async function getAuditLogs() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return [];
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, target_type, actor_id, ip_address, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[v0] Failed to fetch audit logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[v0] Error fetching logs:', error);
    return [];
  }
}

function getActionIcon(action: string) {
  if (action.includes('login_success')) return <LogIn className="w-4 h-4 text-green-500" />;
  if (action.includes('login_failed')) return <AlertCircle className="w-4 h-4 text-red-500" />;
  if (action.includes('logout')) return <LogOut className="w-4 h-4 text-blue-500" />;
  if (action.includes('2fa')) return <Shield className="w-4 h-4 text-purple-500" />;
  if (action.includes('success')) return <CheckCircle className="w-4 h-4 text-green-500" />;
  return <AlertCircle className="w-4 h-4 text-gray-500" />;
}

function formatAction(action: string) {
  return action
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function AuditLogsPage() {
  const logs = await getAuditLogs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground mt-2">Monitor system activity and security events</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          <Download className="w-5 h-5" />
          <span>Export</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by actor ID or IP address..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            <Filter className="w-5 h-5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Target Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Actor ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getActionIcon(log.action)}
                        <span className="text-sm font-medium text-foreground">
                          {formatAction(log.action)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {log.target_type}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                      {log.actor_id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {log.ip_address}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
