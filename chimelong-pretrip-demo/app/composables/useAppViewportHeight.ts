export function useAppViewportHeight() {
  const viewportHeight = shallowRef<number | null>(null)

  function syncViewportHeight() {
    const nextHeight = Math.round(window.visualViewport?.height ?? window.innerHeight)
    if (nextHeight <= 0 || viewportHeight.value === nextHeight) return
    viewportHeight.value = nextHeight
    document.documentElement.style.setProperty('--app-viewport-height', `${nextHeight}px`)
  }

  onMounted(() => {
    syncViewportHeight()
    window.addEventListener('resize', syncViewportHeight, { passive: true })
    window.addEventListener('orientationchange', syncViewportHeight, { passive: true })
    window.visualViewport?.addEventListener('resize', syncViewportHeight, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', syncViewportHeight)
    window.removeEventListener('orientationchange', syncViewportHeight)
    window.visualViewport?.removeEventListener('resize', syncViewportHeight)
  })

  return readonly(viewportHeight)
}
