import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vdijqwlbgkecwxxlvvyz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_LULOnIeze-vcaMLmYMn5PA_Y5d4z2Uf'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)