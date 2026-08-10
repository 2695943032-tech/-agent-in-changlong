import type { AnimalId } from '../../shared/types/pretrip'

const STORAGE_KEY = 'chimelong-field-observations-v1'

export function useFieldObservations() {
  const zoneIds = useState<AnimalId[]>('field-observation-zone-ids-v1', () => [])
  const hydrated = useState('field-observation-zone-ids-v1-hydrated', () => false)

  if (import.meta.client) {
    onMounted(() => {
      if (hydrated.value) return
      hydrated.value = true
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as AnimalId[]
        if (Array.isArray(saved)) zoneIds.value = [...new Set([...zoneIds.value, ...saved])]
      }
      catch { /* Keep the current session if old demo data is unreadable. */ }
    })
    watch(zoneIds, value => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })
  }

  function complete(zoneId: AnimalId) {
    if (!zoneIds.value.includes(zoneId)) zoneIds.value = [...zoneIds.value, zoneId]
  }

  return { zoneIds: readonly(zoneIds), complete }
}
