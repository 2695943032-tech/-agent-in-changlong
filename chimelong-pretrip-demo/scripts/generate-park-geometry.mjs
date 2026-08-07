import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const sourceRoot = resolve(process.argv[2] ?? 'output/map-reference-source/map')
const outputFile = resolve(process.argv[3] ?? 'shared/data/parkGeometry.generated.ts')
const parkOsmWayId = '297264709'
const walkableHighways = new Set(['footway', 'pedestrian', 'path', 'service', 'unclassified'])

const readJson = async name => JSON.parse(await readFile(resolve(sourceRoot, name), 'utf8'))
const [lineData, polygonData, pointData, zoneData] = await Promise.all([
  readJson('lines.geojson'),
  readJson('multipolygons.geojson'),
  readJson('points.geojson'),
  readJson('zoo.geojson'),
])

function flattenCoordinates(value, output = []) {
  if (Array.isArray(value) && value.length >= 2 && value.slice(0, 2).every(Number.isFinite)) {
    output.push([value[0], value[1]])
  }
  else if (Array.isArray(value)) {
    value.forEach(item => flattenCoordinates(item, output))
  }
  return output
}

function featureBounds(feature) {
  const points = flattenCoordinates(feature.geometry?.coordinates)
  return {
    minLon: Math.min(...points.map(point => point[0])),
    minLat: Math.min(...points.map(point => point[1])),
    maxLon: Math.max(...points.map(point => point[0])),
    maxLat: Math.max(...points.map(point => point[1])),
  }
}

function intersects(a, b) {
  return !(a.maxLon < b.minLon || a.minLon > b.maxLon || a.maxLat < b.minLat || a.minLat > b.maxLat)
}

const parkBoundary = polygonData.features.find(feature => String(feature.properties?.osm_way_id) === parkOsmWayId)
if (!parkBoundary) throw new Error('未找到长隆野生动物世界边界')
const bounds = featureBounds(parkBoundary)
const centerLatitude = (bounds.minLat + bounds.maxLat) / 2
const lonScale = Math.cos(centerLatitude * Math.PI / 180)
const widthMeters = haversine([bounds.minLon, centerLatitude], [bounds.maxLon, centerLatitude])
const heightMeters = haversine([bounds.minLon, bounds.minLat], [bounds.minLon, bounds.maxLat])
const viewWidth = 1000
const viewHeight = Math.round(viewWidth * heightMeters / widthMeters)

function project([longitude, latitude]) {
  return [
    Number(((longitude - bounds.minLon) / (bounds.maxLon - bounds.minLon) * viewWidth).toFixed(1)),
    Number(((bounds.maxLat - latitude) / (bounds.maxLat - bounds.minLat) * viewHeight).toFixed(1)),
  ]
}

function haversine(a, b) {
  const radius = 6371000
  const lat1 = a[1] * Math.PI / 180
  const lat2 = b[1] * Math.PI / 180
  const deltaLat = (b[1] - a[1]) * Math.PI / 180
  const deltaLon = (b[0] - a[0]) * Math.PI / 180
  const value = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2
  return 2 * radius * Math.asin(Math.sqrt(value))
}

function pointLineDistance(point, start, end) {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1])
  const ratio = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx ** 2 + dy ** 2)))
  return Math.hypot(point[0] - (start[0] + ratio * dx), point[1] - (start[1] + ratio * dy))
}

function simplify(points, tolerance = 1.4) {
  if (points.length <= 2) return points
  let maxDistance = 0
  let index = 0
  for (let cursor = 1; cursor < points.length - 1; cursor += 1) {
    const distance = pointLineDistance(points[cursor], points[0], points.at(-1))
    if (distance > maxDistance) {
      index = cursor
      maxDistance = distance
    }
  }
  if (maxDistance <= tolerance) return [points[0], points.at(-1)]
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)]
}

function geometryLines(geometry) {
  if (!geometry) return []
  if (geometry.type === 'LineString') return [geometry.coordinates]
  if (geometry.type === 'MultiLineString') return geometry.coordinates
  if (geometry.type === 'Polygon') return geometry.coordinates
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat()
  return []
}

function pathFromPoints(points, closed = false) {
  if (!points.length) return ''
  const projected = simplify(points.map(project))
  const commands = projected.map((point, index) => `${index ? 'L' : 'M'}${point[0]},${point[1]}`)
  return `${commands.join(' ')}${closed ? ' Z' : ''}`
}

const areas = polygonData.features
  .filter(feature => intersects(featureBounds(feature), bounds))
  .flatMap((feature) => {
    const properties = feature.properties ?? {}
    const kind = String(properties.osm_way_id) === parkOsmWayId
      ? 'boundary'
      : properties.natural === 'water'
        ? 'water'
        : ['wood', 'grassland'].includes(properties.natural)
          ? 'vegetation'
          : properties.building
            ? 'building'
            : 'habitat'
    if (kind === 'habitat' && !properties.leisure && !properties.landuse) return []
    return geometryLines(feature.geometry).map(points => ({ kind, path: pathFromPoints(points, true) }))
  })
  .filter(item => item.path)

const roads = lineData.features
  .filter(feature => walkableHighways.has(feature.properties?.highway) && intersects(featureBounds(feature), bounds))
  .flatMap(feature => geometryLines(feature.geometry).map(points => ({
    kind: ['footway', 'pedestrian', 'path'].includes(feature.properties?.highway) ? 'footway' : 'service',
    path: pathFromPoints(points),
  })))
  .filter(item => item.path)

const namedPoint = name => pointData.features.find(feature => feature.properties?.name === name)?.geometry?.coordinates
const pointByOsmId = id => pointData.features.find(feature => String(feature.properties?.osm_id) === String(id))?.geometry?.coordinates
const zoneIdMap = { white_tiger: 'tiger', orangutan: 'gorilla' }
const poiCoordinates = {
  entrance: namedPoint('南门入口'),
  ...Object.fromEntries(zoneData.features.map(feature => [zoneIdMap[feature.properties.id] ?? feature.properties.id, feature.geometry.coordinates])),
  'restaurant-panda': namedPoint('熊猫餐厅'),
  'restaurant-qinglong': [113.3088, 23.0034],
  'restaurant-momo': [113.30995, 23.00218],
}

const serviceCoordinates = {
  'service-restroom-south': pointByOsmId('2708228432'),
  'service-restroom-panda': pointByOsmId('2708229315'),
  'service-restroom-north': pointByOsmId('2708229316'),
  'service-restroom-koala': pointByOsmId('2708229317'),
  'service-restroom-west': pointByOsmId('2708229329'),
  'service-dining-panda': namedPoint('熊猫餐厅'),
  'service-dining-koala': namedPoint('考拉食街'),
  'service-dining-birds': namedPoint('飞禽餐厅'),
  'service-show-panda': namedPoint('熊猫4D剧场'),
  'service-retail-south': namedPoint('纪念品商店'),
  // The source GIS does not label these facilities. They remain explicit demo
  // configuration points and are never presented as surveyed GIS facilities.
  'service-family-south': [113.31516, 23.00173],
  'service-medical-south': [113.31532, 23.00162],
  'service-rest-river': [113.31175, 23.00335],
  'service-photo-giraffe': [113.30905, 23.00425],
}

for (const [id, coordinate] of Object.entries(serviceCoordinates)) {
  if (!coordinate) throw new Error(`未找到服务点 ${id} 的坐标`)
}

const graphNodes = new Map()
const adjacency = new Map()
const coordinateKey = coordinate => `${coordinate[0].toFixed(7)},${coordinate[1].toFixed(7)}`

function addGraphEdge(fromCoordinate, toCoordinate) {
  const from = coordinateKey(fromCoordinate)
  const to = coordinateKey(toCoordinate)
  graphNodes.set(from, fromCoordinate)
  graphNodes.set(to, toCoordinate)
  const distance = haversine(fromCoordinate, toCoordinate)
  if (!adjacency.has(from)) adjacency.set(from, [])
  if (!adjacency.has(to)) adjacency.set(to, [])
  adjacency.get(from).push({ to, distance })
  adjacency.get(to).push({ to: from, distance })
}

lineData.features
  .filter(feature => walkableHighways.has(feature.properties?.highway) && intersects(featureBounds(feature), bounds))
  .flatMap(feature => geometryLines(feature.geometry))
  .forEach(points => points.slice(1).forEach((point, index) => addGraphEdge(points[index], point)))

const snappedPoiNodes = Object.fromEntries(Object.entries(poiCoordinates).map(([id, coordinate]) => {
  const graphEntry = [...graphNodes.entries()].reduce((best, entry) => {
    const distance = haversine(coordinate, entry[1])
    return distance < best.distance ? { key: entry[0], distance } : best
  }, { key: '', distance: Number.POSITIVE_INFINITY })
  return [id, graphEntry]
}))

function shortestPath(fromId, toId) {
  const start = snappedPoiNodes[fromId].key
  const target = snappedPoiNodes[toId].key
  const distances = new Map([[start, 0]])
  const previous = new Map()
  const queue = [{ node: start, distance: 0 }]

  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance)
    const current = queue.shift()
    if (!current || current.distance !== distances.get(current.node)) continue
    if (current.node === target) break
    for (const edge of adjacency.get(current.node) ?? []) {
      const candidate = current.distance + edge.distance
      if (candidate < (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.to, candidate)
        previous.set(edge.to, current.node)
        queue.push({ node: edge.to, distance: candidate })
      }
    }
  }

  if (!distances.has(target)) throw new Error(`点位 ${fromId} 与 ${toId} 不连通`)
  const keys = []
  for (let cursor = target; cursor; cursor = previous.get(cursor)) {
    keys.unshift(cursor)
    if (cursor === start) break
  }
  const geographicPath = [poiCoordinates[fromId], ...keys.map(key => graphNodes.get(key)), poiCoordinates[toId]]
  const distanceMeters = Math.round(
    snappedPoiNodes[fromId].distance + distances.get(target) + snappedPoiNodes[toId].distance,
  )
  return {
    distanceMeters,
    path: simplify(geographicPath.map(project), 1.2).map(([x, y]) => [x, y]),
  }
}

const poiIds = Object.keys(poiCoordinates)
const routes = {}
for (const from of poiIds) {
  for (const to of poiIds) {
    if (from === to) continue
    routes[`${from}:${to}`] = shortestPath(from, to)
  }
}

const points = Object.fromEntries(Object.entries(poiCoordinates).map(([id, coordinate]) => {
  const [x, y] = project(coordinate)
  return [id, {
    x,
    y,
    longitude: coordinate[0],
    latitude: coordinate[1],
  }]
}))

const servicePoints = Object.fromEntries(Object.entries(serviceCoordinates).map(([id, coordinate]) => {
  const [x, y] = project(coordinate)
  return [id, {
    x,
    y,
    longitude: coordinate[0],
    latitude: coordinate[1],
  }]
}))

const graphNodeEntries = [...graphNodes.entries()]
const graphNodeIndex = new Map(graphNodeEntries.map(([key], index) => [key, index]))
const graphNodeOutput = graphNodeEntries.map(([, coordinate]) => {
  const [x, y] = project(coordinate)
  return [coordinate[0], coordinate[1], x, y]
})
const graphEdgeOutput = []
const seenEdges = new Set()
for (const [fromKey, edges] of adjacency.entries()) {
  const from = graphNodeIndex.get(fromKey)
  for (const edge of edges) {
    const to = graphNodeIndex.get(edge.to)
    const key = from < to ? `${from}:${to}` : `${to}:${from}`
    if (seenEdges.has(key)) continue
    seenEdges.add(key)
    graphEdgeOutput.push([from, to, Number(edge.distance.toFixed(2))])
  }
}

const output = `// This file is generated by scripts/generate-park-geometry.mjs from the user-provided GIS GeoJSON.\n`
  + `// Do not hand-edit geometry; rerun the generator when source data changes.\n\n`
  + `export const parkMapMeta = ${JSON.stringify({ viewWidth, viewHeight, bounds, centerLatitude, lonScale }, null, 2)} as const\n\n`
  + `export const parkMapAreas = ${JSON.stringify(areas)} as const\n\n`
  + `export const parkMapRoads = ${JSON.stringify(roads)} as const\n\n`
  + `export const parkMapPoints = ${JSON.stringify(points, null, 2)} as const\n\n`
  + `export const parkServicePoints = ${JSON.stringify(servicePoints, null, 2)} as const\n\n`
  + `export const parkGraphNodes = ${JSON.stringify(graphNodeOutput)} as const\n\n`
  + `export const parkGraphEdges = ${JSON.stringify(graphEdgeOutput)} as const\n\n`
  + `export const parkMapRoutes = ${JSON.stringify(routes)} as const\n`

await writeFile(outputFile, output, 'utf8')
console.log(JSON.stringify({ outputFile, viewWidth, viewHeight, areas: areas.length, roads: roads.length, graphNodes: graphNodeOutput.length, graphEdges: graphEdgeOutput.length, services: Object.keys(servicePoints).length, routes: Object.keys(routes).length }))
