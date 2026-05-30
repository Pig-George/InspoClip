const DEFAULT_SERVER = 'http://localhost:3001';

let serverUrl = DEFAULT_SERVER;
let analyzedData = null;
let capturedBlob = null;

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

  // Load saved settings
  const result = await chrome.storage.sync.get(['serverUrl', 'appUrl']);
  serverUrl = result.serverUrl || DEFAULT_SERVER;
  const appUrl = result.appUrl || serverUrl.replace(/:3001$/, ':8080');
  serverInput.value = serverUrl;
  appUrlInput.value = appUrl;

  // Open app link — switch to existing tab if already open, otherwise create new
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
    // Trigger analyze with stored image URL
    setTimeout(() => doAnalyze(imageUrl), 300);
  }

  // Test connection button
  testConnection.addEventListener('click', testServerConnection);

  // Click on connection status dot also tests
  connectionStatus.addEventListener('click', testServerConnection);

  // Save settings
  saveSettings.addEventListener('click', async () => {
    serverUrl = serverInput.value.trim().replace(/\/$/, '') || DEFAULT_SERVER;
    const newAppUrl = appUrlInput.value.trim().replace(/\/$/, '') || serverUrl.replace(/:3001$/, ':8080');
    await chrome.storage.sync.set({ serverUrl, appUrl: newAppUrl });
    openAppLink.href = newAppUrl;
    showStatus('Settings saved!', 'success');
    testServerConnection();
    setTimeout(() => hideStatus(), 2000);
  });

  // Analyze button — captures the visible tab
  analyzeBtn.addEventListener('click', () => doAnalyze());

  // Core analyze function: if imageUrl is provided, fetch that image directly;
  // otherwise capture the visible tab.
  async function doAnalyze(imageUrl) {
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="spinner"></span> <span>Analyzing...</span>';

    try {
      if (imageUrl) {
        // Fetch the specific image directly
        try {
          const response = await fetch(imageUrl);
          capturedBlob = await response.blob();
        } catch {
          // CORS fallback: capture visible tab
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
          capturedBlob = dataUrlToBlob(dataUrl);
        }
      } else {
        // Capture the visible tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
        capturedBlob = dataUrlToBlob(dataUrl);
      }

      // Show preview
      const previewImg = document.getElementById('previewImage');
      if (imageUrl && capturedBlob.type.startsWith('image/')) {
        previewImg.src = URL.createObjectURL(capturedBlob);
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
        previewImg.src = dataUrl;
      }

      // Send to server for analysis
      const ext = capturedBlob.type === 'image/png' ? '.png' : '.jpg';
      const formData = new FormData();
      formData.append('image', capturedBlob, 'analyze' + ext);

      const res = await fetch(`${serverUrl}/api/images/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Analysis failed');

      analyzedData = await res.json();
      renderAnalysis(analyzedData);

      document.getElementById('analysisPanel').style.display = 'block';
      showStatus('Analysis complete!', 'success');
      setTimeout(() => hideStatus(), 2000);
    } catch (err) {
      showStatus(`Error: ${err.message}`, 'error');
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<span class="btn-icon">🔍</span> <span>Analyze Page</span>';
    }
  }

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
    uploadAnalyzed.innerHTML = '<span class="spinner"></span> <span>Saving...</span>';

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

      const uploadRes = await fetch(`${serverUrl}/api/images`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');

      showStatus('Saved to InspoClip!', 'success');
      document.getElementById('analysisPanel').style.display = 'none';
      analyzedData = null;
      capturedBlob = null;
    } catch (err) {
      showStatus(`Error: ${err.message}`, 'error');
    } finally {
      uploadAnalyzed.disabled = false;
      uploadAnalyzed.innerHTML = '<span class="btn-icon">⬆️</span> <span>Save to InspoClip</span>';
    }
  });

  // Quick save button
  captureBtn.addEventListener('click', async () => {
    captureBtn.disabled = true;
    captureBtn.innerHTML = '<span class="spinner"></span> <span>Saving...</span>';

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

      const uploadRes = await fetch(`${serverUrl}/api/images`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');

      showStatus('Saved to InspoClip!', 'success');
    } catch (err) {
      showStatus(`Error: ${err.message}`, 'error');
    } finally {
      captureBtn.disabled = false;
      captureBtn.innerHTML = '<span class="btn-icon">📸</span> <span>Quick Save</span>';
    }
  });
});

// Test server connection
async function testServerConnection() {
  const statusEl = document.getElementById('connectionStatus');
  const labelEl = document.getElementById('connectionLabel');
  const testBtn = document.getElementById('testConnection');

  // Start testing state
  statusEl.className = 'connection-status testing';
  labelEl.textContent = '...';
  testBtn.disabled = true;

  try {
    const res = await fetch(`${serverUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      statusEl.className = 'connection-status connected';
      statusEl.title = 'Connected';
      labelEl.textContent = 'Connected';
      // Auto-hide label after 3s
      setTimeout(() => {
        labelEl.textContent = '';
        statusEl.className = 'connection-status connected';
      }, 3000);
    } else {
      statusEl.className = 'connection-status error';
      statusEl.title = 'Server error';
      labelEl.textContent = 'Error';
    }
  } catch {
    statusEl.className = 'connection-status error';
    statusEl.title = 'Cannot connect';
    labelEl.textContent = 'Offline';
  } finally {
    testBtn.disabled = false;
  }
}

// Render analysis results
function renderAnalysis(data) {
  // Terms
  const termsList = document.getElementById('termsList');
  termsList.innerHTML = '';
  (data.terms || []).forEach(term => {
    const tag = document.createElement('span');
    tag.className = 'term-tag';
    tag.textContent = term;
    termsList.appendChild(tag);
  });

  // Colors
  const colorsList = document.getElementById('colorsList');
  colorsList.innerHTML = '';
  (data.colors || []).forEach(hex => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.innerHTML = `<span class="color-dot" style="background:${hex}"></span><span>${hex.toUpperCase()}</span>`;
    swatch.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(hex.toUpperCase());
        swatch.style.borderColor = '#4caf50';
        setTimeout(() => swatch.style.borderColor = '', 1000);
      } catch {}
    });
    colorsList.appendChild(swatch);
  });

  // Prompt
  const promptText = document.getElementById('promptText');
  if (data.prompt && (data.prompt.en || data.prompt.zh)) {
    promptText.textContent = data.prompt.zh || data.prompt.en;
    promptText.style.display = 'block';
  } else {
    promptText.style.display = 'none';
  }
}

// Data URL to Blob
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const binaryStr = atob(parts[1]);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function hideStatus() {
  document.getElementById('status').className = 'status';
}

// Helpers
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
