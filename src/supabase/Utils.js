import { supabase } from './supabaseClient.js'

export class DatabaseUtils {
  async getDashboardStats() {
    try {
      const [
        { count: eventsCount },
        { count: galleryCount },
        { count: announcementsCount },
        { count: rsvpsCount },
        { count: usersCount }
      ] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('gallery').select('*', { count: 'exact', head: true }),
        supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('published', true),
        supabase.from('rsvps').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_active', true)
      ])
      
      const { data: upcomingEvents } = await supabase
        .from('events')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(5)
      
      const { data: recentAnnouncements } = await supabase
        .from('announcements')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(5)
      
      return {
        counts: {
          events: eventsCount || 0,
          gallery: galleryCount || 0,
          announcements: announcementsCount || 0,
          rsvps: rsvpsCount || 0,
          users: usersCount || 0
        },
        upcomingEvents: upcomingEvents || [],
        recentAnnouncements: recentAnnouncements || []
      }
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      throw error
    }
  }

  async backupData() {
    const tables = ['events', 'gallery', 'yearly_plans', 'announcements', 'rsvps', 'user_profiles']
    
    const backup = {}
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
      
      if (!error) {
        backup[table] = data
      }
    }
    
    return backup
  }

  async cleanOldData(days = 365) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    const { error: eventsError } = await supabase
      .from('events')
      .delete()
      .lt('date', cutoffDate.toISOString().split('T')[0])
    
    const { error: rsvpsError } = await supabase
      .from('rsvps')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
    
    if (eventsError || rsvpsError) {
      throw new Error('Error cleaning old data')
    }
    
    return true
  }

  async getStorageUsage() {
    const { data: images, error: imagesError } = await supabase.storage
      .from('images')
      .list()
    
    const { data: documents, error: documentsError } = await supabase.storage
      .from('documents')
      .list()
    
    const { data: avatars, error: avatarsError } = await supabase.storage
      .from('avatars')
      .list()
    
    if (imagesError || documentsError || avatarsError) {
      throw new Error('Error getting storage usage')
    }
    
    return {
      images: images?.length || 0,
      documents: documents?.length || 0,
      avatars: avatars?.length || 0,
      total: (images?.length || 0) + (documents?.length || 0) + (avatars?.length || 0)
    }
  }

  async exportTableToCSV(tableName) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return ''
    }
    
    const headers = Object.keys(data[0])
    const csvRows = []
    
    csvRows.push(headers.join(','))
    
    for (const row of data) {
      const values = headers.map(header => {
        const escaped = ('' + row[header]).replace(/"/g, '\\"')
        return `"${escaped}"`
      })
      csvRows.push(values.join(','))
    }
    
    return csvRows.join('\n')
  }

  async getDatabaseSize() {
    const { data, error } = await supabase.rpc('get_database_size')
    
    if (error) {
      console.error('Error getting database size:', error)
      return 'Unknown'
    }
    
    return data
  }

  async getRecentActivity(limit = 10) {
    const activities = []
    
    const tables = [
      { name: 'events', label: 'Event', titleField: 'title' },
      { name: 'announcements', label: 'Announcement', titleField: 'title' },
      { name: 'gallery', label: 'Gallery Image', titleField: 'description' }
    ]
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (!error && data) {
        activities.push(...data.map(item => ({
          type: table.label,
          title: item[table.titleField] || 'Untitled',
          date: item.created_at,
          id: item.id
        })))
      }
    }
    
    return activities
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit)
  }
}

export const databaseUtils = new DatabaseUtils()
