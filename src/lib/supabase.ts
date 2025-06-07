import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'your_supabase_url') {
  throw new Error(
    'Missing or invalid VITE_SUPABASE_URL. Please set this environment variable in your .env file with your Supabase project URL'
  );
}

if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key') {
  throw new Error(
    'Missing or invalid VITE_SUPABASE_ANON_KEY. Please set this environment variable in your .env file with your Supabase anonymous key'
  );
}

try {
  // Validate URL format
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(
    `Invalid VITE_SUPABASE_URL format. The URL must be a complete and valid URL (e.g., https://your-project-ref.supabase.co)`
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);