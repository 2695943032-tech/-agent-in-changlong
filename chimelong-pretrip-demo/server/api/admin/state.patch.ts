import type { OperationsPatch } from '../../../shared/types/operations'
import { patchOperationsState } from '../../utils/operationsState'

export default defineEventHandler(async (event) => {
  const patch = await readBody<OperationsPatch>(event)
  return patchOperationsState(patch)
})
