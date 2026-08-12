import { addLostChildReport } from '../../utils/operationsState'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string, appearance?: string, location?: string, guardianPhone?: string }>(event)
  if (!body.name?.trim() || !body.appearance?.trim() || !body.location?.trim() || !body.guardianPhone?.trim()) {
    throw createError({ statusCode: 400, statusMessage: '走失儿童信息不完整' })
  }
  return addLostChildReport({ name: body.name, appearance: body.appearance, location: body.location, guardianPhone: body.guardianPhone })
})
