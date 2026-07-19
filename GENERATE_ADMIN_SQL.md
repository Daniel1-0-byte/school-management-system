# Generate Admin SQL INSERT Statement

This script generates a ready-to-paste SQL INSERT statement for creating the initial platform admin directly in Supabase, without needing Node.js or environment variables.

## Usage

```bash
pnpm generate-admin-sql
```

## What It Does

1. Prompts you for:
   - First name
   - Last name
   - Password (hidden input)
   - Confirm password

2. Generates:
   - PBKDF2 password hash (using 100,000 iterations)
   - New UUID for admin id
   - Complete SQL INSERT statement

3. Outputs ONLY the SQL statement (nothing else)

## Example Output

```sql
INSERT INTO platform_admins (id, email, first_name, last_name, password_hash, status, totp_enabled, created_at, updated_at, last_login_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'danielantwi237@gmail.com',
  'Daniel',
  'Antwi',
  'a1b2c3d4e5f6....',
  'active',
  false,
  '2024-01-15T10:30:00.000Z',
  '2024-01-15T10:30:00.000Z',
  NULL
);
```

## How to Use It

### Step 1: Run the script

```bash
pnpm generate-admin-sql
```

### Step 2: Enter your details

```
=== Platform Admin SQL Generator ===

First name: Daniel
Last name: Antwi
Password (min 8 chars): ••••••••
Confirm password: ••••••••
```

### Step 3: Copy the SQL

The script outputs the SQL statement. Copy it from your terminal.

### Step 4: Paste into Supabase

1. Go to your Supabase project → **SQL Editor**
2. Create a new query
3. Paste the SQL statement
4. Click **Run**

You're done! The admin is created in the database.

## Details

- **Email**: Fixed to `danielantwi237@gmail.com`
- **Status**: Set to `active`
- **TOTP**: Set to `false` (can enable later in admin dashboard)
- **Password**: PBKDF2 with 100,000 iterations (never logged or printed)
- **ID**: Auto-generated UUID v4

## Advantages Over `pnpm create-admin`

| Aspect | `generate-admin-sql` | `create-admin` |
|--------|----------------------|----------------|
| Requires `.env.local` | ❌ No | ✅ Yes |
| Requires Supabase connection | ❌ No | ✅ Yes |
| Output | SQL only | Inserts directly |
| Copy-paste friendly | ✅ Yes | ❌ No |
| Great for scripts/automation | ✅ Yes | ❌ No |

## Troubleshooting

**"Password must be at least 8 characters"**
→ Use a stronger password (8+ chars)

**"Passwords do not match"**
→ Retype both passwords carefully

**"First name is required"**
→ Provide a first name

**Nothing copied from Supabase SQL**
→ Run the script again and copy the SQL output

## Security

- Passwords are hidden during input
- Plain-text password is never logged
- Hash is generated using production-grade PBKDF2
- Script runs locally (no data sent anywhere)
