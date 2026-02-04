// public/js/auth.js
// Authentication functionality

// Check if user is authenticated
async function checkUserAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user !== null;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

// Login user
async function loginUser(email, password, rememberMe = false) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
        });

        if (error) {
            console.error('Login error:', error.message);
            return false;
        }

        // Store session if remember me is checked
        if (rememberMe && data.session) {
            localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
        }

        return true;
    } catch (error) {
        console.error('Login error:', error);
        return false;
    }
}

// Logout user
async function logoutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Clear localStorage
        localStorage.removeItem('supabase.auth.token');
        
        // Redirect to login page
        window.location.href = 'login.html';
        return true;
    } catch (error) {
        console.error('Logout error:', error);
        return false;
    }
}

// Get current user
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Get user error:', error);
        return null;
    }
}

// Check admin role
async function isAdmin() {
    try {
        const user = await getCurrentUser();
        if (!user) return false;

        // Check user role in database
        const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (error) throw error;
        return data?.role === 'admin';
    } catch (error) {
        console.error('Admin check error:', error);
        return false;
    }
}

// Protect admin routes
async function protectAdminRoute() {
    const isAuthenticated = await checkUserAuth();
    const isAdminUser = await isAdmin();

    if (!isAuthenticated) {
        window.location.href = 'login.html';
        return false;
    }

    if (!isAdminUser) {
        showNotification('Access denied. Admin privileges required.', 'error');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
        return false;
    }

    return true;
}

// Update user profile
async function updateUserProfile(userData) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('No user logged in');

        const { data, error } = await supabase
            .from('users')
            .update(userData)
            .eq('id', user.id);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Update profile error:', error);
        return { success: false, error: error.message };
    }
}

// Change password
async function changePassword(currentPassword, newPassword) {
    try {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Change password error:', error);
        return { success: false, error: error.message };
    }
}

// Reset password request
async function requestPasswordReset(email) {
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/admin/reset-password.html`,
        });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Password reset request error:', error);
        return { success: false, error: error.message };
    }
}

// Session management
function initAuthListeners() {
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN') {
            console.log('User signed in:', session.user.email);
            
            // Update last login
            updateLastLogin(session.user.id);
        }
        
        if (event === 'SIGNED_OUT') {
            console.log('User signed out');
        }
    });
}

// Update last login time
async function updateLastLogin(userId) {
    try {
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', userId);
    } catch (error) {
        console.error('Update last login error:', error);
    }
}

// Initialize auth listeners
document.addEventListener('DOMContentLoaded', () => {
    initAuthListeners();
});

// Export functions
export {
    checkUserAuth,
    loginUser,
    logoutUser,
    getCurrentUser,
    isAdmin,
    protectAdminRoute,
    updateUserProfile,
    changePassword,
    requestPasswordReset
};