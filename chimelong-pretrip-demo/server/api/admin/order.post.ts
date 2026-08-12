import type { CompanionId } from '../../../shared/types/pretrip'
import { purchaseMerchandise } from '../../utils/operationsState'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids?: CompanionId[] }>(event)
  return purchaseMerchandise(Array.isArray(body.ids) ? body.ids : [])
})
