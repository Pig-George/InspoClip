<!-- superpowers-zh:begin (do not edit between these markers) -->
# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（20 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令
5. **代码必须提交到 develop 分支** — 不可直接提交到 master/main 分支，所有功能开发、bug 修复等代码变更必须先提交到 develop 分支

## 可用 Skills

Skills 位于 `.Codex/skills/` 目录，每个 skill 有独立的 `SKILL.md` 文件。

- **brainstorming**: 在任何创造性工作之前必须使用此技能——创建功能、构建组件、添加功能或修改行为。在实现之前先探索用户意图、需求和设计。
- **chinese-code-review**: 中文 review 沟通参考——话术模板、分级标注（必须修复/建议修改/仅供参考）、国内团队常见反模式应对。仅在用户显式 /chinese-code-review 时调用，不要根据上下文自动触发。
- **chinese-commit-conventions**: 中文 commit 与 changelog 配置参考——Conventional Commits 中文适配、commitlint/husky/commitizen 中文模板、conventional-changelog 中文配置。仅在用户显式 /chinese-commit-conventions 时调用，不要根据上下文自动触发。
- **chinese-documentation**: 中文文档排版参考——中英文空格、全半角标点、术语保留、链接格式、中文文案排版指北约定。仅在用户显式 /chinese-documentation 时调用，不要根据上下文自动触发。
- **chinese-git-workflow**: 国内 Git 平台配置参考——Gitee、Coding.net、极狐 GitLab、CNB 的 SSH/HTTPS/凭据/CI 接入差异与镜像同步配置。仅在用户显式 /chinese-git-workflow 时调用，不要根据上下文自动触发。
- **dispatching-parallel-agents**: 当面对 2 个以上可以独立进行、无共享状态或顺序依赖的任务时使用
- **executing-plans**: 当你有一份书面实现计划需要在单独的会话中执行，并设有审查检查点时使用
- **finishing-a-development-branch**: 当实现完成、所有测试通过、需要决定如何集成工作时使用——通过提供合并、PR 或清理等结构化选项来引导开发工作的收尾
- **mcp-builder**: MCP 服务器构建方法论 — 系统化构建生产级 MCP 工具，让 AI 助手连接外部能力
- **receiving-code-review**: 收到代码审查反馈后、实施建议之前使用，尤其当反馈不明确或技术上有疑问时——需要技术严谨性和验证，而非敷衍附和或盲目执行
- **requesting-code-review**: 完成任务、实现重要功能或合并前使用，用于验证工作成果是否符合要求
- **subagent-driven-development**: 当在当前会话中执行包含独立任务的实现计划时使用
- **systematic-debugging**: 遇到任何 bug、测试失败或异常行为时使用，在提出修复方案之前执行
- **test-driven-development**: 在实现任何功能或修复 bug 时使用，在编写实现代码之前
- **using-git-worktrees**: 当需要开始与当前工作区隔离的功能开发，或在执行实现计划之前使用——通过原生工具或 git worktree 回退机制确保隔离工作区存在
- **using-superpowers**: 在开始任何对话时使用——确立如何查找和使用技能，要求在任何响应（包括澄清性问题）之前调用 Skill 工具
- **verification-before-completion**: 在宣称工作完成、已修复或测试通过之前使用，在提交或创建 PR 之前——必须运行验证命令并确认输出后才能声称成功；始终用证据支撑断言
- **workflow-runner**: 在 Codex / OpenClaw / Cursor 中直接运行 agency-orchestrator YAML 工作流——无需 API key，使用当前会话的 LLM 作为执行引擎。当用户提供 .yaml 工作流文件或要求多角色协作完成任务时触发。
- **writing-plans**: 当你有规格说明或需求用于多步骤任务时使用，在动手写代码之前
- **writing-skills**: 当创建新技能、编辑现有技能或在部署前验证技能是否有效时使用

## 如何使用

当任务匹配某个 skill 时，使用 `Skill` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。
<!-- superpowers-zh:end -->

## 自动版本与发布规则

### 触发条件与授权

- 当用户明确要求“合并到 master”时，自动执行本章节的版本和发布流程；除非用户在同一请求中明确说不推送或不发版，否则不再额外请求推送确认。
- 此规则适用于包含问题修复或功能变更的发布。纯文档、宣传素材或格式整理不自动升级版本，除非用户明确要求发版。
- 若构建、测试、GitHub 认证、远程权限或 Release 创建失败，立即停止后续发布步骤，保留已完成步骤并向用户报告具体错误和当前仓库状态。
- 所有本地代码和配置变更必须先提交到 `develop`；不得直接在 `master` 上提交。

### 版本管理

- 根目录 `package.json` 的 `version` 是唯一版本源。禁止单独修改三端版本文件。
- 先根据自上一版本标签以来的实际变更评估语义化版本，并在发布报告中说明判断依据：
  - `PATCH`：问题修复、UI/交互/性能修复、安全依赖更新。
  - `MINOR`：向后兼容的新功能、用户可见的新工作流或新增接口。
  - `MAJOR`：不兼容变更、数据迁移、移除或改变既有公共行为。
- 同一次发布包含多类变更时，按最高级别升级。只有用户明确指定 beta、rc 等预发布通道时，才能使用预发布版本。
- 修改根版本后必须依次执行：

```powershell
pnpm version:sync
pnpm version:check
pnpm test:version
```

- `pnpm version:sync` 会同步 `client/package.json`、`server/package.json`、`extension/package.json` 和 `extension/legacy/manifest.json`；同步失败或检查发现版本漂移时不得继续合并或发布。

### 自动合并与发版流程

1. 检查工作区、当前分支及 `origin/master` 状态，确保不会覆盖用户未提交的改动或远程新提交。
2. 评估版本增量，更新根版本并执行版本同步；运行版本校验、版本测试及与变更范围匹配的测试和构建。
3. 将版本变更提交到 `develop`，再将 `develop` 合并到 `master`。
4. 在 `master` 创建注释标签 `vX.Y.Z`，推送 `master` 与该标签到 `origin`。
5. 构建并归档三端产物：客户端 `client/dist`、服务端 `server/dist` 及其运行清单、浏览器扩展 `extension/build/chrome-mv3-prod.zip`。上传时统一命名为：
   - `inspoclip-client-vX.Y.Z.zip`
   - `inspoclip-server-vX.Y.Z.zip`
   - `inspoclip-extension-vX.Y.Z.zip`
6. 使用 GitHub CLI 创建标题为 `InspoClip vX.Y.Z` 的 GitHub Release，发布说明必须为中文，并上传三端产物。
7. 最终向用户报告版本判定、合并提交、标签、推送结果、Release 链接和构建产物；不得凭推测宣称任何远程步骤成功。

### 发布模板（中文）

Release 正文按实际变更保留非空章节，禁止出现乱码、占位文字或空章节：

```md
# InspoClip vX.Y.Z

## 新增
- [面向用户的新能力]

## 优化
- [体验、性能或交互优化]

## 修复
- [已修复的问题]

## 升级说明
- [兼容性、配置或迁移说明]

## 发布产物
- 客户端：`inspoclip-client-vX.Y.Z.zip`
- 服务端：`inspoclip-server-vX.Y.Z.zip`
- 浏览器扩展：`inspoclip-extension-vX.Y.Z.zip`
```
