// Utility to clear all PWA caches
export async function clearAllCaches() {
    if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        )
        console.log('All caches cleared:', cacheNames)
        return true
    }
    return false
}

// Utility to unregister service worker and clear caches
export async function resetPWA() {
    try {
        // Clear all caches
        await clearAllCaches()

        // Unregister all service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations()
            await Promise.all(
                registrations.map(registration => registration.unregister())
            )
            console.log('All service workers unregistered')
        }

        // Reload the page to get fresh content
        window.location.reload()
        return true
    } catch (error) {
        console.error('Error resetting PWA:', error)
        return false
    }
}

// Force update service worker
export async function updateServiceWorker() {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
            await registration.update()
            console.log('Service worker updated')
            return true
        }
    }
    return false
}
