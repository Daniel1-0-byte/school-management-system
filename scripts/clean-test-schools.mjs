#!/usr/bin/env node

/**
 * Clean up test school signup data from the database
 * This removes all schools, profiles, and school requests so they can retry signup
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[v0] Missing Supabase credentials');
  process.exit(1);
}

console.log('[v0] Initializing Supabase client');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupSchools() {
  try {
    console.log('[v0] Starting cleanup process...\n');

    // Step 1: Get all schools to display what we're deleting
    console.log('[v0] Fetching all schools...');
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, created_at');

    if (schoolsError) {
      console.error('[v0] Error fetching schools:', schoolsError);
      return;
    }

    if (schools.length === 0) {
      console.log('[v0] No schools found in database');
      return;
    }

    console.log(`[v0] Found ${schools.length} schools to delete:`);
    schools.forEach(school => {
      console.log(`  - ${school.name} (${school.id}) - Created: ${new Date(school.created_at).toLocaleString()}`);
    });

    // Step 2: Get all profiles associated with schools
    console.log('\n[v0] Fetching profiles associated with schools...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, school_id')
      .not('school_id', 'is', null);

    if (profilesError) {
      console.error('[v0] Error fetching profiles:', profilesError);
      return;
    }

    console.log(`[v0] Found ${profiles?.length || 0} profiles to delete`);

    // Step 3: Get all school requests
    console.log('[v0] Fetching school requests...');
    const { data: requests, error: requestsError } = await supabase
      .from('school_requests')
      .select('id, school_name, email');

    if (requestsError) {
      console.error('[v0] Error fetching school requests:', requestsError);
      return;
    }

    console.log(`[v0] Found ${requests?.length || 0} school requests to delete`);
    if (requests?.length > 0) {
      requests.forEach(req => {
        console.log(`  - ${req.school_name} (${req.email})`);
      });
    }

    // Step 4: Delete in order (respecting foreign key constraints)
    console.log('\n[v0] Starting deletion process...');

    // Delete profiles first (they reference schools)
    if (profiles && profiles.length > 0) {
      console.log(`[v0] Deleting ${profiles.length} profiles...`);
      const profileIds = profiles.map(p => p.id);
      const { error: deleteProfilesError } = await supabase
        .from('profiles')
        .delete()
        .in('id', profileIds);

      if (deleteProfilesError) {
        console.error('[v0] Error deleting profiles:', deleteProfilesError);
        return;
      }
      console.log('[v0] Profiles deleted successfully');
    }

    // Delete school subscriptions (they reference schools)
    console.log('[v0] Deleting school subscriptions...');
    const { error: deleteSubsError } = await supabase
      .from('school_subscriptions')
      .delete()
      .in('school_id', schools.map(s => s.id));

    if (deleteSubsError) {
      console.error('[v0] Error deleting subscriptions:', deleteSubsError);
      return;
    }

    // Delete school admin invites
    console.log('[v0] Deleting school admin invites...');
    const { error: deleteInvitesError } = await supabase
      .from('school_admin_invites')
      .delete()
      .in('school_id', schools.map(s => s.id));

    if (deleteInvitesError) {
      console.error('[v0] Error deleting invites:', deleteInvitesError);
      return;
    }

    // Delete schools
    console.log(`[v0] Deleting ${schools.length} schools...`);
    const { error: deleteSchoolsError } = await supabase
      .from('schools')
      .delete()
      .in('id', schools.map(s => s.id));

    if (deleteSchoolsError) {
      console.error('[v0] Error deleting schools:', deleteSchoolsError);
      return;
    }
    console.log('[v0] Schools deleted successfully');

    // Delete school requests
    if (requests && requests.length > 0) {
      console.log(`[v0] Deleting ${requests.length} school requests...`);
      const { error: deleteRequestsError } = await supabase
        .from('school_requests')
        .delete()
        .in('id', requests.map(r => r.id));

      if (deleteRequestsError) {
        console.error('[v0] Error deleting requests:', deleteRequestsError);
        return;
      }
      console.log('[v0] School requests deleted successfully');
    }

    console.log('\n✓ Cleanup completed successfully!');
    console.log('[v0] All test school data has been removed from the database');
    console.log('[v0] Schools can now retry signup with the same email addresses\n');

  } catch (error) {
    console.error('[v0] Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupSchools();
