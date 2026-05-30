const DEFAULT_SERVER = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', async () => {
  const captureBtn = document.getElementById('captureBtn');
  const serverInput = document.getElementById('serverUrl');
  const saveBtn = document.getElementById('saveSettings');
  const statusEl = document.getElementById('status');
  const openAppLink = document.getElementById('openApp');

  const result = await chrome.storage.sync.get(['serverUrl']);
  const serverUrl = result.serverUrl || DEFAULT_SERVER;
  serverInput.value = serverUrl;

  openAppLink.href = serverUrl;
  openAppLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: serverUrl });
  });

  saveBtn.addEventListener('click', async () => {
    const url = serverInput.value.trim().replace(/\/$/, '');
    await chrome.storage.sync.set({ serverUrl: url });
    showStatus('Settings saved!', 'success');
    setTimeout(() => hideStatus(), 2000);
  });

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
