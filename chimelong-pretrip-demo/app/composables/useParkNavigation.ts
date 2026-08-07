import type { GeoPoint, Pace } from '../../shared/types/pretrip'
import type { ParkNavigationRoute, ParkNavigationTarget } from '../../shared/types/park'
import { parkMapPoints } from '#shared/data/parkGeometry.generated'
import { navigationRouteFromPosition } from '#shared/utils/parkGeo'

export function useParkNavigation() {
  const route = useState<ParkNavigationRoute | null>('park-active-navigation-v1', () => null)
  const error = useState('park-navigation-error-v1', () => '')

  function start(target: ParkNavigationTarget, currentPosition?: GeoPoint | null, pace: Pace = 'balanced') {
    try {
      route.value = navigationRouteFromPosition(currentPosition ?? parkMapPoints.entrance, target, pace)
      error.value = ''
      return route.value
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : '暂时无法生成这条步行路线。'
      return null
    }
  }

  function clear() {
    route.value = null
    error.value = ''
  }

  return { route: readonly(route), error: readonly(error), start, clear }
}

