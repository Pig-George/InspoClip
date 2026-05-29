# Browser Bookmark Extension Implementation Plan

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 创建 Chrome/Firefox 浏览器扩展，在任意网页右键「保存到 InspoClip」，自动截图并发送到今天的日期

**架构：** 独立的浏览器扩展项目，使用 Manifest V3，通过 contextMenus API 添加右键菜单，使用 tabs.captureVisibleTab 截图，通过 fetch 发送到 InspoClip API

**技术栈：** Chrome Extension Manifest V3, JavaScript/TypeScript, Service Worker

---

## 文件结构

创建独立目录：`extension/`

```
extension/
  manifest.json           — 扩展配置
  background.js           — Service Worker (右键菜单 + 截图)
  popup.html              — 弹出窗口
  popup.js                — 弹出窗口逻辑
  popup.css               — 弹出窗口样式
  icons/
    icon16.png
    icon48.png
    icon128.png
  README.md               — 扩展安装说明
```

---

### 任务 1：创建 manifest.json

**文件：**
- 创建：`extension/manifest.json`

- [ ] **步骤 1：编写 manifest**

```json
{
  "manifest_version": 3,
  "name": "InspoClip Saver",
  "version": "1.0.0",
  "description": "Save design inspiration from any webpage to InspoClip",
  "permissions": [
    "contextMenus",
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "http://localhost:3001/*",
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add extension/manifest.json
git commit -m "feat(extension): create Chrome extension manifest"
```

---

### 任务 2：Service Worker — 右键菜单和截图

**文件：**
- 创建：`extension/background.js`

- [ ] **步骤 1：实现 background service worker**

```javascript
// extension/background.js

const DEFAULT_SERVER = 'http://localhost:3001';

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'inspoclip-save',
    title: 'Save to InspoClip',
    contexts: ['image', 'page']
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'inspoclip-save') return;

  try {
    const server = await getServerUrl();

    // Get today's date info
    const now = new Date();
    const dow = now.getDay();
    const dayOfWeek = dow === 0 ? 6 : dow - 1; // Mon=0, Sun=6
    const monday = getMonday(now);
    const dateStr = formatDate(monday);

    // Get or create week
    const weekRes = await fetch(`${server}/api/weeks/${dateStr}`);
    if (!weekRes.ok) throw new Error('Failed to get week');
    const weekData = await weekRes.json();
    const weekId = weekData.week.id;

    let imageBlob;

    if (info.mediaType === 'image' && info.srcUrl) {
      // Right-clicked on an image: download it directly
      const response = await fetch(info.srcUrl);
      imageBlob = await response.blob();
    } else {
      // Right-clicked on page: capture visible tab
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
      const response = await fetch(dataUrl);
      imageBlob = await response.blob();
    }

    // Upload to InspoClip
    const formData = new FormData();
    formData.append('image', imageBlob, 'screenshot.jpg');
    formData.append('weekId', weekId);
    formData.append('dayOfWeek', String(dayOfWeek));

    const uploadRes = await fetch(`${server}/api/images`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Upload failed: ${err}`);
    }

    // Show success notification
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'InspoClip',
      message: 'Inspiration saved successfully!',
    });

  } catch (err) {
    console.error('InspoClip save failed:', err);
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'InspoClip',
      message: `Failed to save: ${err.message}`,
    });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_AND_UPLOAD') {
    captureAndUpload(message.serverUrl, message.dayOfWeek)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }
});

async function captureAndUpload(serverUrl, dayOfWeek) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab');

  const now = new Date();
  const dow = now.getDay();
  const actualDayOfWeek = dayOfWeek ?? (dow === 0 ? 6 : dow - 1);
  const monday = getMonday(now);
  const dateStr = formatDate(monday);

  // Get week
  const weekRes = await fetch(`${serverUrl}/api/weeks/${dateStr}`);
  if (!weekRes.ok) throw new Error('Failed to get week');
  const weekData = await weekRes.json();

  // Capture
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  // Upload
  const formData = new FormData();
  formData.append('image', blob, 'screenshot.jpg');
  formData.append('weekId', weekData.week.id);
  formData.append('dayOfWeek', String(actualDayOfWeek));

  const uploadRes = await fetch(`${serverUrl}/api/images`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) throw new Error('Upload failed');
  return uploadRes.json();
}

async function getServerUrl() {
  const result = await chrome.storage.sync.get(['serverUrl']);
  return result.serverUrl || DEFAULT_SERVER;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}
```

- [ ] **步骤 2：Commit**

```bash
git add extension/background.js
git commit -m "feat(extension): implement context menu and screenshot capture"
```

---

### 任务 3：弹出窗口

**文件：**
- 创建：`extension/popup.html`
- 创建：`extension/popup.js`
- 创建：`extension/popup.css`

- [ ] **步骤 1：创建 popup.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>InspoClip</h1>
      <p class="subtitle">Save design inspiration</p>
    </div>

    <div class="status" id="status"></div>

    <div class="actions">
      <button id="captureBtn" class="btn btn-primary">
        Capture This Page
      </button>
    </div>

    <div class="settings">
      <label for="serverUrl">Server URL</label>
      <input type="text" id="serverUrl" placeholder="http://localhost:3001" />
      <button id="saveSettings" class="btn btn-small">Save</button>
    </div>

    <div class="footer">
      <a href="#" id="openApp">Open InspoClip</a>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **步骤 2：创建 popup.css**

```css
/* extension/popup.css */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  width: 280px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #faf3e6;
  color: #4a3028;
}

.container {
  padding: 16px;
}

.header {
  text-align: center;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 18px;
  color: #c0784a;
}

.subtitle {
  font-size: 12px;
  color: #8a7060;
  margin-top: 2px;
}

.status {
  padding: 8px;
  border-radius: 8px;
  font-size: 12px;
  text-align: center;
  margin-bottom: 12px;
  display: none;
}

.status.success { display: block; background: #d4edda; color: #155724; }
.status.error { display: block; background: #f8d7da; color: #721c24; }
.status.loading { display: block; background: #fff3cd; color: #856404; }

.actions {
  margin-bottom: 16px;
}

.btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:hover { opacity: 0.9; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  background: #c0784a;
  color: white;
}

.btn-small {
  width: auto;
  padding: 6px 12px;
  font-size: 12px;
  background: #e8d5b0;
  color: #4a3028;
  margin-top: 8px;
}

.settings {
  border-top: 1px solid #e8d5b0;
  padding-top: 12px;
}

.settings label {
  font-size: 11px;
  color: #8a7060;
  display: block;
  margin-bottom: 4px;
}

.settings input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e8d5b0;
  border-radius: 6px;
  font-size: 12px;
  background: white;
  color: #4a3028;
}

.footer {
  text-align: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e8d5b0;
}

.footer a {
  font-size: 11px;
  color: #c0784a;
  text-decoration: none;
}

.footer a:hover { text-decoration: underline; }
```

- [ ] **步骤 3：创建 popup.js**

```javascript
// extension/popup.js
const DEFAULT_SERVER = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', async () => {
  const captureBtn = document.getElementById('captureBtn');
  const serverInput = document.getElementById('serverUrl');
  const saveBtn = document.getElementById('saveSettings');
  const statusEl = document.getElementById('status');
  const openAppLink = document.getElementById('openApp');

  // Load saved server URL
  const result = await chrome.storage.sync.get(['serverUrl']);
  const serverUrl = result.serverUrl || DEFAULT_SERVER;
  serverInput.value = serverUrl;

  // Open app link
  openAppLink.href = serverUrl;
  openAppLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: serverUrl });
  });

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const url = serverInput.value.trim().replace(/\/$/, '');
    await chrome.storage.sync.set({ serverUrl: url });
    showStatus('Settings saved!', 'success');
    setTimeout(() => hideStatus(), 2000);
  });

  // Capture button
  captureBtn.addEventListener('click', async () => {
    captureBtn.disabled = true;
    showStatus('Capturing...', 'loading');

    try {
      const currentServer = serverInput.value.trim().replace(/\/$/, '') || DEFAULT_SERVER;

      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_AND_UPLOAD',
        serverUrl: currentServer,
      });

      if (response.success) {
        showStatus('Saved to InspoClip!', 'success');
      } else {
        showStatus(`Error: ${response.error}`, 'error');
      }
    } catch (err) {
      showStatus(`Error: ${err.message}`, 'error');
    } finally {
      captureBtn.disabled = false;
      setTimeout(() => hideStatus(), 3000);
    }
  });

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
  }

  function hideStatus() {
    statusEl.className = 'status';
  }
});
```

- [ ] **步骤 4：Commit**

```bash
git add extension/popup.html extension/popup.js extension/popup.css
git commit -m "feat(extension): add popup UI for manual capture"
```

---

### 任务 4：图标资源

**文件：**
- 创建：`extension/icons/` 目录

- [ ] **步骤 1：创建图标**

使用项目中已有的 InspoClip 图标，或创建简单的占位图标（16x16, 48x48, 128x128 PNG）。

可以使用 sharp 从项目中已有的图标生成：
```bash
# If source icon exists
npx sharp-cli -i src-icon.png -o extension/icons/icon16.png resize 16 16
npx sharp-cli -i src-icon.png -o extension/icons/icon48.png resize 48 48
npx sharp-cli -i src-icon.png -o extension/icons/icon128.png resize 128 128
```

或者手动创建简单图标。

- [ ] **步骤 2：Commit**

```bash
git add extension/icons/
git commit -m "feat(extension): add extension icons"
```

---

### 任务 5：安装说明

**文件：**
- 创建：`extension/README.md`

- [ ] **步骤 1：编写安装说明**

```markdown
# InspoClip Browser Extension

Save design inspiration from any webpage directly to your InspoClip collection.

## Installation

### Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select this `extension/` folder

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `extension/manifest.json`

## Usage

- **Right-click** on any image or page → "Save to InspoClip"
- **Click** the extension icon → "Capture This Page"
- Configure your InspoClip server URL in the popup settings

## Requirements

- InspoClip server running (default: http://localhost:3001)
```

- [ ] **步骤 2：Commit**

```bash
git add extension/README.md
git commit -m "docs(extension): add installation and usage instructions"
```
