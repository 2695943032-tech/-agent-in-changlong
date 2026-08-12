import type { CompanionId } from '../../shared/types/pretrip'

export interface MerchProduct {
  name: string
  price: string
  description: string
  badge: string
}

export const merchCatalog: Record<CompanionId, MerchProduct> = {
  panda: { name: '团团竹林伙伴毛绒挂件', price: '¥59', description: '柔软短绒材质，附“竹林观察员”限定身份牌。', badge: '熊猫村限定' },
  tiger: { name: '凯凯虎纹探险徽章', price: '¥39', description: '金属珐琅徽章，记录你完成的虎园观察挑战。', badge: '虎园限定' },
  koala: { name: '悠米慢游考拉挂件', price: '¥55', description: '考拉 Agent 同款造型，可挂在儿童背包或钥匙圈上。', badge: '考拉园限定' },
  elephant: { name: '潺潺象群守护水杯', price: '¥79', description: '儿童友好吸管杯，附大象科普贴纸一套。', badge: '亚洲象园限定' },
  giraffe: { name: '长乐高空观察员帽', price: '¥69', description: '轻量儿童遮阳帽，带长颈鹿观察员刺绣标。', badge: '长颈鹿园限定' },
  gorilla: { name: '阿悟森林解谜贴纸册', price: '¥45', description: '包含灵长类科普贴纸和园区闯关记录页。', badge: '黑猩猩馆限定' },
}
