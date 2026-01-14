// KnowYou Client - Supports both Supabase and AWS backends
// Automatically detects which backend to use based on environment variables

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Check if we're using AWS backend
const USE_AWS = Boolean(import.meta.env.VITE_AWS_USER_POOL_ID);

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Create Supabase client (works with both Supabase and PostgREST)
// PostgREST is compatible with Supabase client for database operations
export const supabase = createClient<Database>(
  USE_AWS ? import.meta.env.VITE_AWS_DB_ENDPOINT || SUPABASE_URL : SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY || 'not-used-with-postgrest',
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// Export AWS config for components that need direct AWS access
export const awsConfig = USE_AWS ? {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID,
  clientId: import.meta.env.VITE_AWS_CLIENT_ID,
  s3Bucket: import.meta.env.VITE_AWS_S3_BUCKET,
} : null;

// Log which backend is being used (helpful for debugging)
if (import.meta.env.DEV) {
  console.log(`[KnowYou] Using ${USE_AWS ? 'AWS' : 'Supabase'} backend`);
}
