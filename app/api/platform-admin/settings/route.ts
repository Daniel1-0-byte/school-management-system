import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { formatSupabaseError } from '@/lib/supabase';

interface PlatformSettings {
  id: string;
  siteName: string;
  maintenanceMode: boolean;
  emailNotifications: boolean;
  twoFactorRequired: boolean;
  sessionTimeout: number;
  captchaEnabled: boolean;
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  smtpServer: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword?: string;
  updated_at: string;
}

async function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// GET /api/platform-admin/settings - Fetch platform settings
export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[v0] Failed to fetch settings:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    // Return default settings if none exist
    const defaultSettings: Partial<PlatformSettings> = {
      siteName: 'School Management System',
      maintenanceMode: false,
      emailNotifications: true,
      twoFactorRequired: true,
      sessionTimeout: 8,
      captchaEnabled: true,
      passwordMinLength: 8,
      passwordRequireSpecial: true,
      smtpServer: '',
      smtpPort: 587,
      smtpUsername: '',
    };

    console.log('[v0] Settings fetched:', { hasData: !!data });

    return NextResponse.json({
      success: true,
      data: data || defaultSettings,
    });
  } catch (error) {
    console.error('[v0] Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/platform-admin/settings - Update platform settings
export async function PUT(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      siteName,
      maintenanceMode,
      emailNotifications,
      twoFactorRequired,
      sessionTimeout,
      captchaEnabled,
      passwordMinLength,
      passwordRequireSpecial,
      smtpServer,
      smtpPort,
      smtpUsername,
      smtpPassword,
    } = body;

    // Validate required fields
    if (!siteName) {
      return NextResponse.json({ error: 'Site name is required' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    // Try to update existing settings, or insert if none exist
    const { data: existingSettings, error: fetchError } = await supabase
      .from('platform_settings')
      .select('id')
      .single();

    const settingsData = {
      siteName,
      maintenanceMode,
      emailNotifications,
      twoFactorRequired,
      sessionTimeout: parseInt(sessionTimeout),
      captchaEnabled,
      passwordMinLength: parseInt(passwordMinLength),
      passwordRequireSpecial,
      smtpServer,
      smtpPort: parseInt(smtpPort),
      smtpUsername,
      ...(smtpPassword && { smtpPassword }),
      updated_at: new Date().toISOString(),
    };

    let response;

    if (existingSettings?.id) {
      // Update existing
      response = await supabase
        .from('platform_settings')
        .update(settingsData)
        .eq('id', existingSettings.id)
        .select()
        .single();

      console.log('[v0] Settings updated:', { id: existingSettings.id });
    } else {
      // Insert new
      response = await supabase
        .from('platform_settings')
        .insert([settingsData])
        .select()
        .single();

      console.log('[v0] Settings created');
    }

    if (response.error) {
      console.error('[v0] Failed to save settings:', response.error);
      return NextResponse.json({ error: formatSupabaseError(response.error) }, { status: 400 });
    }

    // Log audit entry
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: adminId,
        action: 'settings_updated',
        target_type: 'settings',
        target_id: 'platform',
        target_name: 'Platform Settings',
      })
      .catch(err => console.error('[v0] Failed to log settings audit:', err));

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Settings saved successfully',
    });
  } catch (error) {
    console.error('[v0] Error saving settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
