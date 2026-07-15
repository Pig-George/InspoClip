# 客户端周视图未来周切换守卫实现计划

> **面向 AI 代理的工作者：** 使用 superpowers:executing-plans 在当前会话逐任务实现；用户已明确不使用子代理。步骤使用复选框跟踪进度。

**目标：** 让周视图按钮和键盘快捷键都无法进入未来周，并在受阻时为下一周按钮提供可访问的抖动反馈。

**架构：** 把周日期边界判断提取为纯函数，由 `App` 中唯一的 `attemptNextWeek` 同时服务按钮与键盘。`WeekHeader` 只负责呈现 `aria-disabled` 状态，并根据受阻计数通过 Framer Motion 播放反馈动画。

**技术栈：** React 18、TypeScript、Framer Motion、Vitest、Testing Library、pnpm。

---

## 文件结构

- 创建 `client/src/lib/week-navigation.ts`：提供历史周、本周、未来周的可前进判断。
- 创建 `client/src/lib/week-navigation.test.ts`：覆盖周导航日期边界。
- 修改 `client/src/App.tsx`：建立唯一下一周切换守卫，并将受阻状态传给页头。
- 创建 `client/src/App.test.tsx`：验证键盘不能从本周进入未来周、历史周可以回到本周。
- 修改 `client/src/components/WeekHeader.tsx`：用 `aria-disabled` 替代原生禁用，并播放抖动反馈。
- 创建 `client/src/components/WeekHeader.test.tsx`：验证禁用语义、点击转发和受阻动画。

### 任务 1：周导航边界纯函数

**文件：**
- 创建：`client/src/lib/week-navigation.ts`
- 测试：`client/src/lib/week-navigation.test.ts`

- [ ] **步骤 1：编写失败测试**

测试 `canNavigateToNextWeek(currentMonday, now)`：历史周返回 `true`，本周与未来周返回 `false`，并覆盖同一周内不同日期。

- [ ] **步骤 2：运行测试并确认红灯**

运行：`pnpm --dir client test -- src/lib/week-navigation.test.ts`

预期：FAIL，原因是 `week-navigation` 模块或导出尚不存在。

- [ ] **步骤 3：实现最小纯函数**

使用 `getMonday` 和 `formatISODate` 归一化传入日期，再比较 ISO 周一字符串，不依赖时间和时区内的小时差异。

- [ ] **步骤 4：运行测试并确认绿灯**

运行：`pnpm --dir client test -- src/lib/week-navigation.test.ts`

预期：全部通过。

### 任务 2：页头受阻反馈

**文件：**
- 修改：`client/src/components/WeekHeader.tsx`
- 创建：`client/src/components/WeekHeader.test.tsx`

- [ ] **步骤 1：编写失败测试**

渲染本周的 `WeekHeader`，断言下一周按钮：

- `aria-disabled="true"`，但没有原生 `disabled`。
- 点击仍调用统一的 `onNextWeek` 尝试回调。
- `nextWeekBlockedAttempt` 从 0 变为 1 时调用动画控制器，执行 `[0, -4, 4, -3, 3, 0]` 的水平位移。
- 减少动态效果偏好开启时不播放位移动画。

- [ ] **步骤 2：运行测试并确认红灯**

运行：`pnpm --dir client test -- src/components/WeekHeader.test.tsx`

预期：FAIL，原因是新属性和动画行为尚不存在。

- [ ] **步骤 3：实现最小页头行为**

增加 `canGoNext` 与 `nextWeekBlockedAttempt` 属性；使用 `motion.button`、`useAnimationControls` 和 `useReducedMotion`。移除原生 `disabled`，设置 `aria-disabled`，并按状态切换透明度、光标和 hover 样式。

- [ ] **步骤 4：运行测试并确认绿灯**

运行：`pnpm --dir client test -- src/components/WeekHeader.test.tsx`

预期：全部通过。

### 任务 3：统一按钮与键盘切换入口

**文件：**
- 修改：`client/src/App.tsx`
- 创建：`client/src/App.test.tsx`

- [ ] **步骤 1：编写失败测试**

在固定系统日期下渲染 `App`，切到周视图：

- 本周按右方向键后页头日期不变，并递增受阻尝试信号。
- 先进入上一周，再按右方向键可以返回本周。
- 本周点击下一周尝试入口后日期不变。

- [ ] **步骤 2：运行测试并确认红灯**

运行：`pnpm --dir client test -- src/App.test.tsx`

预期：FAIL，当前键盘路径仍直接进入未来周，也没有受阻信号。

- [ ] **步骤 3：实现统一守卫**

在 `AppInner` 增加 `nextWeekBlockedAttempt`。`attemptNextWeek` 使用任务 1 的纯函数判断：允许时基于旧状态前进七天，受阻时只递增计数。按钮和 `useKeyboardShortcuts` 均接入该函数，并向 `WeekHeader` 传递 `canGoNext` 与计数。

- [ ] **步骤 4：运行测试并确认绿灯**

运行：`pnpm --dir client test -- src/App.test.tsx src/components/WeekHeader.test.tsx src/lib/week-navigation.test.ts`

预期：全部通过。

### 任务 4：全量验证、提交与部署

**文件：**
- 验证上述全部变更。

- [ ] **步骤 1：运行客户端全量测试**

运行：`pnpm --dir client test`

预期：所有测试文件和测试用例通过，无失败。

- [ ] **步骤 2：运行客户端生产构建**

运行：`pnpm --dir client build`

预期：TypeScript 与 Vite 构建退出码为 0。

- [ ] **步骤 3：检查差异并提交到 develop**

仅暂存本计划涉及的客户端文件和计划文档，执行 `git diff --cached --check`，提交信息使用 `fix(client): guard future week navigation`。

- [ ] **步骤 4：自动部署 Docker**

运行：`docker compose up -d --build client`，然后检查 `docker compose ps client` 和 `http://localhost:8080` 可访问。

- [ ] **步骤 5：不推送远端**

报告提交和部署结果；只有用户明确确认后才执行 `git push`。
