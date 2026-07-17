import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://psftgweqjfefrjtsmhoy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZnRnd2VxamZlZnJqdHNtaG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODMxNzQsImV4cCI6MjA5OTc1OTE3NH0.y23eMZTdmF5B0xkrTNTSdKNkza3U8-wRU9f2xfiOZx8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
