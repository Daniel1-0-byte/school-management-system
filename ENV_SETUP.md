# Environment Variable Setup

## Before Running `pnpm create-admin`

You **MUST** create a `.env.local` file in the project root. The setup script reads from `process.env`, not from `lib/env.ts` (which is Next.js-only).

### Step 1: Create `.env.local`

Create a file named `.env.local` in the project root directory:

```bash
touch .env.local
```

### Step 2: Add Supabase Credentials

Open `.env.local` and add these two lines:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Get Your Credentials from Supabase

1. Log in to [Supabase](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → paste as `NEXT_PUBLIC_SUPABASE_URL`
   - **Service Role Secret** → paste as `SUPABASE_SERVICE_ROLE_KEY`

### Example `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://xyzabc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2OTQ0NDQ0NDQsImV4cCI6MjAwMDAwMDAwMH0.abcd...
```

## Security Note

⚠️ **Important**: 
- `.env.local` is in `.gitignore` and will NOT be committed to git
- The `SUPABASE_SERVICE_ROLE_KEY` is sensitive - never share it
- Keep `.env.local` only on your local machine

## For Vercel Deployment

Once deployed to Vercel, you don't need `.env.local`:

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add the same variables as above
3. The `create-admin` script won't be run on Vercel (it's for local setup only)

## For Next.js App (Not the Script)

The Next.js app uses `lib/env.ts` which automatically loads from:
- `.env.local` (local development)
- Vercel Environment Variables (production)

The setup **script** reads directly from `process.env`, so it needs `.env.local` to exist.

## Quick Checklist

- [ ] Create `.env.local` in project root
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Run `pnpm create-admin`
- [ ] Follow interactive prompts

---

If you see: *"Error: Missing required environment variables"*
→ Check that `.env.local` exists and has both variables
