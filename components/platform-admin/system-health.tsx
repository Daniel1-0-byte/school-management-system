import React from 'react';
import { CheckCircle, AlertCircle, Database, Network, Shield } from 'lucide-react';

interface SystemStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  icon: React.ReactNode;
  details: string;
}

export function SystemHealth() {
  const systemStatus: SystemStatus[] = [
    {
      name: 'Database',
      status: 'healthy',
      icon: <Database className="w-5 h-5" />,
      details: 'All connections active',
    },
    {
      name: 'API Gateway',
      status: 'healthy',
      icon: <Network className="w-5 h-5" />,
      details: 'Response time: 45ms',
    },
    {
      name: 'Authentication',
      status: 'healthy',
      icon: <Shield className="w-5 h-5" />,
      details: 'Sessions: 12 active',
    },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4">System Health</h2>

      <div className="space-y-2 sm:space-y-3">
        {systemStatus.map((item) => (
          <div key={item.name} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/50 hover:shadow-sm transition-shadow">
            <div className="mt-0.5 flex-shrink-0">
              {item.status === 'healthy' ? (
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              ) : item.status === 'warning' ? (
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              ) : (
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs sm:text-sm text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.details}</p>
            </div>

            <div className="text-xs font-semibold px-2 py-1 rounded-full bg-background flex-shrink-0">
              {item.status === 'healthy' ? (
                <span className="text-green-600">OK</span>
              ) : item.status === 'warning' ? (
                <span className="text-yellow-600">WARN</span>
              ) : (
                <span className="text-red-600">ERR</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 sm:mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
        <p className="text-xs text-green-600 font-medium">All systems operational</p>
      </div>
    </div>
  );
}
