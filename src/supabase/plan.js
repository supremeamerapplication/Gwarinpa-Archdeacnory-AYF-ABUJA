import { supabase } from './supabaseClient.js'

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
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  async createPlan(plan) {
    const { data, error } = await supabase
      .from('yearly_plans')
      .insert([{
        year: plan.year,
        month: plan.month,
        theme: plan.theme,
        activities: plan.activities,
        scriptures: plan.scriptures,
        goals: plan.goals,
        created_by: plan.created_by
      }])
      .select()
    
    if (error) throw error
    return data[0]
  }

  async updatePlan(id, updates) {
    const { data, error } = await supabase
      .from('yearly_plans')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  }

  async uploadPlanFile(file, year) {
    const fileExt = file.name.split('.').pop()
    const fileName = `yearly-plan-${year}.${fileExt}`
    const filePath = `plans/${fileName}`

    const { error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      })
    
    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    return publicUrl
  }
}

export const plansManager = new PlansManager()