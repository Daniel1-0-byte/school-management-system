'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';

interface SessionData {
  user: {
    id: string;
    email: string;
    profile: {
      first_name: string;
      last_name: string;
      system_role: string;
      school_id: string;
    };
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (!response.ok) {
          router.push('/login');
          return;
        }

        const data = await response.json() as { success: boolean; data?: SessionData };
        if (data.success && data.data) {
          setSession(data.data);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('[v0] Session check error:', error);
        setError('Failed to verify session');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('[v0] Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">{error || 'Unable to load dashboard'}</h1>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Top Bar */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">SchoolHub Dashboard</h1>
          <p className="text-slate-400 text-sm">
            Welcome, {session.user.profile.first_name} {session.user.profile.last_name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-300">
            {session.user.profile.system_role}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8">
            <h2 className="text-3xl font-bold text-white mb-4">Welcome to SchoolHub!</h2>
            <p className="text-slate-300 mb-6">
              Your school management dashboard is being set up. This is a placeholder page for the main dashboard.
            </p>

            {/* Role-based message */}
            {session.user.profile.system_role === 'Admin' && (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-200">
                <p className="font-semibold">As a School Admin, you can:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Manage students and teachers</li>
                  <li>Track attendance and academic performance</li>
                  <li>Manage school finances and fees</li>
                  <li>View reports and analytics</li>
                </ul>
              </div>
            )}

            {session.user.profile.system_role === 'Teacher' && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                <p className="font-semibold">As a Teacher, you can:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Record student attendance</li>
                  <li>Enter grades and create report cards</li>
                  <li>Communicate with parents</li>
                  <li>View your class roster</li>
                </ul>
              </div>
            )}

            {session.user.profile.system_role === 'Parent' && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
                <p className="font-semibold">As a Parent, you can:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>View your child&apos;s attendance records</li>
                  <li>Check grades and report cards</li>
                  <li>View fee statements and payment history</li>
                  <li>Receive school notifications</li>
                </ul>
              </div>
            )}
          </div>

          {/* Session Information */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Your Information</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-slate-400">Name</dt>
                  <dd className="text-white">{session.user.profile.first_name} {session.user.profile.last_name}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Email</dt>
                  <dd className="text-white">{session.user.email}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Role</dt>
                  <dd className="text-white">{session.user.profile.system_role}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">School ID</dt>
                  <dd className="text-white font-mono text-xs">{session.user.profile.school_id}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300">
                  📚 Academic Management
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300">
                  📋 Attendance Tracking
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300">
                  💰 Fee Management
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300">
                  ⚙️ Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
