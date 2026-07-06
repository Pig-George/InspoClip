# InspoClip 视频理解功能实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为客户端和浏览器插件增加 UI 动效视频分析能力，默认使用 `qwen3.7-plus`，输出标准时间线和按用途生成的复刻提示词，同时将现有图片 AI 调用迁移到隔离的 LangChain 架构。

**架构：** 服务端通过数据库记录异步视频任务，进程内 worker 负责调用模型并保存结构化结果。业务层仅依赖项目自有 `ModelProvider`，LangChain 封装在供应商适配层；客户端轮询任务并展示时间线，插件只负责采集、上传、状态与跳转。

**技术栈：** Node.js、Express、TypeScript、Drizzle ORM、PostgreSQL、LangChain、OpenAI 兼容 API、React 18、Vite、Vitest、Supertest、Chrome Extension Manifest V3。

---

## 文件结构

### 服务端新增

- `server/src/ai/types.ts`：项目自有模型请求、视频分析和用途输出类型。
- `server/src/ai/config.ts`：模型配置读取与掩码规则。
- `server/src/ai/provider.ts`：`ModelProvider` 接口。
- `server/src/ai/langchain-provider.ts`：LangChain/OpenAI 兼容实现及 Qwen 视频参数透传。
- `server/src/ai/prompts.ts`：图片与视频 Prompt 模板。
- `server/src/ai/parser.ts`：Zod 结构校验和一次修复策略。
- `server/src/ai/service.ts`：图片、视频分析及用途生成业务入口。
- `server/src/video/media.ts`：视频探测、校验与封面生成。
- `server/src/video/repository.ts`：视频、任务、分析和输出持久化。
- `server/src/video/worker.ts`：数据库任务领取、重试与恢复。
- `server/src/routes/videos.ts`：视频上传、查询、重试、删除和输出 API。
- `server/src/routes/video-jobs.ts`：任务状态 API。
- `server/src/middleware/video-upload.ts`：视频上传限制。
- `server/src/test/fakes/fake-model-provider.ts`：测试用可控模型。
- `server/src/**/*.test.ts`：各单元和 API 测试。

### 服务端修改

- `server/src/db/schema.ts`：新增视频相关表。
- `server/src/index.ts`：建表、路由注册、worker 生命周期。
- `server/src/services/ai.ts`：改为兼容门面，委托新 AI service。
- `server/src/routes/config.ts`：视频模型配置与密钥掩码。
- `server/src/middleware/upload.ts`：复用安全文件名规则。
- `server/package.json`、`server/package-lock.json`：LangChain、Zod、媒体探测和测试依赖。

### 客户端新增

- `client/src/types/video.ts`：视频、任务、分析和用途类型。
- `client/src/lib/video-api.ts`：视频 API 客户端。
- `client/src/components/video/VideoUploadDialog.tsx`：视频选择、预览和上传。
- `client/src/components/video/VideoAnalysisView.tsx`：播放器与分析结果容器。
- `client/src/components/video/VideoTimeline.tsx`：阶段时间线。
- `client/src/components/video/VideoPromptPanel.tsx`：用途、目标、语言和输出。
- `client/src/components/video/VideoJobProgress.tsx`：任务状态和重试。
- `client/src/components/video/*.test.tsx`：组件测试。

### 客户端修改

- `client/src/App.tsx`：视频分析视图入口和路由状态。
- `client/src/components/ImageUploader.tsx`：图片/视频分流。
- `client/src/components/SettingsDialog.tsx`：独立视频模型设置。
- `client/src/lib/api.ts`：保留图片 API，导出配置类型。
- `client/src/i18n/translations.ts`：中英文视频文案。
- `client/package.json`、`client/package-lock.json`：测试依赖。

### 插件新增与修改

- `extension/video.js`：视频发现、URL 解析、上传和任务轮询。
- `extension/video.test.js`：纯函数和失败路径测试。
- `extension/background.js`：视频右键菜单、下载和消息转发。
- `extension/content.js`：仅注入最小视频入口，不承载分析逻辑。
- `extension/popup.html`、`extension/popup.js`、`extension/popup.css`：本地视频/URL 上传、状态、摘要和客户端跳转。
- `extension/manifest.json`：视频相关权限和脚本声明。

### 配置与文档

- `.env.example`：视频模型默认配置。
- `docker-compose.yml`：视频目录和模型变量。
- `server/Dockerfile`：安装 FFmpeg/ffprobe。
- `README.md`、`extension/README.md`：使用、限制和配置说明。

---

## 阶段一：测试基础与 AI 架构

### 任务 1：建立服务端测试基础

**文件：** `server/package.json`、`server/package-lock.json`、`server/vitest.config.ts`、`server/src/ai/parser.test.ts`

- [ ] 安装 `vitest`、`supertest`、`@types/supertest`、`zod`、`@langchain/openai` 和 `@langchain/core`，新增 `test: vitest run` 脚本。
- [ ] 创建 Vitest Node 配置，并写一个失败测试：非法视频分析缺少 `stages` 时必须抛出校验错误。
- [ ] 运行 `npm test -- src/ai/parser.test.ts`，预期因 `parseVideoAnalysis` 不存在而失败。
- [ ] 创建 `server/src/ai/types.ts` 与 `parser.ts`，定义 `VideoAnalysis`、`VideoStage`、`VideoAction`，用 Zod 完成严格校验。
- [ ] 再次运行测试，预期通过。

关键接口：

```ts
export interface ModelProvider {
  analyzeImage(input: ImageModelInput): Promise<unknown>;
  analyzeVideo(input: VideoModelInput): Promise<unknown>;
  generateText(input: TextModelInput): Promise<unknown>;
}

export function parseVideoAnalysis(input: unknown): VideoAnalysis;
```

### 任务 2：实现配置、Prompt 与 LangChain 适配器

**文件：** `server/src/ai/config.ts`、`provider.ts`、`prompts.ts`、`langchain-provider.ts` 及对应测试

- [ ] 写失败测试，验证默认视频模型为 `qwen3.7-plus`、API Key 读取结果会掩码、视频消息包含 `video_url` 和 `fps: 3`。
- [ ] 运行目标测试，确认因模块不存在而失败。
- [ ] 实现配置服务和 Prompt 常量；实现 `LangChainProvider`，构造 OpenAI 兼容模型，并通过供应商消息字段透传视频 URL、FPS 和像素参数。
- [ ] 使用注入的 transport/mock 验证请求，不访问真实网络。
- [ ] 运行 `npm test -- src/ai`，预期全部通过。

### 任务 3：迁移现有图片 AI 调用

**文件：** `server/src/ai/service.ts`、`server/src/services/ai.ts`、相关测试

- [ ] 为 `generateTerms` 和 `generateDesignPrompt` 写回归测试，固定现有中英文结果、图片压缩输入和异常回退行为。
- [ ] 运行测试，确认新 service 尚不存在导致失败。
- [ ] 将图片预处理和模型调用迁移到 `AiService`，旧 `services/ai.ts` 仅保留同名导出门面。
- [ ] 运行 `npm test -- src/ai src/services` 和 `npm run build`，预期通过。
- [ ] 提交阶段一：`feat: 重构 AI 模型调用架构`。

---

## 阶段二：视频数据、任务与 API

### 任务 4：新增视频数据表和仓储

**文件：** `server/src/db/schema.ts`、`server/src/video/repository.ts`、`server/src/video/repository.test.ts`、`server/src/index.ts`

- [ ] 写仓储失败测试，覆盖创建视频、创建任务、原子领取任务、完成任务、按用途缓存输出。
- [ ] 运行测试，确认表和仓储不存在导致失败。
- [ ] 在 Drizzle schema 和启动 SQL 中加入 `videos`、`video_analysis_jobs`、`video_analyses`、`video_prompt_outputs`，唯一键采用 `analysis_id/purpose/target/locale`。
- [ ] 实现仓储方法，领取任务时仅允许 `pending → processing`，完成时在同一事务保存分析并更新任务。
- [ ] 运行仓储测试，预期通过。

### 任务 5：实现视频媒体校验

**文件：** `server/src/middleware/video-upload.ts`、`server/src/video/media.ts`、对应测试、`server/Dockerfile`

- [ ] 写失败测试，覆盖 MP4/MOV/WebM、伪造扩展名、超过 200 MB、短于 10 秒、长于 2 分钟及安全文件名。
- [ ] 运行测试，确认实现不存在导致失败。
- [ ] 使用 multer 限制大小，使用 ffprobe 校验真实容器、时长、尺寸，使用 ffmpeg 生成缩略图；命令参数必须以数组传递，禁止拼接 shell 字符串。
- [ ] 在 Dockerfile 安装 FFmpeg，并允许测试注入假的 probe/thumbnail runner。
- [ ] 运行媒体测试，预期通过。

### 任务 6：实现视频分析 service 和 worker

**文件：** `server/src/ai/service.ts`、`server/src/video/worker.ts`、`server/src/test/fakes/fake-model-provider.ts`、对应测试

- [ ] 写失败测试：worker 领取任务、使用任务模型/FPS、成功保存；429/超时重试；Schema 永久错误失败；启动恢复 processing 任务。
- [ ] 运行测试，确认 worker 不存在导致失败。
- [ ] 实现 `VideoWorker`，限制首期单并发，采用有上限的指数退避，并在停止时不领取新任务。
- [ ] 实现 `analyzeVideo`，要求模型输出标准 Schema；解析失败时用 `generateText` 修复一次。
- [ ] 运行 worker 和 AI service 测试，预期通过。

### 任务 7：实现视频 HTTP API

**文件：** `server/src/routes/videos.ts`、`video-jobs.ts`、`server/src/index.ts`、`server/src/routes/*.test.ts`

- [ ] 写 Supertest 失败测试，覆盖上传返回 `202`、任务查询、分析读取、默认 `general` 输出、重试、删除和非法输入。
- [ ] 运行测试，确认路由返回 404。
- [ ] 实现路由和依赖注入式 app factory；上传成功返回 `{ videoId, jobId, status: "pending" }`。
- [ ] 输出用途限定为 `general/video-generation/frontend/motion-design/storyboard/json`，未传用途时使用 `general`。
- [ ] 删除操作同时清理数据库、视频和缩略图；文件不存在仍允许幂等删除数据库记录。
- [ ] 更新配置 API，仅写入密钥、读取掩码；注册 worker 生命周期。
- [ ] 运行 `npm test` 和 `npm run build`，预期全部通过。
- [ ] 提交阶段二：`feat: 增加异步视频分析后端`。

---

## 阶段三：客户端视频体验

### 任务 8：建立客户端测试基础和视频 API

**文件：** `client/package.json`、`client/package-lock.json`、`client/vitest.config.ts`、`client/src/test/setup.ts`、`client/src/types/video.ts`、`client/src/lib/video-api.ts` 及测试

- [ ] 安装 Vitest、jsdom、Testing Library 和 user-event，新增 `test` 脚本。
- [ ] 写失败测试，验证上传 FormData、查询任务、默认 `general` 输出和错误响应正文。
- [ ] 运行目标测试，确认 API 模块不存在导致失败。
- [ ] 实现与后端 Schema 一致的类型和 API 函数。
- [ ] 运行 API 测试和 `npm run build`，预期通过。

### 任务 9：实现上传和任务进度

**文件：** `VideoUploadDialog.tsx`、`VideoJobProgress.tsx`、`ImageUploader.tsx` 及测试

- [ ] 写组件失败测试：选择视频显示元数据；非法大小/时长阻止上传；上传后轮询；失败可重试；图片流程不变。
- [ ] 运行测试，确认组件不存在导致失败。
- [ ] 实现视频分流、预览、上传和带清理的轮询 hook；卸载后不得继续 setState。
- [ ] 运行目标测试，预期通过。

### 任务 10：实现时间线和多用途输出

**文件：** `VideoAnalysisView.tsx`、`VideoTimeline.tsx`、`VideoPromptPanel.tsx`、`App.tsx`、i18n 文件及测试

- [ ] 写失败测试：完成任务显示阶段；点击阶段设置播放器时间；默认通用；切换用途只调用提示词 API，不重新分析；复制输出。
- [ ] 运行测试，确认组件不存在导致失败。
- [ ] 实现视频播放器、阶段时间线、动作详情、用途/目标/语言选择和输出缓存状态。
- [ ] 在 App 中支持通过 `?video=<id>` 打开分析视图，供插件跳转。
- [ ] 补充中英文文案，运行组件测试和构建，预期通过。

### 任务 11：扩展设置页

**文件：** `SettingsDialog.tsx`、`api.ts`、相关测试

- [ ] 写失败测试：图片和视频配置独立；视频默认 `qwen3.7-plus`；掩码密钥不会作为新值提交。
- [ ] 实现分区设置与 FPS 数值校验（首期范围 1～5，默认 3）。
- [ ] 运行 `npm test` 和 `npm run build`，预期通过。
- [ ] 提交阶段三：`feat: 增加客户端视频分析体验`。

---

## 阶段四：浏览器插件

### 任务 12：抽离插件视频核心模块

**文件：** `extension/video.js`、`extension/video.test.js`、`extension/package.json`

- [ ] 使用 Node 内置 test runner 写失败测试，覆盖 URL 判定、任务轮询终止、Blob URL 拒绝信息和客户端跳转 URL。
- [ ] 运行 `node --test extension/video.test.js`，确认模块不存在导致失败。
- [ ] 实现不依赖 DOM 的视频上传与轮询核心函数，浏览器 API 通过参数注入。
- [ ] 再次运行测试，预期通过。

### 任务 13：接入右键菜单、后台下载和弹窗

**文件：** `manifest.json`、`background.js`、`content.js`、`popup.html`、`popup.js`、`popup.css`

- [ ] 为 background 消息处理写可测试函数，验证普通 URL 下载上传、鉴权失败、Blob URL 提示和状态通知。
- [ ] 在 manifest 注册视频菜单所需权限；background 创建“保存并分析视频”菜单，并从 `srcUrl` 获取视频。
- [ ] content 只负责识别当前视频和发送消息，不复制上传/轮询逻辑。
- [ ] popup 增加本地文件、URL、进度、摘要和“在 InspoClip 中查看”。
- [ ] 运行 `node --test extension/*.test.js`，并用 Chrome 加载未打包扩展检查 manifest 无错误。
- [ ] 提交阶段四：`feat: 增加插件视频采集与分析`。

---

## 阶段五：集成、部署与文档

### 任务 14：部署配置和端到端回归

**文件：** `.env.example`、`docker-compose.yml`、`README.md`、`extension/README.md`、必要的集成测试

- [ ] 写配置测试或启动断言，验证缺省视频模型、视频目录和 FFmpeg 可用性；生产环境缺少必要配置时给出明确日志。
- [ ] 更新环境变量：`VIDEO_AI_PROVIDER`、`VIDEO_AI_API_KEY`、`VIDEO_AI_API_BASE`、`VIDEO_AI_MODEL=qwen3.7-plus`、`VIDEO_AI_FPS=3`、`VIDEO_UPLOAD_DIR`。
- [ ] 为 Docker 增加持久化视频目录；README 记录限制、配置、客户端和插件流程。
- [ ] 依次运行 `cd server; npm test; npm run build`、`cd client; npm test; npm run build`、`node --test extension/*.test.js`。
- [ ] 运行 `docker compose config`，预期配置解析成功。
- [ ] 使用三段 10～120 秒 UI 视频人工验收进入、点击和复杂转场场景，并记录模型遗漏到验收说明。
- [ ] 检查 `git diff --check` 与 `git status --short`，确保不包含用户原有无关修改。
- [ ] 提交阶段五：`docs: 完善视频分析部署与使用说明`。

## 最终完成条件

- 后端、客户端和插件测试及构建全部通过。
- 现有图片分析回归测试通过。
- 默认模型和默认用途分别为 `qwen3.7-plus`、`general`。
- 客户端和插件均能创建任务并观察完成或失败状态。
- 所有阶段提交均位于 `develop`。
- 未经用户明确确认，不执行 `git push`。

## 补充任务：日期卡片统一承载视频

- [ ] 为视频表增加周、星期和排序字段，并让周接口返回视频及最新任务状态。
- [ ] 为视频上传接口增加日期卡片归档参数，并提供缩略图读取接口。
- [ ] 日期卡片上传区支持图片和视频分流，页面粘贴视频默认归档到当天。
- [ ] 新增符合现有视觉语言的视频卡片，支持打开分析、重试和删除。
- [ ] 删除独立悬浮视频分析按钮与上传弹窗入口。
- [ ] 完成服务端、客户端和插件端回归测试与构建后提交到 `develop`。
