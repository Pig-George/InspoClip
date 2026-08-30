# 独立插件本地持久化第二阶段实施计划

> **面向 AI 代理的工作者：** 在当前 `future-extension` 分支使用 `executing-plans` 逐任务实现；用户已要求不使用子代理。生产代码遵循 TDD，每个任务独立提交。

**目标：** 让插件能够显式切换后端服务与独立运行模式，并为独立模式建立可持久化图片、视频、分析结果和任务的 IndexedDB + OPFS 存储基础。

**架构：** `chrome.storage.local` 保存运行模式，IndexedDB 保存素材和任务元数据，OPFS 保存图片与视频 Blob。Background Runtime 根据模式创建 Backend Runtime 或 Standalone Runtime；第二阶段的独立分析适配器会明确返回“模型尚未配置/未启用”，不静默调用后端。

**技术栈：** TypeScript、Plasmo MV3、IndexedDB、OPFS、Chrome Storage、Vitest、`fake-indexeddb`（仅测试）。

---

## 文件结构

### 新建

- `extension/src/runtime/settings.ts`：运行模式读取、保存和首次安装初始化。
- `extension/src/runtime/local/indexed-db.ts`：数据库打开、事务和对象仓库基础设施。
- `extension/src/runtime/local/indexed-db-asset-repository.ts`：素材元数据与保存状态。
- `extension/src/runtime/local/indexed-db-job-repository.ts`：分析任务持久化与恢复查询。
- `extension/src/runtime/local/opfs-blob-store.ts`：图片、视频、封面与缩略图 Blob。
- `extension/src/runtime/local/standalone-analysis-adapter.ts`：第二阶段明确的独立分析能力门禁。
- `extension/src/runtime/local/standalone-runtime.ts`：组合本地端口。
- `extension/src/runtime/local/draft-cleanup.ts`：过期草稿和关联文件清理。
- 相邻 `*.test.ts`：使用 `fake-indexeddb` 与内存 OPFS 句柄验证。

### 修改

- `extension/package.json`、`pnpm-lock.yaml`：加入测试依赖 `fake-indexeddb`。
- `extension/src/runtime/runtime-factory.ts`：支持异步创建独立运行时和模式隔离缓存。
- `extension/src/runtime/background-runtime.ts`：从 `chrome.storage.local` 读取当前模式。
- `extension/background.ts`：首次安装初始化模式并在切换时失效运行时缓存。
- `extension/src/popup/types.ts`、`services/settings.ts`、`hooks/usePopupController.ts`：加载、保存与展示模式。
- `extension/src/popup/components/SettingsSection.tsx`、`style.css`、多语言常量：模式切换、连接状态和存储风险说明。
- `extension/src/runtime/contracts.ts`：补全本地记录、存储占用和可恢复任务字段。

## 任务 1：运行模式设置与首次安装规则

- [ ] 编写失败测试，验证已有安装缺少模式时读取为 `backend`、新安装初始化为 `standalone`、显式选择可持久化到 `chrome.storage.local`，API Key 不写入 sync。
- [ ] 运行 `pnpm --dir extension test -- src/runtime/settings.test.ts`，确认缺少实现导致失败。
- [ ] 实现 `loadRuntimeMode`、`saveRuntimeMode`、`initializeRuntimeMode`，使用可注入 StorageArea 便于测试。
- [ ] 将 `RuntimeFactory.get` 改为异步模式读取兼容的接口，并更新既有测试。
- [ ] 运行目标测试和 `pnpm --dir extension typecheck`。
- [ ] 提交：`feat(extension): 增加运行模式设置（任务 1/6）`。

## 任务 2：实现 OPFS BlobStore

- [ ] 编写失败测试，使用内存目录句柄验证图片和视频 Blob 写入、读取、覆盖、删除、缺失文件与用量统计。
- [ ] 运行 `pnpm --dir extension test -- src/runtime/local/opfs-blob-store.test.ts`，确认失败。
- [ ] 实现文件名编码、目录按素材类型分层、原子替换和 `navigator.storage.estimate()` 配额读取。
- [ ] 对 OPFS 不可用和空间不足转换为标准运行时错误。
- [ ] 运行目标测试和类型检查。
- [ ] 提交：`feat(extension): 持久化本地图片与视频文件（任务 2/6）`。

## 任务 3：实现 IndexedDB 素材与任务仓库

- [ ] 添加 `fake-indexeddb` 测试依赖。
- [ ] 编写失败测试，覆盖数据库升级、图片/视频草稿创建、主动保存、状态隔离、分页列表、更新、删除、活动任务查询和任务恢复字段。
- [ ] 运行素材与任务仓库测试，确认失败。
- [ ] 实现数据库 `inspoclip-local`，对象仓库 `assets`、`jobs`，建立 `state`、`kind`、`updatedAt`、`status` 索引。
- [ ] `IndexedDbAssetRepository.createDraft` 先写 OPFS，再提交元数据；元数据事务失败时回滚 Blob。
- [ ] 删除素材时同步删除原文件和缩略图；仅 `saved` 素材进入默认资料库列表。
- [ ] 运行目标测试和类型检查。
- [ ] 提交：`feat(extension): 持久化本地素材与分析任务（任务 3/6）`。

## 任务 4：组装 Standalone Runtime 与模式隔离

- [ ] 编写失败测试，验证 Factory 按模式返回不同运行时、切换不复用另一模式实例、独立模式不请求后端、未配置模型时返回可操作错误。
- [ ] 实现 `StandaloneAnalysisAdapter` 和 `createStandaloneRuntime`。
- [ ] 更新 Background Runtime，从 local 读取模式、从 sync 读取后端地址；一次命令固定使用同一设置快照。
- [ ] Background 安装事件：新安装写入 `standalone`，升级且无模式时写入 `backend`。
- [ ] 运行 Runtime、命令路由、Background 相关测试与类型检查。
- [ ] 提交：`feat(extension): 接入独立运行时（任务 4/6）`。

## 任务 5：Popup 模式切换与存储状态

- [ ] 编写组件和设置服务失败测试，验证两个模式选项、默认状态、独立模式隐藏后端地址、后端模式显示连接测试、模式文案和风险提示多语言。
- [ ] 在设置页顶部加入“独立运行 / 后端服务”分段选择器。
- [ ] 独立模式连接指示显示“本地”，不执行 `/api/health`；“打开 InspoClip”在独立模式暂时提示本地资料库将在下一阶段开放，不错误打开后端客户端。
- [ ] 展示 `navigator.storage.estimate()` 的本地占用；无法读取时显示可用状态而非报错。
- [ ] 保存设置后让 Background 下一条命令使用新模式，不迁移或清除另一模式数据。
- [ ] 运行 Popup 与设置测试、完整类型检查。
- [ ] 提交：`feat(extension): 增加独立运行模式切换界面（任务 5/6）`。

## 任务 6：草稿清理、构建与阶段验收

- [ ] 编写失败测试：24 小时前且非活动任务引用的草稿会删除；已保存、处理中、等待重试和较新草稿保留；Blob 删除失败可重试且不误删元数据。
- [ ] 实现启动时和每日限频清理，清理结果不打断分析命令。
- [ ] 运行：

```powershell
pnpm --dir extension test
pnpm --dir extension typecheck
pnpm --dir extension build
```

- [ ] 检查 `git diff --check`、工作区和未跟踪日志，确保日志未提交。
- [ ] 验收：切换模式后数据源隔离；IndexedDB 含图片/视频元数据；OPFS 可恢复图片/视频原文件；浏览器重启后模式、草稿和任务仍存在；独立模式不会静默请求后端。
- [ ] 阶段完成后向用户报告自动验证证据，并等待进入独立图片分析阶段。
