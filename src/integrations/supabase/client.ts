import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

if (!isSupabaseConfigured) {
  console.error(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. The app will show a configuration screen instead of a blank page.',
  );
}

// The placeholder client is never used for a real request because main.tsx gates
// rendering on isSupabaseConfigured. It keeps module evaluation safe in tests and
// in misconfigured preview builds.
export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://missing-configuration.supabase.co',
  SUPABASE_PUBLISHABLE_KEY || 'missing-configuration',
  {
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
