'use client';

import React, { useState } from 'react';
import { Lock, Bell, Shield, Database, Save, CheckCircle, AlertCircle, Mail, Eye, EyeOff } from 'lucide-react';

interface SettingsState {
  siteName: string;
  maintenanceMode: boolean;
  emailNotifications: boolean;
  twoFactorRequired: boolean;
  sessionTimeout: string;
  captchaEnabled: boolean;
  passwordMinLength: string;
  passwordRequireSpecial: boolean;
  smtpServer: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    siteName: 'SchoolHub',
    maintenanceMode: false,
    emailNotifications: true,
    twoFactorRequired: true,
    sessionTimeout: '8',
    captchaEnabled: true,
    passwordMinLength: '8',
    passwordRequireSpecial: true,
    smtpServer: '',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
  });

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'email' | 'system'>('general');

  const handleChange = (key: keyof SettingsState, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
    setError(null);
  };

  const handleSave = async () => {
    try {
      // Validate SMTP if email tab
      if (activeTab === 'email' && settings.smtpServer && !settings.smtpPort) {
        setError('SMTP Port is required');
        return;
      }

      // In a real app, you'd send this to an API
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  const tabs = [
    { id: 'general' as const, label: 'General' },
    { id: 'security' as const, label: 'Security' },
    { id: 'email' as const, label: 'Email' },
    { id: 'system' as const, label: 'System' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage platform configuration and preferences</p>
      </div>

      {/* Messages */}
      {saved && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-600">Settings saved successfully</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Database className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">General Settings</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Platform Name
                  </label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={e => handleChange('siteName', e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">Disable access for maintenance</p>
                  </div>
                  <button
                    onClick={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.maintenanceMode ? 'bg-red-500' : 'bg-gray-400'
                    }`}
                  >
                    <div
                      className={`absolute w-5 h-5 rounded-full bg-white transition-transform top-0.5 ${
                        settings.maintenanceMode ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Security Settings</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Require 2FA</p>
                    <p className="text-sm text-muted-foreground">
                      All admin accounts must use two-factor authentication
                    </p>
                  </div>
                  <button
                    onClick={() => handleChange('twoFactorRequired', !settings.twoFactorRequired)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.twoFactorRequired ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  >
                    <div
                      className={`absolute w-5 h-5 rounded-full bg-white transition-transform top-0.5 ${
                        settings.twoFactorRequired ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Enable reCAPTCHA</p>
                    <p className="text-sm text-muted-foreground">
                      Protect login and registration forms
                    </p>
                  </div>
                  <button
                    onClick={() => handleChange('captchaEnabled', !settings.captchaEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.captchaEnabled ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  >
                    <div
                      className={`absolute w-5 h-5 rounded-full bg-white transition-transform top-0.5 ${
                        settings.captchaEnabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Session Timeout (hours)
                  </label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={e => handleChange('sessionTimeout', e.target.value)}
                    min="1"
                    max="24"
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Sessions will expire after this duration of inactivity
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Minimum Password Length
                    </label>
                    <input
                      type="number"
                      value={settings.passwordMinLength}
                      onChange={e => handleChange('passwordMinLength', e.target.value)}
                      min="6"
                      max="20"
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => handleChange('passwordRequireSpecial', !settings.passwordRequireSpecial)}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                        settings.passwordRequireSpecial
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      Special Characters {settings.passwordRequireSpecial ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Email Settings */}
        {activeTab === 'email' && (
          <>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-cyan-500" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Email Configuration</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    SMTP Server
                  </label>
                  <input
                    type="text"
                    value={settings.smtpServer}
                    onChange={e => handleChange('smtpServer', e.target.value)}
                    placeholder="smtp.example.com"
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Port
                    </label>
                    <input
                      type="number"
                      value={settings.smtpPort}
                      onChange={e => handleChange('smtpPort', e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={settings.smtpUsername}
                      onChange={e => handleChange('smtpUsername', e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={settings.smtpPassword}
                      onChange={e => handleChange('smtpPassword', e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary pr-10"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive email alerts for important events
                    </p>
                  </div>
                  <button
                    onClick={() => handleChange('emailNotifications', !settings.emailNotifications)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.emailNotifications ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  >
                    <div
                      className={`absolute w-5 h-5 rounded-full bg-white transition-transform top-0.5 ${
                        settings.emailNotifications ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* System Info */}
        {activeTab === 'system' && (
          <>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-gray-500" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">System Information</h2>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-mono text-foreground">1.0.0</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">API Version</span>
                  <span className="font-mono text-foreground">v1</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Environment</span>
                  <span className="font-mono text-foreground">
                    {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
                  </span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">Database</span>
                  <span className="font-mono text-foreground">Supabase (PostgreSQL)</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <Save className="w-5 h-5" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
}
