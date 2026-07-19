#!/usr/bin/env node

/**
 * Interactive cleanup script to remove test school signup data
 * Prompts for Supabase credentials if not in environment
 */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function getCredentials() {
  console.log('[v0] Supabase credentials not found in environment\n');
  
  const supabaseUrl = await question('Enter your Supabase URL: ');
  const supabaseServiceKey = await question('Enter your Supabase Service Role Key: ');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[v0] Credentials are required');
    process.exit(1);
  }

  return { supabaseUrl, supabaseServiceKey };
}

async function cleanupSchools() {
  try {
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      const creds = await getCredentials();
      supabaseUrl = creds.supabaseUrl;
      supabaseServiceKey = creds.supabaseServiceKey;
    }

    console.log('\n[v0] Initializing Supabase client');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[v0] Starting cleanup process...\n');

    // Step 1: Get all schools
    console.log('[v0] Fetching all schools...');
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, created_at');

    if (schoolsError) {
      console.error('[v0] Error fetching schools:', schoolsError);
      rl.close();
      return;
    }

    if (schools.length === 0) {
      console.log('[v0] No schools found in database');
      rl.close();
      return;
    }

    console.log(`[v0] Found ${schools.length} schools to delete:`);
    schools.forEach(school => {
      console.log(`  - ${school.name} (${school.id}) - Created: ${new Date(school.created_at).toLocaleString()}`);
    });

    // Step 2: Get all profiles
    console.log('\n[v0] Fetching profiles associated with schools...');
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, school_id')
      .not('school_id', 'is', null);

    console.log(`[v0] Found ${profiles?.length || 0} profiles to delete`);

    // Step 3: Get school requests
    console.log('[v0] Fetching school requests...');
    const { data: requests } = await supabase
      .from('school_requests')
      .select('id, school_name, email');

    console.log(`[v0] Found ${requests?.length || 0} school requests to delete`);
    if (requests?.length > 0) {
      requests.forEach(req => {
        console.log(`  - ${req.school_name} (${req.email})`);
      });
    }

    // Confirm before deleting
    console.log('\n[v0] About to delete all this data. This cannot be undone.');
    const confirm = await question('[v0] Are you sure? Type "DELETE" to confirm: ');

    if (confirm !== 'DELETE') {
      console.log('[v0] Cleanup cancelled');
      rl.close();
      return;
    }

    console.log('\n[v0] Starting deletion process...');

    // Delete profiles
    if (profiles && profiles.length > 0) {
      console.log(`[v0] Deleting ${profiles.length} profiles...`);
      const profileIds = profiles.map(p => p.id);
      const { error: deleteProfilesError } = await supabase
        .from('profiles')
        .delete()
        .in('id', profileIds);

      if (deleteProfilesError) {
        console.error('[v0] Error deleting profiles:', deleteProfilesError);
        rl.close();
        return;
      }
      console.log('[v0] ✓ Profiles deleted');
    }

    // Delete subscriptions
    console.log('[v0] Deleting school subscriptions...');
    await supabase
      .from('school_subscriptions')
      .delete()
      .in('school_id', schools.map(s => s.id));
    console.log('[v0] ✓ Subscriptions deleted');

    // Delete invites
    console.log('[v0] Deleting school admin invites...');
    await supabase
      .from('school_admin_invites')
      .delete()
      .in('school_id', schools.map(s => s.id));
    console.log('[v0] ✓ Invites deleted');

    // Delete schools
    console.log(`[v0] Deleting ${schools.length} schools...`);
    const { error: deleteSchoolsError } = await supabase
      .from('schools')
      .delete()
      .in('id', schools.map(s => s.id));

    if (deleteSchoolsError) {
      console.error('[v0] Error deleting schools:', deleteSchoolsError);
      rl.close();
      return;
    }
    console.log('[v0] ✓ Schools deleted');

    // Delete requests
    if (requests && requests.length > 0) {
      console.log(`[v0] Deleting ${requests.length} school requests...`);
      await supabase
        .from('school_requests')
        .delete()
        .in('id', requests.map(r => r.id));
      console.log('[v0] ✓ Requests deleted');
    }

    console.log('\n✓ Cleanup completed successfully!');
    console.log('[v0] All test school data has been removed');
    console.log('[v0] Schools can now retry signup with the same email addresses\n');

    rl.close();

  } catch (error) {
    console.error('[v0] Cleanup failed:', error);
    rl.close();
    process.exit(1);
  }
}

// Run cleanup
cleanupSchools();
