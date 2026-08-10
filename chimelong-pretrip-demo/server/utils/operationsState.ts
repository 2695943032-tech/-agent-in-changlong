import type { AnimalId, CompanionId } from '../../shared/types/pretrip'
import type { AnimalLiveStatus, LostChildReport, OperationsPatch, OperationsState } from '../../shared/types/operations'

const animalIds: AnimalId[] = ['panda', 'tiger', 'koala', 'elephant', 'giraffe', 'gorilla']
const initialHeat: Record<AnimalId, number> = { panda: 82, tiger: 68, koala: 76, elephant: 54, giraffe: 63, gorilla: 47 }

const zones = Object.fromEntries(animalIds.map(id => [id, { status: '营业中' as AnimalLiveStatus, heat: initialHeat[id] }])) as OperationsState['zones']
const merchStock: Record<CompanionId, number> = { panda: 18, tiger: 12, koala: 15, elephant: 8, giraffe: 10, gorilla: 6 }
let lastStockChange: OperationsState['lastStockChange'] = null
const lostChildReports: LostChildReport[] = []

function liveHeat(id: AnimalId, index: number) {
  const wave = Math.round(Math.sin(Date.now() / 12000 + index * 1.7) * 6)
  return Math.max(8, Math.min(98, initialHeat[id] + wave))
}

export function getOperationsState(): OperationsState {
  return {
    updatedAt: new Date().toISOString(),
    zones: Object.fromEntries(animalIds.map((id, index) => [id, { ...zones[id], heat: liveHeat(id, index) }])) as OperationsState['zones'],
    merchStock: { ...merchStock },
    lastStockChange: lastStockChange ? { ...lastStockChange } : null,
    lostChildReports: lostChildReports.map(report => ({ ...report })),
  }
}

export function patchOperationsState(patch: OperationsPatch) {
  if (patch.zone) zones[patch.zone.id].status = patch.zone.status
  if (patch.stock) {
    const previous = merchStock[patch.stock.id]
    merchStock[patch.stock.id] = Math.max(0, Math.floor(patch.stock.quantity))
    lastStockChange = { id: patch.stock.id, delta: merchStock[patch.stock.id] - previous, source: 'admin', createdAt: new Date().toISOString() }
  }
  if (patch.report) {
    const report = lostChildReports.find(item => item.id === patch.report!.id)
    if (report) report.status = patch.report.status
  }
  return getOperationsState()
}

export function purchaseMerchandise(ids: CompanionId[]) {
  const uniqueIds = [...new Set(ids)].filter((id): id is CompanionId => animalIds.includes(id))
  if (!uniqueIds.length) throw createError({ statusCode: 400, statusMessage: '纪念袋中没有可下单商品' })
  if (uniqueIds.some(id => merchStock[id] <= 0)) throw createError({ statusCode: 409, statusMessage: '商品已售罄，请刷新后重试' })

  for (const id of uniqueIds) {
    merchStock[id] -= 1
    lastStockChange = { id, delta: -1, source: 'demo-order', createdAt: new Date().toISOString() }
  }
  return getOperationsState()
}

export function addLostChildReport(input: Pick<LostChildReport, 'name' | 'appearance' | 'location' | 'guardianPhone'>) {
  const report: LostChildReport = {
    id: `lost-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    appearance: input.appearance.trim(),
    location: input.location.trim(),
    guardianPhone: input.guardianPhone.trim(),
    createdAt: new Date().toISOString(),
    status: '待处理',
  }
  lostChildReports.unshift(report)
  return report
}
