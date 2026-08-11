'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, Building2, Calendar, DollarSign, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LogoUpload } from '@/components/settings/logo-upload';
import { SignatureUpload } from '@/components/settings/signature-upload';

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  enabled?: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState({
    name: 'Example School',
    address: '123 School Street',
    phone: '+91-1234567890',
    email: 'info@school.edu',
    principalName: 'Dr. Sharma',
  });
  const [schoolId, setSchoolId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load school info and user data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get school settings
        const response = await fetch('/api/school/settings');
        if (response.ok) {
          const data = await response.json();
          setSchoolInfo({
            name: data.name || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            principalName: data.principal_name || '',
          });
          setSchoolId(data.id);
          setLogoUrl(data.logo_url);
        }

        // Get user profile for signature
        const profileResponse = await fetch('/api/auth/session');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.user) {
            setUserId(profileData.user.id);
            setSignatureUrl(profileData.user.profile?.signature_url || null);
          }
        }
      } catch (err) {
        console.error('[v0] Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const sections: SettingsSection[] = [
    { id: 'school', label: 'School Information', icon: <Building2 className="w-5 h-5" />, href: '/settings', enabled: true },
    { id: 'academic', label: 'Academic Years & Terms', icon: <Calendar className="w-5 h-5" />, href: '/settings/academic-years', enabled: true },
    { id: 'fees', label: 'Fee Structure', icon: <DollarSign className="w-5 h-5" />, href: '/settings/fees', enabled: false },
    { id: 'security', label: 'Security', icon: <Lock className="w-5 h-5" />, href: '/settings/security', enabled: false },
  ];

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const updateData = {
        name: schoolInfo.name,
        address: schoolInfo.address,
        phone_number: schoolInfo.phone,
        email: schoolInfo.email,
        principal_name: schoolInfo.principalName,
        logo_url: logoUrl,
      };

      const response = await fetch('/api/school/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
      // Show success message
      setTimeout(() => {
        setError(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleNavigate = (href: string, enabled: boolean) => {
    if (enabled) {
      router.push(href);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage school configuration and preferences</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleNavigate(section.href, section.enabled || false)}
                disabled={!section.enabled}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border text-left last:border-0 transition-colors ${
                  section.enabled
                    ? 'hover:bg-muted cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <span className={section.enabled ? 'text-primary' : 'text-muted-foreground'}>{section.icon}</span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">{section.label}</span>
                  {!section.enabled && (
                    <div className="text-xs text-amber-600 font-semibold mt-0.5">Coming Soon</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Settings Panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* School Information */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                School Information
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Update your school details</p>
            </div>

            <div className="space-y-4">
              {/* School Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">School Name *</label>
                <input
                  type="text"
                  value={schoolInfo.name}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, name: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Address</label>
                <input
                  type="text"
                  value={schoolInfo.address}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Contact Phone</label>
                <input
                  type="tel"
                  value={schoolInfo.phone}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                <input
                  type="email"
                  value={schoolInfo.email}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, email: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Principal Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Principal Name</label>
                <input
                  type="text"
                  value={schoolInfo.principalName}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, principalName: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

            </div>

            {!isLoading && schoolId && (
              <div className="pt-6 border-t border-border">
                <LogoUpload
                  currentLogoUrl={logoUrl}
                  schoolId={schoolId}
                  onUploadSuccess={(url) => setLogoUrl(url)}
                />
              </div>
            )}

            {/* Save Button */}
            <div className="pt-4 border-t border-border flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? (
                  <>
                    <Settings className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Principal Signature */}
          {!isLoading && userId && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Principal Signature</h2>
                <p className="text-sm text-muted-foreground mt-1">Upload the principal&apos;s signature to display on report cards</p>
              </div>

              <SignatureUpload
                currentSignatureUrl={signatureUrl}
                userId={userId}
                onUploadSuccess={(url) => setSignatureUrl(url)}
                onDeleteSuccess={() => setSignatureUrl(null)}
              />
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
            <h3 className="font-semibold text-blue-600 mb-4">Manage Other Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/settings/academic-years')}
                className="p-4 rounded-lg bg-background border border-border hover:border-primary transition-colors text-left"
              >
                <p className="font-medium text-foreground">Academic Years & Terms</p>
                <p className="text-xs text-muted-foreground mt-1">Create and manage academic years and terms</p>
              </button>
              <button
                disabled
                className="p-4 rounded-lg bg-background border border-border opacity-60 cursor-not-allowed text-left"
              >
                <p className="font-medium text-foreground">Fee Structure</p>
                <p className="text-xs text-amber-600 font-semibold mt-1">Coming Soon</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
