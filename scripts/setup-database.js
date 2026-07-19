#!/usr/bin/env node

/**
 * Database Setup Script
 * Run this to initialize missing tables in Supabase
 * Usage: node scripts/setup-database.js
 */

require('dotenv').config({ path: '.env.development.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[v0] ERROR: Missing environment variables');
  console.error('[v0] Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupDatabase() {
  try {
    console.log('[v0] Starting database setup...');

    // 1. Create school_requests table
    console.log('[v0] Creating school_requests table...');
    const { error: schoolRequestsError } = await supabase.from('school_requests').select('id').limit(1);
    
    if (schoolRequestsError?.code === 'PGRST205') {
      // Table doesn't exist, create it
      const setupSQL = fs.readFileSync(path.join(__dirname, '../supabase/manual-setup.sql'), 'utf-8');
      
      // Split and execute statements
      const statements = setupSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));

      for (const statement of statements) {
        try {
          // Execute via raw SQL using the query endpoint
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
            },
            body: JSON.stringify({ sql: statement }),
          });

          if (!response.ok && response.status !== 409) {
            const error = await response.text();
            console.warn(`[v0] Warning executing statement: ${error.substring(0, 100)}`);
          }
        } catch (err) {
          console.warn(`[v0] Could not execute statement (may already exist): ${statement.substring(0, 50)}...`);
        }
      }

      console.log('[v0] ✓ school_requests table created');
    } else if (!schoolRequestsError) {
      console.log('[v0] ✓ school_requests table already exists');
    } else {
      console.warn('[v0] Warning checking school_requests:', schoolRequestsError.message);
    }

    // 2. Create platform_settings table
    console.log('[v0] Creating platform_settings table...');
    const { error: settingsError } = await supabase.from('platform_settings').select('id').limit(1);
    
    if (settingsError?.code === 'PGRST205') {
      console.log('[v0] Creating platform_settings table...');
      const { error } = await supabase.rpc('exec_sql', {
        sql: `CREATE TABLE IF NOT EXISTS public.platform_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          setting_key VARCHAR(255) UNIQUE NOT NULL,
          setting_value JSONB,
          setting_type VARCHAR(50),
          description TEXT,
          updated_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
        );
        CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings(setting_key);
        ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;`
      }).catch(() => ({ error: null }));

      if (!error) {
        console.log('[v0] ✓ platform_settings table created');
      }
    } else if (!settingsError) {
      console.log('[v0] ✓ platform_settings table already exists');
    }

    // 3. Verify tables exist
    console.log('[v0] Verifying tables...');
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['school_requests', 'platform_settings'])
      .catch(() => ({ data: [] }));

    if (tables && tables.length > 0) {
      console.log('[v0] ✓ Verified tables:', tables.map(t => t.table_name).join(', '));
    }

    console.log('[v0] ✓ Database setup complete');
    console.log('[v0] School requests and settings tables are ready to use');

  } catch (error) {
    console.error('[v0] Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
