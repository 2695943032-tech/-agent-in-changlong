import type { ParkService, ServiceKind } from '../types/park'
import { parkServicePoints } from './parkGeometry.generated'

interface ServiceSeed {
  id: keyof typeof parkServicePoints
  serviceKind: ServiceKind
  name: string
  detail: string
  aliases: string[]
  source: ParkService['source']
}

const seeds: ServiceSeed[] = [
  { id: 'service-restroom-south', serviceKind: 'restroom', name: '南门洗手间', detail: '主入口旁 · 真实 GIS 点位', aliases: ['洗手间', '厕所', '卫生间', '无障碍厕位'], source: 'gis' },
  { id: 'service-restroom-panda', serviceKind: 'restroom', name: '熊猫区洗手间', detail: '熊猫餐厅附近 · 真实 GIS 点位', aliases: ['洗手间', '厕所', '卫生间', '熊猫区厕所'], source: 'gis' },
  { id: 'service-restroom-north', serviceKind: 'restroom', name: '北区洗手间', detail: '北区步道旁 · 真实 GIS 点位', aliases: ['洗手间', '厕所', '卫生间', '北区厕所'], source: 'gis' },
  { id: 'service-restroom-koala', serviceKind: 'restroom', name: '考拉区洗手间', detail: '考拉园附近 · 真实 GIS 点位', aliases: ['洗手间', '厕所', '卫生间', '考拉区厕所'], source: 'gis' },
  { id: 'service-restroom-west', serviceKind: 'restroom', name: '西区洗手间', detail: '西区游览线旁 · 真实 GIS 点位', aliases: ['洗手间', '厕所', '卫生间', '西区厕所'], source: 'gis' },
  { id: 'service-dining-panda', serviceKind: 'dining', name: '熊猫餐厅', detail: '亲子套餐 · 真实 GIS 点位', aliases: ['餐厅', '吃饭', '餐饮', '熊猫餐厅'], source: 'gis' },
  { id: 'service-dining-koala', serviceKind: 'dining', name: '考拉食街', detail: '轻食与家庭餐 · 真实 GIS 点位', aliases: ['餐厅', '吃饭', '餐饮', '考拉食街'], source: 'gis' },
  { id: 'service-dining-birds', serviceKind: 'dining', name: '飞禽餐厅', detail: '西区餐饮点 · 真实 GIS 点位', aliases: ['餐厅', '吃饭', '餐饮', '飞禽餐厅'], source: 'gis' },
  { id: 'service-show-panda', serviceKind: 'show', name: '熊猫 4D 剧场', detail: '演出时间以园区现场为准 · 真实 GIS 点位', aliases: ['剧场', '演出', '表演', '4D剧场'], source: 'gis' },
  { id: 'service-retail-south', serviceKind: 'retail', name: '南门纪念品商店', detail: '伙伴周边与纪念品 · 真实 GIS 点位', aliases: ['商店', '纪念品', '周边', '购物'], source: 'gis' },
  { id: 'service-family-south', serviceKind: 'family', name: '亲子服务站', detail: '母婴室 · 饮水 · 婴儿车 · 演示配置点', aliases: ['母婴室', '亲子', '婴儿车', '喂奶', '换尿布'], source: 'demo' },
  { id: 'service-medical-south', serviceKind: 'medical', name: '园区医务服务点', detail: '紧急情况请优先联系现场工作人员 · 演示配置点', aliases: ['医务室', '医疗', '医生', '受伤', '不舒服'], source: 'demo' },
  { id: 'service-rest-river', serviceKind: 'rest', name: '河畔休息点', detail: '遮阴座椅 · 饮水 · 演示配置点', aliases: ['休息', '座椅', '喝水', '累了', '歇一会'], source: 'demo' },
  { id: 'service-photo-giraffe', serviceKind: 'photo', name: '长颈鹿同框点', detail: '顺光机位 · 伙伴姿势提示 · 演示配置点', aliases: ['拍照', '合影', '打卡', '同框'], source: 'demo' },
]

export const parkServices: ParkService[] = seeds.map((seed) => {
  const point = parkServicePoints[seed.id]
  return {
    ...seed,
    kind: 'service',
    x: point.x / 10,
    y: point.y / 9.51,
    longitude: point.longitude,
    latitude: point.latitude,
  }
})

export const serviceKindLabels: Record<ServiceKind, string> = {
  dining: '餐饮',
  restroom: '洗手间',
  family: '亲子',
  medical: '医疗',
  rest: '休息',
  show: '演出',
  photo: '拍照',
  retail: '商店',
}

