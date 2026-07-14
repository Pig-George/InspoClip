# 插件框选操作栏 Lucide 图标实现计划

> **面向 AI 代理的工作者：** 在当前会话中按 executing-plans 执行本计划；用户已明确要求不使用子代理。每个任务遵循测试先行并在阶段完成后提交。

**目标：** 使用 Lucide 官方图标替换框选操作栏现有手写 SVG，使实际控件与已确认演示稿图标一致。

**架构：** 新增一个专用图标模块负责操作到 Lucide 图标名的映射、占位标记和局部渲染。内容脚本继续负责按钮状态与事件，只在操作栏创建或动态图标切换后调用局部渲染函数。

**技术栈：** TypeScript、Lucide Vanilla、Plasmo、Vitest、pnpm。

---

## 文件结构

- 创建 `extension/src/content/area-toolbar-icons.ts`：封装 Lucide 按需导入、动作映射、占位标记和局部渲染。
- 创建 `extension/src/content/area-toolbar-icons.test.ts`：验证完整映射、占位标记和局部 Lucide 渲染参数。
- 修改 `extension/src/content/area-recording.ts`：移除手写 SVG 路径，复用图标模块导出的动作类型与占位函数。
- 修改 `extension/src/content/area-recording.test.ts`：将手写 SVG 断言改为 Lucide 映射断言。
- 修改 `extension/contents/inspoclip.ts`：在初始 Dock、录制 Dock 和按钮状态切换后局部渲染 Lucide 图标。
- 修改 `extension/package.json`、`extension/pnpm-lock.yaml`：加入与客户端一致的 `lucide@0.468.0`。

### 任务 1：建立 Lucide 图标映射与局部渲染

- [ ] 在 `area-toolbar-icons.test.ts` 编写失败测试，断言 `screenshot → scan`、`record → video`、`sound-on → volume-2`、`sound-off → volume-x`、`cancel → x`、`pause → pause`、`resume → play`、`retake/confirm-retake → rotate-ccw`、`finish → check`。
- [ ] 添加失败测试，断言图标占位使用 `data-lucide` 且没有内联 SVG，并验证局部渲染传入 `root`、按需图标集合、16px 尺寸、1.75px 描边和无障碍属性。
- [ ] 运行 `pnpm --dir extension test -- src/content/area-toolbar-icons.test.ts`，确认因模块缺失或行为缺失而失败。
- [ ] 使用 `pnpm --dir extension add lucide@0.468.0` 安装依赖。
- [ ] 实现 `area-toolbar-icons.ts`，只导入 `Scan`、`Video`、`Volume2`、`VolumeX`、`X`、`Pause`、`Play`、`RotateCcw`、`Check` 与 `createIcons`。
- [ ] 重跑定向测试，确认映射和局部渲染通过。

### 任务 2：接入框选与录制状态

- [ ] 先修改 `area-recording.test.ts` 形成失败断言，要求所有动作返回对应 Lucide 占位标记而不是 `<svg>` 手写路径。
- [ ] 运行 `pnpm --dir extension test -- src/content/area-recording.test.ts`，确认旧实现导致断言失败。
- [ ] 从 `area-recording.ts` 移除 `AREA_TOOLBAR_ICON_PATHS`，改为复用图标模块。
- [ ] 在 `inspoclip.ts` 的框选 Dock、录制 Dock、声音开关、暂停/继续切换后调用 `renderAreaToolbarIcons()`，渲染范围限制在当前 toolbar 或 button。
- [ ] 运行两个定向测试文件并确认通过。
- [ ] 提交 `feat(extension): use lucide icons in area toolbar`。

### 任务 3：完整验证与构建

- [ ] 运行 `pnpm --dir extension test`，确认全部测试通过。
- [ ] 运行 `pnpm --dir extension typecheck`，确认 TypeScript 无错误。
- [ ] 运行 `pnpm --dir extension build`，确认 Chrome MV3 构建成功并更新 `extension/build/chrome-mv3-prod`。
- [ ] 检查 `git diff --check` 和 `git status --short`，确保未暂存用户无关文件且不推送远程仓库。
