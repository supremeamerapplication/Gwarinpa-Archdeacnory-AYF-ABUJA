import { supabase } from './supabaseClient.js'

export class GalleryManager {
  async getGalleryItems(category = null) {
    let query = supabase
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (category) {
      query = query.eq('category', category)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  }

  async uploadImage(file, metadata) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `gallery/${fileName}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file)
    
    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath)

    // Save to database
    const { data, error } = await supabase
      .from('gallery')
      .insert([{
        image_url: publicUrl,
        category: metadata.category,
        description: metadata.description,
        uploaded_by: metadata.uploaded_by
      }])
      .select()
    
    if (error) throw error
    return data[0]
  }

  async deleteGalleryItem(id, imageUrl) {
    // Extract file path from URL
    const urlParts = imageUrl.split('/')
    const filePath = urlParts.slice(urlParts.indexOf('gallery')).join('/')
    
    // Delete from storage
    await supabase.storage
      .from('images')
      .remove([filePath])
    
    // Delete from database
    const { error } = await supabase
      .from('gallery')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  }
}

export const galleryManager = new GalleryManager()