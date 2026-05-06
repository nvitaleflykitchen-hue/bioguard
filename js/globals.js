// =============================================
// BIOGUARD — Global Configuration & State
// =============================================
const SUPABASE_URL = 'https://oaelabufwmgfkbikkfov.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZWxhYnVmd21nZmtiaWtrZm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMDkyMzUsImV4cCI6MjA5MTg4NTIzNX0.g30wdbeoE4DxGkM-b_fy7uPZXiZW2V4YU3IMPBIKP_Y';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Storage keys
const STORAGE_KEY_REAL = 'bioguard_results_real';
const STORAGE_KEY_DEMO = 'bioguard_results_demo_active';

// Application state
let isDemoMode = false;
let activeScenarioName = '';
let activeScenarioId = ''; // TRACKER FOR CASE STUDY MODE
let activeEstId = localStorage.getItem('bioguard_active_est_id') || 'default';
let establishments = JSON.parse(localStorage.getItem('bioguard_establishments')) || [{id: 'default', name: 'FlyKitchen'}];
let charts = {}; // Track all active Chart.js instances

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initAuth();  // Auth FIRST, then app
    initVault();
    registerSW();
});

function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('PWA Service Worker Registered'))
            .catch(err => console.error('SW Match Error:', err));
    }
}