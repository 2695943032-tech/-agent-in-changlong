import type { AnimalId, CompanionId, GeoPoint } from './pretrip'

export type TripMode = 'follow' | 'free'
export type DynamicEventId = 'queue-surge' | 'fatigue'
export type ServiceKind = 'dining' | 'restroom' | 'family' | 'medical' | 'rest' | 'show' | 'photo' | 'retail'
export type ParkDestinationKind = 'animal' | 'service'

export interface ParkMapPathPoint {
  x: number
  y: number
}

export interface ParkNavigationTarget {
  id: string
  kind: ParkDestinationKind
  name: string
  longitude: number
  latitude: number
}

export interface ParkNavigationRoute {
  target: ParkNavigationTarget
  distanceMeters: number
  walkingMinutes: number
  path: readonly ParkMapPathPoint[]
  startedAt: string
}

export interface ParkJourneyState {
  version: 2
  started: boolean
  mode: TripMode | null
  starterCompanionId: CompanionId | null
  activeCompanionId: CompanionId | null
  unlockedCompanionIds: CompanionId[]
  currentZoneId: AnimalId | null
  visitedZoneIds: AnimalId[]
  completedTaskIds: string[]
  badgeZoneIds: AnimalId[]
  routeZoneIds: AnimalId[]
  routeCompletedIds: AnimalId[]
  activeEventId: DynamicEventId | null
  resolvedEventIds: DynamicEventId[]
  routeAdjusted: boolean
  breakInserted: boolean
  currentPosition: GeoPoint | null
  currentZoneDistanceMeters: number | null
  totalWalkedMeters: number
  routeRevision: number
}

export type ParkAdjustmentAction = 'none' | 'rest' | 'reroute' | 'skip-next' | 'nearest-next'

export interface ParkChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  mode?: 'deepseek' | 'template'
}

export interface ParkChatRequest {
  sessionId: string
  companionId: CompanionId
  currentZoneId: AnimalId | null
  currentPosition: GeoPoint | null
  routeZoneIds: AnimalId[]
  completedZoneIds: AnimalId[]
  question: string
}

export interface ParkChatResponse {
  reply: string
  mode: 'deepseek' | 'template'
  action: ParkAdjustmentAction
  nextZoneId: AnimalId | null
  distanceMeters: number | null
  walkingMinutes: number | null
  navigationTarget: ParkNavigationTarget | null
}

export interface ZoneTask {
  id: string
  title: string
  prompt: string
  choices: string[]
  correctChoice: string
  successMessage: string
}

export interface ParkZoneContent {
  id: AnimalId
  companionId: CompanionId
  kicker: string
  welcome: string
  fact: string
  badgeName: string
  task: ZoneTask
}

export interface ParkService extends ParkNavigationTarget {
  kind: 'service'
  serviceKind: ServiceKind
  id: string
  name: string
  detail: string
  x: number
  y: number
  longitude: number
  latitude: number
  aliases: string[]
  source: 'gis' | 'demo'
}
