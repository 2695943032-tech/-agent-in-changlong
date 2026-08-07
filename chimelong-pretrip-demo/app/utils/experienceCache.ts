const EXPERIENCE_STORAGE_KEYS = [
  'chimelong-pretrip-journey-v4',
  'chimelong-pretrip-journey-v3',
  'chimelong-park-journey-v2',
  'chimelong-journey-records-v2',
] as const

export async function clearExperienceStorage() {
  if (!import.meta.client) return
  EXPERIENCE_STORAGE_KEYS.forEach(key => localStorage.removeItem(key))
  sessionStorage.clear()
  if ('caches' in window) {
    const keys = await window.caches.keys()
    await Promise.all(keys.map(key => window.caches.delete(key)))
  }
}
