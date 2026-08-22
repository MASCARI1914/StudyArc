import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tqleixdqykxlkvswbmlh.supabase.co';
const supabaseAnonKey = 'sb_publishable_zT2WundG880rcDomzfuIgA_mOZzpgGe';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);