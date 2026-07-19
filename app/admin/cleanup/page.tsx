'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Trash2 } from 'lucide-react';

interface CleanupResult {
  success: boolean;
  message: string;
  deleted?: {
    authUsers: number;
    schools: number;
    profiles: number;
    requests: number;
  };
  error?: string;
}

export default function CleanupPage() {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCleanup = async () => {
    if (!supabaseUrl || !serviceRoleKey) {
      setResult({
        success: false,
        message: 'Please fill in all fields',
        error: 'Missing credentials',
      });
      return;
    }

    setIsLoading(true);
    console.log('[v0] Starting cleanup with provided credentials');

    try {
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseUrl,
          serviceRoleKey,
        }),
      });

      const data: CleanupResult = await response.json();
      console.log('[v0] Cleanup response:', data);
      setResult(data);
      setShowConfirm(false);

      if (data.success) {
        setSupabaseUrl('');
        setServiceRoleKey('');
      }
    } catch (error) {
      console.error('[v0] Cleanup error:', error);
      setResult({
        success: false,
        message: 'Failed to perform cleanup',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Database Cleanup</h1>
          <p className="text-slate-600 mt-2">
            Delete all test school data and auth users to allow schools to retry registration
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-slate-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Clean Test Data</h2>
                <p className="text-sm text-slate-600">
                  This will permanently delete all schools, requests, profiles, and auth users
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Credentials Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Supabase URL
                </label>
                <input
                  type="text"
                  placeholder="https://xxxxx.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-slate-600 mt-1">
                  Found in Supabase Dashboard → Settings → API
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Service Role Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGc..."
                  value={serviceRoleKey}
                  onChange={(e) => setServiceRoleKey(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-slate-600 mt-1">
                  Service Role Secret from API settings
                </p>
              </div>
            </div>

            {/* Buttons */}
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={!supabaseUrl || !serviceRoleKey || isLoading}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete All Test Data
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    This will permanently delete all schools, auth users, profiles, and requests.
                    This action cannot be undone.
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCleanup}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Yes, Delete Everything
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium rounded-lg transition disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Result Message */}
            {result && (
              <div className={`flex gap-3 p-4 rounded-lg border ${
                result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className={result.success ? 'text-green-800' : 'text-red-800'}>
                  <div className="font-medium">{result.message}</div>
                  {result.deleted && (
                    <div className="text-sm mt-2 space-y-1">
                      <p>• Auth Users: {result.deleted.authUsers}</p>
                      <p>• Schools: {result.deleted.schools}</p>
                      <p>• Profiles: {result.deleted.profiles}</p>
                      <p>• Requests: {result.deleted.requests}</p>
                    </div>
                  )}
                  {result.error && (
                    <div className="text-sm mt-2">Error: {result.error}</div>
                  )}
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-sm space-y-2">
              <div className="font-medium text-slate-900">What gets deleted:</div>
              <ul className="space-y-1 text-slate-700 list-disc list-inside">
                <li>All schools and school metadata</li>
                <li>All school access requests (pending approvals)</li>
                <li>All user profiles linked to schools</li>
                <li>All auth users associated with schools</li>
                <li>All school subscriptions and invites</li>
              </ul>
              <div className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200">
                After cleanup, schools can retry registration with the same email addresses.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
