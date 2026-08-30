# 独立插件运行时适配器第一阶段实施计划

> **面向 AI 代理的工作者：** 在当前 `future-extension` 分支使用 `executing-plans` 逐任务实现；用户已要求不使用子代理。所有生产代码严格执行 TDD，完成一个任务后独立提交。

**目标：** 建立可测试的扩展运行时、命令协议和后端适配器，并让现有后端分析调用逐步通过该边界执行，保持当前用户行为不变。

**架构：** Popup、Content Script 和录屏模块通过类型化命令客户端访问 Background Runtime；Background 根据运行时工厂取得 Backend Runtime。第一阶段只注册后端实现，独立实现留到下一阶段，因此既有安装无需迁移数据或设置。

**技术栈：** TypeScript、Plasmo MV3、Chrome Runtime Messaging、Vitest、现有 REST API。

---

## 文件结构

### 新建

- `extension/src/runtime/contracts.ts`：运行模式、素材、任务、端口和命令协议类型。
- `extension/src/runtime/errors.ts`：标准运行时错误和未知错误转换。
- `extension/src/runtime/command-client.ts`：Popup/Content Script 使用的类型化消息客户端。
- `extension/src/runtime/command-router.ts`：Background 使用的命令分发器。
- `extension/src/runtime/runtime-factory.ts`：根据设置创建并缓存当前运行时。
- `extension/src/runtime/backend/http-client.ts`：后端 URL、JSON 和错误处理。
- `extension/src/runtime/backend/backend-analysis-adapter.ts`：图片、视频、任务和 Prompt API。
- `extension/src/runtime/backend/backend-asset-repository.ts`：图片/视频保存与查询 API。
- 上述模块相邻的 `*.test.ts`：行为与协议测试。

### 修改

- `extension/background.ts`：注册统一命令路由；保留录屏和浏览器能力消息。
- `extension/src/background/capture.ts`：截图保存经 BackendAssetRepository 执行。
- `extension/src/background/video.ts`：视频 URL 上传经 BackendAnalysisAdapter 执行。
- `extension/src/popup/services/assets.ts`：移除直接图片分析请求，仅保留素材识别和命令构造。
- `extension/src/popup/hooks/usePopupController.ts`：发送不携带 `serverUrl` 的运行时命令。
- `extension/contents/inspoclip.ts`：把图片分析、视频上传/轮询、Prompt 和保存请求迁移到命令客户端。
- 受影响模块的现有测试：改为断言统一命令，不断言调用点拼接 REST URL。

## 任务 1：建立领域契约和标准错误

- [ ] **步骤 1：编写失败测试**

创建 `extension/src/runtime/contracts.test.ts` 与 `errors.test.ts`，验证：

- 图片与视频任务能够使用同一状态模型。
- 命令结果使用 `{ ok, data }` / `{ ok, error }` 可辨识联合。
- 普通 `Error`、HTTP 错误和未知值会转换为不泄露敏感信息的 `RuntimeError`。

- [ ] **步骤 2：运行测试并确认因模块不存在而失败**

运行：`pnpm --dir extension test -- src/runtime/contracts.test.ts src/runtime/errors.test.ts`

- [ ] **步骤 3：实现最小领域类型和错误转换**

接口必须覆盖 `RuntimeMode`、`AssetKind`、`AnalysisJob`、`AnalysisAdapter`、`AssetRepository`、`BlobStore`、`JobRepository`、`ExtensionCommand`、`CommandResult` 和 `RuntimeError`。不要在本任务实现本地数据库。

- [ ] **步骤 4：运行目标测试与类型检查**

运行：

```powershell
pnpm --dir extension test -- src/runtime/contracts.test.ts src/runtime/errors.test.ts
pnpm --dir extension typecheck
```

- [ ] **步骤 5：提交**

提交信息：`feat(extension): 建立独立运行时契约（任务 1/6）`

## 任务 2：实现后端 HTTP 客户端

- [ ] **步骤 1：编写失败测试**

创建 `extension/src/runtime/backend/http-client.test.ts`，覆盖：

- 去除服务地址末尾斜杠并生成 `/api/...` URL。
- 正常 JSON 和无正文成功响应。
- 后端 `{ error }`、非 JSON 错误和网络错误转换为标准错误。
- 错误对象不包含 Authorization 或 API Key。

- [ ] **步骤 2：运行目标测试并确认失败**

运行：`pnpm --dir extension test -- src/runtime/backend/http-client.test.ts`

- [ ] **步骤 3：实现可注入 fetch 的 BackendHttpClient**

客户端只负责传输和错误标准化，不包含图片、视频或业务状态逻辑。

- [ ] **步骤 4：运行目标测试与类型检查**

运行：

```powershell
pnpm --dir extension test -- src/runtime/backend/http-client.test.ts
pnpm --dir extension typecheck
```

- [ ] **步骤 5：提交**

提交信息：`feat(extension): 封装后端 HTTP 客户端（任务 2/6）`

## 任务 3：实现 BackendAnalysisAdapter

- [ ] **步骤 1：编写失败测试**

创建 `extension/src/runtime/backend/backend-analysis-adapter.test.ts`，使用注入的 fetch 验证：

- 图片 Blob 发送至 `/api/images/analyze`。
- 视频 Blob 以 `source=extension` 和草稿标记发送至 `/api/videos`。
- 视频 URL 会先下载成 Blob，受保护或 Blob URL 返回可操作错误。
- 视频任务轮询会保留现有网络变化重试语义。
- Prompt 获取和重新生成分别使用 GET 与 POST，并携带用途和语言。

- [ ] **步骤 2：运行测试并确认因适配器不存在而失败**

运行：`pnpm --dir extension test -- src/runtime/backend/backend-analysis-adapter.test.ts`

- [ ] **步骤 3：实现最小适配器**

复用 `BackendHttpClient`；将 `extension/src/video.ts` 的有效重试算法迁入适配器，并从旧模块重新导出兼容函数，避免一次性破坏调用点。

- [ ] **步骤 4：运行新旧视频测试与类型检查**

运行：

```powershell
pnpm --dir extension test -- src/runtime/backend/backend-analysis-adapter.test.ts src/video.test.ts
pnpm --dir extension typecheck
```

- [ ] **步骤 5：提交**

提交信息：`refactor(extension): 统一后端分析适配器（任务 3/6）`

## 任务 4：实现 BackendAssetRepository 与运行时工厂

- [ ] **步骤 1：编写失败测试**

创建 `backend-asset-repository.test.ts` 和 `runtime-factory.test.ts`，覆盖：

- 截图保存先获取周记录，再上传图片并保留 dayOfWeek。
- 视频保存调用 `/api/videos/:id/save`。
- 图片内容、视频详情和周记录查询路径与现有 API 一致。
- 第一阶段工厂只为 `backend` 创建完整运行时；请求 `standalone` 返回明确的未启用错误，不静默回退。
- 相同设置快照复用运行时，服务地址变化时重建。

- [ ] **步骤 2：运行目标测试并确认失败**

运行：

```powershell
pnpm --dir extension test -- src/runtime/backend/backend-asset-repository.test.ts src/runtime/runtime-factory.test.ts
```

- [ ] **步骤 3：实现仓库与工厂**

第一阶段从现有 `chrome.storage.sync.serverUrl` 读取后端设置，不新增可见模式开关。

- [ ] **步骤 4：运行目标测试与类型检查**

运行：

```powershell
pnpm --dir extension test -- src/runtime/backend/backend-asset-repository.test.ts src/runtime/runtime-factory.test.ts
pnpm --dir extension typecheck
```

- [ ] **步骤 5：提交**

提交信息：`feat(extension): 建立后端运行时工厂（任务 4/6）`

## 任务 5：注册命令路由并迁移调用点

- [ ] **步骤 1：编写失败测试**

创建 `command-router.test.ts` 和 `command-client.test.ts`，验证：

- 已知命令分发到正确端口并返回标准结果。
- 未知命令不被运行时吞掉，以便录屏等既有消息监听器继续处理。
- 运行时错误序列化后可跨 Chrome 消息边界恢复。
- 调用方不再传 `serverUrl`。

为 `capture.ts`、`background/video.ts` 与 Popup 素材消息更新测试，先断言统一运行时行为。

- [ ] **步骤 2：运行测试并确认失败**

运行：

```powershell
pnpm --dir extension test -- src/runtime/command-router.test.ts src/runtime/command-client.test.ts src/popup/services/assets.test.ts
```

- [ ] **步骤 3：实现路由并迁移**

在 `background.ts` 最前部识别 `runtime.*` 命令。录屏、标签页捕获、通知和 Offscreen 消息继续由原监听器处理。迁移 Popup、截图保存、视频 URL 上传以及 Content Script 中的图片分析、视频任务、Prompt 和保存调用。

迁移时保留兼容响应字段，确保结果弹窗无需同时重写。完成后运行：

```powershell
rg -n "fetch\(`\$\{serverUrl\}/api|fetch\(`\$\{trimBase\(serverUrl\)\}/api" extension/contents extension/src/popup extension/src/background
```

预期业务调用点无匹配；REST URL 只允许存在于 `extension/src/runtime/backend/`。

- [ ] **步骤 4：运行扩展完整测试与类型检查**

运行：

```powershell
pnpm --dir extension test
pnpm --dir extension typecheck
```

- [ ] **步骤 5：提交**

提交信息：`refactor(extension): 收口后端业务调用（任务 5/6）`

## 任务 6：构建与回归验收

- [ ] **步骤 1：运行完整静态验证**

```powershell
pnpm --dir extension test
pnpm --dir extension typecheck
pnpm --dir extension build
```

- [ ] **步骤 2：检查边界和工作区**

```powershell
rg -n "/api/" extension/contents extension/src/popup extension/src/background
git diff --check
git status --short
```

`/api/` 只允许出现在 BackendAdapter、服务连接健康检查及其测试中；现有日志文件不纳入提交。

- [ ] **步骤 3：手动回归清单**

- Popup 上传图片和视频可以打开页面侧分析进度。
- 框选截图、整页分析和录屏仍可启动。
- 图片与视频结果弹窗可关闭、恢复和切换。
- Prompt 获取、重新生成和保存按钮行为不变。
- 未点击保存的草稿不出现在客户端搜索结果中。

- [ ] **步骤 4：提交阶段验收记录**

仅在手动回归产生必要的测试或文档变更时提交；否则不创建空提交。阶段完成后停止，向用户报告验证证据，并等待是否进入“模式设置与本地存储”阶段。
