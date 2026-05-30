const DEFAULT_SERVER = 'http://localhost:3001';

// i18n translations
const I18N = {
  en: {
    subtitle: 'Design Inspiration Saver',
    analyzePage: 'Analyze Page',
    quickSave: 'Quick Save',
    analysisResult: 'Analysis Result',
    designTerms: 'Design Terms',
    colorPalette: 'Color Palette',
    saveToInspoClip: 'Save to InspoClip',
    settings: 'Settings',
    test: 'Test',
    saveSettings: 'Save Settings',
    openInspoClip: 'Open InspoClip →',
    analyzing: 'Analyzing...',
    saving: 'Saving...',
    saved: 'Saved to InspoClip!',
    copied: 'Copied!',
    analysisComplete: 'Analysis complete!',
    noTerms: 'No terms',
    noColors: 'No colors',
    noPrompt: 'No prompt',
  },
  zh: {
    subtitle: '设计灵感剪贴簿',
    analyzePage: '分析页面',
    quickSave: '快速保存',
    analysisResult: '分析结果',
    designTerms: '设计术语',
    colorPalette: '配色方案',
    saveToInspoClip: '保存到 InspoClip',
    settings: '设置',
    test: '测试',
    saveSettings: '保存设置',
    openInspoClip: '打开 InspoClip →',
    analyzing: '分析中...',
    saving: '保存中...',
    saved: '已保存到 InspoClip!',
    copied: '已复制!',
    analysisComplete: '分析完成!',
    noTerms: '暂无术语',
    noColors: '暂无配色',
    noPrompt: '暂无 Prompt',
  },
};

let serverUrl = DEFAULT_SERVER;
let analyzedData = null;
let capturedBlob = null;
let locale = 'en';
let promptLangMode = 'auto'; // auto | en | zh | both

document.addEventListener('DOMContentLoaded', async () => {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const captureBtn = document.getElementById('captureBtn');
  const uploadAnalyzed = document.getElementById('uploadAnalyzed');
  const closeAnalysis = document.getElementById('closeAnalysis');
  const testConnection = document.getElementById('testConnection');
  const saveSettings = document.getElementById('saveSettings');
  const serverInput = document.getElementById('serverUrl');
  const appUrlInput = document.getElementById('appUrl');
  const connectionStatus = document.getElementById('connectionStatus');
  const openAppLink = document.getElementById('openApp');
  const langToggle = document.getElementById('langToggle');

  // Detect browser language
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  locale = browserLang.startsWith('zh') ? 'zh' : 'en';

  // Load saved language preference
  const savedLang = await chrome.storage.sync.get(['lang']);
  if (savedLang.lang) locale = savedLang.lang;

  // Apply i18n
  applyI18n();

  // Language toggle
  langToggle.addEventListener('click', async () => {
    locale = locale === 'en' ? 'zh' : 'en';
    await chrome.storage.sync.set({ lang: locale });
    applyI18n();
    if (analyzedData) renderAnalysis(analyzedData);
  });

  // Load saved settings
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

  // Test connection on load
  testServerConnection();

  // Check for pending analyze action from context menu
  const { pendingAction, imageUrl } = await chrome.storage.local.get(['pendingAction', 'imageUrl']);
  if (pendingAction === 'analyze') {
    await chrome.storage.local.remove(['pendingAction', 'imageUrl']);
    setTimeout(() => doAnalyze(imageUrl), 300);
  }

  // Test connection button
  testConnection.addEventListener('click', testServerConnection);
  connectionStatus.addEventListener('click', testServerConnection);

  // Save settings
  saveSettings.addEventListener('click', async () => {
    serverUrl = serverInput.value.trim().replace(/\/$/, '') || DEFAULT_SERVER;
    const newAppUrl = appUrlInput.value.trim().replace(/\/$/, '') || serverUrl.replace(/:3001$/, ':8080');
    await chrome.storage.sync.set({ serverUrl, appUrl: newAppUrl });
    openAppLink.href = newAppUrl;
    showStatus(t('saved'), 'success');
    testServerConnection();
    setTimeout(() => hideStatus(), 2000);
  });

  // Analyze button
  analyzeBtn.addEventListener('click', () => doAnalyze());

  // Prompt language toggle
  document.getElementById('promptLangGroup').addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-btn');
    if (!btn) return;
    promptLangMode = btn.dataset.lang;
    document.querySelectorAll('#promptLangGroup .lang-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if (analyzedData) renderPrompt(analyzedData.prompt);
  });

  // Copy buttons
  document.querySelectorAll('.copy-section-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.copy;
      let text = '';
      if (type === 'terms') {
        text = (analyzedData?.terms || []).join('\n');
      } else if (type === 'colors') {
        text = (analyzedData?.colors || []).map((c) => c.toUpperCase()).join('\n');
      } else if (type === 'prompt') {
        text = getPromptText(analyzedData?.prompt);
      }
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        btn.classList.add('copied');
        btn.querySelector('span').textContent = '✓';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.querySelector('span').textContent = '📋';
        }, 1500);
      } catch {}
    });
  });

  // Close analysis panel
  closeAnalysis.addEventListener('click', () => {
    document.getElementById('analysisPanel').style.display = 'none';
    analyzedData = null;
    capturedBlob = null;
  });

  // Upload analyzed image
  uploadAnalyzed.addEventListener('click', async () => {
    if (!capturedBlob) return;
    uploadAnalyzed.disabled = true;
    uploadAnalyzed.innerHTML = `<span class="spinner"></span> <span>${t('saving')}</span>`;

    try {
      const now = new Date();
      const dow = now.getDay();
      const dayOfWeek = dow === 0 ? 6 : dow - 1;
      const monday = getMonday(now);
      const dateStr = formatDate(monday);

      const weekRes = await fetch(`${serverUrl}/api/weeks/${dateStr}`);
      if (!weekRes.ok) throw new Error('Failed to get week');
      const weekData = await weekRes.json();

      const ext = capturedBlob.type === 'image/png' ? '.png' : '.jpg';
      const formData = new FormData();
      formData.append('image', capturedBlob, 'screenshot' + ext);
      formData.append('weekId', weekData.week.id);
      formData.append('dayOfWeek', String(dayOfWeek));

      const uploadRes = await fetch(`${serverUrl}/api/images`, { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Upload failed');

      showStatus(t('saved'), 'success');
      document.getElementById('analysisPanel').style.display = 'none';
      analyzedData = null;
      capturedBlob = null;
    } catch (err) {
      showStatus(`Error: ${err.message}`, 'error');
    } finally {
      uploadAnalyzed.disabled = false;
      uploadAnalyzed.innerHTML = `<span class="btn-icon">⬆️</span> <span>${t('saveToInspoClip')}</span>`;
    }
  });

  // Quick save button
  captureBtn.addEventListener('click', async () => {
    captureBtn.disabled = true;
    captureBtn.innerHTML = `<span class="spinner"></span> <span>${t('saving')}</span>`;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
      const blob = dataUrlToBlob(dataUrl);

      const now = new Date();
      const dow = now.getDay();
      const dayOfWeek = dow === 0 ? 6 : dow - 1;
      const monday = getMonday(now);
      const dateStr = formatDate(monday);

      const weekRes = await fetch(`${serverUrl}/api/weeks/${dateStr}`);
      if (!weekRes.ok) throw new Error('Failed to get week');
      const weekData = await weekRes.json();

      const ext = blob.type === 'image/png' ? '.png' : '.jpg';
      const formData = new FormData();
      formData.append('image', blob, 'screenshot' + ext);
      formData.append('weekId', weekData.week.id);
      formData.append('dayOfWeek', String(dayOfWeek));

      const uploadRes = await fetch(`${serverUrl}/api/images`, { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Upload failed');

      showStatus(t('saved'), 'success');
    } catch (err) {
      showStatus(`Error: ${err.message}`, 'error');
    } finally {
      captureBtn.disabled = false;
      captureBtn.innerHTML = `<span class="btn-icon">📸</span> <span>${t('quickSave')}</span>`;
    }
  });

  // Core analyze function
  async function doAnalyze(imageUrl) {
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = `<span class="spinner"></span> <span>${t('analyzing')}</span>`;

    try {
      if (imageUrl) {
        try {
          const response = await fetch(imageUrl);
          capturedBlob = await response.blob();
        } catch {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
          capturedBlob = dataUrlToBlob(dataUrl);
        }
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
        capturedBlob = dataUrlToBlob(dataUrl);
      }

      // Show preview
      const previewImg = document.getElementById('previewImage');
      if (imageUrl) {
        previewImg.src = URL.createObjectURL(capturedBlob);
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        previewImg.src = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
      }

      // Send to server for analysis
      const ext = capturedBlob.type === 'image/png' ? '.png' : '.jpg';
      const formData = new FormData();
      formData.append('image', capturedBlob, 'analyze' + ext);

      const res = await fetch(`${serverUrl}/api/images/analyze`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Analysis failed');

      analyzedData = await res.json();
      renderAnalysis(analyzedData);

      document.getElementById('analysisPanel').style.display = 'block';
      showStatus(t('analysisComplete'), 'success');
      setTimeout(() => hideStatus(), 2000);
    } catch (err) {
      showStatus(`Error: ${err.message}`, 'error');
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = `<span class="btn-icon">🔍</span> <span>${t('analyzePage')}</span>`;
    }
  }
});

// i18n helper
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

// Test server connection
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
      statusEl.title = 'Server error';
      labelEl.textContent = locale === 'zh' ? '错误' : 'Error';
    }
  } catch {
    statusEl.className = 'connection-status error';
    statusEl.title = 'Cannot connect';
    labelEl.textContent = locale === 'zh' ? '离线' : 'Offline';
  } finally {
    testBtn.disabled = false;
  }
}

// Get prompt text based on language mode
function getPromptText(prompt) {
  if (!prompt || (!prompt.en && !prompt.zh)) return '';
  const effective = promptLangMode === 'auto' ? locale : promptLangMode;
  if (effective === 'en') return prompt.en || prompt.zh;
  if (effective === 'zh') return prompt.zh || prompt.en;
  // both
  return [prompt.en, prompt.zh].filter(Boolean).join('\n\n');
}

// Render prompt with language toggle
function renderPrompt(prompt) {
  const promptText = document.getElementById('promptText');
  if (!prompt || (!prompt.en && !prompt.zh)) {
    promptText.textContent = t('noPrompt');
    promptText.style.display = 'block';
    return;
  }
  const text = getPromptText(prompt);
  promptText.textContent = text;
  promptText.style.display = 'block';
}

// Render analysis results
function renderAnalysis(data) {
  // Terms
  const termsList = document.getElementById('termsList');
  termsList.innerHTML = '';
  if (data.terms?.length) {
    data.terms.forEach((term) => {
      const tag = document.createElement('span');
      tag.className = 'term-tag';
      tag.textContent = term;
      tag.title = 'Click to copy';
      tag.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(term);
          tag.classList.add('copied');
          tag.textContent = '✓ ' + term;
          setTimeout(() => { tag.classList.remove('copied'); tag.textContent = term; }, 1000);
        } catch {}
      });
      termsList.appendChild(tag);
    });
  } else {
    termsList.innerHTML = `<span class="empty-hint">${t('noTerms')}</span>`;
  }

  // Colors
  const colorsList = document.getElementById('colorsList');
  colorsList.innerHTML = '';
  if (data.colors?.length) {
    data.colors.forEach((hex) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.innerHTML = `<span class="color-dot" style="background:${hex}"></span><span>${hex.toUpperCase()}</span>`;
      swatch.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(hex.toUpperCase());
          swatch.style.borderColor = '#4caf50';
          swatch.querySelector('span:last-child').textContent = '✓';
          setTimeout(() => {
            swatch.style.borderColor = '';
            swatch.querySelector('span:last-child').textContent = hex.toUpperCase();
          }, 1000);
        } catch {}
      });
      colorsList.appendChild(swatch);
    });
  } else {
    colorsList.innerHTML = `<span class="empty-hint">${t('noColors')}</span>`;
  }

  // Prompt
  renderPrompt(data.prompt);
}

// Data URL to Blob
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const binaryStr = atob(parts[1]);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function hideStatus() {
  document.getElementById('status').className = 'status';
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
