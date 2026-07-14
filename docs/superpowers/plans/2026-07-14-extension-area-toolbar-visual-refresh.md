# 插件框选操作栏布局与视觉优化实现计划

> **面向 AI 代理的工作者：** 在当前会话内按 TDD 逐项执行，每个阶段完成后提交到 `develop`，不使用子代理。

**目标：** 将框选操作栏改为默认贴合框选框右下角的紧凑 Dock，并统一使用内联 SVG 图标、自定义多语言悬浮提示和已确认的状态动画。

**架构：** `area-recording.ts` 提供定位、图标和提示文案纯函数；内容脚本只组合状态和事件；`styles.ts` 负责 Dock、提示与动画表现。

**技术栈：** Plasmo、TypeScript、Shadow DOM、内联 SVG、CSS animations、Vitest、pnpm。

---

### 任务 1：将操作栏定位改为右侧对齐

**文件：**
- 修改：`extension/src/content/area-recording.test.ts`
- 修改：`extension/src/content/area-recording.ts`
- 修改：`extension/contents/inspoclip.ts`

- [ ] 先修改定位测试，断言 Dock 右边缘与框选框右边缘对齐，并覆盖底部不足切换到上方和视口安全边距。
- [ ] 运行 `pnpm --dir extension test -- src/content/area-recording.test.ts`，确认旧居中算法导致测试失败。
- [ ] 修改 `getAreaCaptureToolbarPosition`，使用右边缘对齐与 12px 视口限制。
- [ ] 调整内容脚本回退尺寸和箭头位置所需的 placement 数据。
- [ ] 重跑定向测试并提交定位阶段。

### 任务 2：定义统一图标和多语言提示

**文件：**
- 修改：`extension/src/content/area-recording.test.ts`
- 修改：`extension/src/content/area-recording.ts`
- 修改：`extension/contents/inspoclip.ts`

- [ ] 先添加失败测试，覆盖截图、录屏、声音开关、取消、暂停、继续、重录、确认重录和完成的中英文提示。
- [ ] 先添加失败测试，验证每个操作图标使用内联 SVG、`currentColor`，且不包含 emoji 或可见文字。
- [ ] 运行定向测试，确认提示与图标函数缺失导致失败。
- [ ] 实现图标和提示纯函数，并在内容脚本中将文字按钮、声音文字开关替换为带 `aria-label`、`aria-pressed` 和 `data-tooltip` 的图标按钮。
- [ ] 录制中根据声音、暂停和重录确认状态更新图标及可访问属性。
- [ ] 重跑定向测试并提交图标与语义阶段。

### 任务 3：实现紧凑 Dock、悬浮提示和状态动画

**文件：**
- 修改：`extension/src/content/styles.test.ts`
- 修改：`extension/src/content/styles.ts`
- 修改：`extension/contents/inspoclip.ts`

- [ ] 先添加失败测试，断言 32×32px 图标按钮、hover/focus 提示、右侧箭头、Dock 入场、声音波纹、录制呼吸、重录确认、完成回弹和 `prefers-reduced-motion` 规则存在。
- [ ] 运行 `pnpm --dir extension test -- src/content/styles.test.ts`，确认旧样式导致测试失败。
- [ ] 重写操作栏相关 CSS，移除文字按钮与旧声音开关布局，接入紧凑 Dock 和统一提示。
- [ ] 在内容脚本状态切换时添加一次性动画类，并确保定时器和清理逻辑不会残留确认气泡。
- [ ] 重跑样式和录屏定向测试并提交视觉阶段。

### 任务 4：完整验证与构建

**文件：**
- 验证所有本次修改文件。

- [ ] 运行 `pnpm --dir extension test`。
- [ ] 运行 `pnpm --dir extension typecheck`。
- [ ] 运行 `pnpm --dir extension build`。
- [ ] 运行 `git diff --check` 并审查从设计提交开始的差异。
- [ ] 确认只保留用户已有的无关工作区变更，不暂存或修改它们。
- [ ] 将最终修正提交到 `develop`，不推送远端。
