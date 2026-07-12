# 插件端 Plasmo 工程化重构实现计划

> 面向 AI 代理的工作者：本计划在当前会话内联执行，不使用子代理。步骤使用复选框语法跟踪进度。

**目标：** 将现有原生 MV3 插件重构为 Plasmo 工程化项目，同时保持现有图片保存、页面/区域分析、视频上传分析、设置、快捷键和右键菜单能力。

**架构：** 第一阶段先完成等价迁移：保留当前功能行为，建立 Plasmo、TypeScript、React popup、Vitest 的工程骨架。第二阶段再拆分大型 content/popup 逻辑，不在本阶段新增一体化本地存储等产品能力。

**技术栈：** Plasmo、TypeScript、React、Vitest、Chrome Manifest V3。

---

## 文件结构

- `extension/package.json`：插件模块独立 npm 工程，定义 Plasmo 开发、构建、测试脚本和 manifest 覆盖项。
- `extension/tsconfig.json`：插件 TypeScript 配置。
- `extension/vitest.config.ts`：插件单测配置。
- `extension/background.ts`：迁移现有 MV3 service worker 逻辑。
- `extension/contents/inspoclip.ts`：迁移现有 content script 逻辑。
- `extension/popup.tsx`：React popup 入口，承载现有 popup UI。
- `extension/src/video.ts`：视频上传、URL 校验、轮询等可测试逻辑。
- `extension/src/video.test.ts`：迁移并保持现有视频工具测试。
- `extension/src/popup/*`：popup 文案、状态和事件处理拆分目标。
- `extension/assets/*`：插件图标资源。
- `extension/legacy/*`：短期保留旧原生插件文件作为迁移参考，避免丢功能。

## 任务 1：建立 Plasmo 工程骨架

- [ ] 创建 `extension/package.json`，配置 `dev/build/package/test` 脚本。
- [ ] 配置 Manifest V3 权限、host permissions、commands、icons、action。
- [ ] 添加 TypeScript、Vitest 配置。
- [ ] 复制图标到 Plasmo 可识别的 assets 目录。

## 任务 2：迁移视频工具并验证

- [ ] 将 `extension/video.js` 迁移为 `extension/src/video.ts`。
- [ ] 将 `extension/video.test.js` 迁移为 `extension/src/video.test.ts`。
- [ ] 先运行测试确认迁移前失败原因是工程依赖未安装或新文件未实现。
- [ ] 实现最小 TypeScript 版本并运行测试通过。

## 任务 3：迁移 background/content/popup 入口

- [ ] 将 `background.js` 迁移为 `background.ts`，改为 ES module import。
- [ ] 将 `content.js` 迁移为 `contents/inspoclip.ts`，保持消息类型和 UI 行为。
- [ ] 将 popup HTML/CSS/JS 迁移到 `popup.tsx` 与样式文件，保持当前交互。
- [ ] 保留旧文件到 `legacy/`，便于对照和回滚。

## 任务 4：验证和提交

- [ ] 运行插件单测。
- [ ] 运行 Plasmo 构建。
- [ ] 检查 git diff，确认只包含插件重构相关文件。
- [ ] 提交到 `develop` 分支，不执行 push。
