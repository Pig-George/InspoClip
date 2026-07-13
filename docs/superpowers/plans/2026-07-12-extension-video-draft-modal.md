# 插件视频草稿详情弹窗实现计划

> **面向 AI 代理的工作者：** 在当前会话内联执行；不要使用子代理。步骤使用复选框跟踪进度。

**目标：** 让插件视频分析像图片分析一样“先分析、弹窗查看、关闭折叠侧边、用户确认后才保存”。

**架构：** 后端为视频记录增加 `isSaved` 草稿语义，列表类接口只返回已保存视频；插件上传视频时以草稿创建，分析完成后展示详情弹窗，底部保存按钮调用保存接口。插件复用图片分析的 toast → modal → floating tab 生命周期，并补齐阶段分析与复刻输出操作区。

**技术栈：** Express、Drizzle ORM、Vitest、Plasmo content script、TypeScript。

---

## 文件结构

- 修改 `server/src/db/schema.ts`：为 `videos` 表增加 `isSaved` 字段。
- 修改 `server/src/index.ts`：启动时补充 `videos.is_saved` 迁移。
- 修改 `server/src/video/repository.ts`：Create/Record 类型加入 `isSaved`，列表过滤已保存，新增 `saveVideo`。
- 修改 `server/src/routes/videos.ts`：上传接口支持 `draft=true`，新增 `POST /api/videos/:id/save`。
- 修改 `server/src/video/repository.test.ts`：覆盖草稿视频不进入周列表、保存后进入周列表。
- 修改 `server/src/routes/videos.test.ts`：覆盖草稿上传与保存接口行为。
- 修改 `extension/contents/inspoclip.ts`：视频分析使用草稿上传；视频详情支持折叠侧边、保存按钮、复刻输出。
- 修改 `extension/src/content/styles.ts`：补充视频弹窗复刻输出区域样式。

## 任务 1：后端草稿语义测试

- [x] 在 `server/src/video/repository.test.ts` 增加测试：创建 `isSaved:false` 视频后 `listVideosForWeek` 不返回；调用 `saveVideo` 后返回。
- [x] 运行 `pnpm test src/video/repository.test.ts`，确认因 `saveVideo` 缺失或过滤缺失失败。

## 任务 2：实现后端草稿语义

- [x] 在 schema、启动 SQL、仓储接口/实现里加入 `isSaved`。
- [x] `listVideosForWeek` 只返回 `isSaved=true` 视频。
- [x] `createVideo` 默认 `isSaved=true`，插件草稿可传 `false`。
- [x] 实现 `saveVideo(id)`。
- [x] 运行后端仓储测试，确认通过。

## 任务 3：路由支持草稿上传与保存

- [x] 在 `server/src/routes/videos.test.ts` 增加草稿上传与保存接口测试。
- [x] `POST /api/videos` 读取 `draft=true` 并传 `isSaved:false`。
- [x] 新增 `POST /api/videos/:id/save`。
- [x] 运行视频路由测试，确认通过。

## 任务 4：插件视频弹窗生命周期对齐图片

- [x] 增加 `currentAssetResult` 或等效状态，区分图片与视频结果。
- [x] `removeModal` 关闭视频弹窗后也展示侧边 tab。
- [x] 侧边 tab 点击时根据类型打开 `showModal` 或 `showVideoModal`。
- [x] 右键隐藏时清理视频状态。

## 任务 5：插件视频详情补齐操作区

- [x] 视频上传时追加 `draft=true`。
- [x] 视频弹窗底部增加“关闭 / 保存到 InspoClip”，保存调用 `/api/videos/:id/save`。
- [x] 视频弹窗阶段分析继续使用当前语言渲染。
- [x] 增加复刻输出区：用途、语言切换、生成/复制，调用 `/api/videos/:id/prompts`。
- [x] 样式与现有图片分析弹窗、客户端视频详情保持一致。

## 任务 6：验证与提交

- [x] 运行后端相关测试。
- [x] 运行插件测试、类型检查、构建。
- [x] 查看 `git diff`，只暂存本次相关文件。
- [x] 提交到 `develop`。
- [x] 如改动影响 Docker 服务，部署到本地 Docker。
