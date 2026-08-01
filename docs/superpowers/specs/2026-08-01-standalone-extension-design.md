# InspoClip 独立插件模式设计

## 1. 背景与目标

InspoClip 浏览器扩展当前依赖本地或远程服务端完成素材上传、图片与视频分析、Prompt 生成、相似度检测和资料保存。独立插件模式需要让未部署服务端的用户也能完成核心灵感采集流程，同时保留现有后端服务模式，并允许用户显式切换。

本设计的目标是：

- 复用同一套 Popup、页面交互、截图录屏控件和分析结果弹窗。
- 提供“独立运行”和“后端服务”两种明确的运行模式。
- 独立运行时使用浏览器本地存储和用户自行配置的模型密钥，不产生 InspoClip 平台侧对象存储费用。
- 后端模式保持现有功能、数据格式和默认模型行为。
- 图片和视频分析任务可跨 Popup、页面弹窗的关闭恢复；只有用户主动保存后，素材才进入当前模式的正式资料库。
- 视频分析必须理解完整视频；抽帧分析只能作为用户明确选择并带有能力说明的降级选项。

## 2. 范围与非目标

### 2.1 首期范围

- 建立统一领域类型、命令协议和运行时适配器边界。
- 把现有后端请求迁移至 `BackendAdapter`，确保行为不变。
- 增加运行模式设置、连接状态和本地存储状态。
- 独立模式支持截图、框选、整页、粘贴、拖拽和文件选择产生的图片分析。
- 独立模式支持录屏和上传视频的完整视频分析，但仅对支持浏览器直传文件的视频模型开放。
- 独立模式提供时间轴、搜索、详情、标签、删除、导出和空间清理工作台。
- 支持本地备份，以及本地与后端之间由用户主动发起的双向迁移。

### 2.2 非目标

- 不在首期提供 InspoClip 托管同步、账号系统或平台对象存储。
- 不静默合并独立模式与后端模式的数据。
- 不自动把独立模式失败的任务切换到后端，也不自动把后端模式失败的任务切换到本地。
- 不把低帧率截图序列包装为“完整视频理解”。
- 不在首期实现 WebDAV、S3 或其他第三方同步，仅保留扩展点。

## 3. 核心产品决策

### 3.1 模式切换

设置中新增运行模式：

- **后端服务**：调用用户配置的 InspoClip 服务端，默认沿用 Qwen 及现有 Tunnel 视频链路。
- **独立运行**：数据只保存在当前浏览器，模型由用户自行配置，视频优先使用支持官方文件直传 API 的 Gemini 视频模型。

首次升级已有安装时继续使用后端服务模式，避免改变既有用户行为。全新安装在引导页中让用户选择模式；若用户跳过，默认使用独立运行模式，并在首次分析前要求完成模型配置。

切换模式必须由用户主动操作。切换后 UI 立即读取目标模式的数据和任务，不复制、不删除、不合并来源模式的数据。设置页始终显示当前模式、后端连接状态或本地存储占用。

### 3.2 模型策略

- 后端模式默认视频模型保持 `qwen3.7-plus`，用户可继续调整。
- 独立图片分析通过 OpenAI 兼容的多模态接口接入，提供预设和自定义 Endpoint。
- 独立视频分析首期优先接入支持浏览器直接上传文件并由模型读取完整视频的 Gemini Files API 链路。
- Qwen 仅在官方接口验证能够从浏览器安全直传本地视频后才开放独立视频分析；否则 UI 明确标记“视频分析需要后端服务”。
- 模型能力由能力表驱动，不能仅通过模型名称猜测。能力至少包括图片输入、视频文件直传、结构化输出、最大文件、最大时长和支持的 MIME 类型。

### 3.3 草稿与保存

分析中的素材和结果先进入草稿区，用于任务恢复和关闭弹窗后的侧边标签切换。用户点击“保存到 InspoClip”后，才把草稿标记为已保存并展示在资料库、时间轴和搜索结果中。

草稿默认保留 24 小时；正在处理、等待重试或仍被结果历史引用的草稿不清理。清理前删除其 OPFS 文件和关联任务，避免孤立大文件。

## 4. 架构

```text
Popup / Content Script / 独立资料库工作台
                    |
              Extension Commands
                    |
             Background Runtime
              /             \
      Backend Runtime     Standalone Runtime
          /    \           /      |       \
   Server API  Jobs   IndexedDB  OPFS   BYOK Provider
```

Background 是唯一的业务入口和模式判断位置。Popup 与 Content Script 不再直接拼接 `/api`、读取 `serverUrl` 或持有唯一任务状态。Content Script 只负责页面选区、录屏、弹窗渲染、播放器控制和发送命令。

### 4.1 领域接口

```ts
type RuntimeMode = "backend" | "standalone"

interface AssetRepository {
  createDraft(input: CreateAssetInput): Promise<Asset>
  save(assetId: string): Promise<Asset>
  get(assetId: string): Promise<Asset | null>
  list(query: AssetQuery): Promise<Page<Asset>>
  update(assetId: string, patch: AssetPatch): Promise<Asset>
  delete(assetId: string): Promise<void>
}

interface AnalysisAdapter {
  analyzeImage(input: ImageAnalysisInput): Promise<AnalysisJob>
  analyzeVideo(input: VideoAnalysisInput): Promise<AnalysisJob>
  generatePrompt(input: PromptGenerationInput): Promise<PromptResult>
  getJob(jobId: string): Promise<AnalysisJob | null>
  cancelJob(jobId: string): Promise<void>
}

interface JobRepository {
  put(job: AnalysisJob): Promise<void>
  get(jobId: string): Promise<AnalysisJob | null>
  listActive(): Promise<AnalysisJob[]>
  remove(jobId: string): Promise<void>
}

interface BlobStore {
  put(key: string, blob: Blob): Promise<BlobRef>
  get(ref: BlobRef): Promise<Blob | null>
  delete(ref: BlobRef): Promise<void>
  usage(): Promise<StorageUsage>
}
```

实现分为：

- `BackendAnalysisAdapter`、`BackendAssetRepository`：封装现有服务端 API 和轮询逻辑。
- `LocalAnalysisAdapter`：编排 BYOK 模型、解析结构化结果并持久化任务。
- `IndexedDbAssetRepository`、`IndexedDbJobRepository`：保存元数据、结果与任务状态。
- `OpfsBlobStore`：保存图片、视频、封面和缩略图。

`RuntimeFactory` 根据设置快照创建当前运行时。一次命令执行期间固定使用启动时的运行模式；用户在任务中途切换模式不会让该任务跨数据源续跑。

### 4.2 统一命令协议

命令使用可辨识联合类型，并统一返回成功或错误结果：

```ts
type ExtensionCommand =
  | { type: "asset.createDraft"; payload: CreateAssetInput }
  | { type: "asset.save"; payload: { assetId: string } }
  | { type: "asset.list"; payload: AssetQuery }
  | { type: "analysis.image.start"; payload: ImageAnalysisInput }
  | { type: "analysis.video.start"; payload: VideoAnalysisInput }
  | { type: "analysis.job.get"; payload: { jobId: string } }
  | { type: "prompt.generate"; payload: PromptGenerationInput }

type CommandResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: RuntimeError }
```

事件由 Background 广播，页面可在重新注入或重新打开弹窗后订阅并恢复：

- `analysis.job.updated`
- `asset.updated`
- `runtime.mode.changed`
- `storage.usage.changed`

## 5. 数据与存储

### 5.1 存储分工

- `chrome.storage.local`：运行模式、模型预设、加密后的密钥载荷、UI 设置和迁移检查点。
- `chrome.storage.sync`：语言、快捷键等非敏感且体积小的偏好。
- IndexedDB：素材元数据、分析结果、Prompt、标签、搜索字段、任务和迁移记录。
- OPFS：原图、视频、录屏、封面和缩略图。

API Key 禁止写入 `chrome.storage.sync`、日志、导出包和页面 DOM 属性。独立模式提示用户：浏览器扩展本地存储并非跨设备保险箱，卸载扩展或清理站点数据可能导致资料丢失。

### 5.2 核心记录

素材记录包含：

- 本地 UUID、素材类型、来源方式、创建和更新时间。
- `draft` 或 `saved` 状态。
- 当前运行模式和来源标识。
- Blob 引用、缩略图引用、尺寸、时长和 MIME 类型。
- 标题、双语标题、标签、设计术语和搜索文本。
- 图片分析或视频阶段分析结果、复刻输出及其语言。

任务记录包含：

- 任务 UUID、关联素材、运行模式、供应商与模型快照。
- `queued`、`uploading`、`processing`、`completed`、`failed` 或 `cancelled` 状态。
- 可展示进度、供应商文件 ID、重试次数和下一次重试时间。
- 结构化结果或标准化错误。

## 6. 关键流程

### 6.1 图片分析

1. 页面产生 Blob，并发送 `asset.createDraft`。
2. Background 将素材写入当前模式的 BlobStore 与 AssetRepository。
3. `analysis.image.start` 创建持久化任务并立即返回 jobId。
4. 当前 AnalysisAdapter 执行分析，持续发送任务事件。
5. 结果写入草稿；页面弹窗关闭后可从侧边标签恢复。
6. 用户主动保存后，素材才进入资料库。

### 6.2 独立视频分析

1. 视频先持久化到 OPFS，避免 Popup 关闭导致 Blob 丢失。
2. LocalAnalysisAdapter 校验 MIME、文件大小、真实时长和模型能力。
3. 通过供应商官方文件接口上传，保存可恢复的供应商文件 ID。
4. 等待供应商完成文件处理，再请求完整视频理解。
5. 将结果标准化为阶段、时间区间、动作、视觉变化、交互意图和复刻输出。
6. 任务完成后按供应商能力删除临时远程文件；删除失败记录为可重试清理任务，不影响本地结果。

浏览器、插件或页面关闭后，Background 重启时从 JobRepository 恢复未完成任务。无法安全续传的上传任务从本地 OPFS 文件重新开始，并明确更新状态。

### 6.3 模式切换与迁移

模式切换只改变后续命令的数据源。历史数据通过“导入/迁移”显式处理：

- 迁移前展示数量、预计空间和目标模式。
- 以内容哈希和来源 ID 去重。
- 冲突时默认保留两份，并允许用户选择覆盖。
- 迁移过程持久化检查点，可暂停和恢复。
- 完成后展示成功、跳过和失败明细；源数据默认保留。

## 7. 错误与恢复

统一错误包含 `code`、本地化消息、是否可重试和建议操作。至少覆盖：

- 模型配置缺失或密钥无效。
- 当前模型不支持图片或视频直传。
- 文件过大、时长不合法或 MIME 不受支持。
- 后端不可达、供应商限流、网络变化和扩展上下文失效。
- 本地空间不足、OPFS 文件丢失和数据库升级失败。

网络变化采用有上限的指数退避。认证错误、能力不支持和用户取消不自动重试。模式不会因错误而静默切换；错误界面可提供“打开设置”或“切换模式”操作，但必须由用户确认。

## 8. 本地资料库工作台

独立模式新增完整扩展页，沿用客户端的卡片和详情视觉语言，提供：

- 按时间浏览图片与视频。
- 搜索标题、双语标题、标签、设计术语和分析文本。
- 图片与视频详情、阶段跳转、复刻输出生成和多语言切换。
- 保存、删除、导出、导入和存储空间清理。

后端模式下“打开 InspoClip”继续打开客户端；独立模式下打开本地资料库工作台。Popup 保持轻量，不承载完整资料库。

## 9. 安全与隐私

- 所有远程分析前展示实际模型供应商；素材只发往用户配置的服务。
- 自定义 Endpoint 必须使用 HTTPS，只有回环地址可使用 HTTP。
- 对模型响应进行结构校验和长度限制，不把返回内容直接作为 HTML 注入页面。
- 导出默认不包含 API Key、供应商临时文件 ID和未保存草稿。
- 日志对 Authorization、API Key、素材正文和签名 URL 做脱敏。

## 10. 测试策略

- 领域类型与能力表：单元测试。
- RuntimeFactory、命令路由和模式隔离：单元测试。
- IndexedDB 和 OPFS：浏览器环境集成测试，覆盖事务失败与空间不足。
- BackendAdapter：契约测试，确保迁移前后的服务端请求和结果一致。
- LocalAnalysisAdapter：以本地模拟供应商验证上传、轮询、恢复、结构化解析和远程文件清理。
- Content Script 与 Background：消息协议集成测试。
- 截图、录屏、弹窗恢复、保存语义和模式切换：端到端测试。
- 视频供应商接入：使用短测试视频执行受控的手动验收，不把真实 API Key 写入测试夹具。

## 11. 分阶段交付

1. **适配器边界**：建立领域类型、命令协议与 BackendAdapter，现有功能无行为变化。
2. **模式与本地存储**：增加模式设置、IndexedDB、OPFS、草稿和存储占用。
3. **独立图片分析**：完成 BYOK 配置、图片分析、结果恢复和本地保存。
4. **本地资料库**：完成时间轴、搜索、详情、导入导出与空间清理。
5. **独立视频分析**：完成 Gemini 文件直传、持久化任务、阶段分析与复刻输出。
6. **迁移与备份**：完成双向迁移、冲突处理、去重和迁移报告。

每阶段独立提交到 `future-extension`。完成阶段验收后再合并至 `develop`；未经用户明确要求不推送远程。

## 12. 验收标准

- 后端模式下现有图片、视频、截图、录屏、Prompt 和保存流程行为不变。
- Popup 与 Content Script 的业务代码不再直接依赖具体 `/api` 地址。
- 两种模式可自由切换，且数据、任务和搜索结果严格隔离。
- 独立图片分析在未部署服务端时可完成并持久化。
- 独立视频模式只对支持完整视频文件输入的模型开放，页面关闭后任务可恢复。
- 未点击保存的草稿不会出现在资料库和搜索结果中。
- 卸载风险、模型供应商、密钥存储和备份建议均有明确提示。
- 本地与后端之间的数据移动只能由用户显式发起，并提供可核对的迁移报告。
