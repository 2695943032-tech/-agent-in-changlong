export type ScenarioId = 'normal' | 'peak' | 'rain'
export type CompanionId = 'panda' | 'tiger' | 'koala' | 'elephant' | 'giraffe' | 'gorilla'
export type PartyType = 'family' | 'couple' | 'friends' | 'solo' | 'unknown'
export type Pace = 'slow' | 'balanced' | 'fast'
export type AnimalId = 'panda' | 'giraffe' | 'gorilla' | 'tiger' | 'elephant' | 'koala'
export type RestaurantId = 'qinglong' | 'momo' | 'panda'
export type DiningChoice = RestaurantId | 'none' | null
export type PlanMode = 'rules' | 'deepseek-assisted'
export type PoiKind = 'entrance' | 'animal' | 'restaurant'
export type ChatStep = 'party' | 'pace' | 'time' | 'animals' | 'dining' | 'supplement' | 'confirm'

export interface Point {
  x: number
  y: number
}

export interface GeoPoint {
  longitude: number
  latitude: number
}

export interface QueueByScenario {
  normal: number
  peak: number
  rain: number
}

export interface Companion {
  id: CompanionId
  name: string
  species: string
  emoji: string
  selectionImage: string
  chatCharacterImage: string
  dragCharacterImage: string
  personality: string
  greeting: string
  accent: string
  recommendedAnimals: AnimalId[]
}

export interface Scenario {
  id: ScenarioId
  name: string
  emoji: string
  description: string
}

export interface PaceOption {
  id: Pace
  name: string
  description: string
  targetStops: number
}

export interface AnimalPoi extends Point, GeoPoint {
  id: AnimalId
  nodeId: string
  name: string
  emoji: string
  description: string
  durationMinutes: number
  openTime: string
  closeTime: string
  outdoor: boolean
  geofenceRadiusMeters: number
  queueMinutes: QueueByScenario
}

export interface Restaurant extends Point, GeoPoint {
  id: RestaurantId
  nodeId: string
  name: string
  emoji: string
  cuisine: string
  description: string
  durationMinutes: number
  openTime: string
  closeTime: string
  queueMinutes: QueueByScenario
}

export interface RouteNode extends Point, GeoPoint {
  id: string
  name: string
  kind: PoiKind
}

export interface RouteEdge {
  from: string
  to: string
  distanceMeters: number
}

export interface VisitorProfile {
  partyType: PartyType
  adultCount: number | null
  childCount: number | null
  children: Array<{ age: number | null, heightCm: number | null }>
  pace: Pace | null
  startTime: string | null
  endTime: string | null
  animalPriority: AnimalId[]
  diningChoice: DiningChoice
  freeText: string
}

export interface PlanRequest {
  profile: VisitorProfile
  companionId: CompanionId
  scenarioId: ScenarioId
}

export interface ChatTurnRequest {
  companionId: CompanionId
  step: ChatStep
  profile: VisitorProfile
  answerSummary: string
}

export interface ChatTurnResponse {
  message: string
  mode: 'template' | 'deepseek'
  recommendedRestaurantId?: RestaurantId
}

export interface PlanStop extends Point {
  id: string
  poiId: AnimalId | RestaurantId
  nodeId: string
  name: string
  kind: 'animal' | 'restaurant'
  emoji: string
  startTime: string
  endTime: string
  durationMinutes: number
  queueMinutes: number
  travelMinutes: number
  distanceMeters: number
  priorityRank: number | null
  reason: string
}

export interface SkippedAnimal {
  id: AnimalId
  name: string
  rank: number
  reason: string
}

export interface PlanResponse {
  planId: string
  mode: PlanMode
  scenarioId: ScenarioId
  companion: Companion
  title: string
  summary: string
  startTime: string
  endTime: string
  totalMinutes: number
  walkingMeters: number
  walkingMinutes: number
  queueMinutes: number
  userPriority: AnimalId[]
  actualAnimalOrder: AnimalId[]
  stops: PlanStop[]
  skippedAnimals: SkippedAnimal[]
  selectedRestaurant: Restaurant | null
  warnings: string[]
  disclosure: string
}

export interface CatalogResponse {
  companions: Companion[]
  scenarios: Scenario[]
  paceOptions: PaceOption[]
  animals: AnimalPoi[]
  restaurants: Restaurant[]
  routeNodes: RouteNode[]
  routeEdges: RouteEdge[]
}
