# 长隆奇遇伴侣：全周期空间智能动物 Agent 游园系统项目理解文档

这份文档用于在新对话中快速交接项目背景。后续如果把它发给新的 AI/Codex，对方应先阅读本文件，再继续开发、写方案、调试或部署。

## 1. 项目一句话定位

本项目面向长隆野生动物世界，构建贯穿“游前规划—游中空间陪伴—游后记忆留存”的全周期 AI 智慧游园系统，以动物拟人 Agent、GIS 空间触发、动态路线调度和 AIGC 纪念内容，把传统导览升级为可对话、可行动、可留存、可转化的情感型游园伙伴。

项目展示名可使用：

- 长隆奇遇伴侣
- 全周期空间智能动物 Agent 游园系统
- 长隆动物 Agent 智慧游园 Demo

## 2. 参赛命题理解

长隆集团的命题核心不是做一个普通地图工具，而是从“全周期游客视角”出发，用 AI 重塑人与乐园空间的连接。传统数字导览大多停留在“被动说明书”阶段：用户需要主动查地图、查排队、查餐厅、查动物知识，系统只负责回答或展示信息。

本项目的理解是：AI 应当成为游客的“随行伙伴”，主动理解游客是谁、想怎么玩、现在在哪里、身体状态如何、刚刚看到了什么，并把这些数据沉淀为游后的情感资产与商业转化入口。

因此，本项目的参赛表达可以概括为：

- 游前：AI 先认识游客，根据同行结构、节奏、时间、兴趣优先级和餐饮需求，生成个性化路线。
- 游中：游客进入不同动物展区时，空间自动唤醒对应动物 Agent，进行科普、陪聊、任务、路线调整与服务导航。
- 游后：系统基于真实游玩轨迹、对话、照片、任务和徽章生成回忆星册、奇遇票根、AI bit 风纪念照，并连接票根册、周边和 IP 复购。

## 3. 项目核心创新点

### 3.1 全周期闭环创新

系统不只覆盖“正在游玩”的单点场景，而是完整连接：

1. 游前感知：识别游客画像与游玩偏好。
2. 游中沉浸：空间触发动物 Agent、动态路线调度、现场互动。
3. 游后留存：生成个性化数字资产与票根册，延长情感关系。

这让一次入园体验从“当天结束”变成“可回看、可收藏、可分享、可复购”的长期关系。

### 3.2 双层智能体架构

项目避免使用“一个全园通用助手回答所有问题”的传统模式，而采用：

- 全局调度大模型/规则引擎：负责路线规划、距离计算、排队权衡、餐饮插入、动态调整。
- 多动物独立拟人 Agent：每个动物拥有独立名字、人设、语气、知识库、任务和陪伴方式。

目前项目中的动物伙伴包括：

- 团团：大熊猫伙伴，温柔耐心的亲子科普官。
- 凯凯：白虎伙伴，行动果断的错峰探险队长。
- 悠米：考拉伙伴，松弛细心的休闲路线管家。
- 澜澜：大象伙伴，稳稳守护大家的安全向导。
- 长乐：长颈鹿伙伴，视野开阔的观察引导员。
- 森森：猩猩伙伴，机灵活泼的互动搭子。

### 3.3 空间触发创新

游中体验使用地图点位、动物展区坐标、地理围栏和路线数据。游客进入某个动物展区后，系统会自动识别当前位置并触发对应动物 Agent，形成“走到哪里，谁来陪你”的空间沉浸感。

这比传统“打开 App 后手动点问答”更接近真实乐园体验：游客不是在查说明书，而是在被园区空间主动回应。

### 3.4 动态路线与服务衔接

系统支持根据实时情境调整路线，例如：

- 用户觉得累：插入休息建议。
- 前方排队太久：重排后续路线。
- 用户想去最近的展区：按真实路网重新计算下一站。
- 用户问餐厅、厕所、母婴室、医疗点、拍照点、商店等：根据园内服务点导航。

### 3.5 游后情感资产与商业闭环

游后不是简单显示“你走了几公里”，而是把用户的真实游园数据转化为可收藏的内容：

- 回忆星册：路线故事、发生过的事、伙伴总结、观察证明、现场光线、回忆短片、奇遇票根。
- 奇遇票根：用户可选择照片、标题、留言、声音、样式、横竖屏。
- AI bit 风纪念照：把真实游客照片转换为高清 16-bit 像素风，但保持人物特征、正常色彩和清晰度。
- 票根册：用户制作的票根可以加入票根册，并通过动画完成收藏仪式。

商业表达上，这条链路可以转化为实体纪念册、IP 周边、动物玩偶、挂件、照片打印、主题餐饮套餐、二次入园提醒等。

## 4. 当前已实现的产品结构

项目已经不是单纯的“游前 Demo”，而是完整的 Nuxt/Vue 全周期 Web 应用。

本地源码位置：

```text
D:\ai创新大赛\chimelong-pretrip-demo
```

线上部署域名：

```text
https://qiyucl.site
```

主要页面路由：

```text
/                  首页：全周期旅程入口
/pretrip           游前：AI 行程规划
/inpark            游中：地图与随行 Agent
/inpark/zone/[id]  游中：单个动物展区详情
/posttrip          游后：回忆星册
/posttrip/ticket   游后：制作奇遇票根
/posttrip/tickets  游后：票根册
/posttrip/tickets/[id] 单张票根详情
/posttrip/tickets/collect 票根加入票根册动画
```

## 5. 游前模块说明

游前模块目标是让游客在入园前通过对话完成个性化路线规划。

核心流程：

1. 先选择一个动物 Agent。
2. Agent 以对话方式引导用户填写信息。
3. 用户可选择同行人数与类型：家庭、情侣、朋友、独自、跳过。
4. 家庭出游可填写大人几位、孩子几位。
5. 选择旅行节奏：悠享慢游、均衡畅玩、高效打卡。
6. 选择入园和离园时间，默认支持 10:00—22:00。
7. 对六个动物进行优先级排序：熊猫、长颈鹿、猩猩、老虎、大象、考拉。
8. 选择是否园内用餐。
9. 可选餐厅：青龙餐厅、小莫和多多的餐厅、熊猫餐厅。
10. 根据用户选择生成路线、时间轴、地图、摘要和未安排原因。

餐厅知识：

- 青龙餐厅：粤菜。
- 小莫和多多的餐厅：西餐。
- 熊猫餐厅：典型中餐。

游前的核心算法：

- 路线节点和距离来自园区地图/GeoJSON 数据。
- 使用距离矩阵计算点位之间的最短距离。
- 根据用户选择的节奏决定目标点位数量。
- 根据优先级决定“时间不足时优先保留谁”。
- 根据步行距离、排队时间、停留时长和餐饮选择安排完整路线。
- 如果用户选择餐厅，系统会把餐厅插入到总代价更低、更顺路的位置。

关键源码：

```text
app/pages/pretrip.vue
app/components/pretrip/PretripExperience.vue
app/components/pretrip/AgentSelection.vue
app/components/pretrip/AgentChat.vue
app/components/pretrip/AnimalPriorityPicker.vue
app/components/pretrip/DiningPicker.vue
app/components/pretrip/PlanOverview.vue
app/components/pretrip/RouteMap.vue
app/components/pretrip/ItineraryTimeline.vue
app/composables/usePretripJourney.ts
server/utils/planner.ts
server/api/pretrip/chat.post.ts
server/api/pretrip/plan.post.ts
```

## 6. 游中模块说明

游中模块目标是让游客在园区里获得空间沉浸式陪伴。

核心体验：

1. 用户从游前路线进入游中，也可以直接快速开始。
2. 可以选择“跟随游前计划”或“自由探索”。
3. 地图区域优先显示，底部对话抽屉可上拉/展开。
4. 用户可以点击地图展区模拟到达，也可以使用定位。
5. 到达展区后，系统记录位置、到访、解锁伙伴，并跳转到对应展区详情页。
6. 展区详情页展示该动物的专属知识、观察任务、媒体记录、底部浮动对话框。
7. 用户在对话中可问动物知识、餐饮、路线、休息、跳过下一站、最近路线等。
8. 如果对话产生导航请求，系统生成路线，并在页面中央弹窗询问是否回到地图查看红线。

已实现的游中能力：

- 地图展示与手势缩放。
- 动物展区 geofence/空间触发。
- 进入不同展区唤醒不同动物 Agent。
- 随行对话支持滚动条，适配手机和电脑。
- 底部输入框固定，避免内容滚动时输入区丢失。
- 动态事件：排队激增、疲劳提醒。
- 服务导航：餐饮、厕所、母婴、医疗、休息、演出、拍照、零售等。
- Prompt 注入防护：屏蔽要求泄露系统提示词、角色指令等输入。
- 大模型输出清洗：避免把“动作、旁白、提示词、舞台说明”等内容展示给用户。

关键源码：

```text
app/pages/inpark/index.vue
app/pages/inpark/zone/[id].vue
app/components/inpark/InParkExperience.vue
app/components/inpark/ParkMap.vue
app/components/inpark/ParkAgentChat.vue
app/components/inpark/ParkServiceDrawer.vue
app/components/inpark/ZoneUnlockSheet.vue
app/components/inpark/zone/ZoneExperience.vue
app/components/inpark/zone/ZoneKnowledgeDeck.vue
app/components/inpark/zone/ZoneMediaCapture.vue
app/components/inpark/zone/ZoneChatComposer.vue
app/composables/useParkJourney.ts
app/composables/useParkNavigation.ts
server/api/inpark/chat.post.ts
server/utils/parkChat.ts
server/data/zoneKnowledge.ts
shared/data/zoneExperience.ts
shared/data/parkServices.ts
```

## 7. 游后模块说明

游后模块目标是把一次游园体验转化为长期留存的数字纪念资产。

回忆星册页面已经重构为移动端友好的顶部横向 Tab：

- 01 路线故事
- 02 发生过的事
- 03 伙伴总结
- 04 观察证明
- 05 现场光线
- 15s 回忆短片
- 06 奇遇票根

电脑端顶部 Tab 两侧有左右按钮，方便点击横向滚动。

游后记录的数据来源：

- 游前路线快照。
- 游中到访过的展区。
- 位置轨迹。
- 解锁过的伙伴。
- 完成过的观察任务。
- 获得过的徽章。
- 用户与 Agent 的对话。
- 路线变更记录。
- 用户上传/拍摄的照片与视频。
- 用户制作的票根和旅行声音。

奇遇票根编辑器结构：

- 顶部预览成品票根。
- 下方横向栏目：
  - 票根封面
  - 标题与留言
  - 旅行声音
  - 票根样式
  - 横屏/竖屏
- 用户可以上传真实照片。
- 用户可以点击“AI 转为高清 bit 风”，把真实照片转成现代活泼的 16-bit 像素风纪念照。
- 转换后的图片会自动设为当前票根封面。
- 点击“加入票根册”后保存票根，并进入收藏动画页。

票根册动画：

1. 当前票根从顶部预览缓缓移到画面中央。
2. 背景整体变暗。
3. 出现闪光、飘带、发光特效。
4. 票根册背后页面显现。
5. 票根缓缓落回票根册空白位置。

关键源码：

```text
app/pages/posttrip/index.vue
app/pages/posttrip/ticket.vue
app/pages/posttrip/tickets/index.vue
app/pages/posttrip/tickets/[id].vue
app/pages/posttrip/tickets/collect.vue
app/components/posttrip/MemoryBook.vue
app/components/posttrip/JourneyMemoryReel.vue
app/components/posttrip/JourneyEventTimeline.vue
app/components/journey-ticket/JourneyTicketEditor.vue
app/components/journey-ticket/JourneyTicketPreview.vue
app/components/journey-ticket/JourneyTicketAlbum.vue
app/components/journey-ticket/JourneyTicketCollectAnimation.vue
app/components/journey-ticket/JourneyTicketPhotoPicker.vue
app/components/journey-ticket/JourneyTicketAudioRecorder.vue
app/composables/useJourneyRecords.ts
app/services/journeyMediaStorage.ts
server/api/posttrip/pixelize.post.ts
server/utils/imageTransform.ts
shared/data/ticketTemplates.ts
```

## 8. 数据与存储

当前项目主要使用浏览器本地存储模拟完整闭环，不依赖真实数据库。

本地缓存 key：

```text
chimelong-pretrip-journey-v4
chimelong-pretrip-journey-v3
chimelong-park-journey-v2
chimelong-journey-records-v2
```

清除缓存逻辑在：

```text
app/utils/experienceCache.ts
```

数据类型定义：

```text
shared/types/pretrip.ts
shared/types/park.ts
shared/types/journey.ts
```

核心数据文件：

```text
server/data/catalog.ts
shared/data/parkGeometry.generated.ts
shared/data/parkLiveData.generated.ts
shared/data/parkServices.ts
shared/data/zoneExperience.ts
server/data/zoneKnowledge.ts
shared/data/ticketTemplates.ts
```

比赛表达中可以说 MySQL 是正式落地时的数据存储层，但当前 Demo 为了方便评审访问，使用 localStorage / IndexedDB 类前端存储模拟游客画像、轨迹、交互、媒体和票根数据。

如果后续要接真实数据库，可以把下面数据表作为正式版设计：

- 游客画像表：同行结构、偏好、节奏、餐饮选择。
- 展区信息表：动物点位、开放时间、知识库、地理围栏。
- 客流时序表：时间片、排队分钟、人流等级。
- 交互对话表：游客问题、Agent 回答、触发动作。
- 文创商品表：动物 IP、商品类型、库存、推荐规则。
- 游后资产表：回忆星册、票根、照片、声音、短片生成结果。

## 9. AI/API 接入

### 9.1 DeepSeek 对话接口

游前和游中的文字对话支持 DeepSeek 或其他 OpenAI Chat Completions 兼容服务。没有配置 Key 时会自动使用本地模板，不影响路线规划。

环境变量：

```text
NUXT_AI_API_KEY=
NUXT_AI_BASE_URL=https://api.deepseek.com
NUXT_AI_MODEL=deepseek-v4-flash
NUXT_AI_PROVIDER=deepseek
NUXT_AI_TIMEOUT_MS=8000
```

相关代码：

```text
server/utils/ai.ts
server/api/pretrip/chat.post.ts
server/api/inpark/chat.post.ts
```

注意：不要把真实 API Key 写入前端页面或公开文档。

### 9.2 图片生成/图片编辑接口

游后票根的“真实照片 → 高清 bit 风纪念照”使用图片编辑接口。

环境变量：

```text
NUXT_IMAGE_API_KEY=
NUXT_IMAGE_BASE_URL=
NUXT_IMAGE_MODEL=gpt-image-2
NUXT_IMAGE_ENDPOINT=/images/edits
NUXT_IMAGE_TIMEOUT_MS=180000
```

当前项目按 OpenAI-compatible Images Edits 协议发送 multipart/form-data：

- `model`
- `image`
- `prompt`
- `size`
- `quality`
- `response_format`

图片 prompt 当前要求：

- 必须基于用户上传照片做 image-to-image 转换。
- 保留人物身份、五官、发型、肤色、年龄感、体态、姿势、衣服颜色、配饰和人数。
- 保留原始构图和主要背景。
- 明显 16-bit pixel-art / bit 风。
- 正常色彩、鲜亮、活泼、生动。
- 不要复古、怀旧、老照片、暗街机、低饱和、褪色。
- 清晰到适合打印主题乐园票根。
- 不要直接返回原图，也不要只做轻微滤镜。

相关代码：

```text
server/api/posttrip/pixelize.post.ts
server/utils/imageTransform.ts
app/components/journey-ticket/JourneyTicketEditor.vue
```

## 10. 技术栈

```text
Nuxt 4
Vue 3
TypeScript
Vitest
pnpm
PM2
Nginx
```

常用命令：

```powershell
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

本次读取时测试状态：

```text
6 个测试文件通过
44 个测试用例通过
```

## 11. 部署上下文

公网域名：

```text
https://qiyucl.site
```

服务器：

```text
root@103.242.2.204
```

远程项目目录：

```text
/var/www/chimelong-pretrip-demo
```

PM2 应用名：

```text
chimelong-pretrip
```

Nginx 反代：

```text
127.0.0.1:3000
```

项目 PM2 配置：

```text
ecosystem.config.cjs
```

部署说明：

```text
DEPLOY.md
deploy/nginx.conf.example
```

密码防护状态：

- 之前网页端曾开启 Basic Auth。
- 旧密码已停用，不应写入公开材料或交接文档。
- 当前已关闭密码防护，访问站点不应再弹登录框。

安全提醒：如果新对话需要部署或排查服务器，可以读取本地部署文档和 Nginx 配置，但不要在公开材料中暴露私钥、真实 API Key 或服务器敏感凭据。

## 12. 当前 Demo 与真实落地的边界

当前项目是比赛 Demo，不是长隆官方真实生产系统。以下数据为演示或模拟：

- 排队时间。
- 开放时间。
- 停留时长。
- 客流高峰/雨天情景。
- 部分服务点位。
- AIGC 回忆内容。
- 路线安排。

正式落地时应接入：

- 官方地图/GIS。
- 实时客流与排队。
- 餐饮库存与营业状态。
- 酒店/票务/会员系统。
- 商品库存与电商订单。
- 支付、优惠券和会员权益。
- 用户授权与隐私合规系统。

## 13. 比赛汇报时的推荐表达

可用项目总述：

> 本项目打造“长隆奇遇伴侣”全周期 AI 智慧游园系统，围绕游前、游中、游后三个阶段，把传统导览工具升级为具有动物 IP 性格、空间感知能力和记忆生成能力的智能陪伴系统。游前，游客通过动物 Agent 对话完成出行画像采集，系统结合兴趣优先级、同行结构、节奏、时间、餐饮需求和园区距离知识库生成路线。游中，游客进入不同动物展区后，系统基于地理围栏自动唤醒对应动物 Agent，提供趣味科普、观察任务、路线调整和服务导航。游后，系统把实际轨迹、对话、照片、任务和徽章转化为回忆星册、奇遇票根和 AI bit 风纪念照，进一步连接实体纪念册、动物周边和二次消费，实现从一次游玩到长期 IP 关系的商业闭环。

推荐突出三个价值：

1. 体验价值：从查地图变成被动物伙伴陪着玩。
2. 运营价值：动态调度人流，降低拥堵，提高园区空间利用率。
3. 商业价值：情绪连接沉淀为数字纪念资产，并带动餐饮、零售、周边和复购。

## 14. 后续开发注意事项

1. 优先保持移动端体验，因为目标用户主要是手机游客。
2. 不要让页面变成长滚动说明书，重要信息应使用抽屉、Tab、卡片、浮动底栏承载。
3. 游中地图要尽量多露出，底部对话框应可展开/收起。
4. 展区详情页的底部对话输入框应固定，不要随内容滚走。
5. 大模型输出必须经过安全约束与清洗，不能显示 prompt、舞台说明、系统提示词。
6. 图片生成接口成功后，生成结果必须进入媒体库并自动设为票根封面。
7. 游后所有数据要尽量来自真实游玩记录，不要和游前/游中断代。
8. 清缓存功能要同时清理游前、游中、游后记录和浏览器缓存。
9. API Key、SSH Key、服务器凭据不能写入前端或公开文档。
10. 每次修改后建议至少运行 `pnpm test`，重要改动运行 `pnpm check`。

## 15. 给新对话 AI/Codex 的简短上下文

如果新对话只想快速接上，可以直接复制下面这段：

```text
这是一个长隆野生动物世界参赛 Demo，项目名“长隆奇遇伴侣 / 全周期空间智能动物 Agent 游园系统”。源码在 D:\ai创新大赛\chimelong-pretrip-demo，技术栈 Nuxt 4 + Vue 3 + TypeScript + pnpm + Vitest。线上域名 https://qiyucl.site，服务器 root@103.242.2.204，远程目录 /var/www/chimelong-pretrip-demo，PM2 应用名 chimelong-pretrip。

项目核心是贯穿游前、游中、游后的 AI 智慧游园体验：游前通过动物 Agent 对话采集同行人数、旅行节奏、入离园时间、动物优先级和餐饮需求，基于地图距离知识库生成路线；游中通过地图/GIS/geofence 模拟进入动物展区，自动唤醒对应动物 Agent，支持科普问答、观察任务、路线调整、休息/餐饮/厕所/服务导航；游后把真实游玩轨迹、对话、任务、徽章、照片和声音生成回忆星册、奇遇票根、AI 高清 bit 风纪念照和票根册。

关键源码：游前 app/components/pretrip 与 server/utils/planner.ts；游中 app/components/inpark、app/components/inpark/zone、server/utils/parkChat.ts；游后 app/components/posttrip、app/components/journey-ticket、server/utils/imageTransform.ts。主要数据在 server/data/catalog.ts、shared/data/parkGeometry.generated.ts、shared/data/parkServices.ts、shared/data/zoneExperience.ts、server/data/zoneKnowledge.ts、shared/data/ticketTemplates.ts。本地缓存 key 包括 chimelong-pretrip-journey-v4、chimelong-park-journey-v2、chimelong-journey-records-v2，清缓存逻辑在 app/utils/experienceCache.ts。

AI 接口：DeepSeek/OpenAI-compatible chat 使用 NUXT_AI_API_KEY、NUXT_AI_BASE_URL、NUXT_AI_MODEL；图片编辑使用 NUXT_IMAGE_API_KEY、NUXT_IMAGE_BASE_URL、NUXT_IMAGE_MODEL=gpt-image-2、NUXT_IMAGE_ENDPOINT=/images/edits。不要暴露真实密钥。当前是比赛 Demo，排队、客流、营业状态等为模拟数据。
```
