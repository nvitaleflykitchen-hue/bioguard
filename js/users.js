// USER MANAGEMENT (Admin Only)
// =============================================
async function loadUsersView() {
    const isAdminMode = ['developer', 'admin', 'consultant'].includes(currentRole);
    if (!isAdminMode || !supabaseClient) return;
    const grid = document.getElementById('users-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="users-loading"><i data-lucide="loader" class="spin"></i><span>Cargando usuarios Octopus...</span></div>';
    lucide.createIcons();

    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .order('full_name', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            grid.innerHTML = `
                <div class="empty-state-container" style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; background: rgba(255,255,255,0.02); border-radius: var(--r-xl); border: 1px dashed var(--border);">
                    <i data-lucide="users" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 1.5rem;"></i>
                    <h3 style="color: #fff; margin-bottom: 0.5rem;">No hay usuarios registrados</h3>
                    <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto 2rem;">Aún no has invitado a nadie a tu organización. Los usuarios que invites aparecerán aquí.</p>
                    <button class="btn btn-primary" onclick="openInviteModal()">
                        <i data-lucide="user-plus"></i> Invitar Primer Usuario
                    </button>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        grid.innerHTML = data.map(u => {
            const parts = (u.full_name || '?').trim().split(' ');
            let initials = parts[0].charAt(0).toUpperCase();
            if (parts[1]) initials += parts[1].charAt(0).toUpperCase();
            const isCurrentUser = currentUser && u.id === currentUser.id;
            const planClass = u.plan === 'PRO' ? 'pro-user' : 'free-user';
            
            return `
            <div class="user-card ${planClass}">
                <div class="user-card-header">
                    <div class="user-card-avatar">${initials}</div>
                    <div class="user-card-info">
                        <div class="user-card-name">
                            ${u.full_name} 
                            ${isCurrentUser ? '<span class="self-badge" style="font-size:0.6rem; background:var(--accent); color:white; padding:2px 6px; border-radius:4px; margin-left:5px;">VOS</span>' : ''}
                        </div>
                        <div class="user-card-email">${u.business_name || 'Sin Empresa Definida'}</div>
                    </div>
                </div>
                <div class="user-card-body" style="margin-bottom: 1rem;">
                    <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Nivel Octopus</span>
                        <span class="user-role-tag" style="font-size:0.7rem; color:var(--accent-2); font-weight:700;">${(u.role || 'user').toUpperCase()}</span>
                    </div>
                    <select class="role-select-inline" onchange="updateUserRole('${u.id}', this.value)" ${isCurrentUser ? 'disabled' : ''}>
                        <option value="user" ${u.role==='user'?'selected':''}>User (Básico)</option>
                        <option value="client" ${u.role==='client'?'selected':''}>Client (Solo Lectura)</option>
                        <option value="manager" ${u.role==='manager'?'selected':''}>Manager (Supervisor)</option>
                        <option value="auditor" ${u.role==='auditor'?'selected':''}>Auditor (Calidad)</option>
                        <option value="consultant" ${u.role==='consultant'?'selected':''}>Consultant (Experto)</option>
                        <option value="admin" ${u.role==='admin'?'selected':''}>Admin (Control Total)</option>
                        <option value="developer" ${u.role==='developer'?'selected':''}>Developer</option>
                    </select>
                </div>
                <div class="user-card-actions">
                    <button class="btn btn-secondary btn-small" onclick="resetUserPassword('${u.id}')" title="Restablecer Contraseña">
                        <i data-lucide="key"></i> Clave
                    </button>
                    ${!isCurrentUser ? `
                    <button class="btn btn-error btn-small btn-delete-user" onclick="deleteUserProfile('${u.id}', '${u.full_name}')" style="margin-left: auto;">
                        <i data-lucide="trash-2"></i>
                    </button>
                    ` : ''}
                </div>
            </div>`;
        }).join('');
        lucide.createIcons();
    } catch (e) {
        console.error("Error cargando usuarios:", e);
        grid.innerHTML = '<div class="users-loading">Error al conectar con la base de datos de usuarios.</div>';
    }
}

window.updateUserRole = async function(userId, newRole) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient
        .from('usuarios')
        .update({ role: newRole })
        .eq('id', userId);
    if (error) showToast('Error: ' + error.message, 'error');
};

window.deleteUserProfile = async function(userId, name) {
    showCustomModal({
        title: 'Eliminar Usuario',
        message: `¿Estás seguro que querés quitarle el acceso a <strong>${name}</strong>? Esta acción no se puede deshacer.`,
        type: 'error',
        confirmText: 'Eliminar',
        onConfirm: async () => {
            const { error } = await supabaseClient
                .from('usuarios')
                .delete()
                .eq('id', userId);
            if (error) { showToast('Error: ' + error.message, 'error'); return; }
            showToast('Usuario eliminado correctamente', 'success');
            loadUsersView();
        }
    });
};

window.openInviteModal = function() {
    document.getElementById('invite-modal').classList.remove('hidden');
    document.getElementById('invite-name').value = '';
    document.getElementById('invite-email').value = '';
    document.getElementById('invite-error').classList.add('hidden');
    document.getElementById('invite-success').classList.add('hidden');
    lucide.createIcons();
};

window.closeInviteModal = function() {
    document.getElementById('invite-modal').classList.add('hidden');
};

window.inviteUser = async function() {
    const name = document.getElementById('invite-name').value.trim();
    const email = document.getElementById('invite-email').value.trim();
    const business = document.getElementById('invite-business').value.trim();
    const role = document.getElementById('invite-role').value;
    const plan = document.getElementById('invite-plan').value;
    const establishment = document.getElementById('invite-establishment').value.trim();

    const errEl = document.getElementById('invite-error');
    const successEl = document.getElementById('invite-success');
    const btn = document.getElementById('invite-btn');

    errEl.classList.add('hidden');
    successEl.classList.add('hidden');

    if (!name || !email) {
        errEl.textContent = 'Completá nombre y correo electrónico.';
        errEl.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span>Procesando...</span>';

    // Redirect always to Vercel production, never localhost
    const appUrl = window.location.hostname === 'localhost'
        ? window.location.origin
        : 'https://bioguard-tau.vercel.app';

    const tempPass = Math.random().toString(36).slice(-8) + 'Aa1!';

    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: email,
        password: tempPass,
        options: {
            data: { full_name: name },
            emailRedirectTo: appUrl + '/#dashboard'
        }
    });

    if (authError) {
        let msg = 'Error: ' + authError.message;
        if (authError.message.toLowerCase().includes('already registered')) {
            msg = '⚠️ Este correo ya está registrado en el sistema.';
        }
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send"></i> Enviar Invitación Segura';
        lucide.createIcons();
        return;
    }

    if (authData.user) {
        const { error: profileErr } = await supabaseClient.from('usuarios').insert({
            id: authData.user.id,
            email: email, // Store email for easier management
            full_name: name,
            role: role,
            business_name: business || 'Empresa Independiente',
            plan: plan,
            establishment: establishment || 'Planta Principal',
            permissions: role === 'consultant' || role === 'admin' ? ['all'] : []
        });
        if (profileErr) console.warn('Profile insert warning:', profileErr.message);
    }

    successEl.innerHTML = `
        ✅ <strong>Invitación enviada a ${email}</strong><br>
        <span style="font-size:0.82rem;color:#94a3b8;">
            El usuario recibirá un email. Al confirmar, será redirigido a la app.<br>
            Se creará su cuenta con los permisos de <strong>${role.toUpperCase()}</strong>.
        </span><br><br>
        <span style="font-size:0.78rem;color:#64748b;">Contraseña temporal (si el mail demora):</span><br>
        <code style="color:#a78bfa;font-size:0.85rem;">${tempPass}</code>
    `;
    successEl.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send"></i> Enviar Invitación Segura';
    lucide.createIcons();
    setTimeout(() => { if (typeof loadUsersView === "function") loadUsersView(); }, 1500);
};

window.resetUserPassword = async function(userId) {
    if (!supabaseClient) return;
    
    // First, we need the email. Let's try to get it from our 'usuarios' table
    const { data: profile } = await supabaseClient
        .from('usuarios')
        .select('email, full_name')
        .eq('id', userId)
        .single();
        
    const email = profile?.email;
    const name = profile?.full_name || "usuario";

    if (!email) {
        showCustomModal({
            title: 'Recuperar Contraseña',
            message: `No se encontró el correo electrónico para <strong>${name}</strong>. Ingresá el mail manualmente:`,
            isPrompt: true,
            confirmText: 'Enviar Link',
            onConfirm: (manualEmail) => {
                if (!manualEmail) return;
                sendReset(manualEmail);
            }
        });
    } else {
        showCustomModal({
            title: 'Recuperar Contraseña',
            message: `¿Enviar un email de restablecimiento de contraseña a <strong>${email}</strong>?`,
            confirmText: 'Enviar Link',
            onConfirm: () => {
                sendReset(email);
            }
        });
    }

    async function sendReset(emailToReset) {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(emailToReset, {
            redirectTo: window.location.origin + '/#dashboard',
        });
        if (error) showToast("Error: " + error.message, "error");
        else showToast("Email de restablecimiento enviado con éxito.", "success");
    }
};

window.logoutSupabase = async function() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    // onAuthStateChange will show the overlay automatically
};

function initApp() {
    setupNavigation();
    setupForm();
    setupProfile();
    setupPDFScanner();
    
    // Initial view trigger
    const initialHash = window.location.hash || '#dashboard';
    handleRoute(initialHash);

    const dateElem = document.getElementById('current-date');
    if (dateElem) {
        // FIXED: Using explicit day/month/year to avoid localization shifts
        const now = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        dateElem.innerText = now.toLocaleDateString('es-AR', options);
    }
    loadFromSupabase();
}

function handleRoute(hash) {
    const viewId = `view-${hash.substring(1)}`;
    const navItems = document.querySelectorAll('.nav-item');
    
    // Update View Visibility
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    // Update Nav Menu (Desktop)
    navItems.forEach(ni => {
        ni.classList.toggle('active', ni.getAttribute('href') === hash);
    });

    // Update Bottom Nav (Mobile)
    const mobileItems = document.querySelectorAll('.mobile-nav-item');
    mobileItems.forEach(mi => {
        mi.classList.toggle('active', mi.getAttribute('href') === hash);
    });

    // Update Content
    if (hash === '#dashboard') updateDashboard();
    if (hash === '#trends') updateTrends();
    if (hash === '#history') updateHistory();
    if (hash === '#users') loadUsersView();
    
    lucide.createIcons();
}
