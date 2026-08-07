import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const [poiFile, roadFile, outputFile = 'shared/data/parkLiveData.generated.ts'] = process.argv.slice(2)
if (!poiFile || !roadFile) throw new Error('Usage: node scripts/generate-live-park-data.mjs <poi.geojson> <roads.geojson> [output.ts]')

const bounds = {
  minLon: 113.30305172543962,
  maxLon: 113.31879372543962,
  minLat: 22.99321060279202,
  maxLat: 23.01306960279202,
}
const walkableHighways = new Set(['footway', 'pedestrian', 'path', 'steps', 'service', 'unclassified'])
const landmarkCategories = new Set(['景点/景点', '游乐设施', '餐饮', '出入口', '公交站'])

function contains([longitude, latitude]) {
  return longitude >= bounds.minLon && longitude <= bounds.maxLon
    && latitude >= bounds.minLat && latitude <= bounds.maxLat
}

const [poiData, roadData] = await Promise.all([
  readFile(resolve(poiFile), 'utf8').then(JSON.parse),
  readFile(resolve(roadFile), 'utf8').then(JSON.parse),
])

const landmarks = poiData.features
  .filter(feature => feature.geometry?.type === 'Point' && contains(feature.geometry.coordinates))
  .filter(feature => landmarkCategories.has(feature.properties?.category))
  .filter(feature => feature.properties?.name && !/^卫生间-|^游乐设施-/.test(feature.properties.name))
  .map(feature => ({
    id: String(feature.properties.osm_id),
    name: feature.properties.name,
    category: feature.properties.category,
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
  }))

const roads = roadData.features
  .filter(feature => feature.geometry?.type === 'LineString' && walkableHighways.has(feature.properties?.highway))
  .filter(feature => feature.geometry.coordinates.some(contains))
  .map(feature => ({
    id: String(feature.properties.id),
    kind: feature.properties.highway,
    coordinates: feature.geometry.coordinates.filter(contains),
  }))
  .filter(feature => feature.coordinates.length > 1)

const output = `// Generated from the user-provided detailed POI and road-network GeoJSON files.\n`
  + `// Do not hand-edit; rerun scripts/generate-live-park-data.mjs when GIS data changes.\n\n`
  + `export const parkLiveLandmarks = ${JSON.stringify(landmarks, null, 2)} as const\n\n`
  + `export const parkLiveRoads = ${JSON.stringify(roads)} as const\n`

await writeFile(resolve(outputFile), output, 'utf8')
console.log(JSON.stringify({ outputFile: resolve(outputFile), landmarks: landmarks.length, roads: roads.length }))
