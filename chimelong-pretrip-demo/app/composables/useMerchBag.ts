import type { CompanionId } from '../../shared/types/pretrip'

const STORAGE_KEY = 'chimelong-merch-bag-v1'

export function useMerchBag() {
  const ids = useState<CompanionId[]>('merch-bag-ids-v1', () => [])
  const hydrated = useState('merch-bag-ids-v1-hydrated', () => false)

  if (import.meta.client) {
    onMounted(() => {
      if (hydrated.value) return
      hydrated.value = true
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as CompanionId[]
        if (Array.isArray(saved)) ids.value = [...new Set([...ids.value, ...saved])]
      }
      catch { /* Damaged demo storage should not block the visitor flow. */ }
    })
    watch(ids, value => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })
  }

  function add(id: CompanionId) {
    if (!ids.value.includes(id)) ids.value = [...ids.value, id]
  }

  function remove(id: CompanionId) {
    ids.value = ids.value.filter(item => item !== id)
  }

  function clear() {
    ids.value = []
  }

  return { ids, add, remove, clear }
}
