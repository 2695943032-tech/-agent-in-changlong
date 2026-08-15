# 图片处理系统变更说明

## 本次完成内容

### 1. 游中照片创作流程

- 用户上传或拍摄照片后，先选择“和 Agent 合影”或“不合影”。
- 合影模式不再使用 MediaPipe 人物分割、姿态识别、自动选贴纸或自动找位置。
- 系统根据当前 Agent 展示对应动物贴纸，用户可以手动选择、拖动和缩放贴纸。
- 不合影模式直接进入风格选择卡片。
- 游中入口改为 Agent 消息卡，不再依赖已移除的拍摄工具栏入口。

### 2. 游中与游后统一风格生成

两端都使用同一套图片生成接口和风格参数：

- `8bit`：8bit 复古像素风，保留自然鲜亮色彩。
- `ancient`：高级古风，工笔与淡墨融合。
- `2d`：精致 2D 插画风。
- `zine`：`gathered-scenes-zine-skill` 东方极简建筑画册风，包含竖向二分构图、上半部写实摄影、下半部水墨解构插画和米白哑光纸张质感。
- `custom`：用户自定义提示词，最多 500 字。

所有提示词由服务端再次校验和拼接，前端不能绕过风格白名单或长度限制。

### 3. 水印与额度

- 新增 `public/branding/chimelong-watermark.png`。
- 生成结果在客户端统一叠加左下角小尺寸水印，避免遮挡主体。
- 服务端通过 `chimelong-generation-count` cookie 统一记录游中和游后生成次数。
- 单次体验最多生成 9 张，超过后返回收费提示。

### 4. 服务端改动

- `/api/posttrip/pixelize` 新增 `style` 和 `prompt` multipart 字段。
- `server/utils/imageTransform.ts` 维护风格提示词、服务端白名单和结果版本。
- 保留原有图片 API 配置方式，不在客户端暴露 API Key。

## 文件入口

- 游中卡片：[app/components/pretrip/AgentPhotoComposer.vue](../app/components/pretrip/AgentPhotoComposer.vue)
- 游中 Agent 入口：[app/components/pretrip/AgentChat.vue](../app/components/pretrip/AgentChat.vue)
- 游后风格卡：[app/components/journey-ticket/JourneyTicketPhotoPicker.vue](../app/components/journey-ticket/JourneyTicketPhotoPicker.vue)
- 生成请求：[server/api/posttrip/pixelize.post.ts](../server/api/posttrip/pixelize.post.ts)
- 风格提示词：[server/utils/imageTransform.ts](../server/utils/imageTransform.ts)
- 前端生成封装：[app/composables/usePixelArtTransform.ts](../app/composables/usePixelArtTransform.ts)

## 后续方向

1. 将生成额度从浏览器 cookie 升级为账号/IP/订单维度的持久化配额，接入收费套餐和支付回调。
2. 增加生成任务队列、进度轮询、失败重试和结果缓存，降低图片 API 超时对用户体验的影响。
3. 将水印叠加下沉到服务端或对象存储处理链，确保下载、分享和后台保存的原图始终带水印。
4. 为不同园区 Agent 建立可运营的贴纸配置和版本管理，支持后台上下架、AB 测试和节日主题。
5. 增加图片安全审核、敏感提示词过滤、原图生命周期管理和用户删除能力。
6. 补充游中/游后端到端测试和移动端截图回归，重点覆盖额度共享、断网、API 未配置和自定义提示词边界。

## 验证记录

- `pnpm build`：通过。
- `pnpm vitest run tests/imageTransform.test.ts`：3/3 通过。
- `pnpm typecheck`：仍有项目原有的 `usePretripJourney.ts`、`me.vue`、`planner.ts` 类型错误，本次图片系统文件未新增类型错误。
