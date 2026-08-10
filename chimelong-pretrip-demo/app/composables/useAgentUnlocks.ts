import type { CompanionId } from '../../shared/types/pretrip'

const STORAGE_KEY = 'chimelong-unlocked-agents-v1'

export function useAgentUnlocks() {
  const ids = useState<CompanionId[]>('unlocked-agent-ids-v1', () => [])
  const hydrated = useState('unlocked-agent-ids-v1-hydrated', () => false)

  if (import.meta.client) {
    onMounted(() => {
      if (hydrated.value) return
      hydrated.value = true
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as CompanionId[]
        if (Array.isArray(saved)) ids.value = [...new Set([...ids.value, ...saved])]
      }
      catch { /* Ignore damaged demo data and keep the current session usable. */ }
    })
    watch(ids, value => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })
  }

  function unlock(id: CompanionId) {
    if (!ids.value.includes(id)) ids.value = [...ids.value, id]
  }

  return { ids: readonly(ids), unlock }
}
