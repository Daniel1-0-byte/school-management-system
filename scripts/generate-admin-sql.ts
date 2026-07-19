import promptSync from 'prompt-sync';
import { hashPassword } from '../lib/platform-admin-auth.server';
import { randomUUID } from 'crypto';

const prompt = promptSync({ sigint: true });

async function main() {
  console.log('\n=== Platform Admin SQL Generator ===\n');

  // Get user input
  const firstName = prompt('First name: ').trim();
  if (!firstName) {
    console.error('Error: First name is required');
    process.exit(1);
  }

  const lastName = prompt('Last name: ').trim();
  if (!lastName) {
    console.error('Error: Last name is required');
    process.exit(1);
  }

  const password = prompt.hide('Password (min 8 chars): ');
  if (!password || password.length < 8) {
    console.error('Error: Password must be at least 8 characters');
    process.exit(1);
  }

  const confirmPassword = prompt.hide('Confirm password: ');
  if (password !== confirmPassword) {
    console.error('Error: Passwords do not match');
    process.exit(1);
  }

  // Generate hash and UUID
  const hashedPassword = hashPassword(password);
  const adminId = randomUUID();
  const email = 'danielantwi237@gmail.com';
  const now = new Date().toISOString();

  // Escape single quotes for SQL
  const escapedFirstName = firstName.replace(/'/g, "''");
  const escapedLastName = lastName.replace(/'/g, "''");

  // Generate SQL
  const sql = `INSERT INTO platform_admins (id, email, first_name, last_name, password_hash, status, totp_enabled, created_at, updated_at, last_login_at)
VALUES (
  '${adminId}',
  '${email}',
  '${escapedFirstName}',
  '${escapedLastName}',
  '${hashedPassword}',
  'active',
  false,
  '${now}',
  '${now}',
  NULL
);`;

  // Output ONLY the SQL (no other text)
  console.log('\n');
  console.log(sql);
  console.log('\n');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
