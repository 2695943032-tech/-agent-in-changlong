import type { AnimalId, CompanionId, GeoPoint, VisitorProfile } from './pretrip'

export type JourneyStatus = 'active' | 'completed'
export type JourneyEventType =
  | 'journey_started'
  | 'zone_arrived'
  | 'zone_left'
  | 'companion_unlocked'
  | 'task_completed'
  | 'badge_earned'
  | 'route_changed'
  | 'rest_started'
  | 'photo_added'
  | 'video_added'
  | 'conversation'
  | 'journey_finished'

export type JourneyMediaKind = 'photo' | 'video'
export type JourneyTicketTemplate = 'classic' | 'companion' | 'stamp' | 'expedition'

export interface JourneyEvent {
  id: string
  type: JourneyEventType
  occurredAt: string
  title: string
  detail?: string
  zoneId?: AnimalId
  companionId?: CompanionId
  data?: Record<string, string | number | boolean | null>
}

export interface JourneyMedia {
  id: string
  journeyId: string
  kind: JourneyMediaKind
  storageKey: string
  mimeType: string
  createdAt: string
  zoneId?: AnimalId
  caption?: string
  isHighlight: boolean
}

export interface JourneyPlanSnapshot {
  planId?: string
  zoneIds: AnimalId[]
  walkingMeters: number
  visitorProfile?: VisitorProfile
}

export interface JourneyRouteChange {
  id: string
  occurredAt: string
  reason: string
  beforeZoneIds: AnimalId[]
  afterZoneIds: AnimalId[]
}

export interface ActualJourneyRecord {
  visitedZoneIds: AnimalId[]
  routePoints: Array<GeoPoint & { recordedAt: string }>
  completedTaskIds: string[]
  badgeZoneIds: AnimalId[]
  unlockedCompanionIds: CompanionId[]
  walkingDistanceMeters: number
  routeChanges: JourneyRouteChange[]
}

export interface TicketPhotoTransform {
  x: number
  y: number
  scale: number
}

export interface JourneyTicketAudio {
  id: string
  journeyId: string
  ticketId: string
  createdAt: string
  durationSeconds: number
  mimeType: string
  storageKey: string
}

export interface JourneyTicketStatsSnapshot {
  visitedZoneCount: number
  completedTaskCount: number
  earnedBadgeCount: number
  walkingDistanceMeters: number
  routeCompletionRate?: number
}

export interface JourneyTicketExportRecord {
  id: string
  kind: 'horizontal' | 'story'
  createdAt: string
}

export interface JourneyTicket {
  id: string
  journeyId: string
  createdAt: string
  updatedAt: string
  ticketNumber: string
  template: JourneyTicketTemplate
  title: string
  subtitle?: string
  message?: string
  showMessage: boolean
  companionId: CompanionId
  featuredZoneId?: AnimalId
  coverPhotoId?: string
  coverTransform: TicketPhotoTransform
  audio?: JourneyTicketAudio
  zooName: string
  visitDate: string
  statsSnapshot: JourneyTicketStatsSnapshot
  exportHistory: JourneyTicketExportRecord[]
}

export interface JourneyRecord {
  schemaVersion: 2
  id: string
  status: JourneyStatus
  zooName: string
  visitDate: string
  startedAt: string
  completedAt?: string
  primaryCompanionId: CompanionId
  visitorProfile?: VisitorProfile
  planSnapshot: JourneyPlanSnapshot
  actualJourney: ActualJourneyRecord
  events: JourneyEvent[]
  media: JourneyMedia[]
  ticket?: JourneyTicket
}

export interface JourneyCollection {
  schemaVersion: 2
  activeJourneyId: string | null
  records: JourneyRecord[]
}

export interface JourneyTicketTemplateConfig {
  id: JourneyTicketTemplate
  name: string
  description: string
  layout: 'horizontal' | 'vertical'
  supportsPhoto: boolean
  supportsMessage: boolean
  supportsStats: boolean
}

