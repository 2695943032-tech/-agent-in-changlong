export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  return {
    configured: Boolean(config.aiApiKey),
    provider: config.aiProvider,
    model: config.aiModel,
    baseUrl: config.aiBaseUrl,
  }
})
