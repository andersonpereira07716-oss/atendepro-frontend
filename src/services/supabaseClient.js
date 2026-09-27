import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gnbvvdxxqipybarhgwgj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduYnZ2ZHh4cWlweWJhcmh3Z3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNTM0MjIsImV4cCI6MjEwNTgyOTQyMn0.lMpb7Ie2KXqfMfmR1CTZZWN4d3FXrZ7UyzxAqOxTiUg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
