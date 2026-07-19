'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  LogIn,
  LogOut,
  User,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  target_type: string;
  actor_id: string;
  created_at: string;
  ip_address: string;
}

interface RecentActivityProps {
  logs: AuditLog[];
}

function getActionIcon(action: string) {
  const iconProps = { className: 'w-4 h-4' };

  if (action.includes('login')) {
    return action.includes('failed') ? (
      <AlertCircle {...iconProps} className="text-red-500 w-4 h-4" />
    ) : (
      <LogIn {...iconProps} className="text-green-500 w-4 h-4" />
    );
  }

  if (action.includes('logout')) {
    return <LogOut {...iconProps} className="text-blue-500 w-4 h-4" />;
  }

  if (action.includes('2fa')) {
    return <Shield {...iconProps} className="text-purple-500 w-4 h-4" />;
  }

  if (action.includes('success')) {
    return <CheckCircle {...iconProps} className="text-green-500 w-4 h-4" />;
  }

  return <Clock {...iconProps} className="text-gray-500 w-4 h-4" />;
}

function getActionLabel(action: string) {
  const labels: Record<string, string> = {
    login_success: 'Admin Login',
    login_failed: 'Failed Login',
    login_2fa_requested: '2FA Requested',
    login_2fa_success: '2FA Verified',
    login_2fa_failed: '2FA Failed',
    login_failed_invalid_password: 'Invalid Password',
    login_failed_inactive_account: 'Inactive Account',
    logout: 'Logout',
  };

  return labels[action] || action;
}

export function RecentActivity({ logs }: RecentActivityProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
        <div className="text-center py-8 sm:py-12">
          <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4">Recent Activity</h2>

      <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-all hover:shadow-sm"
          >
            <div className="flex-shrink-0 mt-0.5 sm:mt-1">
              {getActionIcon(log.action)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs sm:text-sm text-foreground">
                {getActionLabel(log.action)}
              </p>
              <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
                <p className="text-xs text-muted-foreground truncate">
                  ID: {log.actor_id.substring(0, 8)}...
                </p>
                <span className="text-muted-foreground hidden sm:inline">•</span>
                <p className="text-xs text-muted-foreground truncate">
                  {log.ip_address}
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
