interface FogTransitionOptions {
  label?: string
  coverMs?: number
  totalMs?: number
}

export function useFogTransition() {
  const active = useState<boolean>('journey-fog-active-v1', () => false)
  const label = useState<string>('journey-fog-label-v1', () => '下一段奇遇 · 正在展开')
  const transitionId = useState<number>('journey-fog-id-v1', () => 0)

  async function startFogTransition(options: FogTransitionOptions = {}): Promise<void> {
    const reducedMotion = import.meta.client
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coverMs = reducedMotion ? 20 : (options.coverMs ?? 560)
    const totalMs = reducedMotion ? 80 : Math.max(options.totalMs ?? 1450, coverMs)
    const currentId = transitionId.value + 1

    transitionId.value = currentId
    label.value = options.label ?? '下一段奇遇 · 正在展开'
    active.value = true

    await new Promise(resolve => setTimeout(resolve, coverMs))
    setTimeout(() => {
      if (transitionId.value === currentId) active.value = false
    }, totalMs - coverMs)
  }

  function finishFogTransition() {
    transitionId.value += 1
    active.value = false
  }

  return {
    active: readonly(active),
    label: readonly(label),
    startFogTransition,
    finishFogTransition,
  }
}
