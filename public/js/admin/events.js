// public/js/admin/events.js
// Admin events management
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const canAccess = await protectAdminRoute();
    if (!canAccess) return;

    // Load events for management
    loadAdminEvents();

    // Initialize event form
    initEventForm();

    // Load event categories
    loadEventCategories();
});

// Load events for admin management
async function loadAdminEvents() {
    showLoader();
    try {
        const { data: events, error } = await supabase
            .from('events')
            .select('*')
            .order('date', { ascending: true });

        if (error) throw error;

        displayAdminEvents(events || []);
    } catch (error) {
        console.error('Error loading events:', error);
        showNotification('Failed to load events', 'error');
    } finally {
        hideLoader();
    }
}

// Display events in admin table
function displayAdminEvents(events) {
    const tbody = document.getElementById('events-table-body');
    if (!tbody) return;

    if (events.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <i class="fas fa-calendar-times"></i>
                    <p>No events found. Create your first event!</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = events.map(event => `
        <tr data-id="${event.id}">
            <td>
                <div class="event-preview">
                    ${event.image_url ? `
                        <img src="${event.image_url}" alt="${event.title}" class="event-thumbnail">
                    ` : `
                        <div class="event-thumbnail placeholder">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                    `}
                    <div>
                        <strong>${event.title}</strong>
                        <small class="text-muted">${event.category || 'General'}</small>
                    </div>
                </div>
            </td>
            <td>${new Date(event.date).toLocaleDateString()}</td>
            <td>${event.location}</td>
            <td>
                <span class="badge ${event.is_featured ? 'badge-featured' : 'badge-normal'}">
                    ${event.is_featured ? 'Featured' : 'Regular'}
                </span>
            </td>
            <td>${event.attendees_count || 0}</td>
            <td>
                <span class="status ${event.status || 'upcoming'}">
                    ${event.status || 'upcoming'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editEvent('${event.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteEvent('${event.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn-view" onclick="viewEventRSVPs('${event.id}')">
                        <i class="fas fa-users"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Initialize event form
function initEventForm() {
    const form = document.getElementById('event-form');
    if (!form) return;

    // Initialize date picker
    const dateInput = document.getElementById('event-date');
    if (dateInput) {
        dateInput.min = new Date().toISOString().split('T')[0];
    }

    // Initialize time picker
    const timeInput = document.getElementById('event-time');
    if (timeInput) {
        timeInput.value = '18:00'; // Default time
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEvent();
    });

    // Initialize image upload
    const imageUpload = document.getElementById('event-image-upload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
    }
}

// Load event categories
async function loadEventCategories() {
    try {
        const { data, error } = await supabase
            .from('event_categories')
            .select('*')
            .order('name');

        if (error) throw error;

        const categorySelect = document.getElementById('event-category');
        if (categorySelect && data) {
            categorySelect.innerHTML = `
                <option value="">Select Category</option>
                ${data.map(cat => `
                    <option value="${cat.id}">${cat.name}</option>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Handle image upload
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showNotification('Please upload a valid image file (JPEG, PNG, GIF, WebP)', 'error');
        event.target.value = '';
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size should be less than 5MB', 'error');
        event.target.value = '';
        return;
    }

    showLoader();
    try {
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `event-images/${fileName}`;

        const { data, error } = await supabase.storage
            .from('public')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('public')
            .getPublicUrl(filePath);

        // Show preview
        const preview = document.getElementById('image-preview');
        if (preview) {
            preview.innerHTML = `
                <div class="upload-preview">
                    <div class="preview-item">
                        <img src="${publicUrl}" alt="Preview">
                        <button type="button" class="remove-file" onclick="removeImage()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        // Store URL for form submission
        document.getElementById('event-image-url').value = publicUrl;

        showNotification('Image uploaded successfully', 'success');
    } catch (error) {
        console.error('Error uploading image:', error);
        showNotification('Failed to upload image', 'error');
    } finally {
        hideLoader();
        event.target.value = '';
    }
}

// Remove uploaded image
function removeImage() {
    const preview = document.getElementById('image-preview');
    if (preview) {
        preview.innerHTML = '';
    }
    document.getElementById('event-image-url').value = '';
}

// Save event (create or update)
async function saveEvent() {
    const form = document.getElementById('event-form');
    if (!form) return;

    const eventId = document.getElementById('event-id').value;
    const isEditing = !!eventId;

    // Get form data
    const formData = new FormData(form);
    const eventData = {
        title: formData.get('title'),
        description: formData.get('description'),
        full_description: formData.get('full_description'),
        date: `${formData.get('date')}T${formData.get('time')}:00`,
        location: formData.get('location'),
        speaker: formData.get('speaker'),
        category_id: formData.get('category'),
        is_featured: formData.get('is_featured') === 'on',
        status: formData.get('status'),
        image_url: formData.get('image_url'),
        updated_at: new Date().toISOString()
    };

    // Validate required fields
    if (!eventData.title || !eventData.date || !eventData.location) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    showLoader();
    try {
        let result;
        if (isEditing) {
            // Update existing event
            const { data, error } = await supabase
                .from('events')
                .update(eventData)
                .eq('id', eventId);

            if (error) throw error;
            result = data;
        } else {
            // Create new event
            eventData.created_at = new Date().toISOString();
            eventData.created_by = (await getCurrentUser())?.id;

            const { data, error } = await supabase
                .from('events')
                .insert([eventData])
                .select();

            if (error) throw error;
            result = data;
        }

        showNotification(
            `Event ${isEditing ? 'updated' : 'created'} successfully!`,
            'success'
        );

        // Reset form and reload events
        resetEventForm();
        loadAdminEvents();
    } catch (error) {
        console.error('Error saving event:', error);
        showNotification('Failed to save event', 'error');
    } finally {
        hideLoader();
    }
}

// Edit event
async function editEvent(eventId) {
    showLoader();
    try {
        const { data: event, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (error) throw error;

        // Populate form
        document.getElementById('event-id').value = event.id;
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-description').value = event.description;
        document.getElementById('event-full-description').value = event.full_description || '';

        const eventDate = new Date(event.date);
        document.getElementById('event-date').value = eventDate.toISOString().split('T')[0];
        document.getElementById('event-time').value = eventDate.toTimeString().slice(0, 5);

        document.getElementById('event-location').value = event.location;
        document.getElementById('event-speaker').value = event.speaker || '';
        document.getElementById('event-category').value = event.category_id || '';
        document.getElementById('event-is-featured').checked = event.is_featured;
        document.getElementById('event-status').value = event.status || 'upcoming';
        document.getElementById('event-image-url').value = event.image_url || '';

        // Show image preview
        if (event.image_url) {
            const preview = document.getElementById('image-preview');
            if (preview) {
                preview.innerHTML = `
                    <div class="upload-preview">
                        <div class="preview-item">
                            <img src="${event.image_url}" alt="Preview">
                            <button type="button" class="remove-file" onclick="removeImage()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        // Scroll to form
        document.getElementById('event-form').scrollIntoView({ behavior: 'smooth' });

        showNotification('Event loaded for editing', 'info');
    } catch (error) {
        console.error('Error loading event:', error);
        showNotification('Failed to load event', 'error');
    } finally {
        hideLoader();
    }
}

// Delete event
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return;
    }

    showLoader();
    try {
        // First, delete RSVPs for this event
        await supabase
            .from('event_rsvps')
            .delete()
            .eq('event_id', eventId);

        // Then delete the event
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) throw error;

        showNotification('Event deleted successfully', 'success');
        loadAdminEvents();
    } catch (error) {
        console.error('Error deleting event:', error);
        showNotification('Failed to delete event', 'error');
    } finally {
        hideLoader();
    }
}

// View event RSVPs
async function viewEventRSVPs(eventId) {
    showLoader();
    try {
        const { data: rsvps, error } = await supabase
            .from('event_rsvps')
            .select(`
                *,
                users (
                    email,
                    full_name,
                    phone
                )
            `)
            .eq('event_id', eventId)
            .order('rsvped_at', { ascending: false });

        if (error) throw error;

        // Get event details
        const { data: event } = await supabase
            .from('events')
            .select('title')
            .eq('id', eventId)
            .single();

        displayRSVPsModal(event?.title || 'Event', rsvps || []);
    } catch (error) {
        console.error('Error loading RSVPs:', error);
        showNotification('Failed to load RSVPs', 'error');
    } finally {
        hideLoader();
    }
}

// Display RSVPs in modal
function displayRSVPsModal(eventTitle, rsvps) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>RSVPs for "${eventTitle}"</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="rsvp-summary">
                    <div class="summary-item">
                        <i class="fas fa-users"></i>
                        <div>
                            <h3>${rsvps.length}</h3>
                            <p>Total RSVPs</p>
                        </div>
                    </div>
                </div>
                
                ${rsvps.length > 0 ? `
                    <div class="admin-table-container">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>RSVP Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rsvps.map(rsvp => `
                                    <tr>
                                        <td>${rsvp.users?.full_name || 'N/A'}</td>
                                        <td>${rsvp.users?.email || 'N/A'}</td>
                                        <td>${rsvp.users?.phone || 'N/A'}</td>
                                        <td>${new Date(rsvp.rsvped_at).toLocaleDateString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="text-center" style="padding: 40px;">
                        <i class="fas fa-users-slash" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
                        <h3>No RSVPs Yet</h3>
                        <p>No one has RSVPed for this event yet.</p>
                    </div>
                `}
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="exportRSVPs('${eventTitle}', ${JSON.stringify(rsvps)})">
                    <i class="fas fa-download"></i> Export CSV
                </button>
                <button class="btn btn-outline modal-close-btn">
                    Close
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Close modal handlers
    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
    modal.querySelector('.modal-close-btn').addEventListener('click', () => closeModal(modal));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });
}

// Export RSVPs to CSV
function exportRSVPs(eventTitle, rsvps) {
    const csvContent = [
        ['Name', 'Email', 'Phone', 'RSVP Date'],
        ...rsvps.map(rsvp => [
            rsvp.users?.full_name || '',
            rsvp.users?.email || '',
            rsvp.users?.phone || '',
            new Date(rsvp.rsvped_at).toLocaleDateString()
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_rsvps.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification('RSVPs exported successfully', 'success');
}

// Reset event form
function resetEventForm() {
    const form = document.getElementById('event-form');
    if (form) {
        form.reset();
        document.getElementById('event-id').value = '';
        document.getElementById('image-preview').innerHTML = '';
        document.getElementById('event-image-url').value = '';
    }
}

// Utility functions
function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
}

function showNotification(message, type) {
    // Use the notification function from main.js
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}