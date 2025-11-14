import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Lesson = {
  id: string;
  outline: string;
  status: 'generating' | 'generated' | 'error';
  typescript_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};
