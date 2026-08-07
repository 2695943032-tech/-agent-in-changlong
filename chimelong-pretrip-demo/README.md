# 长隆奇遇伴侣 · 对话式游前 Demo

Nuxt 全栈移动端 Web 应用。游客先选择熊猫、白虎或考拉 Agent，再通过聊天完成同行人数、旅行节奏、游玩时间、六个动物优先级、园内餐厅与补充需求，最后生成基于园区距离知识图谱的路线。

## 已实现

- 三个拥有独立语气和默认偏好的动物 Agent
- 家庭、情侣、朋友、独自出游与跳过状态
- 悠享慢游、均衡畅玩、高效打卡三种节奏及自动推荐
- 熊猫、长颈鹿、猩猩、老虎、大象、豹的1—6点击排序
- 青龙餐厅（粤菜）、小莫和多多的餐厅（西餐）、熊猫餐厅（典型中餐）
- 用户提供导览图中的9条距离组成的最短路径知识图谱
- 优先级负责取舍、距离算法负责实际游览顺序
- 原始导览图上的路线节点叠加、时间轴和未排入原因
- DeepSeek角色回复与路线摘要；无Key时自动使用本地模板
- 支持替换成其他 OpenAI Chat Completions 兼容服务

## 本地运行

```powershell
pnpm install
Copy-Item .env.example .env
pnpm dev
```

打开 `http://localhost:3000`。

## DeepSeek配置

编辑项目根目录的 `.env`：

```text
NUXT_AI_API_KEY=在这里填写你的DeepSeek_API_Key
NUXT_AI_BASE_URL=https://api.deepseek.com
NUXT_AI_MODEL=deepseek-v4-flash
NUXT_AI_PROVIDER=deepseek
NUXT_AI_TIMEOUT_MS=8000
```

API Key 只在 Nuxt 服务端使用，不会出现在浏览器返回数据中。若要使用其他兼容 OpenAI Chat Completions 的服务，只需更换 `BASE_URL`、`MODEL`、`PROVIDER` 和 `API_KEY`。

## API

- `GET /api/catalog`：Agent、动物、餐厅、节奏与地图距离知识库
- `POST /api/pretrip/chat`：角色化对话回复，DeepSeek失败时返回本地模板
- `POST /api/pretrip/plan`：生成距离优化后的完整游前路线
- `GET /api/ai/status`：返回是否已配置AI、模型和服务地址，不返回Key
- `GET /api/health`：部署健康检查

## 验证

```powershell
pnpm typecheck
pnpm test
pnpm build
```

## 数据声明

地图步行距离来自用户提供的《青翠动物园游览导览图》，按双向近似距离用于比赛 Demo。排队、开放时间与停留时长为模拟数据，不可用于真实游园决策。
