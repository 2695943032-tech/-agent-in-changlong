import type { AnimalId, AnimalPoi, GeoPoint, Pace } from '../types/pretrip'
import type { ParkNavigationRoute, ParkNavigationTarget } from '../types/park'
import { parkGraphEdges, parkGraphNodes, parkMapMeta, parkMapRoutes } from '../data/parkGeometry.generated'

export const DEFAULT_GEOFENCE_RADIUS_METERS = 50
export const DEFAULT_ZONE_STAY_MINUTES = 55

export function haversineMeters(from: GeoPoint, to: GeoPoint): number {
  const radius = 6371000
  const lat1 = from.latitude * Math.PI / 180
  const lat2 = to.latitude * Math.PI / 180
  const deltaLat = (to.latitude - from.latitude) * Math.PI / 180
  const deltaLon = (to.longitude - from.longitude) * Math.PI / 180
  const value = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2
  return 2 * radius * Math.asin(Math.sqrt(value))
}

export function findGeofenceMatch(position: GeoPoint, zones: readonly AnimalPoi[]) {
  return zones
    .map(zone => ({ zone, distanceMeters: haversineMeters(position, zone) }))
    .filter(item => item.distanceMeters <= item.zone.geofenceRadiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)[0] ?? null
}

export function routeDistanceMeters(from: string, to: string): number {
  if (from === to) return 0
  const route = parkMapRoutes[`${from}:${to}` as keyof typeof parkMapRoutes]
  if (!route) throw new Error(`缺少 ${from} 到 ${to} 的园区步行路径`)
  return route.distanceMeters
}

export function routePath(from: string, to: string): readonly (readonly [number, number])[] {
  if (from === to) return []
  return parkMapRoutes[`${from}:${to}` as keyof typeof parkMapRoutes]?.path ?? []
}

export function walkingMetersPerMinute(pace: Pace = 'balanced'): number {
  return pace === 'slow' ? 58 : pace === 'fast' ? 82 : 70
}

export function walkingMinutes(distanceMeters: number, pace: Pace = 'balanced'): number {
  return distanceMeters === 0 ? 0 : Math.max(1, Math.ceil(distanceMeters / walkingMetersPerMinute(pace)))
}

export function projectGeoPoint(point: GeoPoint) {
  const { bounds, viewWidth, viewHeight } = parkMapMeta
  return {
    x: (point.longitude - bounds.minLon) / (bounds.maxLon - bounds.minLon) * viewWidth,
    y: (bounds.maxLat - point.latitude) / (bounds.maxLat - bounds.minLat) * viewHeight,
  }
}

const graphAdjacency = (() => {
  const result: Array<Array<{ to: number, distance: number }>> = Array.from({ length: parkGraphNodes.length }, () => [])
  for (const [from, to, distance] of parkGraphEdges) {
    result[from]!.push({ to, distance })
    result[to]!.push({ to: from, distance })
  }
  return result
})()

function nearestGraphNode(point: GeoPoint) {
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < parkGraphNodes.length; index += 1) {
    const [longitude, latitude] = parkGraphNodes[index]!
    const distance = haversineMeters(point, { longitude, latitude })
    if (distance < bestDistance) {
      bestIndex = index
      bestDistance = distance
    }
  }
  return { index: bestIndex, distance: bestDistance }
}

function pushHeap(heap: Array<{ node: number, distance: number }>, value: { node: number, distance: number }) {
  heap.push(value)
  let index = heap.length - 1
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2)
    if (heap[parent]!.distance <= value.distance) break
    heap[index] = heap[parent]!
    index = parent
  }
  heap[index] = value
}

function popHeap(heap: Array<{ node: number, distance: number }>) {
  const root = heap[0]
  const tail = heap.pop()
  if (!root || !tail || !heap.length) return root
  let index = 0
  while (true) {
    const left = index * 2 + 1
    const right = left + 1
    if (left >= heap.length) break
    const child = right < heap.length && heap[right]!.distance < heap[left]!.distance ? right : left
    if (heap[child]!.distance >= tail.distance) break
    heap[index] = heap[child]!
    index = child
  }
  heap[index] = tail
  return root
}

export function navigationRouteFromPosition(
  from: GeoPoint,
  target: ParkNavigationTarget,
  pace: Pace = 'balanced',
): ParkNavigationRoute {
  const start = nearestGraphNode(from)
  const finish = nearestGraphNode(target)
  const distances = new Float64Array(parkGraphNodes.length)
  distances.fill(Number.POSITIVE_INFINITY)
  distances[start.index] = 0
  const previous = new Int32Array(parkGraphNodes.length)
  previous.fill(-1)
  const heap: Array<{ node: number, distance: number }> = []
  pushHeap(heap, { node: start.index, distance: 0 })

  while (heap.length) {
    const current = popHeap(heap)
    if (!current || current.distance !== distances[current.node]) continue
    if (current.node === finish.index) break
    for (const edge of graphAdjacency[current.node] ?? []) {
      const candidate = current.distance + edge.distance
      if (candidate >= distances[edge.to]!) continue
      distances[edge.to] = candidate
      previous[edge.to] = current.node
      pushHeap(heap, { node: edge.to, distance: candidate })
    }
  }

  const indices: number[] = []
  let cursor = finish.index
  while (cursor >= 0) {
    indices.unshift(cursor)
    if (cursor === start.index) break
    cursor = previous[cursor]!
  }
  if (indices[0] !== start.index) throw new Error(`当前位置与${target.name}之间没有可用步行路径`)
  const projectedStart = projectGeoPoint(from)
  const projectedTarget = projectGeoPoint(target)
  const distanceMeters = Math.round(start.distance + distances[finish.index]! + finish.distance)
  return {
    target,
    distanceMeters,
    walkingMinutes: walkingMinutes(distanceMeters, pace),
    path: [
      projectedStart,
      ...indices.map((index) => {
        const [, , x, y] = parkGraphNodes[index]!
        return { x, y }
      }),
      projectedTarget,
    ],
    startedAt: new Date().toISOString(),
  }
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]]
  const result: T[][] = []
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)]
    permutations(rest).forEach(tail => result.push([item, ...tail]))
  })
  return result
}

export function optimizeZoneOrder(startNode: string, zoneIds: readonly AnimalId[]): AnimalId[] {
  const unique = [...new Set(zoneIds)]
  let best = unique
  let bestDistance = Number.POSITIVE_INFINITY
  for (const order of permutations(unique)) {
    let current = startNode
    let distance = 0
    for (const zoneId of order) {
      distance += routeDistanceMeters(current, zoneId)
      current = zoneId
    }
    if (distance < bestDistance) {
      best = order
      bestDistance = distance
    }
  }
  return best
}

export function routeSummary(startNode: string, zoneIds: readonly AnimalId[], pace: Pace = 'balanced') {
  let current = startNode
  let distanceMeters = 0
  for (const zoneId of zoneIds) {
    distanceMeters += routeDistanceMeters(current, zoneId)
    current = zoneId
  }
  return {
    distanceMeters,
    walkingMinutes: walkingMinutes(distanceMeters, pace),
    stayMinutes: zoneIds.length * DEFAULT_ZONE_STAY_MINUTES,
  }
}
