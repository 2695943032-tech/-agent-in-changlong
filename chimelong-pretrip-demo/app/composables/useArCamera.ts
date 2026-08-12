import type { Ref } from 'vue'

export type ArCameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'

export function useArCamera(video: Readonly<Ref<HTMLVideoElement | null>>) {
  const status = shallowRef<ArCameraStatus>('idle')
  const error = shallowRef('')
  const facingMode = shallowRef<'environment' | 'user'>('environment')
  let stream: MediaStream | null = null

  function stop() {
    stream?.getTracks().forEach(track => track.stop())
    stream = null
    if (video.value) video.value.srcObject = null
    if (status.value === 'active') status.value = 'idle'
  }

  async function start() {
    if (!import.meta.client || !navigator.mediaDevices?.getUserMedia) {
      status.value = 'unsupported'
      error.value = '当前浏览器不支持实时相机，已切换为 AR 演示模式。'
      return
    }
    stop()
    status.value = 'requesting'
    error.value = ''
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: facingMode.value }, width: { ideal: 1280 }, height: { ideal: 1920 } },
      })
      if (video.value) {
        video.value.srcObject = stream
        await video.value.play()
      }
      status.value = 'active'
    }
    catch {
      status.value = 'denied'
      error.value = '未获得相机权限，已切换为 AR 演示模式。你仍可体验识别与讲解流程。'
    }
  }

  async function flip() {
    facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
    await start()
  }

  onBeforeUnmount(stop)
  return { status: readonly(status), error: readonly(error), facingMode: readonly(facingMode), start, stop, flip }
}
