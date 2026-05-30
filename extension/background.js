const DEFAULT_SERVER = 'http://localhost:3001';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'inspoclip-save-image',
    title: 'Save Image to InspoClip',
    contexts: ['image']
  });
  chrome.contextMenus.create({
    id: 'inspoclip-save-page',
    title: 'Save Page to InspoClip',
    contexts: ['page']
  });
  chrome.contextMenus.create({
    id: 'inspoclip-analyze-image',
    title: 'Analyze Image with InspoClip',
    contexts: ['image']
  });
  chrome.contextMenus.create({
    id: 'inspoclip-analyze-page',
    title: 'Analyze Page with InspoClip',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // Analyze — send message to content script
  if (info.menuItemId === 'inspoclip-analyze-image' || info.menuItemId === 'inspoclip-analyze-page') {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: info.mediaType === 'image' ? 'ANALYZE_IMAGE' : 'ANALYZE_PAGE',
        imageUrl: info.srcUrl || null,
      });
    } catch (err) {
      console.error('Failed to send analyze message:', err);
    }
    return;
  }

  // Save actions — delegate to content script for similarity check + UI
  if (info.menuItemId !== 'inspoclip-save-image' && info.menuItemId !== 'inspoclip-save-page') return;

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'SAVE_IMAGE',
      imageUrl: info.srcUrl || null,
      isImage: info.mediaType === 'image',
    });
  } catch (err) {
    console.error('Failed to send save message:', err);
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Content script requests a tab capture
  if (message.type === 'CAPTURE_TAB') {
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.tabs.get(tabId, async (tab) => {
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 });
          sendResponse({ dataUrl });
        } catch (err) {
          sendResponse({ error: err.message });
        }
      });
      return true; // async response
    }
  }

  // Popup requests capture and upload
  if (message.type === 'CAPTURE_AND_UPLOAD') {
    captureAndUpload(message.serverUrl, message.dayOfWeek)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Fetch image as data URL (for content script to avoid CORS)
  if (message.type === 'FETCH_IMAGE') {
    fetch(message.url)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.blob();
      })
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ dataUrl: reader.result });
        reader.readAsDataURL(blob);
      })
      .catch(() => sendResponse({ dataUrl: null }));
    return true; // async
  }

  // Popup triggers analyze on current tab
  if (message.type === 'TRIGGER_ANALYZE') {
    const imageUrl = message.imageUrl || null;
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        try {
          await chrome.tabs.sendMessage(tabs[0].id, {
            type: imageUrl ? 'ANALYZE_IMAGE' : 'ANALYZE_PAGE',
            imageUrl,
          });
          sendResponse({ ok: true });
        } catch (err) {
          sendResponse({ error: err.message });
        }
      }
    });
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

  const uploadRes = await fetch(`${serverUrl}/api/images`, { method: 'POST', body: formData });
  if (!uploadRes.ok) throw new Error('Upload failed');
  return uploadRes.json();
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const binaryStr = atob(parts[1]);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
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
