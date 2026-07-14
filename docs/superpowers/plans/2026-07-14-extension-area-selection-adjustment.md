# 插件框选区域调整实现计划

> **面向 AI 代理的工作者：** 在当前 `develop` 工作区中使用 `executing-plans` 逐任务实现；按用户要求不使用子代理。

**目标：** 让完成后的框选区域支持整体移动和 8 方向缩放，并保证截图、录屏消费调整后的最终区域。

**架构：** 把移动、缩放和视口约束实现为 `area-recording.ts` 中的纯几何函数；content script 只负责 Pointer Events 状态和 DOM 同步。选区、工具栏以及截图/录屏操作共享同一个当前矩形状态。

**技术栈：** TypeScript、Plasmo Content Script、Shadow DOM、Pointer Events、Vitest、CSS。

---

### 任务 1：实现可测试的选区几何计算

**文件：**
- 修改：`extension/src/content/area-recording.ts`
- 测试：`extension/src/content/area-recording.test.ts`

- [ ] 添加 `AreaResizeHandle` 八方向类型，以及移动与缩放纯函数的失败测试。
- [ ] 运行 `pnpm --dir extension test -- src/content/area-recording.test.ts`，确认函数缺失导致测试失败。
- [ ] 实现整体移动的视口约束，以及八方向缩放的最小尺寸和视口约束。
- [ ] 再次运行目标测试并确认全部通过。
- [ ] 提交 `feat(extension): add adjustable area geometry`。

### 任务 2：接入选区拖动、八个拖动点和工具栏跟随

**文件：**
- 修改：`extension/contents/inspoclip.ts`
- 修改：`extension/src/content/styles.ts`
- 测试：`extension/src/content/area-recording.test.ts`

- [ ] 添加覆盖八个拖动点方向列表的失败测试，确保 DOM 生成使用统一定义。
- [ ] 在初次框选锁定后创建八个拖动点，并为选区绑定 Pointer Events。
- [ ] 在 pointer move 时更新当前矩形、选区样式和工具栏位置。
- [ ] 让截图和录屏按钮在点击时读取当前矩形；开始录屏后禁用编辑状态并隐藏拖动点。
- [ ] 增加暖棕色拖动点、方向光标和扩大命中区域的样式。
- [ ] 运行目标测试并确认通过。
- [ ] 提交 `feat(extension): make captured area adjustable`。

### 任务 3：完整回归验证

**文件：**
- 验证：`extension/src/content/area-recording.test.ts`
- 验证：插件全部测试和构建产物

- [ ] 运行 `pnpm --dir extension test`，期望所有测试文件通过。
- [ ] 运行 `pnpm --dir extension typecheck`，期望退出码为 0。
- [ ] 运行 `pnpm --dir extension build`，期望 Chrome MV3 构建完成。
- [ ] 运行 `git diff --check` 并审查只包含本功能相关文件。
- [ ] 若验证阶段产生修复，单独提交；否则保留任务 2 的功能提交作为最终代码提交。
