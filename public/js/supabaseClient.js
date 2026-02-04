// public/js/supabaseClient.js
// Supabase Client Initialization
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test connection
async function testConnection() {
    try {
        const { data, error } = await supabase.from('test').select('*').limit(1);
        if (error) throw error;
        console.log('Supabase connection successful');
        return true;
    } catch (error) {
        console.error('Supabase connection failed:', error);
        return false;
    }
}

// Initialize connection on page load
document.addEventListener('DOMContentLoaded', async () => {
    const isConnected = await testConnection();
    if (!isConnected) {
        console.warn('Using mock data due to connection issues');
    }
});

export { supabase };