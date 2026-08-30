export function getContentStyles(): string {
  return `
    :host { all: initial; }

    .inspoclip-container {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      color: #4a3028;
      font-size: 13px;
      line-height: 1.5;
      pointer-events: none;
      width: 0;
      height: 0;
      overflow: visible;
    }

    /* Toast */
    .inspoclip-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
      opacity: 0;
      transform: translateX(30px);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: auto;
      max-width: 320px;
    }

    .inspoclip-toast-visible {
      opacity: 1;
      transform: translateX(0);
    }

    .inspoclip-toast-success {
      border-left: 4px solid #4caf50;
      background: #f0faf0;
    }

    .inspoclip-toast-error {
      border-left: 4px solid #f44336;
      background: #fef0f0;
    }

    .inspoclip-toast-loading {
      border-left: 4px solid #c0784a;
    }

    .inspoclip-toast-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .inspoclip-progress-ring {
      display: block;
      width: 18px;
      height: 18px;
      flex: 0 0 18px;
      overflow: visible;
    }

    .inspoclip-progress-ring-track,
    .inspoclip-progress-ring-value {
      fill: none;
      stroke-width: 2.5;
    }

    .inspoclip-progress-ring-track {
      stroke: #eadfd3;
    }

    .inspoclip-progress-ring-value {
      stroke: #c0784a;
      stroke-linecap: round;
      stroke-dasharray: 100;
      transition: stroke-dashoffset 0.38s cubic-bezier(0.22, 0.72, 0.24, 1);
      transform: rotate(-90deg);
      transform-origin: 10px 10px;
    }

    .inspoclip-progress-ring-determinate .inspoclip-progress-ring-value {
      stroke-dasharray: 100;
    }

    .inspoclip-progress-ring-indeterminate {
      animation: inspoclip-progress-ring-spin 1s linear infinite;
    }

    .inspoclip-progress-ring-indeterminate .inspoclip-progress-ring-value {
      stroke-dasharray: 24 76;
      stroke-dashoffset: 0;
    }

    @keyframes inspoclip-progress-ring-spin {
      to { transform: rotate(360deg); }
    }

    @media (prefers-reduced-motion: reduce) {
      .inspoclip-progress-ring-indeterminate {
        animation: none;
      }

      .inspoclip-progress-ring-value {
        transition-duration: 1ms;
      }

      .inspoclip-toast-text-char {
        animation: none;
      }
    }

    .inspoclip-toast-text {
      font-size: 13px;
      font-weight: 500;
      color: #4a3028;
      white-space: nowrap;
    }

    .inspoclip-toast-text-char {
      display: inline-block;
      animation: inspoclip-toast-char-jump 1.5s ease-in-out infinite;
      animation-delay: calc(var(--inspoclip-toast-char-index) * 50ms);
      transform-origin: center bottom;
    }

    /* Concurrent analysis progress stack */
    .inspoclip-analysis-stack {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      width: fit-content;
      max-width: calc(100vw - 40px);
      pointer-events: auto;
    }

    .inspoclip-analysis-stack .inspoclip-toast {
      position: relative !important;
      top: auto;
      right: auto;
      align-self: center;
      flex: 0 0 auto;
      width: max-content;
      max-width: 320px;
      pointer-events: auto;
      transform: translateX(30px) scale(var(--inspoclip-analysis-stack-scale, 1));
      transform-origin: top center;
      transition: margin-top .48s cubic-bezier(.22,.8,.24,1),
        opacity .32s cubic-bezier(.22,.8,.24,1),
        transform .48s cubic-bezier(.22,.8,.24,1),
        box-shadow .48s cubic-bezier(.22,.8,.24,1);
      will-change: margin-top, opacity, transform;
    }

    .inspoclip-analysis-stack .inspoclip-toast.inspoclip-toast-visible {
      transform: translateX(0) scale(var(--inspoclip-analysis-stack-scale, 1));
    }

    .inspoclip-analysis-stack .inspoclip-toast + .inspoclip-toast {
      margin-top: -32px;
    }

    .inspoclip-analysis-stack.is-expanded .inspoclip-toast + .inspoclip-toast,
    .inspoclip-analysis-stack:focus-within .inspoclip-toast + .inspoclip-toast {
      margin-top: 8px;
    }

    .inspoclip-analysis-stack.is-expanded .inspoclip-toast.inspoclip-toast-visible,
    .inspoclip-analysis-stack:focus-within .inspoclip-toast.inspoclip-toast-visible {
      transform: translateX(0) scale(1);
    }

    .inspoclip-analysis-stack .inspoclip-toast.inspoclip-toast-leaving,
    .inspoclip-analysis-stack.is-expanded .inspoclip-toast.inspoclip-toast-leaving,
    .inspoclip-analysis-stack:focus-within .inspoclip-toast.inspoclip-toast-leaving {
      opacity: 0;
      transform: translateX(16px) scale(.96);
    }

    @media (prefers-reduced-motion: reduce) {
      .inspoclip-analysis-stack .inspoclip-toast {
        transition-duration: 1ms;
      }
    }

    @keyframes inspoclip-toast-char-jump {
      0%, 18%, 100% { transform: translateY(0); }
      9% { transform: translateY(-2.5px); }
    }

    /* Modal Overlay */
    .inspoclip-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2147483647;
      pointer-events: auto;
      animation: inspoclip-fade-in 0.3s ease;
    }

    @keyframes inspoclip-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Modal */
    .inspoclip-modal {
      position: fixed;
      left: var(--target-x);
      top: var(--target-y);
      width: 380px;
      max-height: calc(100vh - 40px);
      background: #faf3e6;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      /* Start from origin position */
      opacity: 0;
      transform: scale(0.5) translate(calc(var(--origin-x) - var(--target-x)), calc(var(--origin-y) - var(--target-y)));
      transform-origin: top right;
      transition: opacity 0.35s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .inspoclip-modal-visible {
      opacity: 1;
      transform: scale(1) translate(0, 0);
    }

    .inspoclip-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px dashed #e8d5b0;
      flex-shrink: 0;
    }

    .inspoclip-modal-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Similar badge */
    .inspoclip-similar-badge {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 8px;
      background: #ff980018;
      color: #e65100;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .inspoclip-similar-badge:hover {
      background: #ff980030;
    }

    .inspoclip-similar-icon { font-size: 11px; }
    .inspoclip-similar-count { font-variant-numeric: tabular-nums; }

    /* Tooltip */
    .inspoclip-similar-tooltip {
      position: absolute;
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border-radius: 10px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.15);
      padding: 10px;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
      pointer-events: none;
      z-index: 10;
      min-width: 160px;
    }

    .inspoclip-similar-badge:hover .inspoclip-similar-tooltip {
      opacity: 1;
      visibility: visible;
    }

    .inspoclip-similar-tooltip-title {
      display: block;
      font-size: 10px;
      color: #8a7060;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .inspoclip-similar-previews {
      display: flex;
      gap: 4px;
    }

    .inspoclip-similar-thumb {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #e8d5b0;
      background: #f0e6d6;
    }

    .inspoclip-modal-header h3 {
      font-size: 15px;
      font-weight: 700;
      color: #c0784a;
      margin: 0;
    }

    .inspoclip-modal-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .inspoclip-nav-btn {
      background: none;
      border: none;
      font-size: 10px;
      color: #8a7060;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
      transition: background 0.2s, color 0.2s;
      line-height: 1;
    }

    .inspoclip-nav-btn:hover { background: #e8d5b0; color: #4a3028; }
    .inspoclip-nav-btn:disabled { opacity: 0.3; cursor: default; }
    .inspoclip-nav-btn:disabled:hover { background: transparent; color: #8a7060; }

    .inspoclip-nav-index {
      font-size: 10px;
      color: #8a7060;
      min-width: 28px;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .inspoclip-modal-close {
      background: none;
      border: none;
      font-size: 16px;
      color: #8a7060;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.2s;
    }

    .inspoclip-modal-close:hover { background: #e8d5b0; }

    /* Preview */
    .inspoclip-preview {
      max-height: 140px;
      overflow: hidden;
      background: #f0e6d6;
    }

    .inspoclip-preview-trigger {
      display: block;
      width: 100%;
      border: 0;
      background: transparent;
      cursor: zoom-in;
      padding: 0;
    }

    .inspoclip-preview img {
      width: 100%;
      height: auto;
      max-height: 140px;
      object-fit: cover;
      display: block;
      cursor: zoom-in;
      transition: transform 0.24s cubic-bezier(.22,.8,.24,1);
    }

    .inspoclip-preview-trigger:hover img,
    .inspoclip-preview-trigger:focus-visible img { transform: scale(1.025); }

    .inspoclip-preview-trigger:focus-visible {
      outline: 2px solid #c0784a;
      outline-offset: -2px;
    }

    .inspoclip-image-lightbox {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      box-sizing: border-box;
      padding: 32px;
      background: rgba(32, 22, 18, 0.72);
      opacity: 0;
      pointer-events: auto;
      transition: opacity 0.22s ease;
    }

    .inspoclip-image-lightbox-visible { opacity: 1; }

    .inspoclip-image-lightbox img {
      display: block;
      max-width: 100%;
      max-height: calc(100vh - 64px);
      border-radius: 8px;
      box-shadow: 0 18px 56px rgba(0, 0, 0, 0.38);
      object-fit: contain;
      transform: scale(0.96);
      transition: transform 0.26s cubic-bezier(.22,.8,.24,1);
    }

    .inspoclip-image-lightbox-visible img { transform: scale(1); }

    .inspoclip-image-lightbox-close {
      position: absolute;
      top: 16px;
      right: 16px;
      display: grid;
      width: 34px;
      height: 34px;
      place-items: center;
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 50%;
      background: rgba(30, 20, 16, 0.45);
      color: white;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
    }

    /* Body */
    .inspoclip-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
    }

    .inspoclip-modal-body::-webkit-scrollbar { width: 4px; }
    .inspoclip-modal-body::-webkit-scrollbar-thumb { background: #d4c4b0; border-radius: 2px; }

    /* Sections */
    .inspoclip-section {
      margin-bottom: 14px;
    }

    .inspoclip-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .inspoclip-section-title {
      font-size: 11px;
      font-weight: 600;
      color: #8a7060;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .inspoclip-copy-all {
      background: transparent;
      border: 0;
      border-radius: 4px;
      color: var(--text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 22px;
      width: 22px;
      padding: 4px;
      transition: background 160ms ease, color 160ms ease;
    }

    .inspoclip-copy-all svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.7;
    }

    .inspoclip-copy-all:hover:not(:disabled) {
      background: var(--muted);
      color: var(--text);
    }

    .inspoclip-copy-all-copied {
      background: #eef8ef;
      border-color: #b8dfbd;
      color: #3f9a4c;
    }

    .inspoclip-prompt-regenerate:disabled {
      cursor: wait;
      opacity: 0.6;
    }

    .inspoclip-prompt-regenerate.is-loading svg {
      animation: inspoclip-prompt-refresh-spin 0.85s linear infinite;
    }

    @keyframes inspoclip-prompt-refresh-spin {
      to { transform: rotate(360deg); }
    }

    /* Terms */
    .inspoclip-terms {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .inspoclip-term {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 4px 8px;
      background: #c0784a12;
      color: #c0784a;
      border-radius: 14px;
      font-size: 12px;
      font-weight: 500;
    }

    .inspoclip-term-part {
      cursor: pointer;
      padding: 0 2px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .inspoclip-term-part:hover { background: #c0784a20; text-decoration: underline; }
    .inspoclip-copied { background: #4caf5020 !important; color: #4caf50 !important; text-decoration: none !important; }
    .inspoclip-check-mark { color: #4caf50; font-weight: 600; font-size: 12px; animation: inspoclip-check-in 0.25s ease; }
    @keyframes inspoclip-check-in { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
    .inspoclip-term-sep { opacity: 0.35; user-select: none; }

    /* Colors */
    .inspoclip-colors {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .inspoclip-color {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px 4px 5px;
      background: white;
      border: 1px solid #e8d5b0;
      border-radius: 8px;
      font-size: 11px;
      font-family: 'SF Mono', 'Consolas', monospace;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .inspoclip-color:hover { border-color: #c0784a; }

    .inspoclip-color-dot {
      width: 16px;
      height: 16px;
      border-radius: 5px;
      border: 1px solid rgba(0,0,0,0.1);
      flex-shrink: 0;
    }

    /* Prompt */
    .inspoclip-prompt-controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .inspoclip-lang-group {
      display: inline-flex;
      align-items: center;
      background: color-mix(in srgb, var(--muted) 84%, transparent);
      border-radius: 5px;
      padding: 2px;
      gap: 0;
    }

    .inspoclip-lang-btn {
      min-width: 25px;
      height: 20px;
      padding: 0 4px;
      border: none;
      background: transparent;
      font-size: 9px;
      line-height: 20px;
      font-weight: 400;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 3px;
      transition: color 160ms ease, background 160ms ease, box-shadow 160ms ease;
    }

    .inspoclip-lang-btn.active {
      background: var(--card);
      color: var(--accent);
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }

    .inspoclip-prompt {
      font-size: 12px;
      line-height: 1.6;
      color: #4a3028;
      background: white;
      padding: 10px 12px;
      border-radius: 10px;
      max-height: 100px;
      overflow-y: auto;
      white-space: pre-wrap;
    }

    /* Footer */
    .inspoclip-modal-footer {
      display: flex;
      gap: 0;
      padding: 14px 18px;
      border-top: 1px dashed #e8d5b0;
      flex-shrink: 0;
    }

    .inspoclip-modal-footer .inspoclip-btn { margin: 0 4px; }

    .inspoclip-btn {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .inspoclip-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .inspoclip-btn:active { transform: translateY(0); }
    .inspoclip-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    .inspoclip-btn-primary { background: #c0784a; color: white; }
    .inspoclip-btn-secondary { background: #e8d5b0; color: #4a3028; }

    /* Confirm Dialog */
    .inspoclip-confirm-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2147483647;
      pointer-events: auto;
      animation: inspoclip-fade-in 0.2s ease;
    }

    .inspoclip-confirm {
      position: fixed;
      top: 80px;
      right: 20px;
      width: 340px;
      background: #faf3e6;
      border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.18);
      padding: 18px;
      opacity: 0;
      transform: scale(0.9) translateY(-10px);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .inspoclip-confirm-visible {
      opacity: 1;
      transform: scale(1) translateY(0);
    }

    .inspoclip-confirm-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .inspoclip-confirm-icon { font-size: 18px; }

    .inspoclip-confirm-header h3 {
      font-size: 14px;
      font-weight: 700;
      color: #4a3028;
      margin: 0;
    }

    .inspoclip-confirm-desc {
      font-size: 12px;
      color: #8a7060;
      margin: 0 0 12px 0;
      line-height: 1.5;
    }

    .inspoclip-confirm-previews {
      display: flex;
      gap: 6px;
      margin-bottom: 14px;
    }

    .inspoclip-confirm-previews img {
      width: 56px;
      height: 56px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #e8d5b0;
    }

    .inspoclip-confirm-actions {
      display: flex;
      gap: 8px;
    }

    /* Area Capture Overlay */
    .inspoclip-area-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2147483647;
      cursor: crosshair;
      pointer-events: auto;
      background: rgba(0, 0, 0, 0.15);
    }

    .inspoclip-area-overlay-selected {
      cursor: default;
    }

    .inspoclip-area-overlay-selected .inspoclip-area-selection {
      cursor: move;
      pointer-events: auto;
      touch-action: none;
    }

    .inspoclip-area-overlay-adjusting,
    .inspoclip-area-overlay-adjusting .inspoclip-area-selection {
      user-select: none;
    }

    .inspoclip-area-overlay-recording {
      right: auto;
      bottom: auto;
      width: 0;
      height: 0;
      overflow: visible;
      pointer-events: none;
      background: transparent;
    }

    .inspoclip-area-overlay-recording .inspoclip-area-selection {
      border-color: #c0784a;
      box-shadow: none;
      background: transparent;
      pointer-events: none;
    }

    .inspoclip-area-overlay-paused .inspoclip-area-selection {
      border-style: dashed;
      border-color: #f5a623;
    }

    .inspoclip-area-instructions {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      pointer-events: none;
      white-space: nowrap;
    }

    .inspoclip-area-selection {
      position: fixed;
      border: 2px solid #c0784a;
      background: rgba(192, 120, 74, 0.1);
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      z-index: 2;
    }

    .inspoclip-area-handle {
      position: absolute;
      display: block;
      width: 20px;
      height: 20px;
      transform: translate(-50%, -50%);
      pointer-events: auto;
      touch-action: none;
      z-index: 3;
    }

    .inspoclip-area-handle::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 8px;
      height: 8px;
      border: 2px solid #fffaf2;
      border-radius: 999px;
      background: #c0784a;
      box-shadow: 0 1px 4px rgba(74, 48, 40, 0.32);
      transform: translate(-50%, -50%);
      transition: width 0.12s ease, height 0.12s ease, background 0.12s ease;
    }

    .inspoclip-area-handle:hover::after {
      width: 10px;
      height: 10px;
      background: #a95f38;
    }

    .inspoclip-area-handle[data-handle="nw"] { left: 0; top: 0; cursor: nwse-resize; }
    .inspoclip-area-handle[data-handle="n"] { left: 50%; top: 0; cursor: ns-resize; }
    .inspoclip-area-handle[data-handle="ne"] { left: 100%; top: 0; cursor: nesw-resize; }
    .inspoclip-area-handle[data-handle="e"] { left: 100%; top: 50%; cursor: ew-resize; }
    .inspoclip-area-handle[data-handle="se"] { left: 100%; top: 100%; cursor: nwse-resize; }
    .inspoclip-area-handle[data-handle="s"] { left: 50%; top: 100%; cursor: ns-resize; }
    .inspoclip-area-handle[data-handle="sw"] { left: 0; top: 100%; cursor: nesw-resize; }
    .inspoclip-area-handle[data-handle="w"] { left: 0; top: 50%; cursor: ew-resize; }

    .inspoclip-area-overlay-recording .inspoclip-area-handle {
      display: none;
    }

    .inspoclip-area-hover {
      position: fixed;
      border: 2px dashed #4caf50;
      background: rgba(76, 175, 80, 0.08);
      pointer-events: none;
      z-index: 1;
      transition: left 0.1s ease, top 0.1s ease, width 0.1s ease, height 0.1s ease;
      border-radius: 2px;
    }

    .inspoclip-area-loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .inspoclip-area-toolbar {
      position: fixed;
      z-index: 4;
      width: max-content;
      max-width: calc(100vw - 24px);
      box-sizing: border-box;
      border: 1px solid rgba(224, 190, 148, 0.92);
      border-radius: 13px;
      background: rgba(255, 250, 242, 0.96);
      box-shadow: 0 10px 28px rgba(74, 48, 40, 0.18), 0 2px 8px rgba(74, 48, 40, 0.07);
      color: #4a3028;
      padding: 5px;
      pointer-events: auto;
      cursor: default;
      backdrop-filter: blur(8px);
      transform-origin: calc(100% - 20px) 0;
      animation: inspoclip-area-dock-arrive 0.36s cubic-bezier(0.2, 0.9, 0.25, 1.25) both;
    }

    .inspoclip-area-toolbar::before {
      content: "";
      position: absolute;
      right: 17px;
      width: 10px;
      height: 10px;
      background: rgba(255, 250, 242, 0.96);
      border-left: 1px solid rgba(224, 190, 148, 0.92);
      border-top: 1px solid rgba(224, 190, 148, 0.92);
      transform: rotate(45deg);
    }

    .inspoclip-area-toolbar[data-placement="bottom"]::before {
      top: -6px;
    }

    .inspoclip-area-toolbar[data-placement="top"]::before {
      bottom: -6px;
      transform: rotate(225deg);
    }

    .inspoclip-area-toolbar[data-placement="top"] {
      transform-origin: calc(100% - 20px) 100%;
    }

    .inspoclip-area-toolbar-main,
    .inspoclip-area-toolbar-recording {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .inspoclip-area-toolbar-main {
      flex-wrap: nowrap;
    }

    .inspoclip-area-icon-button,
    .inspoclip-area-icon-status {
      appearance: none;
      position: relative;
      display: inline-grid;
      width: 38px;
      height: 38px;
      box-sizing: border-box;
      place-items: center;
      flex: 0 0 38px;
      border: none;
      border-radius: 10px;
      background: #e8d5b0;
      color: #4a3028;
      padding: 0;
      line-height: 1;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
    }

    .inspoclip-area-icon-button {
      cursor: pointer;
    }

    .inspoclip-area-control-enter {
      transform-origin: center;
      animation: inspoclip-area-control-enter 0.36s cubic-bezier(0.2, 0.86, 0.28, 1.24) var(--inspoclip-area-control-enter-delay, 0ms) backwards;
    }

    .inspoclip-area-button-icon {
      display: grid;
      place-items: center;
      transform: translateY(0) scale(1);
      transform-origin: center;
      transition: transform 0.24s cubic-bezier(0.2, 0.82, 0.25, 1);
      pointer-events: none;
    }

    .inspoclip-area-button-icon svg,
    .inspoclip-area-icon-status svg {
      display: block;
      width: 16px;
      height: 16px;
    }

    .inspoclip-area-button-label {
      position: absolute;
      right: 3px;
      bottom: 4px;
      left: 3px;
      overflow: hidden;
      color: currentColor;
      font-size: 9px;
      font-weight: 750;
      line-height: 1;
      text-align: center;
      text-overflow: clip;
      white-space: nowrap;
      opacity: 0;
      transform: translateY(5px) scale(0.92);
      transform-origin: center bottom;
      transition: opacity 0.18s ease, transform 0.24s cubic-bezier(0.2, 0.82, 0.25, 1);
      pointer-events: none;
    }

    .inspoclip-area-icon-button:hover .inspoclip-area-button-icon,
    .inspoclip-area-icon-button:focus-visible .inspoclip-area-button-icon,
    .inspoclip-area-action-confirm .inspoclip-area-button-icon {
      transform: translateY(-6px) scale(0.76);
    }

    .inspoclip-area-icon-button:hover .inspoclip-area-button-label,
    .inspoclip-area-icon-button:focus-visible .inspoclip-area-button-label,
    .inspoclip-area-action-confirm .inspoclip-area-button-label {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .inspoclip-area-icon-button:hover {
      z-index: 2;
      background: #f0dfc4;
      box-shadow: 0 4px 10px rgba(74, 48, 40, 0.13);
      transform: translateY(-1px);
    }

    .inspoclip-area-icon-button:active {
      transform: translateY(0) scale(0.94);
    }

    .inspoclip-area-icon-button:focus-visible {
      outline: 2px solid rgba(192, 120, 74, 0.55);
      outline-offset: 2px;
    }

    .inspoclip-area-icon-button:disabled {
      opacity: 0.62;
      cursor: wait;
      transform: none;
      box-shadow: none;
    }

    .inspoclip-area-icon-button-primary {
      background: #c0784a;
      color: #fffaf2;
    }

    .inspoclip-area-icon-button-primary:hover {
      background: #ad6840;
      color: #fff;
    }

    .inspoclip-area-icon-button-quiet {
      background: transparent;
      color: #8a7060;
    }

    .inspoclip-area-icon-button-active,
    .inspoclip-area-icon-status.inspoclip-area-icon-button-active {
      background: rgba(192, 120, 74, 0.14);
      color: #a65f37;
      box-shadow: inset 0 0 0 1px rgba(192, 120, 74, 0.24);
    }

    .inspoclip-area-icon-status-disabled {
      background: #f0ece8;
      color: #9b938d;
      box-shadow: inset 0 0 0 1px rgba(155, 147, 141, 0.2);
      opacity: 0.72;
      cursor: not-allowed;
      filter: saturate(0.45);
    }

    .inspoclip-area-delay-button {
      overflow: visible;
    }

    .inspoclip-area-delay-badge {
      position: absolute;
      right: -3px;
      top: -3px;
      min-width: 16px;
      height: 14px;
      box-sizing: border-box;
      padding: 0 3px;
      border: 1px solid rgba(255, 250, 242, 0.95);
      border-radius: 999px;
      background: #a65f37;
      color: #fffaf2;
      font-size: 8px;
      font-weight: 750;
      line-height: 12px;
      letter-spacing: -0.02em;
      pointer-events: none;
    }

    .inspoclip-area-recording-countdown {
      position: absolute;
      left: 50%;
      top: 50%;
      z-index: 6;
      display: grid;
      width: 72px;
      height: 72px;
      place-items: center;
      border: 1px solid rgba(255, 250, 242, 0.72);
      border-radius: 999px;
      background: rgba(74, 48, 40, 0.82);
      box-shadow: 0 14px 38px rgba(38, 23, 18, 0.24);
      color: #fffaf2;
      font-size: 34px;
      font-weight: 700;
      line-height: 1;
      pointer-events: none;
      transform: translate(-50%, -50%);
      animation: inspoclip-recording-countdown-pop 1s cubic-bezier(0.2, 0.85, 0.3, 1) both;
    }

    .inspoclip-area-toolbar-separator {
      width: 1px;
      height: 18px;
      margin: 0 2px;
      background: rgba(192, 120, 74, 0.22);
      flex: 0 0 1px;
    }

    .inspoclip-area-record-time {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-width: 58px;
      padding: 0 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      font-weight: 700;
      color: #4a3028;
      white-space: nowrap;
    }

    .inspoclip-area-record-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #f44336;
      box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.13);
      animation: inspoclip-record-breathe 1.4s ease-in-out infinite;
      flex-shrink: 0;
      transition: background 0.2s ease, box-shadow 0.2s ease;
    }

    .inspoclip-area-overlay-paused .inspoclip-area-record-dot {
      background: #9b938d;
      box-shadow: 0 0 0 3px rgba(155, 147, 141, 0.14);
      animation: none;
    }

    .inspoclip-area-action-confirm {
      background: #fbe7e3;
      color: #c43d32;
      box-shadow: inset 0 0 0 1px rgba(196, 61, 50, 0.18);
      animation: inspoclip-retake-confirm 0.42s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }

    .inspoclip-area-action-confirm:hover,
    .inspoclip-area-action-confirm:focus-visible {
      background: #f8d8d2;
      color: #b83229;
    }

    .inspoclip-area-action-processing[data-action="retake"] svg {
      animation: inspoclip-retake-turn 0.64s cubic-bezier(0.4, 0, 0.2, 1) both;
    }

    .inspoclip-area-action-completing {
      animation: inspoclip-complete-bounce 0.52s cubic-bezier(0.2, 0.9, 0.25, 1.3) both;
    }

    .inspoclip-area-icon-swap {
      animation: inspoclip-area-icon-swap 0.22s cubic-bezier(0.2, 0.9, 0.25, 1.25) both;
    }

    .inspoclip-area-sound-pop {
      animation: inspoclip-area-sound-pop 0.36s cubic-bezier(0.2, 0.9, 0.25, 1.3) both;
    }

    .inspoclip-area-sound-pop::before {
      content: "";
      position: absolute;
      inset: 5px;
      border: 1px solid #c0784a;
      border-radius: 7px;
      pointer-events: none;
      animation: inspoclip-area-sound-ring 0.52s ease-out both;
    }

    .inspoclip-area-toolbar-state-change {
      animation: inspoclip-area-dock-arrive 0.36s cubic-bezier(0.2, 0.9, 0.25, 1.25) both;
    }

    @keyframes inspoclip-area-dock-arrive {
      from { opacity: 0; transform: translateY(-7px) scale(0.94); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes inspoclip-area-control-enter {
      from { opacity: 0; transform: translateX(-5px) scale(0.64); }
      68% { opacity: 1; transform: translateX(0) scale(1.08); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }

    @keyframes inspoclip-area-sound-pop {
      0% { transform: scale(0.82); }
      65% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }

    @keyframes inspoclip-area-icon-swap {
      0% { transform: scale(0.86); }
      70% { transform: scale(1.06); }
      100% { transform: scale(1); }
    }

    @keyframes inspoclip-area-sound-ring {
      from { opacity: 0.7; transform: scale(0.65); }
      to { opacity: 0; transform: scale(1.7); }
    }

    @keyframes inspoclip-record-breathe {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.48; transform: scale(0.78); }
    }

    @keyframes inspoclip-retake-confirm {
      0%, 100% { transform: translateX(0); }
      30% { transform: translateX(-2px); }
      55% { transform: translateX(2px); }
      75% { transform: translateX(-1px); }
    }

    @keyframes inspoclip-retake-turn {
      from { transform: rotate(0); }
      to { transform: rotate(-360deg); }
    }

    @keyframes inspoclip-complete-bounce {
      0% { transform: scale(1); }
      45% { transform: scale(0.88); }
      72% { transform: scale(1.14); }
      100% { transform: scale(1); }
    }

    @keyframes inspoclip-recording-countdown-pop {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.78); }
      18% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
      78% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0.92; transform: translate(-50%, -50%) scale(0.94); }
    }

    @media (prefers-reduced-motion: reduce) {
      .inspoclip-area-toolbar,
      .inspoclip-area-toolbar *,
      .inspoclip-area-toolbar *::before,
      .inspoclip-area-toolbar *::after {
        animation-duration: 1ms !important;
        animation-delay: 0ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 1ms !important;
      }

      .inspoclip-area-recording-countdown {
        animation: none !important;
      }
    }

    /* Video analysis modal */
    .inspoclip-video-modal {
      width: 460px;
      max-height: calc(100vh - 40px);
    }

    .inspoclip-video-preview {
      padding: 10px 12px 0;
      background: #fffaf2;
      position: relative;
      z-index: 1;
      pointer-events: auto;
    }

    .inspoclip-video-preview video {
      display: block;
      width: 100%;
      max-height: 210px;
      border-radius: 12px;
      background: #111;
      box-shadow: 0 4px 14px rgba(74,48,40,0.12);
      pointer-events: auto;
    }

    .inspoclip-video-preview-status {
      margin-top: 6px;
      color: #8a7060;
      font-size: 11px;
      line-height: 1.4;
      text-align: center;
    }

    .inspoclip-video-summary {
      color: #4a3028;
      font-size: 12px;
      line-height: 1.6;
      margin: 0;
    }

    .inspoclip-video-stages {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .inspoclip-video-stage {
      appearance: none;
      display: block;
      width: 100%;
      border: 1px solid #ead8ba;
      border-radius: 12px;
      padding: 10px;
      background: linear-gradient(135deg, #fffaf2, #f7ead6);
      color: inherit;
      cursor: pointer;
      font: inherit;
      text-align: left;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    }

    .inspoclip-video-stage:hover,
    .inspoclip-video-stage:focus-visible {
      border-color: #c0784a;
      box-shadow: 0 6px 18px rgba(192,120,74,0.14);
      transform: translateY(-1px);
      outline: none;
    }

    .inspoclip-video-stage-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
      color: #4a3028;
      font-size: 12px;
      font-weight: 700;
    }

    .inspoclip-video-stage-head em {
      color: #9a8070;
      font-size: 10px;
      font-style: normal;
      white-space: nowrap;
    }

    .inspoclip-video-stage-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 6px;
      margin-bottom: 8px;
    }

    .inspoclip-video-stage-grid div {
      display: grid;
      grid-template-columns: 46px 1fr;
      gap: 8px;
      font-size: 11px;
      line-height: 1.45;
    }

    .inspoclip-video-stage-grid b {
      color: #c0784a;
      font-weight: 700;
    }

    .inspoclip-video-stage-grid span {
      color: #5c463c;
    }

    .inspoclip-video-actions {
      margin: 0;
      padding-left: 18px;
      color: #6b5448;
      font-size: 11px;
      line-height: 1.55;
    }

    .inspoclip-video-prompt-section {
      background: linear-gradient(135deg, #fffaf2, #f7ead6);
      border: 1px solid #ead8ba;
      border-radius: 14px;
      padding: 10px;
    }

    .inspoclip-video-purpose-group {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }

    .inspoclip-video-purpose-btn {
      border: 1px solid #e2c9a8;
      background: #fff8ef;
      color: #6b4a3a;
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      pointer-events: auto;
      transition: all 0.2s ease;
    }

    .inspoclip-video-purpose-btn:hover,
    .inspoclip-video-purpose-btn.active {
      background: #c0784a;
      border-color: #c0784a;
      color: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,.12);
    }

    .inspoclip-video-prompt-target-wrap {
      margin-bottom: 8px;
    }

    .inspoclip-video-prompt-target {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid #e2c9a8;
      border-radius: 10px;
      background: #fffdf8;
      color: #4a3028;
      font-size: 11px;
      padding: 7px 9px;
      outline: none;
      pointer-events: auto;
    }

    .inspoclip-video-prompt-target:focus {
      border-color: #c0784a;
      box-shadow: 0 0 0 2px rgba(192, 120, 74, 0.12);
    }

    .inspoclip-video-prompt-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }

    .inspoclip-video-prompt-generate {
      min-height: 26px;
      padding: 6px 10px;
      font-size: 11px;
      white-space: nowrap;
    }

    .inspoclip-video-prompt-output {
      max-height: 220px;
      overflow: auto;
      word-break: break-word;
      margin: 0;
      border-radius: 12px;
      border: 1px dashed #ddc39d;
      background: rgba(255, 253, 248, 0.92);
      color: #4a3028;
      font-size: 11px;
      line-height: 1.6;
      padding: 10px;
      font-family: inherit;
    }

    .inspoclip-video-prompt-output h1,
    .inspoclip-video-prompt-output h2,
    .inspoclip-video-prompt-output h3 {
      margin: 8px 0 6px;
      color: #3d2a22;
      line-height: 1.35;
      font-weight: 700;
    }

    .inspoclip-video-prompt-output h1 { font-size: 14px; }
    .inspoclip-video-prompt-output h2 { font-size: 13px; }
    .inspoclip-video-prompt-output h3 { font-size: 12px; }

    .inspoclip-video-prompt-output p {
      margin: 0 0 8px;
    }

    .inspoclip-video-prompt-output ul {
      margin: 4px 0 8px;
      padding-left: 18px;
    }

    .inspoclip-video-prompt-output li {
      margin: 2px 0;
    }

    .inspoclip-video-prompt-output code {
      border-radius: 5px;
      background: rgba(192, 120, 74, 0.12);
      padding: 1px 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 10.5px;
    }

    .inspoclip-video-prompt-output pre {
      margin: 6px 0 10px;
      border-radius: 10px;
      background: rgba(74, 48, 40, 0.06);
      padding: 8px;
      overflow: auto;
      white-space: pre-wrap;
    }

    .inspoclip-video-prompt-output pre code {
      display: block;
      background: transparent;
      padding: 0;
    }

    .inspoclip-video-prompt-placeholder {
      color: #9a8070;
      font-family: inherit;
    }

    .inspoclip-empty {
      color: #9a8070;
      font-size: 11px;
      margin: 0;
    }

    /* Floating Tab */
    .inspoclip-tab {
      position: fixed;
      right: 0;
      top: 50%;
      z-index: 2147483646;
      display: flex;
      align-items: center;
      gap: 0;
      padding: 10px 10px 10px 10px;
      background: #c0784a;
      color: white;
      border-radius: 10px 0 0 10px;
      cursor: pointer;
      box-shadow: -2px 2px 12px rgba(0,0,0,0.15);
      user-select: none;
      pointer-events: auto;
      /* Start fully hidden behind right edge */
      transform: translateY(-50%) translateX(100%);
      transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .inspoclip-tab-visible {
      transform: translateY(-50%) translateX(0);
    }

    .inspoclip-tab-visible:hover {
      transform: translateY(-50%) translateX(0);
    }

    .inspoclip-tab-arrow {
      font-size: 14px;
      line-height: 1;
      flex-shrink: 0;
      transition: transform 0.2s;
    }

    .inspoclip-tab-visible:hover .inspoclip-tab-arrow {
      transform: translateX(-2px);
    }

    .inspoclip-tab-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.3px;
      white-space: nowrap;
      overflow: hidden;
      max-width: 0;
      opacity: 0;
      transition: max-width 0.25s ease, opacity 0.2s ease;
    }

    .inspoclip-tab-visible:hover .inspoclip-tab-label {
      max-width: 80px;
      opacity: 1;
    }

    /* Context Menu */
    .inspoclip-ctx-menu {
      position: fixed;
      z-index: 2147483647;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      padding: 4px;
      pointer-events: auto;
      animation: inspoclip-fade-in 0.15s ease;
    }

    .inspoclip-ctx-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      font-size: 12px;
      color: #4a3028;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.15s;
      white-space: nowrap;
    }

    .inspoclip-ctx-item:hover {
      background: #f0e6d6;
    }

    .inspoclip-ctx-item-icon {
      font-size: 13px;
      width: 16px;
      text-align: center;
    }
  `;
}

