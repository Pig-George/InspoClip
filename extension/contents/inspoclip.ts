// @ts-nocheck
import type { PlasmoCSConfig } from "plasmo"

import {
  DEFAULT_AREA_RECORDING_AUDIO_ENABLED,
  DEFAULT_AREA_RECORDING_DELAY_SECONDS,
  createAreaRecordingStartMessage,
  createAreaRecordingTimerState,
  formatRecordingDuration,
  getAreaCaptureToolbarPosition,
  getAreaRecordingInnerRect,
  getAreaRecordingDelayBadge,
  getAreaRecordingDelayLabel,
  getAreaResizeHandlesMarkup,
  getAreaToolbarActionIcon,
  getAreaToolbarActionLabel,
  getNextAreaRecordingDelay,
  moveAreaRect,
  normalizeAreaRecordingDelay,
  resizeAreaRect,
} from "../src/content/area-recording"
import { createAreaRecordingSource } from "../src/content/area-recording-source"
import { renderAreaToolbarIcons } from "../src/content/area-toolbar-icons"
import {
  createRecordingCountdown,
  waitForRecordingUiToClear
} from "../src/content/recording-countdown"
import { claimContentRuntime, removeExistingContentRoot, setContentRootInteractive, shouldExpandContentRoot } from "../src/content/bootstrap"
import { getCopyButtonIcon, getCopyButtonTitle } from "../src/content/copy"
import { formatDate, getMonday } from "../src/content/date"
import { dataUrlToBlob } from "../src/content/image"
import { renderSafeMarkdown } from "../src/content/markdown"
import { createObjectUrlVideoSource, jumpVideoToTime, revokeObjectUrlVideoSource } from "../src/content/media"
import { getPromptText as resolvePromptText } from "../src/content/prompt"
import { matchShortcut } from "../src/content/shortcut"
import { getContentStyles } from "../src/content/styles"
import { syncToastElement } from "../src/content/toast"
import {
  clearVideoPromptInflight,
  getVideoPromptInflight,
  setVideoPromptInflight,
  videoPromptRequestKey
} from "../src/content/video-prompt-state"

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
  setContentRootInteractive(root, false);
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
  let currentVideoPreviewUrl = null;
  let analyzedData = null;
  let capturedBlob = null;
  let lastPreviewUrl = null;
  let currentAssetResult = null;

  // Analysis history
  let analysisHistory = []; // [{ kind: 'image'|'video', data/detail, previewUrl, blob, timestamp, saved }]
  let historyIndex = -1;
  let savedImageHashes = new Set(); // Track which analyses have been saved
  let serverUrl = 'http://localhost:3001';
  let locale = (navigator.language || 'en').startsWith('zh') ? 'zh' : 'en';
  let promptLangMode = 'auto';
  let videoPromptLangMode = 'auto';
  let videoPromptPurpose = 'general';
  let videoPromptTarget = '';
  let areaRecordingDelaySeconds = DEFAULT_AREA_RECORDING_DELAY_SECONDS;

  function syncContentRootInteractivity() {
    setContentRootInteractive(root, shouldExpandContentRoot({
      hasModal: Boolean(currentModal),
      hasAreaOverlay: Boolean(areaOverlay),
      isAreaRecording: Boolean(areaOverlay?.classList.contains('inspoclip-area-overlay-recording')),
    }));
  }

  // Load server URL
  chrome.storage.sync.get(['serverUrl', 'lang', 'areaRecordingDelaySeconds'], (result) => {
    if (result.serverUrl) serverUrl = result.serverUrl;
    if (result.lang) locale = result.lang;
    areaRecordingDelaySeconds = normalizeAreaRecordingDelay(result.areaRecordingDelaySeconds);
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
      startAreaCapture(msg.mode, msg.recordingSourceId);
      sendResponse({ ok: true });
    }
    if (msg.type === 'START_ASSET_ANALYSIS') {
      handleAssetAnalysis(msg);
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
  let activeAreaRecording = null;
  let preparedAreaRecordingSource = null;
  let activeAreaRecordingCountdown = null;

  function startAreaCapture(mode, recordingSourceId) {
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
    preparedAreaRecordingSource = createAreaRecordingSource(
      recordingSourceId,
      () => crypto.randomUUID?.() || `area-source-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      (sourceId) => sendRuntimeMessage({ type: 'PREPARE_AREA_RECORDING', sourceId })
    );
    syncContentRootInteractivity();

    let startX = 0, startY = 0;
    let isDrawing = false;
    let isSelectionLocked = false;
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
      if (isSelectionLocked) return;
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
      if (isSelectionLocked) return;
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
      isSelectionLocked = true;

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

      showAreaCaptureControls(overlay, selection, hoverHighlight, instructions, rect, mode);
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

  function applyAreaRectToElement(element, rect) {
    element.style.display = 'block';
    element.style.left = rect.x + 'px';
    element.style.top = rect.y + 'px';
    element.style.width = rect.width + 'px';
    element.style.height = rect.height + 'px';
  }

  function getAreaToolbarLocale() {
    return locale === 'zh' ? 'zh' : 'en';
  }

  function renderAreaToolbarIconButton(action, dataAction, className = '', pressed) {
    const label = getAreaToolbarActionLabel(action, getAreaToolbarLocale());
    const pressedAttribute = typeof pressed === 'boolean' ? ` aria-pressed="${pressed}"` : '';
    return `<button type="button" class="inspoclip-area-icon-button ${className}" data-action="${dataAction}" data-tooltip="${label}" aria-label="${label}"${pressedAttribute}>${getAreaToolbarActionIcon(action)}</button>`;
  }

  function setAreaToolbarButtonAction(button, action) {
    if (!button) return;
    const label = getAreaToolbarActionLabel(action, getAreaToolbarLocale());
    button.innerHTML = getAreaToolbarActionIcon(action);
    renderAreaToolbarIcons(button);
    button.dataset.tooltip = label;
    button.setAttribute('aria-label', label);
    button.classList.remove('inspoclip-area-icon-swap');
    void button.offsetWidth;
    button.classList.add('inspoclip-area-icon-swap');
  }

  function renderAreaRecordingDelayButton(delaySeconds) {
    const label = getAreaRecordingDelayLabel(delaySeconds, getAreaToolbarLocale());
    return `<button type="button" class="inspoclip-area-icon-button inspoclip-area-delay-button" data-action="toggle-delay" data-tooltip="${label}" aria-label="${label}">${getAreaToolbarActionIcon('delay')}<span class="inspoclip-area-delay-badge" aria-hidden="true">${getAreaRecordingDelayBadge(delaySeconds)}</span></button>`;
  }

  function syncAreaRecordingDelayButton(button, delaySeconds) {
    if (!button) return;
    const label = getAreaRecordingDelayLabel(delaySeconds, getAreaToolbarLocale());
    button.dataset.tooltip = label;
    button.setAttribute('aria-label', label);
    const badge = button.querySelector('.inspoclip-area-delay-badge');
    if (badge) badge.textContent = getAreaRecordingDelayBadge(delaySeconds);
  }

  async function runAreaRecordingCountdown(overlay, delaySeconds) {
    const countdownElement = document.createElement('div');
    countdownElement.className = 'inspoclip-area-recording-countdown';
    countdownElement.setAttribute('role', 'status');
    countdownElement.setAttribute('aria-live', 'polite');
    let countdownWasRendered = false;
    const countdown = createRecordingCountdown(delaySeconds, {
      onTick: (remainingSeconds) => {
        countdownElement.textContent = String(remainingSeconds);
        countdownElement.dataset.value = String(remainingSeconds);
        if (!countdownElement.isConnected) {
          overlay.querySelector('.inspoclip-area-selection')?.appendChild(countdownElement);
          countdownWasRendered = countdownElement.isConnected;
        }
        countdownElement.style.animation = 'none';
        void countdownElement.offsetWidth;
        countdownElement.style.animation = '';
      },
    });
    activeAreaRecordingCountdown?.cancel();
    activeAreaRecordingCountdown = countdown;
    const result = await countdown.promise;
    if (activeAreaRecordingCountdown === countdown) activeAreaRecordingCountdown = null;
    countdownElement.remove();
    if (result !== 'completed' || areaOverlay !== overlay) return false;
    if (countdownWasRendered) await waitForRecordingUiToClear();
    return areaOverlay === overlay;
  }

  function showAreaCaptureControls(overlay, selection, hoverHighlight, instructions, rect, mode) {
    hoverHighlight.style.display = 'none';
    instructions.style.display = 'none';
    let currentRect = { ...rect };
    applyAreaRectToElement(selection, currentRect);
    selection.innerHTML = getAreaResizeHandlesMarkup();
    overlay.classList.add('inspoclip-area-overlay-selected');

    const existing = overlay.querySelector('.inspoclip-area-toolbar');
    if (existing) existing.remove();

    const toolbar = document.createElement('div');
    toolbar.className = 'inspoclip-area-toolbar';
    let includeTabAudio = DEFAULT_AREA_RECORDING_AUDIO_ENABLED;
    toolbar.innerHTML = `
      <div class="inspoclip-area-toolbar-main">
        ${renderAreaToolbarIconButton('screenshot', 'screenshot')}
        ${renderAreaToolbarIconButton('record', 'record', 'inspoclip-area-icon-button-primary')}
        <span class="inspoclip-area-toolbar-separator" aria-hidden="true"></span>
        ${renderAreaRecordingDelayButton(areaRecordingDelaySeconds)}
        ${renderAreaToolbarIconButton('sound-off', 'toggle-audio', '', includeTabAudio)}
        ${renderAreaToolbarIconButton('cancel', 'cancel', 'inspoclip-area-icon-button-quiet')}
      </div>
    `;
    renderAreaToolbarIcons(toolbar);
    positionAreaToolbar(toolbar, currentRect);
    let adjustment = null;

    const syncAdjustedArea = () => {
      applyAreaRectToElement(selection, currentRect);
      positionAreaToolbar(toolbar, currentRect);
    };

    selection.addEventListener('pointerdown', (event) => {
      if (overlay.classList.contains('inspoclip-area-overlay-recording')) return;
      if (event.button !== 0) return;

      const handleElement = event.target.closest?.('.inspoclip-area-handle');
      adjustment = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originRect: { ...currentRect },
        handle: handleElement?.dataset.handle || null,
      };
      selection.setPointerCapture?.(event.pointerId);
      overlay.classList.add('inspoclip-area-overlay-adjusting');
      event.preventDefault();
      event.stopPropagation();
    });

    selection.addEventListener('pointermove', (event) => {
      if (!adjustment || event.pointerId !== adjustment.pointerId) return;
      const deltaX = event.clientX - adjustment.startX;
      const deltaY = event.clientY - adjustment.startY;
      const viewport = { width: window.innerWidth, height: window.innerHeight };

      currentRect = adjustment.handle
        ? resizeAreaRect(adjustment.originRect, adjustment.handle, deltaX, deltaY, viewport)
        : moveAreaRect(adjustment.originRect, deltaX, deltaY, viewport);
      syncAdjustedArea();
      event.preventDefault();
      event.stopPropagation();
    });

    const finishAdjustment = (event) => {
      if (!adjustment || event.pointerId !== adjustment.pointerId) return;
      if (selection.hasPointerCapture?.(event.pointerId)) {
        selection.releasePointerCapture(event.pointerId);
      }
      adjustment = null;
      overlay.classList.remove('inspoclip-area-overlay-adjusting');
      event.preventDefault();
      event.stopPropagation();
    };

    selection.addEventListener('pointerup', finishAdjustment);
    selection.addEventListener('pointercancel', finishAdjustment);
    selection.addEventListener('lostpointercapture', (event) => {
      if (!adjustment || event.pointerId !== adjustment.pointerId) return;
      adjustment = null;
      overlay.classList.remove('inspoclip-area-overlay-adjusting');
    });

    toolbar.addEventListener('pointerdown', (event) => event.stopPropagation());
    toolbar.addEventListener('mousedown', (event) => event.stopPropagation());
    toolbar.addEventListener('mouseup', (event) => event.stopPropagation());
    toolbar.addEventListener('click', (event) => event.stopPropagation());

    toolbar.querySelector('[data-action="screenshot"]')?.addEventListener('click', () => {
      processAreaScreenshot(mode, currentRect, overlay);
    });
    toolbar.querySelector('[data-action="record"]')?.addEventListener('click', () => {
      startAreaRecording(currentRect, overlay, toolbar, includeTabAudio, areaRecordingDelaySeconds);
    });
    toolbar.querySelector('[data-action="toggle-delay"]')?.addEventListener('click', (event) => {
      areaRecordingDelaySeconds = getNextAreaRecordingDelay(areaRecordingDelaySeconds);
      syncAreaRecordingDelayButton(event.currentTarget, areaRecordingDelaySeconds);
      chrome.storage.sync.set({ areaRecordingDelaySeconds });
    });
    toolbar.querySelector('[data-action="toggle-audio"]')?.addEventListener('click', (event) => {
      includeTabAudio = !includeTabAudio;
      const button = event.currentTarget;
      setAreaToolbarButtonAction(button, includeTabAudio ? 'sound-on' : 'sound-off');
      button.setAttribute('aria-pressed', String(includeTabAudio));
      button.classList.toggle('inspoclip-area-icon-button-active', includeTabAudio);
      if (includeTabAudio) {
        button.classList.remove('inspoclip-area-sound-pop');
        void button.offsetWidth;
        button.classList.add('inspoclip-area-sound-pop');
        window.setTimeout(() => button.classList.remove('inspoclip-area-sound-pop'), 560);
      }
    });
    toolbar.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      removeAreaOverlay();
    });
    overlay.appendChild(toolbar);
  }

  function positionAreaToolbar(toolbar, rect) {
    const fallbackWidth = toolbar.classList.contains('inspoclip-area-toolbar-recording') ? 228 : 210;
    const position = getAreaCaptureToolbarPosition(
      rect,
      { width: window.innerWidth, height: window.innerHeight },
      { width: toolbar.offsetWidth || fallbackWidth, height: toolbar.offsetHeight || 44 }
    );
    toolbar.style.left = position.left + 'px';
    toolbar.style.top = position.top + 'px';
    toolbar.dataset.placement = position.placement;
  }

  async function processAreaScreenshot(mode, rect, overlay) {
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
        pushImageHistory(data, lastPreviewUrl, croppedBlob);

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
  }

  async function startAreaRecording(
    rect,
    overlay,
    toolbar,
    includeTabAudio = DEFAULT_AREA_RECORDING_AUDIO_ENABLED,
    delaySeconds = DEFAULT_AREA_RECORDING_DELAY_SECONDS
  ) {
    const recordBtn = toolbar.querySelector('[data-action="record"]');
    if (recordBtn) {
      recordBtn.disabled = true;
      recordBtn.classList.add('inspoclip-area-action-processing');
      recordBtn.dataset.tooltip = locale === 'zh' ? '正在准备录屏' : 'Preparing recording';
      recordBtn.setAttribute('aria-label', recordBtn.dataset.tooltip);
    }

    const recordingId = crypto.randomUUID?.() || `area-recording-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const recordingRect = getAreaRecordingInnerRect(rect);
    const preparedSource = preparedAreaRecordingSource;
    const visualViewport = window.visualViewport;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      clientWidth: document.documentElement?.clientWidth || window.innerWidth,
      clientHeight: document.documentElement?.clientHeight || window.innerHeight,
      visualWidth: visualViewport?.width || window.innerWidth,
      visualHeight: visualViewport?.height || window.innerHeight,
      visualOffsetLeft: visualViewport?.offsetLeft || 0,
      visualOffsetTop: visualViewport?.offsetTop || 0,
      visualScale: visualViewport?.scale || 1,
      captureBounds: {
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };

    try {
      if (!preparedSource) throw new Error(locale === 'zh' ? '录屏权限未准备好，请重新从 InspoClip 启动框选' : 'Recording permission is not ready. Please start area capture from InspoClip again.');
      overlay.classList.add('inspoclip-area-overlay-recording');
      syncContentRootInteractivity();
      await preparedSource.promise;
      if (areaOverlay !== overlay) return;

      if (!await runAreaRecordingCountdown(overlay, delaySeconds)) return;

      preparedAreaRecordingSource = null;
      const startResponse = await sendRuntimeMessage(createAreaRecordingStartMessage({
        recordingId,
        sourceId: preparedSource.sourceId,
        rect: recordingRect,
        viewport,
        includeTabAudio,
      }));
      if (!startResponse?.success) throw new Error(startResponse?.error || 'Failed to start recording');
      if (areaOverlay !== overlay) {
        await sendRuntimeMessage({ type: 'CANCEL_AREA_RECORDING', recordingId }).catch(() => {});
        return;
      }

      toolbar.classList.add('inspoclip-area-toolbar-recording');
      toolbar.innerHTML = `
        <span class="inspoclip-area-record-time"><span class="inspoclip-area-record-dot"></span><span data-record-time>00:00</span></span>
        <span class="inspoclip-area-icon-status ${includeTabAudio ? 'inspoclip-area-icon-button-active' : ''}" data-tooltip="${getAreaToolbarActionLabel(includeTabAudio ? 'sound-on' : 'sound-off', getAreaToolbarLocale())}" aria-label="${getAreaToolbarActionLabel(includeTabAudio ? 'sound-on' : 'sound-off', getAreaToolbarLocale())}">${getAreaToolbarActionIcon(includeTabAudio ? 'sound-on' : 'sound-off')}</span>
        <span class="inspoclip-area-toolbar-separator" aria-hidden="true"></span>
        ${renderAreaToolbarIconButton('pause', 'pause')}
        ${renderAreaToolbarIconButton('retake', 'retake')}
        ${renderAreaToolbarIconButton('finish', 'finish', 'inspoclip-area-icon-button-primary')}
      `;
      renderAreaToolbarIcons(toolbar);
      toolbar.style.animation = 'none';
      void toolbar.offsetWidth;
      toolbar.style.animation = '';
      positionAreaToolbar(toolbar, rect);
      toolbar.addEventListener('mousedown', (event) => event.stopPropagation());
      toolbar.addEventListener('mouseup', (event) => event.stopPropagation());
      toolbar.addEventListener('click', (event) => event.stopPropagation());

      let timerId = 0;
      let timerState = createAreaRecordingTimerState();
      const recording = {
        recordingId,
        timerId: 0,
        shouldAnalyze: true,
        stopping: false,
        commandPending: false,
        retakeConfirmTimer: 0,
      };
      activeAreaRecording = recording;

      const timeEl = toolbar.querySelector('[data-record-time]');
      const updateTimer = () => {
        const elapsed = (timerState.pausedAt || Date.now()) - timerState.startedAt - timerState.pausedTotal;
        if (timeEl) timeEl.textContent = formatRecordingDuration(elapsed);
      };
      timerId = window.setInterval(updateTimer, 500);
      recording.timerId = timerId;

      toolbar.querySelector('[data-action="pause"]')?.addEventListener('click', async () => {
        const pauseBtn = toolbar.querySelector('[data-action="pause"]');
        try {
          if (recording.commandPending || recording.stopping) return;
          if (!timerState.pausedAt) {
            const response = await sendRuntimeMessage({ type: 'PAUSE_AREA_RECORDING', recordingId });
            if (!response?.success) throw new Error(response?.error || 'Pause failed');
            timerState.pausedAt = Date.now();
            overlay.classList.add('inspoclip-area-overlay-paused');
            setAreaToolbarButtonAction(pauseBtn, 'resume');
          } else {
            const response = await sendRuntimeMessage({ type: 'RESUME_AREA_RECORDING', recordingId });
            if (!response?.success) throw new Error(response?.error || 'Resume failed');
            timerState.pausedTotal += Date.now() - timerState.pausedAt;
            timerState.pausedAt = 0;
            overlay.classList.remove('inspoclip-area-overlay-paused');
            setAreaToolbarButtonAction(pauseBtn, 'pause');
          }
          updateTimer();
        } catch (err) {
          showToast(locale === 'zh' ? `录屏控制失败: ${err.message}` : `Recording control failed: ${err.message}`, 'error');
          setTimeout(removeToast, 3000);
        }
      });

      toolbar.querySelector('[data-action="retake"]')?.addEventListener('click', async () => {
        if (recording.commandPending || recording.stopping) return;
        const retakeBtn = toolbar.querySelector('[data-action="retake"]');
        if (!retakeBtn) return;

        if (retakeBtn.dataset.confirming !== 'true') {
          retakeBtn.dataset.confirming = 'true';
          retakeBtn.classList.add('inspoclip-area-action-confirm');
          setAreaToolbarButtonAction(retakeBtn, 'confirm-retake');
          recording.retakeConfirmTimer = window.setTimeout(() => {
            retakeBtn.dataset.confirming = 'false';
            retakeBtn.classList.remove('inspoclip-area-action-confirm');
            setAreaToolbarButtonAction(retakeBtn, 'retake');
            recording.retakeConfirmTimer = 0;
          }, 2500);
          return;
        }

        if (recording.retakeConfirmTimer) clearTimeout(recording.retakeConfirmTimer);
        recording.retakeConfirmTimer = 0;
        recording.commandPending = true;
        const recordingButtons = Array.from(toolbar.querySelectorAll('button'));
        recordingButtons.forEach((button) => { button.disabled = true; });
        retakeBtn.classList.add('inspoclip-area-action-processing');
        retakeBtn.dataset.tooltip = locale === 'zh' ? '正在准备重录' : 'Preparing retake';
        retakeBtn.setAttribute('aria-label', retakeBtn.dataset.tooltip);

        let retakePrepared = false;
        try {
          const prepareResponse = await sendRuntimeMessage({ type: 'PREPARE_RETAKE_AREA_RECORDING', recordingId });
          if (!prepareResponse?.success) throw new Error(prepareResponse?.error || 'Failed to prepare retake');
          retakePrepared = true;
          overlay.classList.add('inspoclip-area-overlay-paused');

          if (!await runAreaRecordingCountdown(overlay, areaRecordingDelaySeconds)) return;

          const startResponse = await sendRuntimeMessage({ type: 'START_RETAKE_AREA_RECORDING', recordingId });
          if (!startResponse?.success) throw new Error(startResponse?.error || 'Retake failed to start');
          if (areaOverlay !== overlay) {
            await sendRuntimeMessage({ type: 'CANCEL_AREA_RECORDING', recordingId }).catch(() => {});
            return;
          }
          timerState = createAreaRecordingTimerState();
          overlay.classList.remove('inspoclip-area-overlay-paused');
          const pauseBtn = toolbar.querySelector('[data-action="pause"]');
          setAreaToolbarButtonAction(pauseBtn, 'pause');
          updateTimer();
        } catch (err) {
          if (areaOverlay !== overlay) return;
          showToast(locale === 'zh' ? `重录失败: ${err.message}` : `Retake failed: ${err.message}`, 'error');
          setTimeout(removeToast, 3000);
          if (retakePrepared) removeAreaOverlay();
        } finally {
          recording.commandPending = false;
          recordingButtons.forEach((button) => { button.disabled = false; });
          retakeBtn.dataset.confirming = 'false';
          retakeBtn.classList.remove('inspoclip-area-action-confirm');
          retakeBtn.classList.remove('inspoclip-area-action-processing');
          setAreaToolbarButtonAction(retakeBtn, 'retake');
        }
      });

      toolbar.querySelector('[data-action="finish"]')?.addEventListener('click', async () => {
        if (recording.stopping || recording.commandPending) return;
        recording.stopping = true;
        recording.shouldAnalyze = true;
        const elapsedMs = Math.max(1, (timerState.pausedAt || Date.now()) - timerState.startedAt - timerState.pausedTotal);
        const finishBtn = toolbar.querySelector('[data-action="finish"]');
        if (finishBtn) {
          finishBtn.disabled = true;
          finishBtn.classList.add('inspoclip-area-action-completing', 'inspoclip-area-action-processing');
          finishBtn.dataset.tooltip = locale === 'zh' ? '正在完成并分析' : 'Finishing and analyzing';
          finishBtn.setAttribute('aria-label', finishBtn.dataset.tooltip);
        }

        try {
          const response = await sendRuntimeMessage({ type: 'STOP_AREA_RECORDING', recordingId });
          cleanupAreaRecording(recording);
          activeAreaRecording = null;
          removeAreaOverlay();
          if (!response?.success) throw new Error(response?.error || 'Recording failed');
          const blob = dataUrlToBlob(response.dataUrl);
          if (!blob.size) throw new Error('No recording data');
          await analyzeRecordedAreaVideo(blob, elapsedMs);
        } catch (err) {
          cleanupAreaRecording(recording);
          activeAreaRecording = null;
          removeAreaOverlay();
          showToast(locale === 'zh' ? `录屏分析失败: ${err.message}` : `Recording analysis failed: ${err.message}`, 'error');
          setTimeout(removeToast, 5000);
        }
      });

      updateTimer();
    } catch (err) {
      await sendRuntimeMessage({ type: 'CANCEL_AREA_RECORDING', recordingId }).catch(() => {});
      overlay.classList.remove('inspoclip-area-overlay-recording');
      syncContentRootInteractivity();
      if (recordBtn) {
        recordBtn.disabled = false;
        recordBtn.classList.remove('inspoclip-area-action-processing');
        setAreaToolbarButtonAction(recordBtn, 'record');
      }
      showToast(locale === 'zh' ? `录屏启动失败: ${err.message}` : `Failed to start recording: ${err.message}`, 'error');
      setTimeout(removeToast, 5000);
    }
  }

  function cleanupAreaRecording(recording) {
    if (!recording) return;
    if (recording.timerId) clearInterval(recording.timerId);
    if (recording.retakeConfirmTimer) clearTimeout(recording.retakeConfirmTimer);
    if (activeAreaRecording === recording) activeAreaRecording = null;
  }

  async function cancelActiveAreaRecording() {
    const recording = activeAreaRecording;
    if (!recording) return;
    recording.shouldAnalyze = false;
    cleanupAreaRecording(recording);
    try {
      await sendRuntimeMessage({ type: 'CANCEL_AREA_RECORDING', recordingId: recording.recordingId });
    } catch {}
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(response);
      });
    });
  }

  async function analyzeRecordedAreaVideo(videoBlob, durationMs) {
    showToast(locale === 'zh' ? '正在上传录屏...' : 'Uploading recording...', 'loading');
    const formData = new FormData();
    formData.append('video', videoBlob, 'area-recording.webm');
    formData.append('source', 'extension');
    formData.append('draft', 'true');
    if (Number.isFinite(durationMs) && durationMs > 0) {
      formData.append('durationMs', String(Math.round(durationMs)));
    }
    const uploadRes = await fetch(`${serverUrl}/api/videos`, { method: 'POST', body: formData });
    if (!uploadRes.ok) throw new Error(await readableError(uploadRes, 'Video upload failed'));
    const uploadResult = await uploadRes.json();

    showToast(locale === 'zh' ? '正在理解录屏... 0%' : 'Understanding recording... 0%', 'loading');
    const job = await pollVideoJob(uploadResult.jobId, (value) => {
      const progress = value.progress || 0;
      showToast(locale === 'zh' ? `正在理解录屏... ${progress}%` : `Understanding recording... ${progress}%`, 'loading');
    });
    if (job.status === 'failed') throw new Error(job.errorMessage || 'Video analysis failed');

    const detailRes = await fetch(`${serverUrl}/api/videos/${uploadResult.videoId}`);
    if (!detailRes.ok) throw new Error(await readableError(detailRes, 'Failed to load video analysis'));
    const detail = await detailRes.json();
    pushVideoHistory(detail);
    transitionToVideoModal(detail, window.innerWidth - 20, 20);
  }

  function removeAreaOverlay() {
    activeAreaRecordingCountdown?.cancel();
    activeAreaRecordingCountdown = null;
    cancelActiveAreaRecording();
    const preparedSource = preparedAreaRecordingSource;
    preparedAreaRecordingSource = null;
    if (preparedSource) {
      preparedSource.promise
        .then(() => sendRuntimeMessage({ type: 'RELEASE_AREA_RECORDING_SOURCE', sourceId: preparedSource.sourceId }))
        .catch(() => {});
    }
    if (areaOverlay) {
      areaOverlay.remove();
      areaOverlay = null;
      syncContentRootInteractivity();
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
    currentAssetResult = null;

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
      pushImageHistory(analyzedData, lastPreviewUrl, capturedBlob);
      transitionToModal(analyzedData, lastPreviewUrl);
    } catch (err) {
      showToast(locale === 'zh' ? `分析失败: ${err.message}` : `Analysis failed: ${err.message}`, 'error');
      setTimeout(() => removeToast(), 3000);
    }
  }

  async function handleAssetAnalysis(asset) {
    removeFloatingTab();
    analyzedData = null;
    capturedBlob = null;
    currentAssetResult = null;

    if (asset.serverUrl) serverUrl = asset.serverUrl;

    try {
      if (asset.assetKind === 'image') {
        await analyzeAssetImage(asset);
        return;
      }
      if (asset.assetKind === 'video') {
        await analyzeAssetVideo(asset);
        return;
      }
      throw new Error(locale === 'zh' ? '暂不支持此素材类型' : 'Unsupported asset type');
    } catch (err) {
      showToast(locale === 'zh' ? `素材分析失败: ${err.message}` : `Asset analysis failed: ${err.message}`, 'error');
      setTimeout(() => removeToast(), 5000);
    }
  }

  async function analyzeAssetImage(asset) {
    showToast(locale === 'zh' ? '正在分析素材...' : 'Analyzing asset...');

    capturedBlob = dataUrlToBlob(asset.dataUrl);
    const ext = capturedBlob.type === 'image/png' ? '.png' : '.jpg';
    const formData = new FormData();
    formData.append('image', capturedBlob, asset.fileName || 'asset' + ext);

    const res = await fetch(`${serverUrl}/api/images/analyze`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(await readableError(res, 'Analysis failed'));
    analyzedData = await res.json();

    try {
      const simForm = new FormData();
      simForm.append('image', capturedBlob, 'check' + ext);
      const simRes = await fetch(`${serverUrl}/api/images/check-similarity`, { method: 'POST', body: simForm });
      if (simRes.ok) {
        const simData = await simRes.json();
        analyzedData.similarImages = simData.similar || [];
      }
    } catch {
      analyzedData.similarImages = [];
    }

    lastPreviewUrl = URL.createObjectURL(capturedBlob);
    pushImageHistory(analyzedData, lastPreviewUrl, capturedBlob);
    transitionToModal(analyzedData, lastPreviewUrl);
  }

  async function analyzeAssetVideo(asset) {
    showToast(locale === 'zh' ? '正在上传视频素材...' : 'Uploading video asset...');
    let uploadResult;
    if (asset.videoUrl) {
      uploadResult = await uploadVideoUrlFromBackground(asset.videoUrl);
    } else {
      const videoBlob = dataUrlToBlob(asset.dataUrl);
      const formData = new FormData();
      formData.append('video', videoBlob, asset.fileName || 'asset-video.mp4');
      formData.append('source', 'extension');
      formData.append('draft', 'true');
      const res = await fetch(`${serverUrl}/api/videos`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await readableError(res, 'Video upload failed'));
      uploadResult = await res.json();
    }

    showToast(locale === 'zh' ? '正在理解视频... 0%' : 'Understanding video... 0%');
    const job = await pollVideoJob(uploadResult.jobId, (value) => {
      const progress = value.progress || 0;
      showToast(locale === 'zh' ? `正在理解视频... ${progress}%` : `Understanding video... ${progress}%`);
    });
    if (job.status === 'failed') throw new Error(job.errorMessage || 'Video analysis failed');

    const detailRes = await fetch(`${serverUrl}/api/videos/${uploadResult.videoId}`);
    if (!detailRes.ok) throw new Error(await readableError(detailRes, 'Failed to load video analysis'));
    const detail = await detailRes.json();
    pushVideoHistory(detail);
    transitionToVideoModal(detail, window.innerWidth - 20, 20);
  }

  async function uploadVideoUrlFromBackground(videoUrl) {
    const response = await chrome.runtime.sendMessage({ type: 'UPLOAD_VIDEO_URL', url: videoUrl, serverUrl, draft: true });
    if (!response?.success) throw new Error(response?.error || 'Video upload failed');
    return response;
  }

  async function pollVideoJob(jobId, onUpdate) {
    for (let attempt = 0; attempt < 240; attempt += 1) {
      const res = await fetch(`${serverUrl}/api/video-jobs/${jobId}`);
      if (!res.ok) throw new Error(await readableError(res, 'Failed to poll video job'));
      const job = await res.json();
      onUpdate?.(job);
      if (job.status === 'completed' || job.status === 'failed') return job;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error('Video analysis timed out');
  }

  async function readableError(response, fallback) {
    const text = await response.text().catch(() => '');
    if (!text) return fallback;
    try {
      const json = JSON.parse(text);
      return json.error || fallback;
    } catch {
      return text.slice(0, 240) || fallback;
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

    if (currentToast) {
      syncToastElement(currentToast, message, type);
      currentToast.classList.add('inspoclip-toast-visible');
      return;
    }

    const toast = document.createElement('div');
    toast.innerHTML = `
      <div class="inspoclip-toast-icon"></div>
      <span class="inspoclip-toast-text"></span>
    `;
    syncToastElement(toast, message, type);
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

  function transitionToVideoModal(detail, originX, originY) {
    if (!currentToast) {
      showVideoModal(detail, originX, originY);
      return;
    }

    const toastRect = currentToast.getBoundingClientRect();
    const toastOriginX = toastRect.right;
    const toastOriginY = toastRect.top;
    currentToast.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    currentToast.style.opacity = '0';
    currentToast.style.transform = 'translateX(20px) scale(0.8)';
    setTimeout(() => {
      removeToast();
      showVideoModal(detail, toastOriginX, toastOriginY);
    }, 300);
  }

  function localizedText(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return locale === 'zh' ? (value.zh || value.en || '') : (value.en || value.zh || '');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatSeconds(value) {
    const numeric = Number(value);
    const seconds = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
    return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
  }

  function formatActionLine(action) {
    if (!action || typeof action !== 'object') return localizedText(action) || String(action ?? '');
    const subject = localizedText(action.subject) || '';
    const actionText = localizedText(action.action) || '';
    const details = [subject, actionText].filter(Boolean);
    const timing = [
      Number.isFinite(Number(action.durationMs)) ? `${Number(action.durationMs)}ms` : '',
      action.easing ? String(action.easing) : '',
    ].filter(Boolean);
    return [...details, ...timing].join(' · ') || JSON.stringify(action);
  }

  function newHistoryId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function pushImageHistory(data, previewUrl, blob, saved = false) {
    const entry = { id: newHistoryId(), kind: 'image', data, previewUrl, blob, timestamp: Date.now(), saved };
    analysisHistory.push(entry);
    historyIndex = analysisHistory.length - 1;
    analyzedData = data;
    lastPreviewUrl = previewUrl;
    capturedBlob = blob || capturedBlob;
    currentAssetResult = null;
    return entry;
  }

  function pushVideoHistory(detail) {
    const entry = { id: newHistoryId(), kind: 'video', detail, timestamp: Date.now(), saved: !!detail?.video?.isSaved };
    analysisHistory.push(entry);
    historyIndex = analysisHistory.length - 1;
    currentAssetResult = { kind: 'video', detail };
    analyzedData = null;
    lastPreviewUrl = null;
    capturedBlob = null;
    return entry;
  }

  function currentHistoryEntry() {
    return historyIndex >= 0 ? analysisHistory[historyIndex] : null;
  }

  function syncStateFromHistoryEntry(entry) {
    if (!entry) return;
    if (entry.kind === 'video') {
      currentAssetResult = { kind: 'video', detail: entry.detail };
      analyzedData = null;
      lastPreviewUrl = null;
      capturedBlob = null;
      return;
    }
    analyzedData = entry.data;
    lastPreviewUrl = entry.previewUrl;
    capturedBlob = entry.blob || capturedBlob;
    currentAssetResult = null;
  }

  function openHistoryEntry(entry, originX, originY) {
    syncStateFromHistoryEntry(entry);
    if (entry?.kind === 'video') {
      showVideoModal(entry.detail, originX, originY);
    } else if (entry?.kind === 'image') {
      showModal(entry.data, entry.previewUrl, originX, originY);
    }
  }

  const videoPurposeOptions = [
    { value: 'general', zh: '通用', en: 'General' },
    { value: 'video-generation', zh: '视频生成', en: 'Video' },
    { value: 'frontend', zh: '前端实现', en: 'Frontend' },
    { value: 'motion-design', zh: '动效设计', en: 'Motion' },
    { value: 'storyboard', zh: '分镜', en: 'Storyboard' },
    { value: 'json', zh: 'JSON', en: 'JSON' },
  ];

  function videoPurposeLabel(value) {
    const item = videoPurposeOptions.find((option) => option.value === value);
    return item ? (locale === 'zh' ? item.zh : item.en) : value;
  }

  function getVideoPromptOutputText(output) {
    if (!output) return '';
    if (videoPromptLangMode === 'en') return output.contentEn || '';
    if (videoPromptLangMode === 'zh') return output.contentZh || output.contentEn || '';
    if (videoPromptLangMode === 'both') {
      return `EN\n${output.contentEn || ''}\n\n中文\n${output.contentZh || output.contentEn || ''}`.trim();
    }
    return locale === 'zh' ? (output.contentZh || output.contentEn || '') : (output.contentEn || output.contentZh || '');
  }

  async function renderVideoPromptOutput(modal, output, statusText = '') {
    const outputEl = modal.querySelector('#inspoclip-video-prompt-output');
    const copyBtn = modal.querySelector('[data-video-prompt-copy]');
    if (!outputEl) return;
    const text = getVideoPromptOutputText(output);
    const placeholder = locale === 'zh' ? '选择用途后点击生成，得到可复刻此视频效果的提示词。' : 'Choose a purpose and generate a prompt to recreate this video effect.';
    outputEl.dataset.rawMarkdown = text || '';
    if (text && !statusText) {
      outputEl.innerHTML = renderSafeMarkdown(text);
    } else {
      outputEl.textContent = statusText || placeholder;
    }
    outputEl.classList.toggle('inspoclip-video-prompt-placeholder', !text && !!statusText);
    if (copyBtn) copyBtn.disabled = !text;
  }

  function bindVideoPromptPanel(modal, videoId) {
    if (!videoId) return;
    const generateBtn = modal.querySelector('.inspoclip-video-prompt-generate');
    const targetInput = modal.querySelector('.inspoclip-video-prompt-target');
    const targetWrap = modal.querySelector('.inspoclip-video-prompt-target-wrap');
    const copyBtn = modal.querySelector('[data-video-prompt-copy]');
    let activePromptKey = videoPromptRequestKey(videoId, videoPromptPurpose, videoPromptTarget);

    const isActiveModal = () => currentModal === modal;
    const setGenerating = (generating) => {
      if (!generateBtn || !isActiveModal()) return;
      generateBtn.disabled = generating;
      generateBtn.textContent = generating
        ? (locale === 'zh' ? '生成中...' : 'Generating...')
        : (locale === 'zh' ? '生成' : 'Generate');
    };
    const currentPromptKey = () => videoPromptRequestKey(videoId, videoPromptPurpose, videoPromptTarget);
    const isCurrentPrompt = (key) => isActiveModal() && activePromptKey === key;

    const watchPromptPromise = async (key, promise) => {
      activePromptKey = key;
      setGenerating(true);
      renderVideoPromptOutput(modal, null, locale === 'zh' ? '正在生成复刻提示词...' : 'Generating replication prompt...');
      try {
        const output = await promise;
        if (isCurrentPrompt(key)) renderVideoPromptOutput(modal, output);
      } catch (err) {
        if (isCurrentPrompt(key)) {
          renderVideoPromptOutput(modal, null, locale === 'zh' ? `生成失败: ${err.message}` : `Generation failed: ${err.message}`);
        }
      } finally {
        if (isCurrentPrompt(key)) setGenerating(false);
      }
    };

    const refreshTargetVisibility = () => {
      if (!targetWrap) return;
      targetWrap.style.display = ['general', 'json'].includes(videoPromptPurpose) ? 'none' : 'block';
    };

    const loadExisting = async () => {
      const key = currentPromptKey();
      activePromptKey = key;
      const inflight = getVideoPromptInflight(key);
      if (inflight) {
        watchPromptPromise(key, inflight);
        return;
      }
      setGenerating(false);
      const params = new URLSearchParams({ purpose: videoPromptPurpose });
      if (videoPromptTarget.trim()) params.set('target', videoPromptTarget.trim());
      const res = await fetch(`${serverUrl}/api/videos/${videoId}/prompts?${params.toString()}`);
      if (res.ok) {
        const output = await res.json();
        if (isCurrentPrompt(key)) renderVideoPromptOutput(modal, output);
      } else if (res.status === 404) {
        if (isCurrentPrompt(key)) renderVideoPromptOutput(modal, null);
      }
    };

    const generate = async () => {
      const key = currentPromptKey();
      const existing = getVideoPromptInflight(key);
      if (existing) {
        watchPromptPromise(key, existing);
        return;
      }
      const body = { purpose: videoPromptPurpose, target: videoPromptTarget.trim() };
      const promise = fetch(`${serverUrl}/api/videos/${videoId}/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(async (res) => {
        if (!res.ok) throw new Error(await readableError(res, 'Prompt generation failed'));
        return res.json();
      });

      setVideoPromptInflight(key, promise);
      try {
        await watchPromptPromise(key, promise);
      } finally {
        clearVideoPromptInflight(key, promise);
      }
    };

    modal.querySelectorAll('.inspoclip-video-purpose-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        videoPromptPurpose = btn.dataset.purpose;
        modal.querySelectorAll('.inspoclip-video-purpose-btn').forEach((item) => item.classList.remove('active'));
        btn.classList.add('active');
        refreshTargetVisibility();
        loadExisting().catch(() => renderVideoPromptOutput(modal, null));
      });
    });

    modal.querySelectorAll('.inspoclip-video-lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        videoPromptLangMode = btn.dataset.lang;
        modal.querySelectorAll('.inspoclip-video-lang-btn').forEach((item) => item.classList.remove('active'));
        btn.classList.add('active');
        loadExisting().catch(() => renderVideoPromptOutput(modal, null));
      });
    });

    if (targetInput) {
      targetInput.value = videoPromptTarget;
      targetInput.addEventListener('input', () => { videoPromptTarget = targetInput.value; });
      targetInput.addEventListener('change', () => loadExisting().catch(() => renderVideoPromptOutput(modal, null)));
    }
    if (generateBtn) generateBtn.addEventListener('click', generate);
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const outputEl = modal.querySelector('#inspoclip-video-prompt-output');
        const text = outputEl?.dataset.rawMarkdown || outputEl?.textContent || '';
        if (!text) return;
        await navigator.clipboard.writeText(text).catch(() => undefined);
        copyBtn.innerHTML = getCopyButtonIcon('copied');
        copyBtn.classList.add('inspoclip-copy-all-copied');
        setTimeout(() => {
          copyBtn.innerHTML = getCopyButtonIcon();
          copyBtn.classList.remove('inspoclip-copy-all-copied');
        }, 1500);
      });
    }

    refreshTargetVisibility();
    loadExisting().catch(() => renderVideoPromptOutput(modal, null));
  }

  function showVideoModal(detail, originX, originY) {
    removeModal(false);
    currentAssetResult = { kind: 'video', detail };

    const video = detail.video || {};
    const analysis = detail.analysis || {};
    const stages = Array.isArray(analysis.stages) ? analysis.stages : [];
    const title = localizedText(detail.summary) || localizedText(analysis.summary) || video.originalName || (locale === 'zh' ? '视频分析结果' : 'Video Analysis Result');
    const videoSrc = `${serverUrl}/api/videos/${video.id}/content`;
    const vw = window.innerWidth;
    const targetX = Math.max(20, vw - 460 - 20);

    const modal = document.createElement('div');
    modal.className = 'inspoclip-modal-overlay';
    modal.innerHTML = `
      <div class="inspoclip-modal inspoclip-video-modal" style="
        --origin-x: ${originX}px;
        --origin-y: ${originY}px;
        --target-x: ${targetX}px;
        --target-y: 20px;
      ">
        <div class="inspoclip-modal-header">
          <div class="inspoclip-modal-title-row">
            <h3>${locale === 'zh' ? '视频分析结果' : 'Video Analysis Result'}</h3>
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

        <div class="inspoclip-video-preview">
          <video controls preload="metadata" data-video-src="${escapeHtml(videoSrc)}"></video>
          <div class="inspoclip-video-preview-status">${locale === 'zh' ? '正在加载视频预览...' : 'Loading video preview...'}</div>
        </div>

        <div class="inspoclip-modal-body">
          <div class="inspoclip-section">
            <div class="inspoclip-section-header">
              <span class="inspoclip-section-title">${locale === 'zh' ? '摘要' : 'Summary'}</span>
            </div>
            <p class="inspoclip-video-summary">${escapeHtml(title)}</p>
          </div>

          <div class="inspoclip-section">
            <div class="inspoclip-section-header">
              <span class="inspoclip-section-title">${locale === 'zh' ? '阶段分析' : 'Stage Analysis'}</span>
            </div>
            <div class="inspoclip-video-stages">
              ${stages.length ? stages.map((stage, index) => `
                <button type="button" class="inspoclip-video-stage" data-start-time="${Number(stage.startTime) || 0}" title="${locale === 'zh' ? '跳转到此阶段' : 'Jump to this stage'}">
                  <div class="inspoclip-video-stage-head">
                    <span>${index + 1}. ${escapeHtml(localizedText(stage.title) || stage.title || (locale === 'zh' ? '阶段' : 'Stage'))}</span>
                    <em>${formatSeconds(stage.startTime)} – ${formatSeconds(stage.endTime)}</em>
                  </div>
                  <div class="inspoclip-video-stage-grid">
                    <div><b>${locale === 'zh' ? '初始' : 'Initial'}</b><span>${escapeHtml(localizedText(stage.initialState) || stage.initialState || '-')}</span></div>
                    <div><b>${locale === 'zh' ? '触发' : 'Trigger'}</b><span>${escapeHtml(localizedText(stage.trigger) || stage.trigger || '-')}</span></div>
                    <div><b>${locale === 'zh' ? '结果' : 'Result'}</b><span>${escapeHtml(localizedText(stage.resultState) || stage.resultState || '-')}</span></div>
                  </div>
                  ${(stage.actions || []).length ? `<ul class="inspoclip-video-actions">
                    ${(stage.actions || []).map((action) => `
                      <li>${escapeHtml(formatActionLine(action))}</li>
                    `).join('')}
                  </ul>` : ''}
                </button>
              `).join('') : `<p class="inspoclip-empty">${locale === 'zh' ? '暂无阶段分析' : 'No stage analysis yet'}</p>`}
            </div>
          </div>

          <div class="inspoclip-section inspoclip-video-prompt-section">
            <div class="inspoclip-section-header">
              <span class="inspoclip-section-title">${locale === 'zh' ? '复刻输出' : 'Replication Output'}</span>
              <button class="inspoclip-copy-all" data-video-prompt-copy title="${getCopyButtonTitle(locale)}" aria-label="${getCopyButtonTitle(locale)}" disabled>${getCopyButtonIcon()}</button>
            </div>
            <div class="inspoclip-video-purpose-group">
              ${videoPurposeOptions.map((item) => `
                <button class="inspoclip-video-purpose-btn ${item.value === videoPromptPurpose ? 'active' : ''}" data-purpose="${item.value}">
                  ${escapeHtml(locale === 'zh' ? item.zh : item.en)}
                </button>
              `).join('')}
            </div>
            <div class="inspoclip-video-prompt-target-wrap">
              <input class="inspoclip-video-prompt-target" placeholder="${locale === 'zh' ? '目标场景，例如 React + Tailwind 组件' : 'Target, e.g. React + Tailwind component'}" />
            </div>
            <div class="inspoclip-video-prompt-toolbar">
              <div class="inspoclip-lang-group">
                <button class="inspoclip-lang-btn inspoclip-video-lang-btn ${videoPromptLangMode === 'auto' ? 'active' : ''}" data-lang="auto">Auto</button>
                <button class="inspoclip-lang-btn inspoclip-video-lang-btn ${videoPromptLangMode === 'en' ? 'active' : ''}" data-lang="en">EN</button>
                <button class="inspoclip-lang-btn inspoclip-video-lang-btn ${videoPromptLangMode === 'zh' ? 'active' : ''}" data-lang="zh">中</button>
                <button class="inspoclip-lang-btn inspoclip-video-lang-btn ${videoPromptLangMode === 'both' ? 'active' : ''}" data-lang="both">EN/中</button>
              </div>
              <button class="inspoclip-btn inspoclip-btn-secondary inspoclip-video-prompt-generate">${locale === 'zh' ? '生成' : 'Generate'}</button>
            </div>
            <div class="inspoclip-video-prompt-output inspoclip-video-prompt-placeholder" id="inspoclip-video-prompt-output">${locale === 'zh' ? '选择用途后点击生成，得到可复刻此视频效果的提示词。' : 'Choose a purpose and generate a prompt to recreate this video effect.'}</div>
          </div>

        </div>

        <div class="inspoclip-modal-footer">
          <button class="inspoclip-btn inspoclip-btn-secondary inspoclip-close-btn">${locale === 'zh' ? '关闭' : 'Close'}</button>
          ${video.isSaved ? '' : `
            <button class="inspoclip-btn inspoclip-btn-primary inspoclip-video-save-btn">
              ${locale === 'zh' ? '保存到 InspoClip' : 'Save to InspoClip'}
            </button>
          `}
        </div>
      </div>
    `;

    container.appendChild(modal);
    currentModal = modal;
    syncContentRootInteractivity();
    requestAnimationFrame(() => {
      modal.querySelector('.inspoclip-modal').classList.add('inspoclip-modal-visible');
    });
    modal.querySelector('.inspoclip-modal-close').addEventListener('click', removeModal);
    modal.querySelector('.inspoclip-close-btn').addEventListener('click', removeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) removeModal(); });
    const previewVideo = modal.querySelector('.inspoclip-video-preview video');
    const previewStatus = modal.querySelector('.inspoclip-video-preview-status');
    if (previewVideo) {
      createObjectUrlVideoSource(videoSrc)
        .then((objectUrl) => {
          if (currentModal !== modal) {
            revokeObjectUrlVideoSource(objectUrl);
            return;
          }
          revokeObjectUrlVideoSource(currentVideoPreviewUrl);
          currentVideoPreviewUrl = objectUrl;
          previewVideo.src = objectUrl;
          previewStatus?.remove();
        })
        .catch((err) => {
          if (previewStatus) {
            previewStatus.textContent = locale === 'zh'
              ? `视频预览加载失败：${err.message}`
              : `Video preview failed: ${err.message}`;
          }
        });
    }
    if (previewVideo) {
      modal.querySelectorAll('.inspoclip-video-stage[data-start-time]').forEach((stageEl) => {
        stageEl.addEventListener('click', () => {
          const startTime = Number(stageEl.dataset.startTime || 0);
          void jumpVideoToTime(previewVideo, startTime);
        });
      });
    }
    const prevBtn = modal.querySelector('#inspoclip-prev');
    const nextBtn = modal.querySelector('#inspoclip-next');
    if (prevBtn) prevBtn.addEventListener('click', () => navigateHistory(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => navigateHistory(1));
    bindVideoPromptPanel(modal, video.id);
    const saveBtn = modal.querySelector('.inspoclip-video-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = locale === 'zh' ? '保存中...' : 'Saving...';
        try {
          const res = await fetch(`${serverUrl}/api/videos/${video.id}/save`, { method: 'POST' });
          if (!res.ok) throw new Error(await readableError(res, 'Save failed'));
          const saved = await res.json();
          detail.video = saved.video || { ...video, isSaved: true };
          currentAssetResult = { kind: 'video', detail };
          const entry = currentHistoryEntry();
          if (entry?.kind === 'video') {
            entry.detail = detail;
            entry.saved = true;
          }
          saveBtn.textContent = locale === 'zh' ? '✓ 已保存' : '✓ Saved';
          saveBtn.style.background = '#4caf50';
          saveBtn.style.borderColor = '#4caf50';
          saveBtn.style.flex = 'none';
          saveBtn.style.whiteSpace = 'nowrap';
          setTimeout(() => {
            saveBtn.style.transition = 'width 0.35s ease, opacity 0.25s ease, padding 0.35s ease, margin 0.35s ease';
            saveBtn.style.width = saveBtn.offsetWidth + 'px';
            requestAnimationFrame(() => {
              saveBtn.style.width = '0';
              saveBtn.style.opacity = '0';
              saveBtn.style.padding = '0';
              saveBtn.style.margin = '0';
              saveBtn.style.borderWidth = '0';
            });
            setTimeout(() => saveBtn.remove(), 400);
          }, 1000);
        } catch (err) {
          saveBtn.textContent = locale === 'zh' ? '保存失败' : 'Save failed';
          saveBtn.style.background = '#f44336';
          setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = locale === 'zh' ? '保存到 InspoClip' : 'Save to InspoClip';
            saveBtn.style.background = '';
          }, 2000);
        }
      });
    }
  }

  // ---- Modal ----

  function showModal(data, previewUrl, originX, originY) {
    removeModal(false);

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
    syncContentRootInteractivity();

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
    const uploadBtn = modal.querySelector('.inspoclip-upload-btn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', async () => {
        if (data.similarImages?.length > 0) {
          // Show confirmation dialog before saving
          showSaveConfirmDialog(capturedBlob, data.similarImages, async () => {
            await doModalUpload(modal);
          });
        } else {
          await doModalUpload(modal);
        }
      });
    }

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

  function removeModal(showFloating = true) {
    if (currentModal) {
      const overlay = currentModal;
      revokeObjectUrlVideoSource(currentVideoPreviewUrl);
      currentVideoPreviewUrl = null;
      const modal = overlay.querySelector('.inspoclip-modal');
      if (modal) modal.classList.remove('inspoclip-modal-visible');
      setTimeout(() => {
        overlay.remove();
        // Show floating tab after modal is gone, if we have image or video analysis data
        if (showFloating && analysisHistory.length > 0) showFloatingTab();
        syncContentRootInteractivity();
      }, 350);
      currentModal = null;
      syncContentRootInteractivity();
    }
  }

  function navigateHistory(direction) {
    const newIndex = historyIndex + direction;
    if (newIndex < 0 || newIndex >= analysisHistory.length) return;

    const modalEl = currentModal?.querySelector('.inspoclip-modal');
    const rect = modalEl?.getBoundingClientRect();
    const originX = rect ? rect.right : window.innerWidth - 20;
    const originY = rect ? rect.top : 20;
    historyIndex = newIndex;
    const entry = analysisHistory[historyIndex];
    openHistoryEntry(entry, originX, originY);
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
        openHistoryEntry(currentHistoryEntry(), tabX, tabY);
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
        if (!currentHistoryEntry()) { removeFloatingTab(); return; }
        const tabEl = currentTab;
        const rect = tabEl ? tabEl.getBoundingClientRect() : { left: window.innerWidth - 20, top: 20, height: 40 };
        const tabX = rect.left;
        const tabY = rect.top + rect.height / 2;
        removeFloatingTab();
        openHistoryEntry(currentHistoryEntry(), tabX, tabY);
      }},
      { icon: '🙈', label: locale === 'zh' ? '隐藏标签' : 'Hide tab', action: () => {
        removeFloatingTab();
        analyzedData = null; capturedBlob = null; lastPreviewUrl = null;
        currentAssetResult = null;
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


