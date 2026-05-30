const DEFAULT_SERVER = 'http://localhost:3001';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'inspoclip-save',
    title: 'Save to InspoClip',
    contexts: ['image', 'page']
  });
  chrome.contextMenus.create({
    id: 'inspoclip-analyze',
    title: 'Analyze with InspoClip',
    contexts: ['image', 'page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'inspoclip-analyze') {
    // Store action so popup can pick it up
    await chrome.storage.local.set({ pendingAction: 'analyze' });
    // Open the popup programmatically
    try { await chrome.action.openPopup(); } catch { /* popup may already be open */ }
    return;
  }

  if (info.menuItemId !== 'inspoclip-save') return;

  try {
    const server = await getServerUrl();
    const now = new Date();
    const dow = now.getDay();
    const dayOfWeek = dow === 0 ? 6 : dow - 1;
    const monday = getMonday(now);
    const dateStr = formatDate(monday);

    const weekRes = await fetch(`${server}/api/weeks/${dateStr}`);
    if (!weekRes.ok) throw new Error('Failed to get week');
    const weekData = await weekRes.json();
    const weekId = weekData.week.id;

    let imageBlob;

    if (info.mediaType === 'image' && info.srcUrl) {
      // Right-clicked on an image: try to fetch it directly
      try {
        const response = await fetch(info.srcUrl);
        imageBlob = await response.blob();
      } catch (e) {
        // If direct fetch fails (CORS), capture the visible tab instead
        console.log('Direct fetch failed, capturing tab instead:', e.message);
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
        imageBlob = dataUrlToBlob(dataUrl);
      }
    } else {
      // Right-clicked on page: capture visible tab
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
      imageBlob = dataUrlToBlob(dataUrl);
    }

    const ext = imageBlob.type === 'image/png' ? '.png' : '.jpg';
    const formData = new FormData();
    formData.append('image', imageBlob, 'screenshot' + ext);
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_AND_UPLOAD') {
    captureAndUpload(message.serverUrl, message.dayOfWeek)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
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

  const weekRes = await fetch(`${serverUrl}/api/weeks/${dateStr}`);
  if (!weekRes.ok) throw new Error('Failed to get week');
  const weekData = await weekRes.json();

  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
  const blob = dataUrlToBlob(dataUrl);

  const ext = blob.type === 'image/png' ? '.png' : '.jpg';
  const formData = new FormData();
  formData.append('image', blob, 'screenshot' + ext);
  formData.append('weekId', weekData.week.id);
  formData.append('dayOfWeek', String(actualDayOfWeek));

  const uploadRes = await fetch(`${serverUrl}/api/images`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) throw new Error('Upload failed');
  return uploadRes.json();
}

/**
 * Convert a data URL to a Blob (works in service worker context)
 */
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
