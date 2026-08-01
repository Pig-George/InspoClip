# 自动版本与发布治理设计

## 目标

在用户明确要求“合并到 master”时，为本次可发布变更自动完成版本评估、版本同步、验证、合并、远程推送、Git 标签和 GitHub Release 创建。

## 触发与边界

- 仅当用户明确要求合并到 `master` 时触发。
- 规则覆盖问题修复和功能变更；纯文档或宣传素材变更不自动升级版本，除非用户明确要求发版。
- 该请求本身视为对发布相关远程操作的授权；若构建、认证、远程权限或 Release 创建失败，停止后续步骤并报告原因。
- 所有本地代码和配置变更仍先提交到 `develop`，不得直接在 `master` 上提交。

## 版本策略

根目录 `package.json` 是唯一版本源。版本遵循语义化版本：

| 变更类型 | 版本增量 | 判定示例 |
| --- | --- | --- |
| 问题修复、UI/交互/性能修复、安全依赖更新 | PATCH | `1.5.2` 到 `1.5.3` |
| 向后兼容的新功能或新工作流 | MINOR | `1.5.2` 到 `1.6.0` |
| 不兼容变更、数据迁移、移除或改变既有公共行为 | MAJOR | `1.5.2` 到 `2.0.0` |

一次发布包含多类变更时，按最高级别升级。判断依据必须在最终发布报告中说明。预发布版本仅在用户明确指定 beta、rc 等通道时使用。

## 版本同步与验证

升级根 `package.json` 后执行：

```powershell
pnpm version:sync
pnpm version:check
pnpm test:version
```

同步目标由 `scripts/sync-version.mjs` 维护，包括：

- `client/package.json`
- `server/package.json`
- `extension/package.json`
- `extension/legacy/manifest.json`

随后运行与本次变更相关的测试和构建。验证失败不得合并或发布。

## 发布顺序

1. 检查工作区、当前分支和远程 `master` 状态，避免覆盖用户未提交的更改。
2. 对自上一版本标签以来的变更评估版本增量，修改根版本并同步三端版本。
3. 运行版本校验、版本测试及与变更范围匹配的测试和构建。
4. 将版本变更提交到 `develop`。
5. 将 `develop` 合并到 `master`，创建注释标签 `vX.Y.Z`。
6. 推送 `master` 和该标签到 `origin`。
7. 构建客户端、服务端和浏览器扩展产物，并创建 GitHub Release，上传三端产物。

## GitHub Release 模板

Release 标题为 `InspoClip vX.Y.Z`。正文使用中文，按实际变更保留非空章节：

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

Release 正文不得出现乱码、占位内容或空章节。
