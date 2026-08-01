# 自动版本与发布治理实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在 `AGENTS.md` 中加入可执行的自动版本管理与 GitHub 发布规则。

**架构：** 规则以根目录 `package.json` 为唯一版本源，复用 `scripts/sync-version.mjs` 同步三端清单。用户明确要求合并到 `master` 时，代理先判定语义化版本增量、完成验证和 `develop` 提交，再合并、推送标签及创建中文 GitHub Release。

**技术栈：** Markdown、pnpm、Git、GitHub CLI、现有版本同步脚本。

---

### 任务 1：建立规则验收检查

**文件：**
- 修改：`AGENTS.md`
- 验证：PowerShell 内联规则检查

- [ ] **步骤 1：运行预期失败的规则检查**

```powershell
$content = Get-Content -Raw -Encoding UTF8 AGENTS.md
if (-not $content.Contains('## 自动版本与发布规则')) {
  throw '缺少自动版本与发布规则章节'
}
```

预期：失败，提示缺少规则章节。

- [ ] **步骤 2：确认失败原因符合预期**

检查命令只因规则章节缺失失败，而非文件编码或 PowerShell 执行错误。

### 任务 2：补充自动版本与发布规则

**文件：**
- 修改：`AGENTS.md`

- [ ] **步骤 1：写入最小规则实现**

在 Superpowers 说明块之后加入 `## 自动版本与发布规则`，包含：

```markdown
触发条件：用户明确要求“合并到 master”。
版本源：根目录 package.json；执行 pnpm version:sync 与 pnpm version:check。
版本判定：修复为 PATCH，新功能为 MINOR，不兼容变更为 MAJOR，混合变更按最高级别。
发布顺序：验证、提交 develop、合并 master、推送、创建 vX.Y.Z 标签、创建中文 GitHub Release。
```

- [ ] **步骤 2：运行规则验收检查**

```powershell
$content = Get-Content -Raw -Encoding UTF8 AGENTS.md
$required = @(
  '## 自动版本与发布规则',
  'pnpm version:sync',
  'pnpm version:check',
  'PATCH',
  'MINOR',
  'MAJOR',
  'GitHub Release',
  '## 发布模板（中文）'
)
$missing = $required | Where-Object { -not $content.Contains($_) }
if ($missing) { throw "缺少规则：$($missing -join ', ')" }
```

预期：命令退出码为 0。

- [ ] **步骤 3：检查版本同步链路仍可用**

```powershell
pnpm version:check
pnpm test:version
```

预期：所有项目清单版本与根版本一致，版本测试通过。

### 任务 3：审查并提交规则

**文件：**
- 新增：`docs/superpowers/plans/2026-08-01-automated-release-governance.md`
- 新增：`AGENTS.md`

- [ ] **步骤 1：检查变更范围和 Markdown 格式**

```powershell
git diff --check -- AGENTS.md docs/superpowers/plans/2026-08-01-automated-release-governance.md
git diff -- AGENTS.md
```

预期：没有空白错误；规则仅覆盖已确认的版本与发布流程。

- [ ] **步骤 2：提交到 develop**

```powershell
git add AGENTS.md docs/superpowers/plans/2026-08-01-automated-release-governance.md
git commit -m "docs: add automated version and release rules"
```

预期：只提交规则和实现计划，不包含其他工作区文件。
