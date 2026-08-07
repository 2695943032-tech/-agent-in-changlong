export type AudioRecorderStatus = 'idle' | 'requesting' | 'recording' | 'recorded' | 'error' | 'unsupported'

export function useAudioRecorder(maxSeconds = 20) {
  const status = shallowRef<AudioRecorderStatus>('idle')
  const durationSeconds = shallowRef(0)
  const blob = shallowRef<Blob | null>(null)
  const error = shallowRef('')
  const audioUrl = shallowRef<string | null>(null)
  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let startedAt = 0
  let chunks: Blob[] = []

  const remainingSeconds = computed(() => Math.max(0, maxSeconds - durationSeconds.value))
  const supported = computed(() => import.meta.client && Boolean(navigator.mediaDevices?.getUserMedia) && 'MediaRecorder' in window)

  function cleanupStream() {
    stream?.getTracks().forEach(track => track.stop())
    stream = null
    if (timer) clearInterval(timer)
    timer = null
  }

  function setAudioBlob(value: Blob | null, seconds = 0) {
    if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
    blob.value = value
    durationSeconds.value = seconds
    audioUrl.value = value ? URL.createObjectURL(value) : null
    status.value = value ? 'recorded' : 'idle'
  }

  async function start() {
    error.value = ''
    if (!supported.value) {
      status.value = 'unsupported'
      return
    }
    status.value = 'requesting'
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunks = []
      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type))
      recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined)
      recorder.ondataavailable = event => event.data.size && chunks.push(event.data)
      recorder.onstop = () => {
        const recorded = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' })
        const seconds = Math.min(maxSeconds, Math.max(1, Math.round((Date.now() - startedAt) / 1000)))
        cleanupStream()
        setAudioBlob(recorded, seconds)
      }
      startedAt = Date.now()
      durationSeconds.value = 0
      recorder.start(250)
      status.value = 'recording'
      timer = setInterval(() => {
        durationSeconds.value = Math.min(maxSeconds, Math.floor((Date.now() - startedAt) / 1000))
        if (durationSeconds.value >= maxSeconds) stop()
      }, 200)
    }
    catch (cause) {
      cleanupStream()
      status.value = 'error'
      error.value = cause instanceof DOMException && cause.name === 'NotAllowedError'
        ? '没有获得麦克风权限。你仍然可以正常制作和保存票根。'
        : '旅行声音录制失败。你仍然可以正常制作票根。'
    }
  }

  function stop() {
    if (recorder?.state === 'recording') recorder.stop()
  }

  function reset() {
    if (recorder?.state === 'recording') recorder.stop()
    cleanupStream()
    recorder = null
    setAudioBlob(null)
    error.value = ''
  }

  if (import.meta.client) onMounted(() => {
    if (!supported.value) status.value = 'unsupported'
  })
  onBeforeUnmount(() => {
    cleanupStream()
    if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
  })

  return {
    status: readonly(status),
    durationSeconds: readonly(durationSeconds),
    remainingSeconds,
    blob: readonly(blob),
    audioUrl: readonly(audioUrl),
    error: readonly(error),
    supported,
    start,
    stop,
    reset,
    setAudioBlob,
  }
}

