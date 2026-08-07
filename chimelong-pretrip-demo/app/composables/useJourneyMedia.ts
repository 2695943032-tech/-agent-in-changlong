import { readJourneyBlob } from '../services/journeyMediaStorage'

export function useJourneyMedia(storageKey: MaybeRefOrGetter<string | undefined>) {
  const objectUrl = shallowRef<string | null>(null)
  const loading = shallowRef(false)
  const error = shallowRef('')

  watch(
    () => toValue(storageKey),
    async (key, _previous, onCleanup) => {
      if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
      objectUrl.value = null
      error.value = ''
      if (!key || !import.meta.client) return
      loading.value = true
      let cancelled = false
      onCleanup(() => { cancelled = true })
      try {
        const blob = await readJourneyBlob(key)
        if (!blob) throw new Error('媒体文件已不存在')
        const nextUrl = URL.createObjectURL(blob)
        if (cancelled) URL.revokeObjectURL(nextUrl)
        else objectUrl.value = nextUrl
      }
      catch (cause) {
        error.value = cause instanceof Error ? cause.message : '媒体读取失败'
      }
      finally {
        loading.value = false
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  })

  return { objectUrl: readonly(objectUrl), loading: readonly(loading), error: readonly(error) }
}

