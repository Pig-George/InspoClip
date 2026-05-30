const DEFAULT_SERVER = 'http://localhost:3001';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'inspoclip-save',
    title: 'Save to InspoClip',
    contexts: ['image', 'page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
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
      const response = await fetch(info.srcUrl);
      imageBlob = await response.blob();
    } else {
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
      const response = await fetch(dataUrl);
      imageBlob = await response.blob();
    }

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
  const response = await fetch(dataUrl);
  const blob = await response.blob();

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
