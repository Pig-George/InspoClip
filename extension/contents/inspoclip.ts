// @ts-nocheck
import type { PlasmoCSConfig } from "plasmo"

import { claimContentRuntime, removeExistingContentRoot } from "../src/content/bootstrap"
import { getCopyButtonIcon, getCopyButtonTitle } from "../src/content/copy"
import { formatDate, getMonday } from "../src/content/date"
import { dataUrlToBlob } from "../src/content/image"
import { getPromptText as resolvePromptText } from "../src/content/prompt"
import { matchShortcut } from "../src/content/shortcut"
import { getContentStyles } from "../src/content/styles"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
};

// InspoClip Content Script — injected into web pages
// Shows analysis notification and result modal on the page itself

;(() => {
  const INSPOCLIP_ID = 'inspoclip-root';
  if (!claimContentRuntime(globalThis)) return; // already initialized in this extension context
  removeExistingContentRoot(document, INSPOCLIP_ID); // remove stale root left after extension reload

  // Create isolated container
  const root = document.createElement('div');
  root.id = INSPOCLIP_ID;
  root.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483647;pointer-events:none;';
  root.attachShadow({ mode: 'open' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = getContentStyles();
  root.shadowRoot.appendChild(style);

  // Container for dynamic elements
  const container = document.createElement('div');
  container.className = 'inspoclip-container';
  root.shadowRoot.appendChild(container);

  document.body.appendChild(root);

  // State
  let currentToast = null;
  let toastTimer = null;
  let currentModal = null;
  let currentTab = null;
  let currentCtxMenu = null;
  let analyzedData = null;
  let capturedBlob = null;
  let lastPreviewUrl = null;

  // Analysis history
  let analysisHistory = []; // [{data, previewUrl, timestamp}]
  let historyIndex = -1;
  let savedImageHashes = new Set(); // Track which analyses have been saved
  let serverUrl = 'http://localhost:3001';
  let locale = (navigator.language || 'en').startsWith('zh') ? 'zh' : 'en';
  let promptLangMode = 'auto';

  // Load server URL
  chrome.storage.sync.get(['serverUrl', 'lang'], (result) => {
    if (result.serverUrl) serverUrl = result.serverUrl;
    if (result.lang) locale = result.lang;
  });

  // Listen for messages from background/popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'ANALYZE_IMAGE') {
      doAnalyze(msg.imageUrl);
      sendResponse({ ok: true });
    }
    if (msg.type === 'ANALYZE_PAGE') {
      doAnalyze(null);
      sendResponse({ ok: true });
    }
    if (msg.type === 'SAVE_IMAGE') {
      handleSave(msg.imageUrl, msg.isImage);
      sendResponse({ ok: true });
    }
    if (msg.type === 'START_AREA_CAPTURE') {
      startAreaCapture(msg.mode);
      sendResponse({ ok: true });
    }
  });

  // ---- Custom Keyboard Shortcuts ----

  let customShortcuts = { analyze: 'Ctrl+Shift+A', save: 'Ctrl+Shift+S' };

  // Load custom shortcuts
  chrome.storage.sync.get(['shortcuts'], (result) => {
    if (result.shortcuts) customShortcuts = { ...customShortcuts, ...result.shortcuts };
  });

  // Listen for shortcut changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.shortcuts) customShortcuts = { ...customShortcuts, ...changes.shortcuts.newValue };
  });

  document.addEventListener('keydown', (e) => {
    // Don't trigger in inputs
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

    if (matchShortcut(e, customShortcuts.analyze)) {
      e.preventDefault();
      startAreaCapture('analyze');
    } else if (matchShortcut(e, customShortcuts.save)) {
      e.preventDefault();
      startAreaCapture('save');
    }
  });

  // ---- Area Capture Flow ----

  let areaOverlay = null;

  function startAreaCapture(mode) {
    // Remove any existing overlay
    removeAreaOverlay();

    const overlay = document.createElement('div');
    overlay.className = 'inspoclip-area-overlay';

    const instructions = document.createElement('div');
    instructions.className = 'inspoclip-area-instructions';
    instructions.textContent = locale === 'zh' ? '拖拽选择截图区域，按 Esc 取消' : 'Drag to select area, press Esc to cancel';

    const selection = document.createElement('div');
    selection.className = 'inspoclip-area-selection';
    selection.style.display = 'none';

    // Hover highlight element
    const hoverHighlight = document.createElement('div');
    hoverHighlight.className = 'inspoclip-area-hover';
    hoverHighlight.style.display = 'none';

    overlay.appendChild(instructions);
    overlay.appendChild(hoverHighlight);
    overlay.appendChild(selection);
    container.appendChild(overlay);
    areaOverlay = overlay;

    let startX = 0, startY = 0;
    let isDrawing = false;
    let hoveredRect = null;
    const DRAG_THRESHOLD = 5;

    // Find the element under the overlay by temporarily hiding it
    function getElementAtPoint(x, y) {
      overlay.style.pointerEvents = 'none';
      const el = document.elementFromPoint(x, y);
      overlay.style.pointerEvents = 'auto';
      return el;
    }

    // Get a meaningful element's bounding rect (skip tiny/hidden elements)
    function getSmartRect(el) {
      if (!el || el === document.body || el === document.documentElement) return null;
      const rect = el.getBoundingClientRect();
      // Skip very small elements
      if (rect.width < 30 || rect.height < 30) {
        return getSmartRect(el.parentElement);
      }
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    }

    // Hover: show highlight on element under cursor
    overlay.addEventListener('mousemove', (e) => {
      if (isDrawing) {
        // Manual drawing mode — show selection rectangle
        selection.style.display = 'block';
        const x = Math.min(startX, e.clientX);
        const y = Math.min(startY, e.clientY);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);
        selection.style.left = x + 'px';
        selection.style.top = y + 'px';
        selection.style.width = w + 'px';
        selection.style.height = h + 'px';
        hoverHighlight.style.display = 'none';
        return;
      }

      // Auto-detect mode: highlight element under cursor
      const el = getElementAtPoint(e.clientX, e.clientY);
      const rect = getSmartRect(el);
      if (rect) {
        hoveredRect = rect;
        hoverHighlight.style.display = 'block';
        hoverHighlight.style.left = rect.x + 'px';
        hoverHighlight.style.top = rect.y + 'px';
        hoverHighlight.style.width = rect.width + 'px';
        hoverHighlight.style.height = rect.height + 'px';
      } else {
        hoveredRect = null;
        hoverHighlight.style.display = 'none';
      }
    });

    overlay.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDrawing = true;
      startX = e.clientX;
      startY = e.clientY;
      // Reset selection to zero size (will be drawn on drag)
      selection.style.left = startX + 'px';
      selection.style.top = startY + 'px';
      selection.style.width = '0';
      selection.style.height = '0';
      selection.style.display = 'none';
      instructions.style.display = 'none';
    });

    overlay.addEventListener('mouseup', async (e) => {
      if (!isDrawing) return;
      isDrawing = false;

      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);

      let rect;
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
        // Click without drag: use auto-detected element
        if (!hoveredRect) {
          removeAreaOverlay();
          return;
        }
        rect = hoveredRect;
      } else {
        // Drag: use manual selection
        rect = {
          x: Math.min(startX, e.clientX),
          y: Math.min(startY, e.clientY),
          width: dx,
          height: dy,
        };
      }

      // Minimum size check
      if (rect.width < 20 || rect.height < 20) {
        removeAreaOverlay();
        return;
      }

      try {
        // Hide overlay before capturing to avoid capturing the UI
        overlay.style.display = 'none';

        // Small delay to ensure overlay is hidden before capture
        await new Promise((r) => setTimeout(r, 50));

        // Capture the visible tab
        const dataUrl = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' }, (response) => {
            if (response?.dataUrl) resolve(response.dataUrl);
            else reject(new Error('Capture failed'));
          });
        });

        // Crop the image to the selected area
        const croppedBlob = await cropImage(dataUrl, rect);

        removeAreaOverlay();

        // Process based on mode
        if (mode === 'analyze') {
          // Run analysis on the cropped image
          showToast(locale === 'zh' ? '正在分析选区...' : 'Analyzing selection...', 'loading');

          const ext = croppedBlob.type === 'image/png' ? '.png' : '.jpg';
          const formData = new FormData();
          formData.append('image', croppedBlob, 'area' + ext);

          const res = await fetch(`${serverUrl}/api/images/analyze`, { method: 'POST', body: formData });
          if (!res.ok) throw new Error('Analysis failed');
          const data = await res.json();

          // Check similarity
          try {
            const simForm = new FormData();
            simForm.append('image', croppedBlob, 'check' + ext);
            const simRes = await fetch(`${serverUrl}/api/images/check-similarity`, { method: 'POST', body: simForm });
            if (simRes.ok) {
              const simData = await simRes.json();
              data.similarImages = simData.similar || [];
            }
          } catch { data.similarImages = []; }

          capturedBlob = croppedBlob;
          lastPreviewUrl = URL.createObjectURL(croppedBlob);
          analyzedData = data;
          analysisHistory.push({ data, previewUrl: lastPreviewUrl, timestamp: Date.now() });
          historyIndex = analysisHistory.length - 1;

          transitionToModal(data, lastPreviewUrl);
        } else {
          // Save mode — check similarity then upload
          capturedBlob = croppedBlob;
          await doUpload(croppedBlob);
        }
      } catch (err) {
        removeAreaOverlay();
        showToast(locale === 'zh' ? `截图失败: ${err.message}` : `Capture failed: ${err.message}`, 'error');
        setTimeout(removeToast, 3000);
      }
    });

    // ESC to cancel
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        removeAreaOverlay();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  function removeAreaOverlay() {
    if (areaOverlay) {
      areaOverlay.remove();
      areaOverlay = null;
    }
  }

  async function cropImage(dataUrl, rect) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Scale factor between displayed size and actual image size
        const scaleX = img.naturalWidth / window.innerWidth;
        const scaleY = img.naturalHeight / window.innerHeight;

        const canvas = document.createElement('canvas');
        canvas.width = rect.width * scaleX;
        canvas.height = rect.height * scaleY;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          img,
          rect.x * scaleX, rect.y * scaleY,
          rect.width * scaleX, rect.height * scaleY,
          0, 0,
          canvas.width, canvas.height
        );

        canvas.toBlob((blob) => resolve(blob), 'image/png');
      };
      img.src = dataUrl;
    });
  }

  // ---- Analysis Flow ----

  // ---- Save Flow ----

  async function handleSave(imageUrl, isImage) {
    showToast(locale === 'zh' ? '正在检查...' : 'Checking...');

    try {
      // Get image blob
      let blob;
      if (imageUrl && isImage) {
        try {
          const res = await fetch(imageUrl);
          blob = await res.blob();
        } catch {
          blob = await captureTabAsBlob();
        }
      } else {
        blob = await captureTabAsBlob();
      }

      // Check similarity
      const ext = blob.type === 'image/png' ? '.png' : '.jpg';
      const checkForm = new FormData();
      checkForm.append('image', blob, 'check' + ext);

      const checkRes = await fetch(`${serverUrl}/api/images/check-similarity`, {
        method: 'POST',
        body: checkForm,
      });

      let similar = [];
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        similar = checkData.similar || [];
      }

      if (similar.length > 0) {
        // Show confirmation dialog
        removeToast();
        showSaveConfirmDialog(blob, similar);
      } else {
        // No similar, proceed with upload
        await doUpload(blob);
      }
    } catch (err) {
      // If check fails, proceed with upload anyway
      showToast(locale === 'zh' ? '检查失败，直接保存...' : 'Check failed, saving...');
      try {
        let blob;
        if (imageUrl && isImage) {
          try { const res = await fetch(imageUrl); blob = await res.blob(); } catch { blob = await captureTabAsBlob(); }
        } else {
          blob = await captureTabAsBlob();
        }
        await doUpload(blob);
      } catch (uploadErr) {
        showToast(locale === 'zh' ? `✗ 保存失败: ${uploadErr.message}` : `✗ Save failed: ${uploadErr.message}`, 'error');
        toastTimer = setTimeout(removeToast, 5000);
      }
    }
  }

  function showSaveConfirmDialog(blob, similar, onConfirm) {
    const dialog = document.createElement('div');
    dialog.className = 'inspoclip-confirm-overlay';

    const vw = window.innerWidth;
    const targetX = vw - 360 - 20;

    // Build preview HTML with placeholder, load actual images async
    const previewImgs = similar.slice(0, 3).map((img, i) => {
      const imgEl = `<img data-idx="${i}" class="inspoclip-confirm-img" />`;
      return imgEl;
    }).join('');

    dialog.innerHTML = `
      <div class="inspoclip-confirm" style="--target-x: ${targetX}px;">
        <div class="inspoclip-confirm-header">
          <span class="inspoclip-confirm-icon">⚠️</span>
          <h3>${locale === 'zh' ? '发现相似图片' : 'Similar images found'}</h3>
        </div>
        <p class="inspoclip-confirm-desc">${locale === 'zh' ? '你可能已经收集过类似的灵感，确定要继续保存吗？' : 'You may have already collected similar inspiration. Continue saving?'}</p>
        <div class="inspoclip-confirm-previews">
          ${previewImgs}
        </div>
        <div class="inspoclip-confirm-actions">
          <button class="inspoclip-btn inspoclip-btn-secondary inspoclip-confirm-cancel">${locale === 'zh' ? '取消' : 'Cancel'}</button>
          <button class="inspoclip-btn inspoclip-btn-primary inspoclip-confirm-ok">${locale === 'zh' ? '继续保存' : 'Save anyway'}</button>
        </div>
      </div>
    `;

    container.appendChild(dialog);

    // Load preview images via fetch + object URL
    similar.slice(0, 3).forEach((img, i) => {
      const imgEl = dialog.querySelector(`img[data-idx="${i}"]`);
      if (!imgEl) return;
      fetch(`${serverUrl}/api/uploads/${img.filePath}`)
        .then((res) => {
          if (!res.ok) throw new Error('Not found');
          return res.blob();
        })
        .then((imgBlob) => {
          if (imgBlob.size > 0) {
            imgEl.src = URL.createObjectURL(imgBlob);
          } else {
            imgEl.style.display = 'none';
          }
        })
        .catch(() => {
          imgEl.style.display = 'none';
        });
    });

    requestAnimationFrame(() => dialog.querySelector('.inspoclip-confirm').classList.add('inspoclip-confirm-visible'));

    dialog.querySelector('.inspoclip-confirm-cancel').addEventListener('click', () => {
      dialog.querySelector('.inspoclip-confirm').classList.remove('inspoclip-confirm-visible');
      setTimeout(() => dialog.remove(), 300);
    });

    dialog.querySelector('.inspoclip-confirm-ok').addEventListener('click', async () => {
      dialog.querySelector('.inspoclip-confirm').classList.remove('inspoclip-confirm-visible');
      setTimeout(() => dialog.remove(), 300);
      if (onConfirm) {
        await onConfirm();
      } else {
        await doUpload(blob);
      }
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.querySelector('.inspoclip-confirm').classList.remove('inspoclip-confirm-visible');
        setTimeout(() => dialog.remove(), 300);
      }
    });
  }

  async function doUpload(blob) {
    showToast(locale === 'zh' ? '正在保存到 InspoClip...' : 'Saving to InspoClip...', 'loading');

    try {
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
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '');
        throw new Error(errText || `HTTP ${uploadRes.status}`);
      }

      showToast(locale === 'zh' ? '✓ 已保存到 InspoClip' : '✓ Saved to InspoClip', 'success');
      toastTimer = setTimeout(removeToast, 3500);
    } catch (err) {
      showToast(locale === 'zh' ? `✗ 保存失败: ${err.message}` : `✗ Save failed: ${err.message}`, 'error');
      toastTimer = setTimeout(removeToast, 5000);
    }
  }

  // ---- Analysis Flow ----

  async function doAnalyze(imageUrl) {
    // Remove any existing floating tab
    removeFloatingTab();
    analyzedData = null;
    capturedBlob = null;

    // Phase 1: Show toast
    showToast(locale === 'zh' ? '正在分析...' : 'Analyzing...');

    try {
      // Get image blob
      if (imageUrl) {
        try {
          const res = await fetch(imageUrl);
          capturedBlob = await res.blob();
        } catch {
          capturedBlob = await captureTabAsBlob();
        }
      } else {
        capturedBlob = await captureTabAsBlob();
      }

      // Send to server
      const ext = capturedBlob.type === 'image/png' ? '.png' : '.jpg';
      const formData = new FormData();
      formData.append('image', capturedBlob, 'analyze' + ext);

      const res = await fetch(`${serverUrl}/api/images/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Analysis failed');
      analyzedData = await res.json();

      // Check for similar images
      try {
        const simForm = new FormData();
        simForm.append('image', capturedBlob, 'check' + ext);
        const simRes = await fetch(`${serverUrl}/api/images/check-similarity`, {
          method: 'POST',
          body: simForm,
        });
        if (simRes.ok) {
          const simData = await simRes.json();
          analyzedData.similarImages = simData.similar || [];
        }
      } catch {
        analyzedData.similarImages = [];
      }

      // Phase 2: Save to history and transition toast → modal
      lastPreviewUrl = imageUrl ? URL.createObjectURL(capturedBlob) : null;
      const entryId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      analysisHistory.push({ id: entryId, data: analyzedData, previewUrl: lastPreviewUrl, timestamp: Date.now(), saved: false });
      historyIndex = analysisHistory.length - 1;
      transitionToModal(analyzedData, lastPreviewUrl);
    } catch (err) {
      showToast(locale === 'zh' ? `分析失败: ${err.message}` : `Analysis failed: ${err.message}`, 'error');
      setTimeout(() => removeToast(), 3000);
    }
  }

  async function captureTabAsBlob() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' }, (response) => {
        if (response?.dataUrl) {
          resolve(dataUrlToBlob(response.dataUrl));
        }
      });
    });
  }

  // ---- Toast ----

  function showToast(message, type = 'loading') {
    // Clear any pending removal timer
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    removeToast();
    const toast = document.createElement('div');
    toast.className = `inspoclip-toast inspoclip-toast-${type}`;
    toast.innerHTML = `
      <div class="inspoclip-toast-icon">${type === 'loading' ? '<div class="inspoclip-spinner"></div>' : type === 'error' ? '✗' : '✓'}</div>
      <span class="inspoclip-toast-text">${message}</span>
    `;
    container.appendChild(toast);
    currentToast = toast;

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('inspoclip-toast-visible'));
  }

  function removeToast() {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    if (currentToast) {
      const t = currentToast;
      currentToast = null;
      t.classList.remove('inspoclip-toast-visible');
      setTimeout(() => t.remove(), 300);
    }
  }

  // ---- Transition Toast → Modal ----

  function transitionToModal(data, previewUrl) {
    if (!currentToast) {
      // No toast — show modal directly from top-right
      showModal(data, previewUrl, window.innerWidth - 20, 20);
      return;
    }

    // Get toast position for origin of animation
    const toastRect = currentToast.getBoundingClientRect();
    const originX = toastRect.right;
    const originY = toastRect.top;

    // Fade out toast
    currentToast.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    currentToast.style.opacity = '0';
    currentToast.style.transform = 'translateX(20px) scale(0.8)';

    // After toast fades, show modal with expand animation from toast position
    setTimeout(() => {
      removeToast();
      showModal(data, previewUrl, originX, originY);
    }, 300);
  }

  // ---- Modal ----

  function showModal(data, previewUrl, originX, originY) {
    removeModal();

    const modal = document.createElement('div');
    modal.className = 'inspoclip-modal-overlay';

    // Calculate initial position (from toast origin)
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const modalW = 380;
    const modalH = Math.min(vh - 80, 560);
    const targetX = vw - modalW - 20;
    const targetY = 20;

    modal.innerHTML = `
      <div class="inspoclip-modal" style="
        --origin-x: ${originX}px;
        --origin-y: ${originY}px;
        --target-x: ${targetX}px;
        --target-y: ${targetY}px;
      ">
        <div class="inspoclip-modal-header">
          <div class="inspoclip-modal-title-row">
            <h3>${locale === 'zh' ? '分析结果' : 'Analysis Result'}</h3>
            ${data.similarImages && data.similarImages.length > 0 ? `
              <div class="inspoclip-similar-badge" id="inspoclip-similar-badge">
                <span class="inspoclip-similar-icon">🔍</span>
                <span class="inspoclip-similar-count">${data.similarImages.length}</span>
                <div class="inspoclip-similar-tooltip" id="inspoclip-similar-tooltip">
                  <span class="inspoclip-similar-tooltip-title">${locale === 'zh' ? '相似图片' : 'Similar images'}</span>
                  <div class="inspoclip-similar-previews">
                    ${data.similarImages.slice(0, 4).map((img) =>
                      `<img class="inspoclip-similar-thumb" data-fp="${img.filePath}" />`
                    ).join('')}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
          <div class="inspoclip-modal-actions">
            ${analysisHistory.length > 1 ? `
              <button class="inspoclip-nav-btn" id="inspoclip-prev" title="${locale === 'zh' ? '上一条' : 'Previous'}">▲</button>
              <span class="inspoclip-nav-index">${historyIndex + 1}/${analysisHistory.length}</span>
              <button class="inspoclip-nav-btn" id="inspoclip-next" title="${locale === 'zh' ? '下一条' : 'Next'}">▼</button>
            ` : ''}
            <button class="inspoclip-modal-close">✕</button>
          </div>
        </div>

        ${previewUrl ? `<div class="inspoclip-preview"><img src="${previewUrl}" /></div>` : ''}

        <div class="inspoclip-modal-body">
          <!-- Terms -->
          <div class="inspoclip-section">
            <div class="inspoclip-section-header">
              <span class="inspoclip-section-title">${locale === 'zh' ? '设计术语' : 'Design Terms'}</span>
              <button class="inspoclip-copy-all" data-type="terms" title="${getCopyButtonTitle(locale)}" aria-label="${getCopyButtonTitle(locale)}">${getCopyButtonIcon()}</button>
            </div>
            <div class="inspoclip-terms" id="inspoclip-terms"></div>
          </div>

          <!-- Colors -->
          <div class="inspoclip-section">
            <div class="inspoclip-section-header">
              <span class="inspoclip-section-title">${locale === 'zh' ? '配色方案' : 'Color Palette'}</span>
              <button class="inspoclip-copy-all" data-type="colors" title="${getCopyButtonTitle(locale)}" aria-label="${getCopyButtonTitle(locale)}">${getCopyButtonIcon()}</button>
            </div>
            <div class="inspoclip-colors" id="inspoclip-colors"></div>
          </div>

          <!-- Prompt -->
          <div class="inspoclip-section">
            <div class="inspoclip-section-header">
              <span class="inspoclip-section-title">AI Prompt</span>
              <div class="inspoclip-prompt-controls">
                <div class="inspoclip-lang-group">
                  <button class="inspoclip-lang-btn active" data-lang="auto">Auto</button>
                  <button class="inspoclip-lang-btn" data-lang="en">EN</button>
                  <button class="inspoclip-lang-btn" data-lang="zh">中</button>
                  <button class="inspoclip-lang-btn" data-lang="both">EN/中</button>
                </div>
                <button class="inspoclip-copy-all" data-type="prompt" title="${getCopyButtonTitle(locale)}" aria-label="${getCopyButtonTitle(locale)}">${getCopyButtonIcon()}</button>
              </div>
            </div>
            <div class="inspoclip-prompt" id="inspoclip-prompt"></div>
          </div>
        </div>

        <div class="inspoclip-modal-footer">
          <button class="inspoclip-btn inspoclip-btn-secondary inspoclip-close-btn">${locale === 'zh' ? '关闭' : 'Close'}</button>
          ${analysisHistory[historyIndex]?.saved ? '' : `
            <button class="inspoclip-btn inspoclip-btn-primary inspoclip-upload-btn">
              ${locale === 'zh' ? '保存到 InspoClip' : 'Save to InspoClip'}
            </button>
          `}
        </div>
      </div>
    `;

    container.appendChild(modal);
    currentModal = modal;

    // Load similar image thumbnails via background script to avoid CORS
    if (data.similarImages?.length > 0) {
      data.similarImages.slice(0, 4).forEach((img) => {
        const thumbEl = modal.querySelector(`img[data-fp="${img.filePath}"]`);
        if (!thumbEl) return;
        chrome.runtime.sendMessage(
          { type: 'FETCH_IMAGE', url: `${serverUrl}/api/uploads/${img.filePath}` },
          (response) => {
            if (response?.dataUrl) {
              thumbEl.src = response.dataUrl;
            } else {
              thumbEl.style.display = 'none';
            }
          }
        );
      });
    }

    // Trigger expand animation
    requestAnimationFrame(() => {
      modal.querySelector('.inspoclip-modal').classList.add('inspoclip-modal-visible');
    });

    // Render content
    renderTerms(data.terms || []);
    renderColors(data.colors || []);
    renderPrompt(data.prompt);

    // Bind events
    modal.querySelector('.inspoclip-modal-close').addEventListener('click', removeModal);
    modal.querySelector('.inspoclip-close-btn').addEventListener('click', removeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) removeModal(); });

    // History navigation
    const prevBtn = modal.querySelector('#inspoclip-prev');
    const nextBtn = modal.querySelector('#inspoclip-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => navigateHistory(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => navigateHistory(1));
    }

    // Copy all buttons
    modal.querySelectorAll('.inspoclip-copy-all').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const type = btn.dataset.type;
        let text = '';
        if (type === 'terms') text = (data.terms || []).join('\n');
        else if (type === 'colors') text = (data.colors || []).map((c) => c.toUpperCase()).join('\n');
        else if (type === 'prompt') text = getPromptText(data.prompt);
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          btn.innerHTML = getCopyButtonIcon('copied');
          btn.title = getCopyButtonTitle(locale, 'copied');
          btn.setAttribute('aria-label', getCopyButtonTitle(locale, 'copied'));
          btn.classList.add('inspoclip-copy-all-copied');
          setTimeout(() => {
            btn.innerHTML = getCopyButtonIcon();
            btn.title = getCopyButtonTitle(locale);
            btn.setAttribute('aria-label', getCopyButtonTitle(locale));
            btn.classList.remove('inspoclip-copy-all-copied');
          }, 1500);
        } catch {}
      });
    });

    // Prompt language toggle
    modal.querySelectorAll('.inspoclip-lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        promptLangMode = btn.dataset.lang;
        modal.querySelectorAll('.inspoclip-lang-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderPrompt(data.prompt);
      });
    });

    // Upload button — check similar images first
    modal.querySelector('.inspoclip-upload-btn').addEventListener('click', async () => {
      if (data.similarImages?.length > 0) {
        // Show confirmation dialog before saving
        showSaveConfirmDialog(capturedBlob, data.similarImages, async () => {
          await doModalUpload(modal);
        });
      } else {
        await doModalUpload(modal);
      }
    });

    async function doModalUpload(modalEl) {
      const btn = modalEl.querySelector('.inspoclip-upload-btn');
      btn.disabled = true;
      btn.textContent = locale === 'zh' ? '保存中...' : 'Saving...';

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

        // Mark current analysis as saved
        if (historyIndex >= 0 && analysisHistory[historyIndex]) {
          analysisHistory[historyIndex].saved = true;
        }

        // Success — show saved text, then shrink and hide the button
        btn.textContent = locale === 'zh' ? '✓ 已保存' : '✓ Saved';
        btn.style.background = '#4caf50';
        btn.style.borderColor = '#4caf50';
        btn.style.flex = 'none';
        btn.style.whiteSpace = 'nowrap';

        setTimeout(() => {
          btn.style.transition = 'width 0.35s ease, opacity 0.25s ease, padding 0.35s ease, margin 0.35s ease';
          btn.style.width = btn.offsetWidth + 'px';
          requestAnimationFrame(() => {
            btn.style.width = '0';
            btn.style.opacity = '0';
            btn.style.padding = '0';
            btn.style.margin = '0';
            btn.style.borderWidth = '0';
          });
          setTimeout(() => btn.remove(), 400);
        }, 1000);
      } catch (err) {
        btn.textContent = locale === 'zh' ? '保存失败' : 'Save failed';
        btn.style.background = '#f44336';
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = locale === 'zh' ? '保存到 InspoClip' : 'Save to InspoClip';
          btn.style.background = '';
        }, 2000);
      }
    }

    // ESC to close
    const escHandler = (e) => {
      if (e.key === 'Escape') { removeModal(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
  }

  function removeModal() {
    if (currentModal) {
      const overlay = currentModal;
      const modal = overlay.querySelector('.inspoclip-modal');
      if (modal) modal.classList.remove('inspoclip-modal-visible');
      setTimeout(() => {
        overlay.remove();
        // Show floating tab after modal is gone, if we have data
        if (analyzedData) showFloatingTab();
      }, 350);
      currentModal = null;
    }
  }

  function navigateHistory(direction) {
    const newIndex = historyIndex + direction;
    if (newIndex < 0 || newIndex >= analysisHistory.length) return;

    historyIndex = newIndex;
    const entry = analysisHistory[historyIndex];
    analyzedData = entry.data;
    lastPreviewUrl = entry.previewUrl;

    // Re-render modal content
    renderTerms(analyzedData.terms || []);
    renderColors(analyzedData.colors || []);
    renderPrompt(analyzedData.prompt);

    // Update preview
    const previewImg = currentModal?.querySelector('.inspoclip-preview img');
    if (previewImg && entry.previewUrl) {
      previewImg.src = entry.previewUrl;
    }

    // Update nav index
    const navIndex = currentModal?.querySelector('.inspoclip-nav-index');
    if (navIndex) navIndex.textContent = `${historyIndex + 1}/${analysisHistory.length}`;

    // Update button states
    const prevBtn = currentModal?.querySelector('#inspoclip-prev');
    const nextBtn = currentModal?.querySelector('#inspoclip-next');
    if (prevBtn) prevBtn.disabled = historyIndex === 0;
    if (nextBtn) nextBtn.disabled = historyIndex === analysisHistory.length - 1;

    // Update similar badge
    const badge = currentModal?.querySelector('#inspoclip-similar-badge');
    if (badge) {
      const sims = analyzedData.similarImages || [];
      if (sims.length > 0) {
        badge.style.display = 'inline-flex';
        badge.querySelector('.inspoclip-similar-count').textContent = sims.length;
        // Reload thumbnails
        const previews = badge.querySelector('.inspoclip-similar-previews');
        if (previews) {
          previews.innerHTML = sims.slice(0, 4).map((img) =>
            `<img class="inspoclip-similar-thumb" data-fp="${img.filePath}" />`
          ).join('');
          sims.slice(0, 4).forEach((img) => {
            const thumbEl = previews.querySelector(`img[data-fp="${img.filePath}"]`);
            if (!thumbEl) return;
            chrome.runtime.sendMessage(
              { type: 'FETCH_IMAGE', url: `${serverUrl}/api/uploads/${img.filePath}` },
              (response) => {
                if (response?.dataUrl) {
                  thumbEl.src = response.dataUrl;
                } else {
                  thumbEl.style.display = 'none';
                }
              }
            );
          });
        }
      } else {
        badge.style.display = 'none';
      }
    }

    // Update save button visibility based on saved state
    const footer = currentModal?.querySelector('.inspoclip-modal-footer');
    const existingBtn = footer?.querySelector('.inspoclip-upload-btn');
    if (entry.saved) {
      if (existingBtn) existingBtn.remove();
    } else if (!existingBtn && footer) {
      const closeBtn = footer.querySelector('.inspoclip-close-btn');
      const newBtn = document.createElement('button');
      newBtn.className = 'inspoclip-btn inspoclip-btn-primary inspoclip-upload-btn';
      newBtn.textContent = locale === 'zh' ? '保存到 InspoClip' : 'Save to InspoClip';
      newBtn.addEventListener('click', async () => {
        if (analyzedData.similarImages?.length > 0) {
          showSaveConfirmDialog(capturedBlob, analyzedData.similarImages, async () => {
            await doModalUpload(currentModal);
          });
        } else {
          await doModalUpload(currentModal);
        }
      });
      if (closeBtn) closeBtn.after(newBtn);
      else footer.appendChild(newBtn);
    }
  }

  function showFloatingTab() {
    removeFloatingTab();

    const tab = document.createElement('div');
    tab.className = 'inspoclip-tab';
    tab.innerHTML = `<span class="inspoclip-tab-arrow">◂</span><span class="inspoclip-tab-label">InspoClip</span>`;

    // Restore last position
    const savedTop = localStorage.getItem('inspoclip-tab-top');
    if (savedTop) tab.style.top = savedTop + 'px';

    container.appendChild(tab);
    currentTab = tab;

    // Animate in after a frame so the initial transform is applied first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (currentTab === tab) tab.classList.add('inspoclip-tab-visible');
      });
    });

    // Click to reopen modal — wait for tab exit animation
    tab.addEventListener('click', (e) => {
      if (tab._dragging) return;
      const rect = tab.getBoundingClientRect();
      const tabX = rect.left;
      const tabY = rect.top + rect.height / 2;
      tab.style.pointerEvents = 'none';
      tab.classList.remove('inspoclip-tab-visible');
      currentTab = null;
      setTimeout(() => {
        tab.remove();
        showModal(analyzedData, lastPreviewUrl, tabX, tabY);
      }, 280);
    });

    // Right-click context menu
    tab.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu(e.clientX, e.clientY);
    });

    // Drag to reposition
    let dragStartY = 0;
    let startTop = 0;
    let isDragging = false;

    tab.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = false;
      dragStartY = e.clientY;
      startTop = tab.getBoundingClientRect().top;
      tab._dragging = false;

      const onMove = (ev) => {
        const dy = ev.clientY - dragStartY;
        if (Math.abs(dy) > 3) {
          isDragging = true;
          tab._dragging = true;
          const newTop = Math.max(0, Math.min(window.innerHeight - 40, startTop + dy));
          tab.style.top = newTop + 'px';
        }
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        // Save position
        localStorage.setItem('inspoclip-tab-top', parseInt(tab.style.top));
        // Reset dragging flag after a tick (so click handler can check it)
        setTimeout(() => { tab._dragging = false; }, 50);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function removeFloatingTab() {
    if (currentTab) {
      const tab = currentTab;
      currentTab = null;
      tab.style.pointerEvents = 'none';
      tab.classList.remove('inspoclip-tab-visible');
      tab.addEventListener('transitionend', () => tab.remove(), { once: true });
      // Fallback removal if transition doesn't fire
      setTimeout(() => { if (tab.parentNode) tab.remove(); }, 400);
    }
    removeContextMenu();
  }

  function showContextMenu(x, y) {
    removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'inspoclip-ctx-menu';

    const items = [
      { icon: '👁', label: locale === 'zh' ? '查看分析结果' : 'View results', action: () => {
        if (!analyzedData) { removeFloatingTab(); return; }
        const tabEl = currentTab;
        const rect = tabEl ? tabEl.getBoundingClientRect() : { left: window.innerWidth - 20, top: 20, height: 40 };
        const tabX = rect.left;
        const tabY = rect.top + rect.height / 2;
        removeFloatingTab();
        showModal(analyzedData, lastPreviewUrl, tabX, tabY);
      }},
      { icon: '🙈', label: locale === 'zh' ? '隐藏标签' : 'Hide tab', action: () => {
        removeFloatingTab();
        analyzedData = null; capturedBlob = null; lastPreviewUrl = null;
        analysisHistory = []; historyIndex = -1;
      }},
    ];

    items.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'inspoclip-ctx-item';
      el.innerHTML = `<span class="inspoclip-ctx-item-icon">${item.icon}</span><span>${item.label}</span>`;
      el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        removeContextMenu();
        item.action();
      });
      menu.appendChild(el);
    });

    // Position: ensure menu stays within viewport
    const menuW = 160;
    const menuH = 80;
    const finalX = Math.min(x, window.innerWidth - menuW - 10);
    const finalY = Math.min(y, window.innerHeight - menuH - 10);
    menu.style.left = finalX + 'px';
    menu.style.top = finalY + 'px';

    container.appendChild(menu);
    currentCtxMenu = menu;

    // Close on click outside (use composedPath for shadow DOM)
    const closeHandler = (e) => {
      const path = e.composedPath();
      if (!path.includes(menu)) {
        removeContextMenu();
        root.shadowRoot.removeEventListener('mousedown', closeHandler);
      }
    };
    // Delay to avoid the opening right-click from immediately closing the menu
    setTimeout(() => root.shadowRoot.addEventListener('mousedown', closeHandler), 100);
  }

  function removeContextMenu() {
    if (currentCtxMenu) {
      currentCtxMenu.remove();
      currentCtxMenu = null;
    }
  }

  // ---- Render Functions ----

  function renderTerms(terms) {
    const el = currentModal?.querySelector('#inspoclip-terms');
    if (!el) return;
    el.innerHTML = '';
    if (!terms) return;
    terms.forEach((term) => {
      const tag = document.createElement('span');
      tag.className = 'inspoclip-term';

      const idx = term.indexOf(' / ');
      const en = idx === -1 ? term : term.slice(0, idx);
      const zh = idx === -1 ? null : term.slice(idx + 3);

      const enSpan = document.createElement('span');
      enSpan.className = 'inspoclip-term-part';
      enSpan.textContent = en;
      enSpan.addEventListener('click', () => copyText(enSpan, en));
      tag.appendChild(enSpan);

      if (zh && en !== zh) {
        const sep = document.createElement('span');
        sep.className = 'inspoclip-term-sep';
        sep.textContent = '/';
        tag.appendChild(sep);

        const zhSpan = document.createElement('span');
        zhSpan.className = 'inspoclip-term-part';
        zhSpan.textContent = zh;
        zhSpan.addEventListener('click', () => copyText(zhSpan, zh));
        tag.appendChild(zhSpan);
      }

      el.appendChild(tag);
    });
  }

  function renderColors(colors) {
    const el = currentModal?.querySelector('#inspoclip-colors');
    if (!el) return;
    el.innerHTML = '';
    colors.forEach((hex) => {
      const swatch = document.createElement('div');
      swatch.className = 'inspoclip-color';
      swatch.innerHTML = `<span class="inspoclip-color-dot" style="background:${hex}"></span><span>${hex.toUpperCase()}</span>`;
      swatch.addEventListener('click', () => copyText(swatch, hex.toUpperCase()));
      el.appendChild(swatch);
    });
  }

  function getPromptText(prompt) {
    return resolvePromptText(prompt, promptLangMode, locale);
  }

  function renderPrompt(prompt) {
    const el = currentModal?.querySelector('#inspoclip-prompt');
    if (!el) return;
    const text = getPromptText(prompt);
    el.textContent = text || (locale === 'zh' ? '暂无 Prompt' : 'No prompt');
  }

  async function copyText(el, text) {
    try {
      await navigator.clipboard.writeText(text);
      const check = document.createElement('span');
      check.className = 'inspoclip-check-mark';
      check.textContent = ' ✓';
      el.appendChild(check);
      el.classList.add('inspoclip-copied');
      setTimeout(() => {
        check.remove();
        el.classList.remove('inspoclip-copied');
      }, 1200);
    } catch {}
  }

})();


