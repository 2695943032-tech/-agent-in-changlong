import type { AnimalId, CompanionId } from './pretrip'

export type AnimalLiveStatus = '营业中' | '进食中' | '睡觉中'

export interface ZoneOperationsState {
  status: AnimalLiveStatus
  heat: number
}

export interface LostChildReport {
  id: string
  name: string
  appearance: string
  location: string
  guardianPhone: string
  createdAt: string
  status: '待处理' | '协查中' | '已找到'
}

export interface OperationsState {
  updatedAt: string
  zones: Record<AnimalId, ZoneOperationsState>
  merchStock: Record<CompanionId, number>
  lastStockChange: {
    id: CompanionId
    delta: number
    source: 'demo-order' | 'admin'
    createdAt: string
  } | null
  lostChildReports: LostChildReport[]
}

export interface OperationsPatch {
  zone?: { id: AnimalId, status: AnimalLiveStatus }
  stock?: { id: CompanionId, quantity: number }
  report?: { id: string, status: LostChildReport['status'] }
}
