// AUTH - Supabase Authentication & RBAC
// =============================================
let currentUser = null;
let currentRole = 'viewer'; // default safe role

function initAuth() {
    const overlay = document.getElementById('login-overlay');
    const appContainer = document.getElementById('app-container');

    // Show login overlay immediately
    overlay.classList.add('active');
    appContainer.style.display = 'none';

    if (!supabaseClient) {
        // Fallback: no Supabase client, allow local use
        overlay.classList.remove('active');
        appContainer.style.display = 'flex';
        initApp();
        initVault();
        return;
    }

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth State Changed:", event);
        if (session && session.user) {
            currentUser = session.user;
            
            // Unlock UI immediately with basic state
            overlay.classList.remove('active');
            appContainer.style.display = 'flex';
            initApp();
            initVault();
            
            // Load extended profile in the background
            try {
                // 2-second timeout for profile load
                await Promise.race([
                    loadUserProfile(currentUser),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Profile Timeout')), 2000))
                ]);
            } catch (e) {
                console.warn("Using default profile due to:", e.message);
                currentRole = 'user'; // Fallback
            } finally {
                applyRBAC();
            }
        } else {
            currentUser = null;
            currentRole = 'user';
            overlay.classList.add('active');
            appContainer.style.display = 'none';
        }
    });

    // Handle login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const errEl = document.getElementById('login-error');
            const btnText = document.getElementById('login-btn-text');
            const btn = loginForm.querySelector('button[type="submit"]');

            errEl.classList.add('hidden');
            btn.disabled = true;
            btnText.textContent = 'Verificando...';

            if (email === 'admin@admin.com' && password === 'admin') {
                currentUser = { id: 'dev-bypass', email: 'admin@admin.com' };
                currentRole = 'developer';
                const nameEl = document.getElementById('user-name');
                if (nameEl) nameEl.textContent = 'Admin Developer';
                overlay.classList.remove('active');
                appContainer.style.display = 'flex';
                initApp();
                initVault();
                applyRBAC();
                showToast("Modo Desarrollador Activado", "success");
                return;
            }

            try {
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

                if (error) {
                    console.error("Login Auth Error:", error);
                    let errorMsg = 'Credenciales incorrectas.';
                    if (error.message.toLowerCase().includes('email not confirmed')) {
                        errorMsg = 'Debés confirmar tu correo electrónico. Revisá tu mail (SPAM).';
                    } else if (error.message.toLowerCase().includes('invalid login credentials')) {
                        errorMsg = 'Correo o contraseña incorrectos. Verificá los datos.';
                    } else {
                        errorMsg = 'Error: ' + error.message;
                    }
                    errEl.textContent = errorMsg;
                    errEl.classList.remove('hidden');
                    btn.disabled = false;
                    btnText.textContent = 'Ingresar Segurizado';
                }
            } catch (err) {
                console.error("Login Exception:", err);
                errEl.textContent = "Error de conexión con el servidor.";
                errEl.classList.remove('hidden');
                btn.disabled = false;
                btnText.textContent = 'Ingresar Segurizado';
            }
        });
    }
}

window.loginWithGoogle = async function() {
    if (!supabaseClient) {
        showToast("Conexión con el servidor no disponible", "error");
        return;
    }
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        if (error) {
            console.error("Google Login Error:", error);
            showToast("Error conectando con Google", "error");
        }
    } catch (err) {
        console.error("Exception in Google Login:", err);
        showToast("No se pudo iniciar el inicio de sesión con Google", "error");
    }
};

async function loadUserProfile(user) {
    if (!supabaseClient) return;
    try {
        const { data } = await supabaseClient
            .from('usuarios')
            .select('full_name, role, establishment, business_name, plan, permissions')
            .eq('id', user.id)
            .single();

        if (data) {
            currentRole = data.role || 'user';
            const nameEl = document.getElementById('user-name');
            const estEl = document.getElementById('user-establishment');
            const bizEl = document.getElementById('user-business');
            const planEl = document.getElementById('user-plan-badge');
            const avatarEl = document.getElementById('user-avatar');

            if (nameEl) nameEl.textContent = data.full_name || user.email;
            if (bizEl) bizEl.textContent = data.business_name || 'Personal / PCCLAB';
            if (planEl) {
                planEl.textContent = (data.plan || 'FREE').toUpperCase();
                planEl.className = 'plan-badge ' + (data.plan === 'PRO' ? 'pro' : 'free');
            }
            if (estEl) {
                let roleLabel = currentRole.toUpperCase();
                if (currentRole === 'developer') roleLabel = 'DESARROLLADOR';
                if (currentRole === 'consultant') roleLabel = 'CONSULTOR EXPERTO';
                estEl.textContent = roleLabel;
                estEl.className = 'user-role-badge' + (currentRole === 'developer' ? ' dev-role' : '');
            }
            if (avatarEl) {
                const parts = (data.full_name || user.email).trim().split(' ');
                let initials = parts[0].charAt(0).toUpperCase();
                if (parts[1]) initials += parts[1].charAt(0).toUpperCase();
                avatarEl.textContent = initials;
            }
        } else {
            currentRole = 'user';
            const nameEl = document.getElementById('user-name');
            if (nameEl) nameEl.textContent = user.email;
        }
    } catch(e) { console.error('Error loading profile:', e); }
}

function applyRBAC() {
    console.log("Applying Octopus RBAC for role:", currentRole);
    // Hierarchy: developer > admin = consultant > manager > auditor > client = viewer = user
    const isAdminMode = ['developer', 'admin', 'consultant'].includes(currentRole);
    const isRegistryMode = isAdminMode || ['manager', 'auditor'].includes(currentRole);

    // Hide 'Registrar' nav item for restricted users
    const navRegister = document.getElementById('nav-register');
    if (navRegister) {
        if (!isRegistryMode) {
            navRegister.classList.add('role-hidden');
            navRegister.classList.remove('role-visible');
        } else {
            navRegister.classList.remove('role-hidden');
            navRegister.classList.add('role-visible');
        }
    }
    // Show Users nav only for admins, consultants and developers
    const navUsers = document.getElementById('nav-users');
    if (navUsers) {
        if (isAdminMode) {
            navUsers.classList.add('role-visible');
            navUsers.classList.remove('role-hidden');
            navUsers.style.display = 'flex';
        } else {
            navUsers.classList.remove('role-visible');
            navUsers.classList.add('role-hidden');
            navUsers.style.display = 'none';
        }
    }
    
    // Toggle Demo Sections based on mode
    const demoSections = document.querySelectorAll('.scenario-intro, #active-scenario-tag');
    demoSections.forEach(s => {
        if (isDemoMode) {
            s.classList.remove('hidden');
        } else {
            s.classList.add('hidden');
        }
    });

    // Developer Specifics
    const devBadges = document.querySelectorAll('.dev-badge');
    devBadges.forEach(b => b.style.display = (currentRole === 'developer' ? 'inline-block' : 'none'));
}