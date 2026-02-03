import { supabase } from './supabaseClient.js'
import { authManager } from './auth.js'

export class EventsManager {
  async getAllEvents(options = {}) {
    const { 
      limit = null, 
      upcomingOnly = false,
      featuredOnly = false,
      category = null 
    } = options
    
    let query = supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })
    
    if (upcomingOnly) {
      query = query.gte('date', new Date().toISOString().split('T')[0])
    }
    
    if (featuredOnly) {
      query = query.eq('is_featured', true)
    }
    
    if (category) {
      query = query.ilike('category', `%${category}%`)
    }
    
    if (limit) {
      query = query.limit(limit)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data
  }

  async getPastEvents(limit = 10) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .lt('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  }

  async getEventById(id) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        rsvps:rsvps(*),
        created_by:user_profiles(first_name, last_name, avatar_url)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  async getEventsByMonth(year, month) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })
    
    if (error) throw error
    return data
  }

  async createEvent(eventData) {
    const user = authManager.getUser()
    if (!user) throw new Error('User not authenticated')
    
    const { data, error } = await supabase
      .from('events')
      .insert([{
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        time: eventData.time,
        location: eventData.location,
        image_url: eventData.image_url,
        rsvp_link: eventData.rsvp_link,
        max_attendees: eventData.max_attendees,
        is_featured: eventData.is_featured || false,
        category: eventData.category || 'general',
        created_by: user.id
      }])
      .select()
    
    if (error) throw error
    return data[0]
  }

  async updateEvent(id, updates) {
    const user = authManager.getUser()
    if (!user) throw new Error('User not authenticated')
    
    const { data, error } = await supabase
      .from('events')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  }

  async deleteEvent(id) {
    const user = authManager.getUser()
    if (!user) throw new Error('User not authenticated')
    
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  }

  async toggleFeatured(id, featured) {
    return this.updateEvent(id, { is_featured: featured })
  }

  async updateEventStatus(id, status) {
    return this.updateEvent(id, { status })
  }

  async searchEvents(searchTerm, options = {}) {
    const { limit = 20, upcomingOnly = false } = options
    
    let query = supabase
      .from('events')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
      .order('date', { ascending: true })
    
    if (upcomingOnly) {
      query = query.gte('date', new Date().toISOString().split('T')[0])
    }
    
    if (limit) {
      query = query.limit(limit)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data
  }

  async getUpcomingEventsWithRSVPCount(limit = 5) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        rsvps(count)
      `)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(limit)
    
    if (error) throw error
    return data
  }

  async getEventsByDateRange(startDate, endDate) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
    
    if (error) throw error
    return data
  }

  async getFeaturedEvents(limit = 3) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_featured', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(limit)
    
    if (error) throw error
    return data
  }

  async getEventStatistics(eventId) {
    const { data, error } = await supabase.rpc('get_event_stats', {
      event_id: eventId
    })
    
    if (error) {
      console.error('Error getting event stats:', error)
      
      const { data: rsvps, error: rsvpsError } = await supabase
        .from('rsvps')
        .select('status, guests')
        .eq('event_id', eventId)
      
      if (rsvpsError) throw rsvpsError
      
      const totalRSVPs = rsvps.length
      const confirmedRSVPs = rsvps.filter(r => r.status === 'confirmed').length
      const totalGuests = rsvps.reduce((sum, r) => sum + (r.guests || 1), 0)
      
      return {
        total_rsvps: totalRSVPs,
        confirmed_rsvps: confirmedRSVPs,
        total_guests: totalGuests
      }
    }
    
    return data
  }

  async duplicateEvent(eventId) {
    const event = await this.getEventById(eventId)
    
    const newEvent = {
      ...event,
      title: `${event.title} (Copy)`,
      date: this.getNextAvailableDate(event.date),
      is_featured: false,
      created_at: undefined,
      updated_at: undefined,
      id: undefined
    }
    
    return this.createEvent(newEvent)
  }

  getNextAvailableDate(originalDate) {
    const date = new Date(originalDate)
    date.setDate(date.getDate() + 7)
    return date.toISOString().split('T')[0]
  }

  async exportEventsToCSV() {
    const events = await this.getAllEvents()
    
    if (events.length === 0) return ''
    
    const headers = ['Title', 'Date', 'Time', 'Location', 'Description', 'RSVP Link', 'Status']
    const csvRows = []
    
    csvRows.push(headers.join(','))
    
    for (const event of events) {
      const values = [
        `"${event.title.replace(/"/g, '""')}"`,
        event.date,
        event.time || '',
        `"${(event.location || '').replace(/"/g, '""')}"`,
        `"${(event.description || '').replace(/"/g, '""').substring(0, 100)}"`,
        event.rsvp_link || '',
        event.status
      ]
      csvRows.push(values.join(','))
    }
    
    return csvRows.join('\n')
  }
}

export const eventsManager = new EventsManager()
