# 共享工作区 UI 迁移计划

## 目标

将客户端和独立插件端的工作区 UI 收敛为一套共享 React 源码，同时保留两端独立的数据访问、媒体地址和能力适配层，确保客户端 Vite 与插件 Plasmo 可以分别构建。

## 设计边界

- `packages/inspoclip-workspace-ui` 只包含展示组件、共享类型、样式 Token、视图模型和交互回调，不直接调用 HTTP、Chrome Runtime、IndexedDB 或后端 API。
- 客户端适配器负责将服务端图片/视频数据映射为共享 `WorkspaceAsset`，并实现保存、删除、Prompt 操作。
- 插件适配器负责将 Runtime/IndexedDB 数据映射为共享 `WorkspaceAsset`，并实现本地媒体读取和持久化。
- 共享 CSS 使用 `.inspoclip-workspace` 作用域，避免客户端和扩展页面全局样式相互污染。
- 共享依赖统一使用 `lucide-react` 和 `framer-motion`，两端版本保持一致。

## 阶段

1. 建立 pnpm workspace 与共享包骨架，定义 `WorkspaceAsset`、分析结果和适配器接口。
2. 抽取设计 Token、媒体卡片、日期卡片和详情弹窗，先迁移客户端并保持现有行为。
3. 抽取 Header、日视图、周视图、时间轴和笔记区域，迁移客户端交互。
4. 接入插件 Runtime 适配器，替换当前插件 Timeline 页面中的重复 UI。
5. 对齐导出、搜索、标签、删除和 Prompt 重新生成能力，按端能力矩阵处理不可用操作。
6. 增加两端共享组件单测、适配器契约测试和桌面/窄屏视觉回归截图。

## 验证门禁

- `pnpm -r test`
- `pnpm --dir client build`
- `pnpm --dir extension typecheck`
- `pnpm --dir extension build`
- 客户端和插件工作区在相同 fixture 数据下截图差异可接受。
- 服务端与 Docker 配置无改动。
