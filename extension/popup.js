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
  const connectionStatus = document.getElementById('connectionStatus');
  const openAppLink = document.getElementById('openApp');

  // Load saved settings
  const result = await chrome.storage.sync.get(['serverUrl']);
  serverUrl = result.serverUrl || DEFAULT_SERVER;
  serverInput.value = serverUrl;

  // Open app link
  openAppLink.href = serverUrl;
  openAppLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: serverUrl });
  });

  // Test connection on load
  testServerConnection();

  // Check for pending analyze action from context menu
  const { pendingAction } = await chrome.storage.local.get(['pendingAction']);
  if (pendingAction === 'analyze') {
    await chrome.storage.local.remove(['pendingAction']);
    // Trigger analyze after a short delay to let UI render
    setTimeout(() => analyzeBtn.click(), 300);
  }

  // Test connection button
  testConnection.addEventListener('click', testServerConnection);

  // Click on connection status dot also tests
  connectionStatus.addEventListener('click', testServerConnection);

  // Save settings
  saveSettings.addEventListener('click', async () => {
    serverUrl = serverInput.value.trim().replace(/\/$/, '') || DEFAULT_SERVER;
    await chrome.storage.sync.set({ serverUrl });
    showStatus('Settings saved!', 'success');
    testServerConnection();
    setTimeout(() => hideStatus(), 2000);
  });

  // Analyze button
  analyzeBtn.addEventListener('click', async () => {
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="spinner"></span> <span>Analyzing...</span>';

    try {
      // Capture the current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
      capturedBlob = dataUrlToBlob(dataUrl);

      // Show preview
      const previewImg = document.getElementById('previewImage');
      previewImg.src = dataUrl;

      // Send to server for analysis
      const formData = new FormData();
      formData.append('image', capturedBlob, 'screenshot.jpg');

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
