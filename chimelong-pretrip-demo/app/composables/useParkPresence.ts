import type { GeoPoint } from '../../shared/types/pretrip'
import { parkMapMeta } from '#shared/data/parkGeometry.generated'

export type ParkPresenceStatus = 'idle' | 'requesting' | 'watching' | 'inside' | 'denied' | 'unavailable'

function isInsideParkBounds(position: GeoPoint) {
  const { bounds } = parkMapMeta
  return position.longitude >= bounds.minLon
    && position.longitude <= bounds.maxLon
    && position.latitude >= bounds.minLat
    && position.latitude <= bounds.maxLat
}

/** Browser-only location lifecycle for the conversation experience. */
export function useParkPresence() {
  const status = shallowRef<ParkPresenceStatus>('idle')
  const position = shallowRef<GeoPoint | null>(null)
  const error = shallowRef('')
  let watchId: number | undefined

  function stop() {
    if (watchId !== undefined && navigator.geolocation) navigator.geolocation.clearWatch(watchId)
    watchId = undefined
  }

  function start(onEnter?: (nextPosition: GeoPoint) => void) {
    if (!import.meta.client || watchId !== undefined) return
    if (!navigator.geolocation) {
      status.value = 'unavailable'
      error.value = '当前设备不支持定位，你也可以直接告诉我“我到了”。'
      return
    }
    status.value = 'requesting'
    watchId = navigator.geolocation.watchPosition(
      (next) => {
        const nextPosition = { longitude: next.coords.longitude, latitude: next.coords.latitude }
        position.value = nextPosition
        status.value = isInsideParkBounds(nextPosition) ? 'inside' : 'watching'
        error.value = ''
        if (status.value === 'inside') onEnter?.(nextPosition)
      },
      () => {
        status.value = 'denied'
        error.value = '没有获得定位权限；到园后发一句“我到了”即可继续。'
        stop()
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    )
  }

  onBeforeUnmount(stop)
  return { status: readonly(status), position: readonly(position), error: readonly(error), start, stop, isInsideParkBounds }
}
