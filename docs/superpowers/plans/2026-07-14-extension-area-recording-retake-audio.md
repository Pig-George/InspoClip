# 插件框选录屏重录与标签页声音实现计划

> **面向 AI 代理的工作者：** 在当前会话内按 TDD 逐项执行，每个阶段完成后提交到 `develop`。

**目标：** 为插件框选录屏增加复用现有采集流的重录功能，以及默认关闭的当前标签页声音录制开关。

**架构：** 内容脚本管理声音选择与重录交互，background 只负责消息转发，offscreen recorder 负责音轨合成、标签页声音回放和无权限重申请的 recorder 重建。

**技术栈：** Plasmo、TypeScript、Chrome MV3 `tabCapture`/offscreen document、MediaStream、MediaRecorder、Vitest、pnpm。

---

### 任务 1：定义音频采集与输出轨行为

**文件：**
- 修改：`extension/src/offscreen/area-recorder.test.ts`
- 修改：`extension/src/offscreen/area-recorder.ts`

- [ ] 先添加失败测试，断言 tab capture 同时请求音频，并断言输出流只在 `includeTabAudio` 为真时包含源音轨。
- [ ] 运行 `pnpm --dir extension test -- src/offscreen/area-recorder.test.ts`，确认因当前 `audio: false` 和缺少音轨选择函数而失败。
- [ ] 实现音视频约束、输出音轨组合与标签页声音本地回放清理逻辑。
- [ ] 重跑定向测试，确认通过。

### 任务 2：实现复用媒体流的重录命令

**文件：**
- 修改：`extension/src/offscreen/area-recorder.test.ts`
- 修改：`extension/src/offscreen/area-recorder.ts`
- 修改：`extension/background.ts`

- [ ] 先添加失败测试，断言重录会停止旧 recorder、清空旧分片并启动新 recorder，但不会停止源流和输出流。
- [ ] 运行定向测试，确认缺少重录能力导致失败。
- [ ] 抽取 recorder 创建逻辑，新增 `RETAKE_OFFSCREEN_AREA_RECORDING` 命令并在 background 增加转发。
- [ ] 重跑定向测试，确认通过且停止/取消行为无回归。

### 任务 3：实现声音开关与重录交互

**文件：**
- 修改：`extension/contents/inspoclip.ts`
- 修改：`extension/src/content/styles.ts`
- 测试：按现有内容脚本辅助函数测试结构新增或修改相邻测试文件。

- [ ] 先添加失败测试，覆盖声音默认关闭、开始消息携带声音选项、重录后计时状态归零。
- [ ] 运行定向测试，确认缺少新状态/消息映射导致失败。
- [ ] 在选择工具栏增加多语言声音开关，在录制工具栏增加带二次确认的多语言重录操作。
- [ ] 重录成功后恢复录制态、重置计时和暂停样式；失败时恢复按钮并显示错误 toast。
- [ ] 重跑定向测试并提交功能阶段。

### 任务 4：完整验证

**文件：**
- 验证所有本次修改文件。

- [ ] 运行 `pnpm --dir extension test`。
- [ ] 运行 `pnpm --dir extension typecheck`。
- [ ] 运行 `pnpm --dir extension build`。
- [ ] 检查 `git diff --check` 和 `git status --short`，只暂存本次相关文件。
- [ ] 提交到 `develop`，不推送远端。
