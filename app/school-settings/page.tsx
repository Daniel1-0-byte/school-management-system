'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2, Save } from 'lucide-react';

interface SchoolSettings {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone_number?: string;
  email: string;
  principal_name?: string;
  principal_email?: string;
  established_year?: number;
  website?: string;
}

export default function SchoolSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState<SchoolSettings>({
    name: '',
    email: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Get school ID from session or query param
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();

        if (!session.user) {
          router.push('/login');
          return;
        }

        // Fetch school settings
        const res = await fetch(
          `/api/school/settings?school_id=${session.user.school_id}`
        );
        const data = await res.json();

        if (res.ok) {
          setSettings(data);
        } else {
          setError(data.error || 'Failed to load settings');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: name === 'established_year' ? parseInt(value) : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();

      const res = await fetch(
        `/api/school/settings?school_id=${session.user.school_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save settings');
        setSaving(false);
        return;
      }

      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">School Settings</h1>
          <p className="text-slate-400">Manage your school information and configuration</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-200">{success}</p>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                School Name *
              </label>
              <input
                type="text"
                name="name"
                value={settings.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={settings.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={settings.address || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={settings.city || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={settings.state || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postal_code"
                  value={settings.postal_code || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={settings.phone_number || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={settings.website || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Principal Name
                </label>
                <input
                  type="text"
                  name="principal_name"
                  value={settings.principal_name || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Principal Email
                </label>
                <input
                  type="email"
                  name="principal_email"
                  value={settings.principal_email || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Year Established
              </label>
              <input
                type="number"
                name="established_year"
                value={settings.established_year || new Date().getFullYear()}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
