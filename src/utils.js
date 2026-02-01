/**
 * Utility functions for the Gwarinpa AYF website
 */

// Format date to readable string
export function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

// Format time to readable string
export function formatTime(timeString) {
    if (!timeString) return 'TBD'
    return timeString
}

// Truncate text with ellipsis
export function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
}

// Generate initials from name
export function getInitials(name) {
    if (!name) return '?'
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
}

// Validate email format
export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
}

// Validate phone number (basic validation)
export function validatePhone(phone) {
    const re = /^[\+]?[1-9][\d]{0,15}$/
    return re.test(phone.replace(/\D/g, ''))
}

// Format file size
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Debounce function for search inputs
export function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

// Throttle function for scroll events
export function throttle(func, limit) {
    let inThrottle
    return function() {
        const args = arguments
        const context = this
        if (!inThrottle) {
            func.apply(context, args)
            inThrottle = true
            setTimeout(() => inThrottle = false, limit)
        }
    }
}

// Create a notification element
export function showNotification(message, type = 'info', duration = 5000) {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification')
    existingNotifications.forEach(notification => {
        notification.classList.remove('show')
        setTimeout(() => notification.remove(), 300)
    })

    // Create new notification
    const notification = document.createElement('div')
    notification.className = `notification ${type}`
    notification.textContent = message
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        z-index: 10000;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `
    
    // Add type-specific styles
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #10b981, #34d399)'
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #ef4444, #f87171)'
    } else if (type === 'warning') {
        notification.style.background = 'linear-gradient(135deg, #f59e0b, #fbbf24)'
    } else {
        notification.style.background = 'linear-gradient(135deg, #3b82f6, #60a5fa)'
    }

    document.body.appendChild(notification)

    // Trigger animation
    setTimeout(() => {
        notification.style.transform = 'translateX(0)'
    }, 100)

    // Auto-remove after duration
    setTimeout(() => {
        notification.style.transform = 'translateX(120%)'
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification)
            }
        }, 300)
    }, duration)

    // Click to dismiss
    notification.addEventListener('click', () => {
        notification.style.transform = 'translateX(120%)'
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification)
            }
        }, 300)
    })

    return notification
}

// Toggle password visibility
export function togglePasswordVisibility(inputId, toggleId) {
    const passwordInput = document.getElementById(inputId)
    const toggleButton = document.getElementById(toggleId)
    
    if (passwordInput && toggleButton) {
        toggleButton.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password'
            passwordInput.type = type
            
            // Update icon
            const icon = toggleButton.querySelector('i')
            if (type === 'text') {
                icon.classList.remove('fa-eye')
                icon.classList.add('fa-eye-slash')
            } else {
                icon.classList.remove('fa-eye-slash')
                icon.classList.add('fa-eye')
            }
        })
    }
}

// Load image with error handling
export function loadImageWithFallback(imgElement, imageUrl, fallbackUrl = '/images/default.jpg') {
    if (!imgElement) return
    
    const img = new Image()
    img.onload = () => {
        imgElement.src = imageUrl
    }
    img.onerror = () => {
        imgElement.src = fallbackUrl
        imgElement.alt = 'Image not available'
    }
    img.src = imageUrl
}

// Format currency (for donations if added later)
export function formatCurrency(amount, currency = 'NGN') {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount)
}

// Get month name from number
export function getMonthName(monthNumber) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[monthNumber - 1] || ''
}

// Calculate days until event
export function daysUntil(dateString) {
    const eventDate = new Date(dateString)
    const today = new Date()
    const diffTime = eventDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
}

// Sanitize HTML input
export function sanitizeInput(input) {
    const div = document.createElement('div')
    div.textContent = input
    return div.innerHTML
}

// Generate a unique ID
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Parse query parameters from URL
export function getQueryParams() {
    const params = {}
    const queryString = window.location.search.substring(1)
    const pairs = queryString.split('&')
    
    pairs.forEach(pair => {
        const [key, value] = pair.split('=')
        if (key) {
            params[decodeURIComponent(key)] = decodeURIComponent(value || '')
        }
    })
    
    return params
}

// Set query parameter in URL
export function setQueryParam(key, value) {
    const url = new URL(window.location)
    url.searchParams.set(key, value)
    window.history.pushState({}, '', url)
}

// Remove query parameter from URL
export function removeQueryParam(key) {
    const url = new URL(window.location)
    url.searchParams.delete(key)
    window.history.pushState({}, '', url)
}

// Check if element is in viewport
export function isInViewport(element) {
    const rect = element.getBoundingClientRect()
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
}

// Add smooth scroll to element
export function smoothScrollTo(elementId, offset = 80) {
    const element = document.getElementById(elementId)
    if (element) {
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - offset

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        })
    }
}

// Copy text to clipboard
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text)
        showNotification('Copied to clipboard!', 'success')
        return true
    } catch (err) {
        console.error('Failed to copy: ', err)
        showNotification('Failed to copy to clipboard', 'error')
        return false
    }
}

// Detect mobile device
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Detect iOS device
export function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

// Detect Android device
export function isAndroid() {
    return /Android/.test(navigator.userAgent)
}

// Format social media handle
export function formatSocialHandle(handle, platform) {
    if (!handle) return ''
    
    handle = handle.replace(/^@/, '')
    
    switch(platform) {
        case 'twitter':
        case 'instagram':
            return `@${handle}`
        case 'facebook':
            return handle
        case 'youtube':
            return handle.includes('@') ? handle : `@${handle}`
        default:
            return handle
    }
}

// Generate avatar color based on string
export function getAvatarColor(str) {
    const colors = [
        'linear-gradient(135deg, #e63946, #f4a261)',
        'linear-gradient(135deg, #1d3557, #a8dadc)',
        'linear-gradient(135deg, #8b5cf6, #a78bfa)',
        'linear-gradient(135deg, #10b981, #34d399)',
        'linear-gradient(135deg, #f59e0b, #fbbf24)',
        'linear-gradient(135deg, #3b82f6, #60a5fa)',
    ]
    
    // Simple hash function
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    const index = Math.abs(hash) % colors.length
    return colors[index]
}

// Validate form fields
export function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], textarea[required], select[required]')
    let isValid = true
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false
            input.classList.add('error')
        } else {
            input.classList.remove('error')
            
            // Additional validation for specific input types
            if (input.type === 'email' && !validateEmail(input.value)) {
                isValid = false
                input.classList.add('error')
            }
            
            if (input.type === 'tel' && !validatePhone(input.value)) {
                isValid = false
                input.classList.add('error')
            }
        }
    })
    
    return isValid
}

// Clear form validation errors
export function clearFormErrors(formElement) {
    const errorElements = formElement.querySelectorAll('.error')
    errorElements.forEach(element => {
        element.classList.remove('error')
    })
}

// Add loading state to button
export function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true
        const originalText = button.innerHTML
        button.setAttribute('data-original-text', originalText)
        button.innerHTML = `
            <div class="loading loading-sm"></div>
            <span style="margin-left: 8px">Loading...</span>
        `
    } else {
        button.disabled = false
        const originalText = button.getAttribute('data-original-text')
        if (originalText) {
            button.innerHTML = originalText
        }
    }
}

// Handle API errors
export function handleApiError(error, defaultMessage = 'An error occurred') {
    console.error('API Error:', error)
    
    let message = defaultMessage
    if (error.message) {
        message = error.message
    } else if (error.error_description) {
        message = error.error_description
    } else if (typeof error === 'string') {
        message = error
    }
    
    showNotification(message, 'error')
    return { success: false, error: message }
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)
    
    if (diffSec < 60) {
        return 'just now'
    } else if (diffMin < 60) {
        return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
    } else if (diffHour < 24) {
        return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`
    } else if (diffDay < 7) {
        return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`
    } else {
        return formatDate(dateString)
    }
}

// Generate random color
export function getRandomColor() {
    const colors = [
        '#e63946', '#f4a261', '#1d3557', '#a8dadc',
        '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
}

// Check if user is online
export function isOnline() {
    return navigator.onLine
}

// Add offline/online event listeners
export function setupNetworkStatus(callback) {
    window.addEventListener('online', () => {
        if (callback) callback(true)
        showNotification('You are back online', 'success')
    })
    
    window.addEventListener('offline', () => {
        if (callback) callback(false)
        showNotification('You are offline. Some features may not work.', 'warning')
    })
}

// Export all utilities
export default {
    formatDate,
    formatTime,
    truncateText,
    getInitials,
    validateEmail,
    validatePhone,
    formatFileSize,
    debounce,
    throttle,
    showNotification,
    togglePasswordVisibility,
    loadImageWithFallback,
    formatCurrency,
    getMonthName,
    daysUntil,
    sanitizeInput,
    generateId,
    getQueryParams,
    setQueryParam,
    removeQueryParam,
    isInViewport,
    smoothScrollTo,
    copyToClipboard,
    isMobile,
    isIOS,
    isAndroid,
    formatSocialHandle,
    getAvatarColor,
    validateForm,
    clearFormErrors,
    setButtonLoading,
    handleApiError,
    formatRelativeTime,
    getRandomColor,
    isOnline,
    setupNetworkStatus
}