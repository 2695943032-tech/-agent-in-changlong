# AR 动物伙伴同款建模复现指南

> 适用于“团团”同系列卡通动物伙伴，已在 Windows + NVIDIA GPU + Blender + Hunyuan3D-2mv 流程中验证。

## 1. 为什么 `codex://threads/...` 打不开

`codex://threads/...` 是 Codex 本机任务深度链接，不是可公开分享的网页，也不会自动授予队友会话访问权。队友看到 `No Codex thread found` 是正常的权限行为。

正确分享方式：

1. 把本文档和脚本目录发给队友。
2. 一起打包角色三视图、GLB、`.blend` 和预览图。
3. 如果要传递讨论上下文，直接导出或复制会话文本，不要只发 `codex://` 链接。

## 2. 最终资产标准

- 风格：温和、圆润、清晰的游乐园 IP，不是球体拼装的几何白模。
- 头身比：幼态卡通，但脸部不肿胀、不依赖苹果肌。
- 嘴：短小嘴缝，贴合口鼻曲面；禁止粉色“香肠嘴”或独立圆环嘴唇。
- 表面：耳廓、眼睑、鼻孔、鬃毛、衣领、口袋、包和鞋底都应有真实立体层级。
- 展示版预算：约 240,000 三角面、120,000 顶点，GLB 尽量控制在 6–8 MB。
- 移动精简版：可另导出 80,000–160,000 三角面的 LOD。
- 轴心：脚底着地，角色居中，导出前应用旋转和缩放。

## 3. 不可跳过的建模顺序

```text
正面定稿
  → 正/侧/背三视图
  → 三视图拆分与去背景
  → Hunyuan3D-2mv 多视角高模
  → Blender 无材质泥模验收
  → 清理碎片 / 减面 / UV 与贴图
  → 重新导入 Blender 渲染验收
  → GLB 接入 AR
  → 类型检查 / 测试 / 构建 / 本地路由检查
```

只将 8 万面提高到 24 万面，不会自动产生眼睑、耳厚度或衣服背面细节。精度主要来自多视角造型信息，面数只负责保留已经存在的曲面细节。

## 4. 所需环境

### 硬件

- NVIDIA GPU，建议 16 GB 以上显存。
- 至少 35 GB 空闲磁盘，多视角和贴图权重体积很大。

### 软件

- Blender 5.x（本项目用 5.2 LTS）。
- Python 3.10/3.11。
- CUDA 版 PyTorch，不能是 `+cpu`。
- Hunyuan3D-2 源码。
- Node.js + pnpm，用于 Nuxt 项目验证。

PowerShell 检查 GPU 环境：

```powershell
python -c "import torch; print(torch.__version__, torch.cuda.is_available())"
```

结果必须类似：

```text
2.x.x+cu128 True
```

如果是 `+cpu False`，先恢复 CUDA 版 PyTorch，否则会报：

```text
AssertionError: Torch not compiled with CUDA enabled
```

## 5. 仓库中的关键脚本

```text
scripts/hunyuan/prepare_companion_multiview.py
scripts/hunyuan/generate_companion_multiview.py
scripts/hunyuan/prepare_companion_ar_mesh.py
scripts/blender/render_hunyuan_panda.py
```

`render_hunyuan_panda.py` 历史名字保留了 panda，但现在通过 `COMPANION_*` 环境变量可渲染任意动物。

## 6. 生成三视图

三视图必须是同一角色的 FRONT / LEFT / BACK，等比例、等高度、无透视、A-pose、纯色背景。

提示词必须明确：

- 三视图中的斑纹、背包带、鬃毛、尾巴和衣服结构要前后一致。
- 侧面要显示耳朵厚度、头骨深度、口鼻突出量。
- 背面要显示衣服背面、斜挎带、后袋、鞋跟和尾巴连接。
- 禁止地面、阴影、文字、标签和环境元素。

已验证参考：

```text
art/companions/giraffe/references/giraffe-turnaround-v5.png
art/companions/koala/references/koala-turnaround-v9.png
```

## 7. 拆分三视图

```powershell
python scripts/hunyuan/prepare_companion_multiview.py giraffe --version 5
python scripts/hunyuan/prepare_companion_multiview.py koala --version 9
```

输出位于：

```text
art/companions/<character>/wip/hunyuan/multiview-v<version>/
```

## 8. 生成多视角高模

先设置 Hunyuan3D-2 源码和 Hugging Face 缓存位置：

```powershell
$env:PYTHONPATH='D:\Qiyu3DTools\Hunyuan3D-2'
$env:HF_HOME='D:\Qiyu3DTools\hf-cache'
python scripts/hunyuan/generate_companion_multiview.py giraffe --version 5
python scripts/hunyuan/generate_companion_multiview.py koala --version 9
```

脚本的高质量设置：

- `Hunyuan3D-2mv`
- `hunyuan3d-dit-v2-mv`
- 50 步推理
- `octree_resolution=420`
- front / left / back 三视图

420 体素解码可能需要 7–10 分钟。不要因为终端暂时没有新输出就杀掉进程。

## 9. 先验收无材质泥模

不要一生成就直接接入 AR。先在 Blender 用柔和灯光检查：

- 正面轮廓是否符合角色。
- 侧脸是否有合理深度，而不是薄片。
- 耳廓、鹿角、鬃毛、眼睑、鼻孔是否成型。
- 衣领、口袋、包、短裤、鞋底是否是独立立体层级。
- 背面是否有明确结构。

参考验收图：

```text
art/companions/giraffe/references/giraffe-multiview-clay-v5.png
```

## 10. 清理并导出 AR GLB

```powershell
python scripts/hunyuan/prepare_companion_ar_mesh.py giraffe --version 5 --faces 240000
python scripts/hunyuan/prepare_companion_ar_mesh.py koala --version 9 --faces 240000
```

该脚本会：

- 删除过小游离碎片。
- 减面到指定三角面预算。
- 保留完整外轮廓和大型立体细节。
- 对透明图像边缘做颜色扩散，避免黑色 UV 污染。
- 导出内嵌贴图的 GLB。

注意：单张正面投影无法自动产生完整的侧背面材质。展示级产品应进一步在 Blender/Substance 中做完整 UV 分区和材质烘焙。

## 11. Blender 渲染验收

```powershell
$env:COMPANION_MODEL=(Resolve-Path 'art\companions\giraffe\wip\hunyuan\giraffe-ar-colored-v5.glb').Path
$env:COMPANION_RENDER=(Join-Path (Get-Location) 'art\companions\giraffe\references\giraffe-front-check.png')
$env:COMPANION_BLEND=(Join-Path (Get-Location) 'art\companions\giraffe\giraffe-check.blend')
$env:COMPANION_FRONT_RENDER='1'
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' -b --python scripts\blender\render_hunyuan_panda.py
```

必须渲染“导出后的 GLB”，不能只看 Blender 源文件。

## 12. 接入 Nuxt / AR

资源放在：

```text
public/models/companions/<character>-companion-ar-v<version>.glb
```

在角色映射中使用带版本号的 URL，防止浏览器缓存旧 GLB：

```ts
giraffe: '/models/companions/giraffe-companion-ar-v5.glb?v=5'
koala: '/models/companions/koala-companion-ar-v9.glb?v=9'
```

本项目映射文件：

```text
app/components/inpark/ar/ArCompanionModel.vue
```

不要为换模型而修改现有聊天对话协议、角色切换方式或 AR 页面通信方式。

## 13. 交付前验证

```powershell
pnpm exec vue-tsc --noEmit
pnpm test -- --run
pnpm build
```

再验证：

- `/api/health` 返回 200。
- GLB URL 返回 200 且文件字节数正确。
- 真实 AR 路由显示的是新版本，不是缓存旧模型。
- 明暗背景下不出现黑斑、白模、悬浮或穿模。

## 14. 常见错误

### `No Codex thread found`

原因：会话深度链接不具备跨账号授权能力。

解决：分享本文档、仓库、脚本和资产文件，或导出会话文本。

### `ModuleNotFoundError: hy3dgen`

设置 Hunyuan3D-2 源码路径：

```powershell
$env:PYTHONPATH='D:\Qiyu3DTools\Hunyuan3D-2'
```

### `Torch not compiled with CUDA enabled`

安装和本机 CUDA 匹配的 PyTorch wheel，然后再次确认 `torch.cuda.is_available()` 为 `True`。

### 模型出现黑斑

常见原因是透明 PNG 的 RGB 默认为黑色，线性过滤后污染 UV 边缘。使用 `prepare_companion_ar_mesh.py` 的边缘颜色扩散流程，不要直接将原始透明 PNG 作为不透明模型贴图。

### 面数很高但仍然不精细

原因：输入只有正面，或正侧背不一致。高面数只会保留模糊曲面。

解决：先重做一致三视图，再用 `Hunyuan3D-2mv`。

### `custom_rasterizer` 缺失

Hunyuan3D Paint 的官方多视角贴图管线需要 CUDA Toolkit/NVCC 编译扩展。只安装 GPU 驱动和 CUDA PyTorch 并不代表本机有 `nvcc`。无 NVCC 的 Windows 环境应使用已验证的边缘安全投影，或在具有 CUDA Toolkit 的 Linux/WSL 环境中编译官方扩展。

## 15. 分享给队友的最小文件包

```text
docs/companion-3d-reproduction-guide.zh-CN.md
scripts/hunyuan/prepare_companion_multiview.py
scripts/hunyuan/generate_companion_multiview.py
scripts/hunyuan/prepare_companion_ar_mesh.py
scripts/blender/render_hunyuan_panda.py
art/companions/<character>/references/*turnaround*.png
art/companions/<character>/references/*preview*.png
public/models/companions/*final*.glb
```

如果要继续编辑，再加上最终 `.blend` 文件和未减面的 `*-base-v*.glb`。
