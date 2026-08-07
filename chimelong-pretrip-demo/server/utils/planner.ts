import { randomUUID } from 'node:crypto'
import type {
  AnimalId,
  AnimalPoi,
  Pace,
  PlanRequest,
  PlanResponse,
  PlanStop,
  Restaurant,
  SkippedAnimal,
} from '../../shared/types/pretrip'
import {
  animals,
  companions,
  paceOptions,
  restaurants,
  routeEdges,
  routeNodes,
} from '../data/catalog'

const DEFAULT_START = '10:00'
const DEFAULT_END = '22:00'
const VISIT_START_BOUNDARY = 10 * 60
const VISIT_END_BOUNDARY = 22 * 60

const animalById = new Map(animals.map(item => [item.id, item]))
const nodeIds = routeNodes.map(node => node.id)

function buildDistanceMatrix(): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>()
  for (const from of nodeIds) {
    matrix.set(from, new Map(nodeIds.map(to => [to, from === to ? 0 : Number.POSITIVE_INFINITY])))
  }

  for (const edge of routeEdges) {
    matrix.get(edge.from)?.set(edge.to, edge.distanceMeters)
    matrix.get(edge.to)?.set(edge.from, edge.distanceMeters)
  }

  for (const via of nodeIds) {
    for (const from of nodeIds) {
      for (const to of nodeIds) {
        const direct = matrix.get(from)?.get(to) ?? Number.POSITIVE_INFINITY
        const candidate = (matrix.get(from)?.get(via) ?? Number.POSITIVE_INFINITY)
          + (matrix.get(via)?.get(to) ?? Number.POSITIVE_INFINITY)
        if (candidate < direct) matrix.get(from)?.set(to, candidate)
      }
    }
  }

  return matrix
}

const distanceMatrix = buildDistanceMatrix()

export function shortestDistance(from: string, to: string): number {
  const value = distanceMatrix.get(from)?.get(to)
  if (value === undefined || !Number.isFinite(value)) throw new Error(`点位 ${from} 与 ${to} 之间缺少可行路径`)
  return value
}

function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function toTime(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`
}

function walkingSpeed(pace: Pace): number {
  return pace === 'slow' ? 55 : pace === 'fast' ? 85 : 70
}

function travelMinutes(distanceMeters: number, pace: Pace): number {
  return Math.max(1, Math.ceil(distanceMeters / walkingSpeed(pace)))
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items]
  const result: T[][] = []
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)]
    for (const tail of permutations(rest)) result.push([item, ...tail])
  })
  return result
}

type SchedulablePoi = AnimalPoi | Restaurant

interface Simulation {
  stops: PlanStop[]
  walkingMeters: number
  walkingMinutes: number
  queueMinutes: number
  finishMinutes: number
  score: number
}

function isRestaurant(item: SchedulablePoi): item is Restaurant {
  return 'cuisine' in item
}

function simulateSequence(
  sequence: SchedulablePoi[],
  request: PlanRequest,
  pace: Pace,
  visitStart: number,
  visitEnd: number,
  priority: AnimalId[],
): Simulation | null {
  const stops: PlanStop[] = []
  let currentNode = 'entrance'
  let currentMinutes = visitStart
  let walkingMeters = 0
  let walkingMinutes = 0
  let queueMinutes = 0

  for (const poi of sequence) {
    const distanceMeters = shortestDistance(currentNode, poi.nodeId)
    const travel = travelMinutes(distanceMeters, pace)
    const queue = poi.queueMinutes[request.scenarioId]
    const open = toMinutes(poi.openTime)
    const close = toMinutes(poi.closeTime)
    const start = Math.max(currentMinutes + travel + queue, open)

    const durationFactor = pace === 'slow' ? 1.08 : pace === 'fast' ? 0.9 : 1
    const duration = Math.round(poi.durationMinutes * durationFactor)
    const end = start + duration
    if (end > visitEnd || end > close) return null

    const priorityRank = isRestaurant(poi) ? null : priority.indexOf(poi.id) + 1
    stops.push({
      id: `${poi.nodeId}-${start}`,
      poiId: poi.id,
      nodeId: poi.nodeId,
      name: poi.name,
      kind: isRestaurant(poi) ? 'restaurant' : 'animal',
      emoji: poi.emoji,
      x: poi.x,
      y: poi.y,
      startTime: toTime(start),
      endTime: toTime(end),
      durationMinutes: duration,
      queueMinutes: queue,
      travelMinutes: travel,
      distanceMeters,
      priorityRank: priorityRank || null,
      reason: isRestaurant(poi)
        ? `${poi.cuisine}选择已按营业时间和路线距离，插入到增加步行最少的位置。`
        : `你的第${priorityRank}优先动物；实际到访顺序已按园区步行距离优化。`,
    })

    walkingMeters += distanceMeters
    walkingMinutes += travel
    queueMinutes += queue
    currentMinutes = end
    currentNode = poi.nodeId
  }

  return {
    stops,
    walkingMeters,
    walkingMinutes,
    queueMinutes,
    finishMinutes: currentMinutes,
    score: walkingMeters + queueMinutes * 2 + (currentMinutes - visitStart) * 0.05,
  }
}

function bestSimulation(
  selectedAnimals: AnimalPoi[],
  restaurant: Restaurant | null,
  request: PlanRequest,
  pace: Pace,
  visitStart: number,
  visitEnd: number,
  priority: AnimalId[],
): Simulation | null {
  let best: Simulation | null = null

  for (const animalOrder of permutations(selectedAnimals)) {
    const sequences: SchedulablePoi[][] = restaurant
      ? Array.from({ length: animalOrder.length + 1 }, (_, index) => {
          const sequence: SchedulablePoi[] = [...animalOrder]
          sequence.splice(index, 0, restaurant)
          return sequence
        })
      : [animalOrder]

    for (const sequence of sequences) {
      const simulation = simulateSequence(sequence, request, pace, visitStart, visitEnd, priority)
      if (simulation && (!best || simulation.score < best.score)) best = simulation
    }
  }

  return best
}

function uniqueValidPriority(input: AnimalId[]): AnimalId[] {
  return [...new Set(input)].filter(id => animalById.has(id))
}

export function buildPlan(request: PlanRequest): PlanResponse {
  const companion = companions.find(item => item.id === request.companionId)
  if (!companion) throw new Error('动物伙伴配置不存在')

  const pace = request.profile.pace ?? 'balanced'
  const startTime = request.profile.startTime ?? DEFAULT_START
  const endTime = request.profile.endTime ?? DEFAULT_END
  const visitStart = toMinutes(startTime)
  const visitEnd = toMinutes(endTime)
  if (visitStart < VISIT_START_BOUNDARY || visitEnd > VISIT_END_BOUNDARY) {
    throw new Error('入园和离园时间须在10:00—22:00之间')
  }
  if (visitEnd - visitStart < 240) throw new Error('游玩时长至少需要4小时')

  const userSelectedPriority = uniqueValidPriority(request.profile.animalPriority)
  const priority = userSelectedPriority.length > 0
    ? userSelectedPriority
    : [...companion.recommendedAnimals]
  const targetStops = paceOptions.find(item => item.id === pace)?.targetStops ?? 5
  const restaurant = request.profile.diningChoice && request.profile.diningChoice !== 'none'
    ? restaurants.find(item => item.id === request.profile.diningChoice) ?? null
    : null

  let selectedIds = priority.slice(0, targetStops)
  let simulation: Simulation | null = null
  while (selectedIds.length > 0 && !simulation) {
    const selectedAnimals = selectedIds.map(id => animalById.get(id)).filter((item): item is AnimalPoi => Boolean(item))
    simulation = bestSimulation(selectedAnimals, restaurant, request, pace, visitStart, visitEnd, priority)
    if (!simulation) selectedIds = selectedIds.slice(0, -1)
  }

  if (!simulation) throw new Error('当前时间范围内无法生成可行路线，请延长游玩时间')

  const skippedAnimals: SkippedAnimal[] = priority
    .filter(id => !selectedIds.includes(id))
    .map((id) => {
      const animal = animalById.get(id)!
      return {
        id,
        name: animal.name,
        rank: priority.indexOf(id) + 1,
        reason: priority.indexOf(id) >= targetStops
          ? `${paceOptions.find(item => item.id === pace)?.name ?? '当前节奏'}优先保留前${targetStops}项。`
          : '受游玩时间、点位开放时间和闭园时间限制，本次暂未排入。',
      }
    })

  const actualAnimalOrder = simulation.stops
    .filter(stop => stop.kind === 'animal')
    .map(stop => stop.poiId as AnimalId)
  const partyLabel = request.profile.partyType === 'family'
    ? '亲子家庭'
    : request.profile.partyType === 'couple'
      ? '情侣'
      : request.profile.partyType === 'friends'
        ? '朋友结伴'
        : request.profile.partyType === 'solo' ? '独自出游' : '游客'

  return {
    planId: randomUUID(),
    mode: 'rules',
    scenarioId: request.scenarioId,
    companion,
    title: `${companion.name}为你安排的${partyLabel}路线`,
    summary: `保留${actualAnimalOrder.length}个高优先级动物点位，按地图距离重新排序，预计步行${simulation.walkingMeters}米。`,
    startTime,
    endTime,
    totalMinutes: simulation.finishMinutes - visitStart,
    walkingMeters: simulation.walkingMeters,
    walkingMinutes: simulation.walkingMinutes,
    queueMinutes: simulation.queueMinutes,
    userPriority: priority,
    actualAnimalOrder,
    stops: simulation.stops,
    skippedAnimals,
    selectedRestaurant: restaurant,
    warnings: [
      '地图步行距离来自用户提供的《青翠动物园游览导览图》，按双向近似距离计算。',
      '排队、开放时间与停留时长均为比赛 Demo 模拟数据，请以园区现场公示为准。',
    ],
    disclosure: '本路线仅用于比赛 Demo，不构成真实预约、支付或游园承诺。',
  }
}
