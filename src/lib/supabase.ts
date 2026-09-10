import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton client — só cria se as vars estiverem configuradas
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (_client) return _client;
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id')) {
    console.warn('[Supabase] Variáveis de ambiente não configuradas. Usando modo local-only.');
    return null;
  }
  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('your-project-id');
};