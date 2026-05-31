const DEFAULT_SERVER = 'http://localhost:3001';

const I18N = {
  en: {
    subtitle: 'Design Inspiration Saver',
    analyzePage: 'Analyze',
    quickSave: 'Quick Save',
    fullPage: 'Full Page',
    areaSelect: 'Area Select',
    settings: 'Settings',
    test: 'Test',
    saveSettings: 'Save Settings',
    openInspoClip: 'Open InspoClip →',
    saving: 'Saving...',
    saved: 'Saved to InspoClip!',
  },
  zh: {
    subtitle: '设计灵感剪贴簿',
    analyzePage: '分析',
    quickSave: '快速保存',
    fullPage: '整页',
    areaSelect: '区域',
    settings: '设置',
    test: '测试',
    saveSettings: '保存设置',
    openInspoClip: '打开 InspoClip →',
    saving: '保存中...',
    saved: '已保存到 InspoClip!',
  },
};

let serverUrl = DEFAULT_SERVER;
let locale = 'en';

document.addEventListener('DOMContentLoaded', async () => {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const captureBtn = document.getElementById('captureBtn');
  const modeToggle = document.getElementById('modeToggle');
  const testConnection = document.getElementById('testConnection');
  let captureMode = 'area'; // 'area' or 'page'
  const saveSettings = document.getElementById('saveSettings');
  const serverInput = document.getElementById('serverUrl');
  const appUrlInput = document.getElementById('appUrl');
  const connectionStatus = document.getElementById('connectionStatus');
  const openAppLink = document.getElementById('openApp');
  const langToggle = document.getElementById('langToggle');

  // Detect browser language
  const browserLang = navigator.language || 'en';
  locale = browserLang.startsWith('zh') ? 'zh' : 'en';
  const savedLang = await chrome.storage.sync.get(['lang']);
  if (savedLang.lang) locale = savedLang.lang;
  applyI18n();

  // Language toggle
  langToggle.addEventListener('click', async () => {
    locale = locale === 'en' ? 'zh' : 'en';
    await chrome.storage.sync.set({ lang: locale });
    applyI18n();
  });

  // Load settings
  const result = await chrome.storage.sync.get(['serverUrl', 'appUrl']);
  serverUrl = result.serverUrl || DEFAULT_SERVER;
  const appUrl = result.appUrl || serverUrl.replace(/:3001$/, ':8080');
  serverInput.value = serverUrl;
  appUrlInput.value = appUrl;

  // Open app link
  openAppLink.href = appUrl;
  openAppLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const appOrigin = new URL(appUrl).origin;
    const tabs = await chrome.tabs.query({});
    const existing = tabs.find((t) => t.url && t.url.startsWith(appOrigin));
    if (existing) {
      await chrome.tabs.update(existing.id, { active: true });
      await chrome.windows.update(existing.windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: appUrl });
    }
  });

  // Capture mode toggle
  modeToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    captureMode = btn.dataset.mode;
    modeToggle.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // Settings toggle
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsArrow = document.getElementById('settingsArrow');
  const settingsWrapper = document.getElementById('settingsWrapper');
  let settingsOpen = false;
  settingsToggle.addEventListener('click', () => {
    settingsOpen = !settingsOpen;
    settingsArrow.classList.toggle('open', settingsOpen);
    settingsWrapper.classList.toggle('open', settingsOpen);
  });

  // Test connection
  testServerConnection();
  testConnection.addEventListener('click', testServerConnection);
  connectionStatus.addEventListener('click', testServerConnection);

  // Save settings
  saveSettings.addEventListener('click', async () => {
    serverUrl = serverInput.value.trim().replace(/\/$/, '') || DEFAULT_SERVER;
    const newAppUrl = appUrlInput.value.trim().replace(/\/$/, '') || serverUrl.replace(/:3001$/, ':8080');
    await chrome.storage.sync.set({ serverUrl, appUrl: newAppUrl });
    openAppLink.href = newAppUrl;
    testServerConnection();
  });

  // Analyze button — send message to content script, then close popup
  analyzeBtn.addEventListener('click', async () => {
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = `<span class="spinner"></span> <span>${locale === 'zh' ? '启动中...' : 'Starting...'}</span>`;

    const msgType = captureMode === 'area' ? 'START_AREA_CAPTURE' : 'ANALYZE_PAGE';
    const msg = captureMode === 'area' ? { type: msgType, mode: 'analyze' } : { type: msgType };

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, msg);
      // Close popup after triggering analysis
      setTimeout(() => window.close(), 200);
    } catch (err) {
      // Content script might not be injected, try injecting
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
        // Wait a bit for script to initialize
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id, msg);
            window.close();
          } catch {
            showStatus('Failed to start analysis', 'error');
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = `<span class="btn-icon">🔍</span> <span>${t('analyzePage')}</span>`;
          }
        }, 500);
      } catch {
        showStatus('Cannot inject script on this page', 'error');
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = `<span class="btn-icon">🔍</span> <span>${t('analyzePage')}</span>`;
      }
    }
  });

  // Quick save button — delegate to content script for similarity check
  captureBtn.addEventListener('click', async () => {
    captureBtn.disabled = true;
    captureBtn.innerHTML = `<span class="spinner"></span> <span>${t('saving')}</span>`;

    const msgType = captureMode === 'area' ? 'START_AREA_CAPTURE' : 'SAVE_IMAGE';
    const msg = captureMode === 'area' ? { type: msgType, mode: 'save' } : { type: msgType, imageUrl: null, isImage: false };

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, msg);
      setTimeout(() => window.close(), 200);
    } catch (err) {
      // Content script might not be injected
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id, msg);
            window.close();
          } catch {
            showStatus('Failed to start save', 'error');
            captureBtn.disabled = false;
            captureBtn.innerHTML = `<span class="btn-icon">📸</span> <span>${t('quickSave')}</span>`;
          }
        }, 500);
      } catch {
        showStatus('Cannot inject script on this page', 'error');
        captureBtn.disabled = false;
        captureBtn.innerHTML = `<span class="btn-icon">📸</span> <span>${t('quickSave')}</span>`;
      }
    }
  });

});

function t(key) {
  return I18N[locale]?.[key] || I18N.en[key] || key;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (I18N[locale]?.[key]) el.textContent = I18N[locale][key];
  });
  document.getElementById('langLabel').textContent = locale === 'en' ? '中' : 'EN';
}

async function testServerConnection() {
  const statusEl = document.getElementById('connectionStatus');
  const labelEl = document.getElementById('connectionLabel');
  const testBtn = document.getElementById('testConnection');

  statusEl.className = 'connection-status testing';
  labelEl.textContent = '...';
  testBtn.disabled = true;

  try {
    const res = await fetch(`${serverUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      statusEl.className = 'connection-status connected';
      statusEl.title = 'Connected';
      labelEl.textContent = locale === 'zh' ? '已连接' : 'Connected';
      setTimeout(() => { labelEl.textContent = ''; statusEl.className = 'connection-status connected'; }, 3000);
    } else {
      statusEl.className = 'connection-status error';
      labelEl.textContent = locale === 'zh' ? '错误' : 'Error';
    }
  } catch {
    statusEl.className = 'connection-status error';
    labelEl.textContent = locale === 'zh' ? '离线' : 'Offline';
  } finally {
    testBtn.disabled = false;
  }
}

// Track mouse position for button glow effect
document.addEventListener('mousemove', (e) => {
  const btn = e.target.closest('.btn');
  if (btn) {
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty('--x', ((e.clientX - rect.left) / rect.width * 100) + '%');
    btn.style.setProperty('--y', ((e.clientY - rect.top) / rect.height * 100) + '%');
  }
});

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type} visible`;
  setTimeout(() => { statusEl.className = 'status'; }, 3000);
}
