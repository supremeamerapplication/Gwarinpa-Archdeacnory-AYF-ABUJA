import { supabase } from './supabaseClient.js'

export class AnnouncementsManager {
  async getAnnouncements(publishedOnly = true) {
    let query = supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (publishedOnly) {
      query = query.eq('published', true)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  }

  async getAnnouncementById(id) {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  async createAnnouncement(announcement) {
    const { data, error } = await supabase
      .from('announcements')
      .insert([{
        title: announcement.title,
        content: announcement.content,
        excerpt: announcement.excerpt,
        type: announcement.type,
        author_id: announcement.author_id,
        published: announcement.published,
        publish_date: announcement.publish_date,
        featured_image: announcement.featured_image,
        tags: announcement.tags
      }])
      .select()
    
    if (error) throw error
    return data[0]
  }

  async updateAnnouncement(id, updates) {
    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  }

  async deleteAnnouncement(id) {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  }

  async incrementViews(id) {
    const { error } = await supabase.rpc('increment_announcement_views', {
      announcement_id: id
    })
    
    if (error) throw error
    return true
  }
}

export const announcementsManager = new AnnouncementsManager()
