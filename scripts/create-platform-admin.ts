import { createClient } from '@supabase/supabase-js';
import promptSync from 'prompt-sync';
import { hashPassword } from '../lib/platform-admin-auth.server';

const prompt = promptSync({ sigint: true });

// Note: These must be set in .env.local before running this script
// They are read from process.env, not from lib/env.ts which is for Next.js only
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function main() {
  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\nError: Missing required environment variables.\n');
    console.error('Please create a .env.local file in the project root with:\n');
    console.error('  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
    console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key\n');
    console.error('You can get these from your Supabase project settings.\n');
    process.exit(1);
  }

  // Initialize Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('\n=== Create Platform Admin ===\n');

  // Prompt for first name
  const firstName = prompt('First name: ');
  if (!firstName.trim()) {
    console.error('Error: First name is required.');
    process.exit(1);
  }

  // Prompt for last name
  const lastName = prompt('Last name: ');
  if (!lastName.trim()) {
    console.error('Error: Last name is required.');
    process.exit(1);
  }

  // Prompt for email (with default)
  const defaultEmail = 'danielantwi237@gmail.com';
  const emailInput = prompt(`Email (default: ${defaultEmail}): `);
  const email = emailInput.trim() || defaultEmail;

  if (!email.includes('@')) {
    console.error('Error: Invalid email address.');
    process.exit(1);
  }

  // Check if admin with this email already exists
  const { data: existingAdmin, error: checkError } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('email', email)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 means no rows found, which is what we want
    console.error('Error: Failed to check existing admin.');
    process.exit(1);
  }

  if (existingAdmin) {
    console.log('A platform admin with this email already exists.');
    process.exit(0);
  }

  // Prompt for password (hidden input)
  const password = prompt.hide('Password: ');
  if (!password || password.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  // Prompt for password confirmation
  const confirmPassword = prompt.hide('Confirm password: ');
  if (password !== confirmPassword) {
    console.error('Error: Passwords do not match.');
    process.exit(1);
  }

  // Hash the password
  const passwordHash = hashPassword(password);

  // Insert the admin into the platform_admins table
  const { error: insertError } = await supabase
    .from('platform_admins')
    .insert({
      email,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      password_hash: passwordHash,
      status: 'active',
      totp_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error('Error: Failed to create platform admin.');
    console.error(insertError.message);
    process.exit(1);
  }

  console.log('Platform admin created successfully.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
