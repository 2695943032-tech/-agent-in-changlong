import type {
  AnimalPoi,
  CatalogResponse,
  Companion,
  PaceOption,
  Restaurant,
  RouteEdge,
  RouteNode,
  Scenario,
} from '../../shared/types/pretrip'
import { parkMapMeta, parkMapPoints, parkMapRoutes } from '#shared/data/parkGeometry.generated'
import { DEFAULT_GEOFENCE_RADIUS_METERS, DEFAULT_ZONE_STAY_MINUTES } from '#shared/utils/parkGeo'

// Coordinates verified against the user-provided detailed POI GeoJSON (EPSG:4326).
const surveyedCoordinates: Partial<Record<keyof typeof parkMapPoints, readonly [number, number]>> = {
  entrance: [113.315459, 23.00128],
  panda: [113.310497, 23.003059],
  giraffe: [113.308466, 23.003716],
  gorilla: [113.313879, 23.001573],
  tiger: [113.305217, 23.004212],
  elephant: [113.309851, 23.002024],
  koala: [113.309464, 23.003678],
  'restaurant-panda': [113.311284, 23.002056],
  'restaurant-qinglong': [113.309664, 23.002561],
  'restaurant-momo': [113.312554, 23.002074],
}

function mappedPoint(id: keyof typeof parkMapPoints) {
  const point = parkMapPoints[id]
  const coordinate = surveyedCoordinates[id]
  if (coordinate) {
    const [longitude, latitude] = coordinate
    return {
      x: Number(((longitude - parkMapMeta.bounds.minLon) / (parkMapMeta.bounds.maxLon - parkMapMeta.bounds.minLon) * 100).toFixed(2)),
      y: Number(((parkMapMeta.bounds.maxLat - latitude) / (parkMapMeta.bounds.maxLat - parkMapMeta.bounds.minLat) * 100).toFixed(2)),
      longitude,
      latitude,
    }
  }
  return {
    x: Number((point.x / parkMapMeta.viewWidth * 100).toFixed(2)),
    y: Number((point.y / parkMapMeta.viewHeight * 100).toFixed(2)),
    longitude: point.longitude,
    latitude: point.latitude,
  }
}

export const scenarios: Scenario[] = [
  { id: 'normal', name: '普通日', emoji: '晴', description: '客流平稳，优先兼顾兴趣与步行距离。' },
  { id: 'peak', name: '客流高峰', emoji: '峰', description: '热门区域等待增加，优先保留高优先级动物。' },
  { id: 'rain', name: '雨天', emoji: '雨', description: '室外停留时间下降，等待数据按雨天演示值计算。' },
]

export const paceOptions: PaceOption[] = [
  { id: 'slow', name: '悠享慢游', description: '少走路、多休息，优先安排3—4个核心点位。', targetStops: 4 },
  { id: 'balanced', name: '均衡畅玩', description: '体验数量与体力更均衡，优先安排4—5个点位。', targetStops: 5 },
  { id: 'fast', name: '高效打卡', description: '接受紧凑节奏，尽可能体验5—6个点位。', targetStops: 6 },
]

export const companions: Companion[] = [
  {
    id: 'panda',
    name: '团团',
    species: '大熊猫伙伴',
    emoji: '熊猫',
    selectionImage: '/companions/panda-selection.png',
    chatCharacterImage: '/companions/panda-companion.webp',
    dragCharacterImage: '/companions/panda-dragging.webp',
    personality: '温柔耐心的亲子科普官',
    greeting: '你好呀，我是团团。把同行伙伴和最想见的动物告诉我，我会慢慢帮你排好这一天。',
    accent: '#d58b2c',
    recommendedAnimals: ['panda', 'giraffe', 'gorilla'],
  },
  {
    id: 'tiger',
    name: '凯凯',
    species: '白虎伙伴',
    emoji: '白虎',
    selectionImage: '/companions/tiger-selection.png',
    chatCharacterImage: '/companions/tiger-companion.webp',
    dragCharacterImage: '/companions/tiger-dragging.webp',
    personality: '行动果断的错峰探险队长',
    greeting: '我是凯凯。告诉我谁一起出发，我们用更少折返换更多动物奇遇。',
    accent: '#d2683c',
    recommendedAnimals: ['tiger', 'koala', 'elephant'],
  },
  {
    id: 'koala',
    name: '悠米',
    species: '考拉伙伴',
    emoji: '考拉',
    selectionImage: '/companions/koala-selection.png',
    chatCharacterImage: '/companions/koala-companion.webp',
    dragCharacterImage: '/companions/koala-dragging.webp',
    personality: '松弛细心的休闲路线管家',
    greeting: '嗨，我是悠米。舒服地玩也能看见精彩，我们一起把节奏调到刚刚好。',
    accent: '#6b8e74',
    recommendedAnimals: ['elephant', 'giraffe', 'panda'],
  },
  {
    id: 'elephant',
    name: '澜澜',
    species: '大象伙伴',
    emoji: '大象',
    selectionImage: '/companions/elephant-selection.png',
    chatCharacterImage: '/companions/elephant-companion.webp',
    dragCharacterImage: '/companions/elephant-dragging.webp',
    personality: '稳稳守护大家的安全向导',
    greeting: '嗨，我是澜澜。把今天同行的小伙伴交给我，我们稳稳地开启这场大象级冒险！',
    accent: '#159cb1',
    recommendedAnimals: ['elephant', 'panda', 'giraffe'],
  },
  {
    id: 'giraffe',
    name: '长乐',
    species: '长颈鹿伙伴',
    emoji: '长颈鹿',
    selectionImage: '/companions/giraffe-selection.png',
    chatCharacterImage: '/companions/giraffe-companion.webp',
    dragCharacterImage: '/companions/giraffe-dragging.webp',
    personality: '视野开阔的观察与拍照达人',
    greeting: '我是长乐！站得高看得远，路线、风景和精彩瞬间都逃不过我的眼睛。',
    accent: '#2f70e8',
    recommendedAnimals: ['giraffe', 'panda', 'gorilla'],
  },
  {
    id: 'gorilla',
    name: '阿悟',
    species: '猩猩伙伴',
    emoji: '猩猩',
    selectionImage: '/companions/gorilla-selection.png',
    chatCharacterImage: '/companions/gorilla-companion.webp',
    dragCharacterImage: '/companions/gorilla-dragging.webp',
    personality: '脑洞满格的科普闯关玩家',
    greeting: '嘿，我是阿悟！准备好了吗？我们把每个知识点都变成一场好玩的挑战。',
    accent: '#7151d7',
    recommendedAnimals: ['gorilla', 'tiger', 'koala'],
  },
]

export const animals: AnimalPoi[] = [
  {
    id: 'panda', nodeId: 'panda', name: '熊猫村', emoji: '熊猫', ...mappedPoint('panda'),
    description: '核心国宝展区，适合亲子科普与主题合影。', durationMinutes: DEFAULT_ZONE_STAY_MINUTES,
    openTime: '10:00', closeTime: '22:00', outdoor: false, geofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
    queueMinutes: { normal: 18, peak: 48, rain: 24 },
  },
  {
    id: 'giraffe', nodeId: 'giraffe', name: '长颈鹿', emoji: '长颈鹿', ...mappedPoint('giraffe'),
    description: '互动型展区，适合观察取食行为。', durationMinutes: DEFAULT_ZONE_STAY_MINUTES,
    openTime: '10:00', closeTime: '22:00', outdoor: true, geofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
    queueMinutes: { normal: 12, peak: 30, rain: 8 },
  },
  {
    id: 'gorilla', nodeId: 'gorilla', name: '黑猩猩馆', emoji: '猩猩', ...mappedPoint('gorilla'),
    description: '观察灵长类动物行为，适合自然科普。', durationMinutes: DEFAULT_ZONE_STAY_MINUTES,
    openTime: '10:00', closeTime: '22:00', outdoor: false, geofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
    queueMinutes: { normal: 10, peak: 24, rain: 14 },
  },
  {
    id: 'tiger', nodeId: 'tiger', name: '虎园', emoji: '白虎', ...mappedPoint('tiger'),
    description: '观察白虎活动，是园区猛兽主题重点展区。', durationMinutes: DEFAULT_ZONE_STAY_MINUTES,
    openTime: '10:00', closeTime: '22:00', outdoor: true, geofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
    queueMinutes: { normal: 16, peak: 42, rain: 12 },
  },
  {
    id: 'elephant', nodeId: 'elephant', name: '亚洲象园', emoji: '大象', ...mappedPoint('elephant'),
    description: '家庭友好的大型动物展区，可观察象群互动。', durationMinutes: DEFAULT_ZONE_STAY_MINUTES,
    openTime: '10:00', closeTime: '22:00', outdoor: true, geofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
    queueMinutes: { normal: 11, peak: 26, rain: 9 },
  },
  {
    id: 'koala', nodeId: 'koala', name: '考拉', emoji: '考拉', ...mappedPoint('koala'),
    description: '适合观察考拉慢生活习性与桉叶取食。', durationMinutes: DEFAULT_ZONE_STAY_MINUTES,
    openTime: '10:00', closeTime: '22:00', outdoor: true, geofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
    queueMinutes: { normal: 10, peak: 22, rain: 8 },
  },
]

export const restaurants: Restaurant[] = [
  {
    id: 'qinglong', nodeId: 'restaurant-qinglong', name: '考拉食街', emoji: '食', cuisine: '轻食餐饮',
    description: 'POI 数据标注的考拉主题餐饮点。', ...mappedPoint('restaurant-qinglong'),
    durationMinutes: 50, openTime: '10:00', closeTime: '22:00',
    queueMinutes: { normal: 10, peak: 28, rain: 14 },
  },
  {
    id: 'momo', nodeId: 'restaurant-momo', name: '飞禽餐厅', emoji: '食', cuisine: '园区餐饮',
    description: 'POI 数据标注的飞禽主题餐饮点。', ...mappedPoint('restaurant-momo'),
    durationMinutes: 50, openTime: '10:00', closeTime: '22:00',
    queueMinutes: { normal: 8, peak: 22, rain: 12 },
  },
  {
    id: 'panda', nodeId: 'restaurant-panda', name: '熊猫餐厅', emoji: '中', cuisine: '典型中餐',
    description: '位于熊猫主题区域，适合围绕熊猫园灵活安排用餐。', ...mappedPoint('restaurant-panda'),
    durationMinutes: 50, openTime: '10:00', closeTime: '22:00',
    queueMinutes: { normal: 12, peak: 30, rain: 16 },
  },
]

export const routeNodes: RouteNode[] = [
  { id: 'entrance', name: '南门入口', kind: 'entrance', ...mappedPoint('entrance') },
  ...animals.map(item => ({ id: item.nodeId, name: item.name, kind: 'animal' as const, x: item.x, y: item.y, longitude: item.longitude, latitude: item.latitude })),
  ...restaurants.map(item => ({ id: item.nodeId, name: item.name, kind: 'restaurant' as const, x: item.x, y: item.y, longitude: item.longitude, latitude: item.latitude })),
]

// 距离由用户提供的 OSM GeoJSON 步行路网生成：场馆先吸附到最近路网节点，再用 Dijkstra 计算最短路径。
export const routeEdges: RouteEdge[] = routeNodes.flatMap((from, index) => routeNodes.slice(index + 1).map((to) => {
  const route = parkMapRoutes[`${from.id}:${to.id}` as keyof typeof parkMapRoutes]
  if (!route) throw new Error(`GIS 路网缺少 ${from.id} 到 ${to.id} 的路径`)
  return { from: from.id, to: to.id, distanceMeters: route.distanceMeters }
}))

export const catalog: CatalogResponse = {
  companions,
  scenarios,
  paceOptions,
  animals,
  restaurants,
  routeNodes,
  routeEdges,
}
