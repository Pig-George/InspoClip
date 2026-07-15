# 客户端周视图受阻动效细化实现计划

> **面向 AI 代理的工作者：** 使用 superpowers:executing-plans 在当前会话实现；用户已明确不使用子代理。步骤使用复选框跟踪进度。

**目标：** 将下一周按钮的受阻抖动改为更柔和、优雅的轻触回弹。

**架构：** 保持现有统一导航守卫和受阻计数不变，仅调整 `WeekHeader` 的 Framer Motion 关键帧、缩放和缓动参数，并通过现有组件测试锁定动效契约。

**技术栈：** React 18、TypeScript、Framer Motion、Vitest、Testing Library、pnpm。

---

### 任务 1：轻触回弹动效

**文件：**
- 修改：`client/src/components/WeekHeader.test.tsx`
- 修改：`client/src/components/WeekHeader.tsx`

- [ ] **步骤 1：先更新测试期望**

将受阻动画期望改为：水平位移 `[0, -2.4, 1.2, -0.4, 0]`、缩放 `[1, 0.985, 1, 0.997, 1]`、时长 `0.38` 秒、时间点 `[0, 0.26, 0.56, 0.8, 1]` 和 cubic-bezier `[0.22, 1, 0.36, 1]`。

- [ ] **步骤 2：运行测试并确认红灯**

运行：`pnpm --dir client test -- src/components/WeekHeader.test.tsx`

预期：FAIL，收到旧的快速对称抖动参数。

- [ ] **步骤 3：实现最小参数调整**

只修改 `nextWeekControls.start` 的 `x`、`scale` 和 `transition`；保留减少动态效果逻辑、导航守卫与按钮语义。

- [ ] **步骤 4：运行定向测试并确认绿灯**

运行：`pnpm --dir client test -- src/components/WeekHeader.test.tsx`

预期：3 条页头测试全部通过。

- [ ] **步骤 5：运行完整验证**

运行：`pnpm --dir client test` 和 `pnpm --dir client build`。

预期：客户端全部测试通过，TypeScript 与 Vite 构建退出码为 0。

- [ ] **步骤 6：提交并部署**

只提交本计划、组件和测试文件到 `develop`，提交信息使用 `style(client): soften blocked week navigation motion`。随后运行 `docker compose up -d --build client`，检查客户端容器和 `http://localhost:8080`；不推送远端。
