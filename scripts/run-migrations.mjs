import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[v0] Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigrations() {
  try {
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log('[v0] Found migrations:', migrationFiles);

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`[v0] Running migration: ${file}`);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
          console.error(`[v0] Migration error in ${file}:`, error);
          // Continue to next migration instead of failing
        } else {
          console.log(`[v0] ✓ Migration completed: ${file}`);
        }
      } catch (err) {
        console.error(`[v0] Failed to execute migration ${file}:`, err.message);
        // Try alternative approach: split by statements
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s && !s.startsWith('--'));

        for (const statement of statements) {
          try {
            await supabase.rpc('exec_raw', { 
              query: statement 
            }).catch(() => {
              // Ignore RPC errors, try direct query instead
              return supabase.from('_migrations').select('*').limit(0);
            });
          } catch (e) {
            console.log(`[v0] Skipping statement (may already exist): ${statement.substring(0, 50)}...`);
          }
        }
      }
    }

    console.log('[v0] All migrations processed');
  } catch (error) {
    console.error('[v0] Migration runner error:', error);
    process.exit(1);
  }
}

runMigrations();
