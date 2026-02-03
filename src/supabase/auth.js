import { supabase } from './supabaseClient.js'

export class AuthManager {
  constructor() {
    this.user = null
    this.session = null
    this.init()
  }

  async init() {
    const { data: { session } } = await supabase.auth.getSession()
    this.session = session
    this.user = session?.user || null
    
    supabase.auth.onAuthStateChange((_event, session) => {
      this.session = session
      this.user = session?.user || null
      this.dispatchAuthChange()
    })
  }

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      this.user = data.user
      this.session = data.session
      this.dispatchAuthChange()
      return { success: true, user: data.user }
    } catch (error) {
      console.error('Sign in error:', error)
      return { success: false, error: error.message }
    }
  }

  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })
      
      if (error) throw error
      
      if (data.user) {
        this.user = data.user
        this.session = data.session
        this.dispatchAuthChange()
      }
      
      return { 
        success: true, 
        user: data.user,
        needsEmailConfirmation: !data.session
      }
    } catch (error) {
      console.error('Sign up error:', error)
      return { success: false, error: error.message }
    }
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      this.user = null
      this.session = null
      this.dispatchAuthChange()
      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      return { success: false, error: error.message }
    }
  }

  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Password reset error:', error)
      return { success: false, error: error.message }
    }
  }

  async updatePassword(newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Update password error:', error)
      return { success: false, error: error.message }
    }
  }

  async updateProfile(updates) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      })
      
      if (error) throw error
      
      this.user = data.user
      this.dispatchAuthChange()
      return { success: true, user: data.user }
    } catch (error) {
      console.error('Update profile error:', error)
      return { success: false, error: error.message }
    }
  }

  async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) throw error
      
      this.session = data.session
      this.user = data.user
      this.dispatchAuthChange()
      return { success: true, session: data.session }
    } catch (error) {
      console.error('Refresh session error:', error)
      return { success: false, error: error.message }
    }
  }

  dispatchAuthChange() {
    const event = new CustomEvent('authChange', { 
      detail: { 
        user: this.user,
        session: this.session
      }
    })
    window.dispatchEvent(event)
  }

  getUser() {
    return this.user
  }

  getSession() {
    return this.session
  }

  isAuthenticated() {
    return !!this.user
  }

  isAdmin() {
    return this.user?.email?.endsWith('@gwarinpaayf.org') || 
           this.user?.user_metadata?.role === 'admin'
  }

  isEditor() {
    return this.user?.user_metadata?.role === 'editor' || this.isAdmin()
  }

  getUserId() {
    return this.user?.id
  }

  getUserEmail() {
    return this.user?.email
  }

  getUserMetadata() {
    return this.user?.user_metadata || {}
  }
}

export const authManager = new AuthManager()

export async function requireAuth(redirectTo = '/admin/login.html') {
  const user = authManager.getUser()
  if (!user) {
    window.location.href = redirectTo
    return false
  }
  return true
}

export async function requireAdmin(redirectTo = '/admin/login.html') {
  const isAuthenticated = await requireAuth(redirectTo)
  if (!isAuthenticated) return false
  
  if (!authManager.isAdmin()) {
    window.location.href = '/'
    return false
  }
  return true
}

export async function requireEditor(redirectTo = '/admin/login.html') {
  const isAuthenticated = await requireAuth(redirectTo)
  if (!isAuthenticated) return false
  
  if (!authManager.isEditor()) {
    window.location.href = '/'
    return false
  }
  return true
}
