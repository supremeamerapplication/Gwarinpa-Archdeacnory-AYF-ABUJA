import { supabase } from './supabaseClient.js'
import { authManager } from './auth.js'

export class PlansManager {
  async getYearlyPlan(year = new Date().getFullYear()) {
    const { data, error } = await supabase
      .from('yearly_plans')
      .select('*')
      .eq('year', year)
      .order('month', { ascending: true })
    
    if (error) throw error
    return data
  }

  async getPlanById(id) {
    const { data, error } = await supabase
      .from('yearly_plans')
      .select(`
        *,
        created_by:user_profiles(first_name, last_name, avatar_url)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  async getPlanByMonth(year, month) {
    const { data, error } = await supabase
      .from('yearly_plans')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }
    
    return data
  }

  async getAllYears() {
    const { data, error } = await supabase
      .from('yearly_plans')
      .select('year')
      .order('year', { ascending: false })
    
    if (error) throw error
    
    const uniqueYears = [...new Set(data.map(item => item.year))]
    return uniqueYears.sort((a, b) => b - a)
  }

  async createPlan(planData) {
    const user = authManager.getUser()
    if (!user) throw new Error('User not authenticated')
    
    const { data, error } = await supabase
      .from('yearly_plans')
      .insert([{
        year: planData.year,
        month: planData.month,
        theme: planData.theme,
        theme_scripture: planData.theme_scripture,
        activities: JSON.stringify(planData.activities || []),
        scriptures: JSON.stringify(planData.scriptures || []),
        goals: JSON.stringify(planData.goals || []),
        notes: planData.notes,
        pdf_url: planData.pdf_url,
        excel_url: planData.excel_url,
        created_by: user.id
      }])
      .select()
    
    if (error) throw error
    return data[0]
  }

  async updatePlan(id, updates) {
    const user = authManager.getUser()
    if (!user) throw new Error('User not authenticated')
    
    const updateData = { ...updates }
    
    if (updateData.activities) {
      updateData.activities = JSON.stringify(updateData.activities)
    }
    
    if (updateData.scriptures) {
      updateData.scriptures = JSON.stringify(updateData.scriptures)
    }
    
    if (updateData.goals) {
      updateData.goals = JSON.stringify(updateData.goals)
    }
    
    updateData.updated_at = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('yearly_plans')
      .update(updateData)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  }

  async deletePlan(id) {
    const user = authManager.getUser()
    if (!user) throw new Error('User not authenticated')
    
    const { error } = await supabase
      .from('yearly_plans')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  }

  async uploadPlanFile(file, year, type = 'pdf') {
    const fileExt = file.name.split('.').pop()
    const fileName = `yearly-plan-${year}-${type}.${fileExt}`
    const filePath = `plans/${fileName}`
    
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)
    
    return publicUrl
  }

  async deletePlanFile(fileUrl) {
    try {
      const urlParts = fileUrl.split('/')
      const filePath = urlParts.slice(urlParts.indexOf('plans')).join('/')
      
      const { error } = await supabase.storage
        .from('documents')
        .remove([filePath])
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting file:', error)
      return false
    }
  }

  async getCurrentMonthPlan() {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.toLocaleString('default', { month: 'long' })
    
    return this.getPlanByMonth(currentYear, currentMonth)
  }

  async getNextMonthPlan() {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const year = nextMonth.getFullYear()
    const month = nextMonth.toLocaleString('default', { month: 'long' })
    
    return this.getPlanByMonth(year, month)
  }

  async searchPlans(searchTerm) {
    const { data, error } = await supabase
      .from('yearly_plans')
      .select('*')
      .or(`theme.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%,month.ilike.%${searchTerm}%`)
      .order('year', { ascending: false })
      .order('month', { ascending: true })
    
    if (error) throw error
    return data
  }

  async getPlanStatistics(year) {
    const plans = await this.getYearlyPlan(year)
    
    const totalPlans = plans.length
    const completedPlans = plans.filter(plan => 
      plan.pdf_url || plan.excel_url
    ).length
    
    const themesWithScripture = plans.filter(plan => 
      plan.theme_scripture
    ).length
    
    const monthsWithActivities = plans.filter(plan => {
      const activities = JSON.parse(plan.activities || '[]')
      return activities.length > 0
    }).length
    
    return {
      total_plans: totalPlans,
      completed_plans: completedPlans,
      completion_rate: totalPlans > 0 ? (completedPlans / totalPlans * 100) : 0,
      themes_with_scripture: themesWithScripture,
      months_with_activities: monthsWithActivities
    }
  }

  async exportPlanToCSV(year) {
    const plans = await this.getYearlyPlan(year)
    
    if (plans.length === 0) return ''
    
    const headers = ['Month', 'Theme', 'Theme Scripture', 'Activities', 'Goals', 'Notes']
    const csvRows = []
    
    csvRows.push(headers.join(','))
    
    for (const plan of plans) {
      const activities = JSON.parse(plan.activities || '[]').join('; ')
      const goals = JSON.parse(plan.goals || '[]').join('; ')
      
      const values = [
        plan.month,
        `"${(plan.theme || '').replace(/"/g, '""')}"`,
        `"${(plan.theme_scripture || '').replace(/"/g, '""')}"`,
        `"${activities.replace(/"/g, '""')}"`,
        `"${goals.replace(/"/g, '""')}"`,
        `"${(plan.notes || '').replace(/"/g, '""')}"`
      ]
      csvRows.push(values.join(','))
    }
    
    return csvRows.join('\n')
  }

  async duplicateYearPlan(sourceYear, targetYear) {
    const sourcePlans = await this.getYearlyPlan(sourceYear)
    
    if (sourcePlans.length === 0) {
      throw new Error(`No plans found for year ${sourceYear}`)
    }
    
    const user = authManager.getUser()
    if (!user) throw new Error('User not authenticated')
    
    const newPlans = sourcePlans.map(plan => ({
      year: targetYear,
      month: plan.month,
      theme: plan.theme,
      theme_scripture: plan.theme_scripture,
      activities: plan.activities,
      scriptures: plan.scriptures,
      goals: plan.goals,
      notes: plan.notes,
      created_by: user.id
    }))
    
    const { data, error } = await supabase
      .from('yearly_plans')
      .insert(newPlans)
      .select()
    
    if (error) throw error
    return data
  }

  async generateYearPlanTemplate(year) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    const user = authManager.getUser()
    if (!user) throw new Error('User not authenticated')
    
    const templatePlans = months.map(month => ({
      year,
      month,
      theme: '',
      theme_scripture: '',
      activities: '[]',
      scriptures: '[]',
      goals: '[]',
      notes: '',
      created_by: user.id
    }))
    
    const { data, error } = await supabase
      .from('yearly_plans')
      .insert(templatePlans)
      .select()
    
    if (error) throw error
    return data
  }

  async getPlanDownloadStats() {
    const { data, error } = await supabase
      .from('yearly_plans')
      .select('year, month, pdf_url, excel_url')
      .order('year', { ascending: false })
    
    if (error) throw error
    
    const stats = data.reduce((acc, plan) => {
      const year = plan.year
      if (!acc[year]) {
        acc[year] = {
          year,
          total_months: 0,
          pdf_available: 0,
          excel_available: 0,
          fully_available: 0
        }
      }
      
      acc[year].total_months++
      if (plan.pdf_url) acc[year].pdf_available++
      if (plan.excel_url) acc[year].excel_available++
      if (plan.pdf_url && plan.excel_url) acc[year].fully_available++
      
      return acc
    }, {})
    
    return Object.values(stats).sort((a, b) => b.year - a.year)
  }
}

export const plansManager = new PlansManager()
