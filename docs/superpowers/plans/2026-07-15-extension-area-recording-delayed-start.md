# 插件区域录屏延时启动实现计划

> 执行约束：在 `develop` 分支按 TDD 实现；每个阶段独立提交；推送前必须取得用户确认。

## 目标

为插件区域录屏增加可记忆的延时启动能力。用户可在框选工具栏中选择关闭、3 秒或 5 秒，默认 3 秒。首次录制和重录都在录制真正开始前倒计时；倒计时不进入成片、不计入录制时长，并可通过 Esc 安全取消。

## 阶段一：延时领域逻辑与图标

涉及文件：

- `extension/src/content/area-recording.ts`
- `extension/src/content/area-recording.test.ts`
- `extension/src/content/area-toolbar-icons.ts`
- `extension/src/content/area-toolbar-icons.test.ts`

步骤：

1. 先补充失败测试，覆盖默认延时、非法存储值归一化、`关闭 → 3 秒 → 5 秒 → 关闭` 循环和中英文标签。
2. 实现纯函数与常量，不引入浏览器状态。
3. 先补充 `Timer` 图标映射失败测试，再以 Lucide 的按需导入方式接入。
4. 运行对应单元测试并提交。

## 阶段二：可取消倒计时控制器

涉及文件：

- `extension/src/content/recording-countdown.ts`
- `extension/src/content/recording-countdown.test.ts`

步骤：

1. 先写测试，覆盖逐秒通知、零延时立即完成、中途取消后不再触发开始、重复取消幂等。
2. 实现可注入等待函数的倒计时控制器，使测试无需真实等待。
3. 控制器使用显式取消结果，避免把用户取消当作录制失败。
4. 运行对应测试并提交。

## 阶段三：首次录制接入

涉及文件：

- `extension/contents/inspoclip.ts`
- `extension/src/content/styles.ts`
- `extension/src/content/area-recording.ts`
- 对应测试文件

步骤：

1. 先补充可测试的延时按钮展示模型、存储值处理和倒计时文案测试。
2. 在工具栏加入 Timer 图标按钮、当前延时角标和多语言悬浮提示；点击循环切换并写入 `chrome.storage.sync`。
3. 首次录制流程调整为：准备捕获权限完成 → 锁定框选 → 选区中央倒计时 → 发送真正的录制启动消息。
4. 倒计时期间保持网页可交互；倒计时层与框选控件不进入成片；录制计时器只在后台确认启动后创建。
5. Esc 或关闭框选时取消倒计时、释放已准备的视频源，且不显示失败 toast。
6. 增加轻量缩放/淡入动画，并适配 `prefers-reduced-motion`。
7. 运行相关测试、类型检查并提交。

## 阶段四：重录接入

涉及文件：

- `extension/contents/inspoclip.ts`
- `extension/background.ts`
- `extension/src/offscreen/area-recorder.ts`
- `extension/src/offscreen/area-recorder.test.ts`
- 相关消息测试

步骤：

1. 先写失败测试，覆盖“准备重录”和“开始重录”两阶段协议，以及新录制器在倒计时结束前保持 inactive。
2. 将 offscreen 重录拆成准备和启动：准备阶段停止并丢弃旧片段、建立但不启动新录制器；启动阶段才调用 `MediaRecorder.start`。
3. 后台转发新的准备/启动消息，并保留必要的旧消息兼容处理。
4. 插件弹窗重录流程调整为：确认重录 → 准备重录 → 倒计时 → 启动重录 → 重置计时器。
5. 倒计时取消时不误启动新录制器；用户仍可再次重录或取消整个会话。
6. 运行 offscreen、background 和内容脚本相关测试并提交。

## 阶段五：验证与本地交付

1. 运行插件完整单元测试。
2. 运行 TypeScript 类型检查。
3. 运行 Plasmo 生产构建，确认可加载产物生成成功。
4. 检查 `git diff`，确保未修改用户已有的无关文件。
5. 按验证结果修复问题并提交最终调整；不执行远程推送。

## 验收标准

- 初始延时默认 3 秒，刷新后保留用户选择。
- 可在关闭、3 秒、5 秒之间循环切换，图标和提示支持中英文。
- 首次录制与重录均在倒计时结束后才真正写入视频。
- 倒计时不出现在成片中，也不计入录制时长。
- 倒计时期间网页可操作，但框选区域不可移动或缩放。
- Esc 可取消倒计时并正确回收资源，不出现错误 toast。
- 延时关闭时保持现有即时启动体验。
- 完整测试、类型检查和生产构建通过。
