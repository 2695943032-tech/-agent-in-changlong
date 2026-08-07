import type { JourneyTicketTemplateConfig } from '../types/journey'

export const journeyTicketTemplates: JourneyTicketTemplateConfig[] = [
  { id: 'classic', name: '经典游园票', description: '大图、日期与撕票线，信息最清晰', layout: 'horizontal', supportsPhoto: true, supportsMessage: true, supportsStats: true },
  { id: 'companion', name: '动物伙伴票', description: '伙伴头像与专属印章更突出', layout: 'horizontal', supportsPhoto: true, supportsMessage: true, supportsStats: true },
  { id: 'stamp', name: '森林邮票', description: '竖向邮票构图，适合社交平台', layout: 'vertical', supportsPhoto: true, supportsMessage: true, supportsStats: false },
  { id: 'expedition', name: '探险档案', description: '强调路线、距离、徽章与编号', layout: 'horizontal', supportsPhoto: true, supportsMessage: false, supportsStats: true },
]

