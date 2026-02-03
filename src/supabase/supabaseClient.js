import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xlqacsxmqahizlklvhfp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhscWFjc3htcWFoaXpsa2x2aGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwOTQxNTAsImV4cCI6MjA4NTY3MDE1MH0.DAYvGHmia5zwiEvK0W-oGDO9H4fDA96CLhW_DhIlQEo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Initialize Supabase
export async function initializeSupabase() {
  try {
    // Check connection
    const { data, error } = await supabase.from('events').select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }
    
    console.log('Supabase connected successfully')
    return true
  } catch (error) {
    console.error('Failed to initialize Supabase:', error)
    return false
  }
}
