// public/js/events.js
// Events functionality
let allEvents = [];

// Load featured event
async function loadFeaturedEvent() {
    try {
        // Try to fetch from Supabase first
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('is_featured', true)
            .gte('date', new Date().toISOString())
            .order('date', { ascending: true })
            .limit(1);

        if (error) throw error;

        let featuredEvent;
        if (data && data.length > 0) {
            featuredEvent = data[0];
        } else {
            // Fallback to mock data
            featuredEvent = getMockFeaturedEvent();
        }

        displayFeaturedEvent(featuredEvent);
    } catch (error) {
        console.error('Error loading featured event:', error);
        // Use mock data as fallback
        const featuredEvent = getMockFeaturedEvent();
        displayFeaturedEvent(featuredEvent);
    }
}

// Load upcoming events
async function loadUpcomingEvents(limit = null) {
    showLoader();
    try {
        let query = supabase
            .from('events')
            .select('*')
            .gte('date', new Date().toISOString())
            .order('date', { ascending: true });

        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data && data.length > 0) {
            allEvents = data;
            displayEvents(data);
        } else {
            // Use mock data
            allEvents = getMockEvents();
            displayEvents(allEvents.slice(0, limit || allEvents.length));
        }
    } catch (error) {
        console.error('Error loading events:', error);
        // Use mock data
        allEvents = getMockEvents();
        displayEvents(allEvents.slice(0, limit || allEvents.length));
    } finally {
        hideLoader();
    }
}

// Display featured event
function displayFeaturedEvent(event) {
    const container = document.getElementById('featured-event-card');
    if (!container) return;

    const eventDate = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    container.innerHTML = `
        <div class="featured-event-header">
            <div class="featured-badge">
                <i class="fas fa-star"></i> Featured Event
            </div>
            <div class="featured-countdown" id="featured-countdown">
                <div id="countdown-timer"></div>
            </div>
        </div>
        <div class="featured-event-content">
            <h3 class="featured-event-title">${event.title}</h3>
            <div class="featured-event-meta">
                <span class="featured-event-date">
                    <i class="fas fa-calendar"></i> ${eventDate}
                </span>
                <span class="featured-event-location">
                    <i class="fas fa-map-marker-alt"></i> ${event.location}
                </span>
            </div>
            <p class="featured-event-description">${event.description}</p>
            <div class="featured-event-actions">
                <button class="btn btn-primary" onclick="rsvpToEvent('${event.id}')">
                    <i class="fas fa-check-circle"></i> RSVP Now
                </button>
                <button class="btn btn-outline" onclick="shareEvent('${event.id}')">
                    <i class="fas fa-share-alt"></i> Share
                </button>
            </div>
        </div>
    `;
}

// Display events in grid
function displayEvents(events) {
    const container = document.getElementById('events-grid');
    if (!container) return;

    if (events.length === 0) {
        container.innerHTML = `
            <div class="no-events">
                <i class="fas fa-calendar-times"></i>
                <h3>No Upcoming Events</h3>
                <p>Check back later for new events!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = events.map(event => createEventCard(event)).join('');
}

// Create event card HTML
function createEventCard(event) {
    const eventDate = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
        <div class="event-card" data-id="${event.id}">
            ${event.image_url ? `
                <img src="${event.image_url}" alt="${event.title}" class="event-image">
            ` : `
                <div class="event-image-placeholder">
                    <i class="fas fa-calendar-alt"></i>
                </div>
            `}
            <div class="event-content">
                <span class="event-date">${eventDate}</span>
                <h3 class="event-title">${event.title}</h3>
                <p class="event-description">${event.description.substring(0, 100)}...</p>
                <div class="event-meta">
                    <span class="event-location">
                        <i class="fas fa-map-marker-alt"></i> ${event.location}
                    </span>
                    <span class="event-attendees">
                        <i class="fas fa-users"></i> ${event.attendees_count || 0} attending
                    </span>
                </div>
                <div class="event-actions">
                    <button class="btn btn-primary btn-sm" onclick="rsvpToEvent('${event.id}')">
                        RSVP
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="viewEventDetails('${event.id}')">
                        Details
                    </button>
                </div>
            </div>
        </div>
    `;
}

// RSVP to event
async function rsvpToEvent(eventId) {
    showLoader();
    try {
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            showNotification('Please login to RSVP', 'error');
            window.location.href = '../admin/login.html?redirect=rsvp';
            return;
        }

        // Add RSVP to database
        const { data, error } = await supabase
            .from('event_rsvps')
            .insert([{
                event_id: eventId,
                user_id: user.id,
                rsvped_at: new Date().toISOString()
            }]);

        if (error) throw error;

        // Update event attendees count
        await updateEventAttendeesCount(eventId);

        showNotification('Successfully RSVPed to event!', 'success');
        
        // Refresh events display
        loadUpcomingEvents();
    } catch (error) {
        console.error('Error RSVPing to event:', error);
        showNotification('Failed to RSVP. Please try again.', 'error');
    } finally {
        hideLoader();
    }
}

// Update event attendees count
async function updateEventAttendeesCount(eventId) {
    try {
        const { count, error } = await supabase
            .from('event_rsvps')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId);

        if (error) throw error;

        await supabase
            .from('events')
            .update({ attendees_count: count })
            .eq('id', eventId);
    } catch (error) {
        console.error('Error updating attendees count:', error);
    }
}

// Share event
function shareEvent(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;

    const shareUrl = `${window.location.origin}/pages/events.html#event-${eventId}`;
    const shareText = `Join us for ${event.title} on ${new Date(event.date).toLocaleDateString()}`;

    if (navigator.share) {
        navigator.share({
            title: event.title,
            text: shareText,
            url: shareUrl
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(`${shareText} - ${shareUrl}`);
        showNotification('Event link copied to clipboard!', 'success');
    }
}

// View event details
function viewEventDetails(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;

    // Create modal for event details
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${event.title}</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="event-details">
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <strong>Date:</strong> ${new Date(event.date).toLocaleString()}
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <strong>Location:</strong> ${event.location}
                    </div>
                    ${event.speaker ? `
                        <div class="detail-item">
                            <i class="fas fa-user"></i>
                            <strong>Speaker:</strong> ${event.speaker}
                        </div>
                    ` : ''}
                    <div class="detail-item">
                        <i class="fas fa-users"></i>
                        <strong>Attendees:</strong> ${event.attendees_count || 0} attending
                    </div>
                    <div class="event-full-description">
                        <h4>Event Description</h4>
                        <p>${event.full_description || event.description}</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="rsvpToEvent('${eventId}')">
                    RSVP Now
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

    // Add modal styles
    if (!document.querySelector('#modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 9998;
            }
            
            .modal.active {
                display: flex;
            }
            
            .modal-content {
                background: white;
                border-radius: 10px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #eee;
            }
            
            .modal-header h2 {
                margin: 0;
                color: var(--dark-red);
            }
            
            .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #666;
            }
            
            .modal-body {
                padding: 20px;
            }
            
            .detail-item {
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .detail-item i {
                color: var(--primary-red);
                width: 20px;
            }
            
            .event-full-description {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
            
            .modal-footer {
                padding: 20px;
                border-top: 1px solid #eee;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
        `;
        document.head.appendChild(style);
    }
}

function closeModal(modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
    document.body.style.overflow = '';
}

// Mock data for fallback
function getMockFeaturedEvent() {
    return {
        id: '1',
        title: 'Annual Youth Convention 2025',
        description: 'Join us for our biggest youth event of the year! A time of worship, fellowship, and spiritual growth.',
        date: '2025-08-15T09:00:00',
        location: 'Church Main Auditorium',
        is_featured: true,
        image_url: '../images/banner.jpg',
        speaker: 'Rev. Dr. James Adekunle',
        full_description: 'This year\'s convention theme is "Anchored in Christ". We\'ll have powerful worship sessions, insightful teachings, breakout sessions, and plenty of opportunities for fellowship and networking. Don\'t miss this life-changing experience!'
    };
}

function getMockEvents() {
    return [
        {
            id: '1',
            title: 'Annual Youth Convention 2025',
            description: 'Our biggest youth event of the year',
            date: '2025-08-15T09:00:00',
            location: 'Church Main Auditorium',
            attendees_count: 150,
            image_url: '../images/banner.jpg'
        },
        {
            id: '2',
            title: 'Youth Bible Study',
            description: 'Weekly Bible study and fellowship',
            date: '2025-07-20T17:00:00',
            location: 'Youth Chapel',
            attendees_count: 45,
            image_url: null
        },
        {
            id: '3',
            title: 'Community Outreach',
            description: 'Serving our local community',
            date: '2025-07-25T08:00:00',
            location: 'Gwarinpa Community',
            attendees_count: 30,
            image_url: null
        },
        {
            id: '4',
            title: 'Worship Night',
            description: 'Night of praise and worship',
            date: '2025-08-05T18:00:00',
            location: 'Church Auditorium',
            attendees_count: 85,
            image_url: null
        }
    ];
}

// Show/Hide loader
function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
}