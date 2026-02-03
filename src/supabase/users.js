import { supabase } from './supabaseClient.js'

export class UsersManager {
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  }

  async createUserProfile(userId, profile) {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([{
        id: userId,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        date_of_birth: profile.date_of_birth,
        gender: profile.gender,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        occupation: profile.occupation,
        department: profile.department,
        role: profile.role || 'member',
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        skills: profile.skills,
        interests: profile.interests,
        emergency_contact_name: profile.emergency_contact_name,
        emergency_contact_phone: profile.emergency_contact_phone
      }])
      .select()
    
    if (error) throw error
    return data[0]
  }

  async updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
    
    if (error) throw error
    return data[0]
  }

  async getAllUsers() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    
    if (error) throw error
    
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
    
    if (profilesError) throw profilesError
    
    return users.map(user => {
      const profile = profiles.find(p => p.id === user.id) || {}
      return {
        ...user,
        profile
      }
    })
  }

  async getUsersByRole(role) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, auth_users:auth.users(email, created_at)')
      .eq('role', role)
      .eq('is_active', true)
    
    if (error) throw error
    return data
  }

  async createAdminUser(email, password, userData) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...userData,
        role: 'admin'
      }
    })
    
    if (error) throw error
    
    await this.createUserProfile(data.user.id, {
      ...userData,
      role: 'admin'
    })
    
    return data.user
  }

  async updateUserRole(userId, role) {
    const { error } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: { role }
      }
    )
    
    if (error) throw error
    
    const { data } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', userId)
      .select()
    
    return data[0]
  }

  async deleteUser(userId) {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    
    if (error) throw error
    
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) throw profileError
    
    return true
  }

  async searchUsers(searchTerm) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, auth_users:auth.users(email, created_at)')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    
    if (error) throw error
    return data
  }
}

export const usersManager = new UsersManager()
