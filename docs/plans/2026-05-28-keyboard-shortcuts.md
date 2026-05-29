# Keyboard Shortcuts Implementation Plan

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 添加全局键盘快捷键体系，提升高频用户的操作效率

**架构：** 创建一个 `useKeyboardShortcuts` 自定义 hook，在 App 层注册全局快捷键，通过事件回调通知各组件执行对应操作。快捷键仅在无弹窗/输入框聚焦时生效。

**技术栈：** React hooks, TypeScript, document.addEventListener('keydown')

---

## 文件结构

- 创建：`client/src/hooks/useKeyboardShortcuts.ts` — 全局快捷键 hook
- 修改：`client/src/App.tsx:12-138` — 注入快捷键 hook，暴露导航/搜索回调
- 修改：`client/src/components/WeekHeader.tsx:18-137` — 暴露搜索打开方法
- 修改：`client/src/i18n/translations.ts` — 添加快捷键提示文案

---

## 快捷键方案

| 快捷键 | 功能 | 条件 |
|--------|------|------|
| `←` / `→` | 切换上/下周 | 周视图模式 |
| `/` | 打开搜索 | 无弹窗时 |
| `Escape` | 关闭当前弹窗 | 已有，统一管理 |
| `d` | 切换到日视图 | 无输入框聚焦 |
| `w` | 切换到周视图 | 无输入框聚焦 |
| `t` | 跳转到今天 | 无输入框聚焦 |
| `?` | 显示快捷键帮助 | 无输入框聚焦 |

---

### 任务 1：创建 useKeyboardShortcuts hook

**文件：**
- 创建：`client/src/hooks/useKeyboardShortcuts.ts`

- [ ] **步骤 1：编写 hook 代码**

```typescript
// client/src/hooks/useKeyboardShortcuts.ts
import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onOpenSearch?: () => void;
  onCloseDialog?: () => void;
  onSwitchDayView?: () => void;
  onSwitchWeekView?: () => void;
  onGoToToday?: () => void;
  onShowHelp?: () => void;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

function isDialogOpen(): boolean {
  // Check for portaled overlays (modals, dialogs)
  return !!document.querySelector('[data-dialog-overlay]');
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Always allow Escape
      if (e.key === 'Escape') {
        handlers.onCloseDialog?.();
        return;
      }

      // Skip if user is typing in an input
      if (isInputFocused()) return;

      // Skip if a dialog is open (except Escape, handled above)
      if (isDialogOpen()) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlers.onPrevWeek?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlers.onNextWeek?.();
          break;
        case '/':
          e.preventDefault();
          handlers.onOpenSearch?.();
          break;
        case 'd':
          handlers.onSwitchDayView?.();
          break;
        case 'w':
          handlers.onSwitchWeekView?.();
          break;
        case 't':
          handlers.onGoToToday?.();
          break;
        case '?':
          handlers.onShowHelp?.();
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
```

- [ ] **步骤 2：Commit**

```bash
git add client/src/hooks/useKeyboardShortcuts.ts
git commit -m "feat(client): add useKeyboardShortcuts hook"
```

---

### 任务 2：在 App 中集成快捷键

**文件：**
- 修改：`client/src/App.tsx`

- [ ] **步骤 1：添加快捷键状态和回调**

在 `AppInner` 组件中，添加搜索对话框状态和快捷键回调。在现有 `viewMode` state 后面添加：

```typescript
const [searchOpen, setSearchOpen] = useState(false);
const [showShortcutHelp, setShowShortcutHelp] = useState(false);
```

导入 hook：
```typescript
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
```

在 `refresh` 函数之后、`return` 之前，添加快捷键 hook 调用：

```typescript
useKeyboardShortcuts({
  onPrevWeek: viewMode === 'week' ? goToPrevWeek : undefined,
  onNextWeek: viewMode === 'week' ? goToNextWeek : undefined,
  onOpenSearch: () => setSearchOpen(true),
  onCloseDialog: () => {
    setSearchOpen(false);
    setShowShortcutHelp(false);
  },
  onSwitchDayView: () => setViewMode('day'),
  onSwitchWeekView: () => setViewMode('week'),
  onGoToToday: () => setCurrentMonday(getMonday(new Date())),
  onShowHelp: () => setShowShortcutHelp((v) => !v),
});
```

- [ ] **步骤 2：添加快捷键帮助面板**

在 `<ToastContainer />` 之后添加帮助面板：

```tsx
{showShortcutHelp && (
  <div
    data-dialog-overlay
    className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40"
    onClick={() => setShowShortcutHelp(false)}
  >
    <div
      className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] shadow-2xl p-6 max-w-sm w-full mx-4"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-lg font-heading font-semibold text-[var(--text)] mb-4">
        {locale === 'zh' ? '快捷键' : 'Keyboard Shortcuts'}
      </h2>
      <div className="space-y-2 text-sm">
        {[
          { keys: ['←', '→'], desc: locale === 'zh' ? '切换周' : 'Switch week' },
          { keys: ['/'], desc: locale === 'zh' ? '搜索' : 'Search' },
          { keys: ['D'], desc: locale === 'zh' ? '日视图' : 'Day view' },
          { keys: ['W'], desc: locale === 'zh' ? '周视图' : 'Week view' },
          { keys: ['T'], desc: locale === 'zh' ? '跳转今天' : 'Go to today' },
          { keys: ['?'], desc: locale === 'zh' ? '显示帮助' : 'Show help' },
          { keys: ['Esc'], desc: locale === 'zh' ? '关闭' : 'Close' },
        ].map((item) => (
          <div key={item.keys.join('')} className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">{item.desc}</span>
            <div className="flex gap-1">
              {item.keys.map((k) => (
                <kbd
                  key={k}
                  className="px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--text)] text-xs font-mono border border-[var(--card-border)]"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

- [ ] **步骤 3：传递搜索状态给 WeekHeader**

修改 `WeekHeader` 的使用，传入搜索状态控制：

```tsx
<WeekHeader
  monday={currentMonday}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  onPrevWeek={viewMode === 'week' ? goToPrevWeek : undefined}
  onNextWeek={viewMode === 'week' ? goToNextWeek : undefined}
  searchOpen={searchOpen}
  onSearchOpenChange={setSearchOpen}
/>
```

- [ ] **步骤 4：Commit**

```bash
git add client/src/App.tsx
git commit -m "feat(client): integrate keyboard shortcuts into App"
```

---

### 任务 3：更新 WeekHeader 支持外部搜索控制

**文件：**
- 修改：`client/src/components/WeekHeader.tsx:10-16, 19-20, 105-111`

- [ ] **步骤 1：更新 WeekHeader props 接口**

```typescript
interface WeekHeaderProps {
  monday: Date;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  searchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
}
```

更新组件签名和搜索状态管理：

```typescript
export function WeekHeader({ monday, viewMode, onViewModeChange, onPrevWeek, onNextWeek, searchOpen: searchOpenProp, onSearchOpenChange }: WeekHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpenLocal, setSearchOpenLocal] = useState(false);
  const searchOpen = searchOpenProp ?? searchOpenLocal;
  const setSearchOpen = onSearchOpenChange ?? setSearchOpenLocal;
  // ... rest unchanged
```

- [ ] **步骤 2：Commit**

```bash
git add client/src/components/WeekHeader.tsx
git commit -m "feat(client): support external search control in WeekHeader"
```

---

### 任务 4：为弹窗添加 data-dialog-overlay 属性

**文件：**
- 修改：`client/src/components/ImageCard.tsx:197, 296` — detail modal 和 confirm dialog
- 修改：`client/src/components/SearchDialog.tsx` — 搜索弹窗
- 修改：`client/src/components/SettingsDialog.tsx` — 设置弹窗

- [ ] **步骤 1：给所有弹窗 overlay 添加 data-dialog-overlay**

在 ImageCard.tsx 的 detail modal overlay div 上添加 `data-dialog-overlay`：
```tsx
<motion.div
  ref={detailOverlayRef}
  data-dialog-overlay
  initial={{ opacity: 0 }}
  ...
```

在 confirm dialog overlay div 上添加：
```tsx
<motion.div
  ref={confirmOverlayRef}
  data-dialog-overlay
  initial={{ opacity: 0 }}
  ...
```

在 SearchDialog.tsx 的 overlay div 上添加 `data-dialog-overlay`。

在 SettingsDialog.tsx 的 overlay div 上添加 `data-dialog-overlay`。

- [ ] **步骤 2：Commit**

```bash
git add client/src/components/ImageCard.tsx client/src/components/SearchDialog.tsx client/src/components/SettingsDialog.tsx
git commit -m "feat(client): add data-dialog-overlay to all modal overlays"
```
