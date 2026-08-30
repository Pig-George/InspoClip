# InspoClip Browser Extension

Save design inspiration from any webpage directly to your InspoClip collection.

## Development

Install dependencies once:

```bash
pnpm install
```

Run checks:

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Source layout

- `popup.tsx` is the Plasmo popup entry and delegates to `src/popup/PopupApp.tsx`.
- `src/popup/components/` contains presentational popup components.
- `src/popup/hooks/` contains popup state and orchestration logic.
- `src/popup/services/` wraps browser APIs used by the popup.
- `background.ts` is the service worker entry and delegates to `src/background/`.
- `contents/inspoclip.ts` is the Plasmo content-script entry. UI orchestration still lives here while shared content helpers/styles are extracted under `src/content/`.

## Installation

### Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Run `pnpm build`
5. Select `extension/build/chrome-mv3-prod`

### Firefox
Firefox packaging is handled by Plasmo browser targets. The current default build target is Chrome MV3.

## Usage

- **Right-click** on any image or page → "Save to InspoClip"
- **Click** the extension icon → "Capture This Page"
- Configure the runtime mode in popup settings: **Local mode** or **Backend service**
- Right-click a webpage video and choose **Save and analyze video with InspoClip**
- Or select a local MP4/MOV/WebM file or paste a public video URL in the popup
- The popup shows analysis progress; use **View full analysis** for the timeline and prompt outputs

Protected, cross-origin, and `blob:` video URLs may not be downloadable by the extension. Save those videos locally and upload the file instead.

## Requirements

### Local mode

Local mode does not require an InspoClip server. Configure an AI provider in popup settings, including the API endpoint, model name, and API key. Supported presets are Alibaba Cloud Model Studio, OpenAI, OpenRouter, and other OpenAI-compatible services. Video analysis for non-Bailian providers uses the configured 4–48 frame sample count when full-video input is unavailable.

Images, videos, analysis results, and prompt jobs are stored in the browser using IndexedDB and OPFS. Local mode data is isolated from backend mode data and is not copied automatically when switching modes. Browser extension uninstall or cleared site data can remove local assets, so export backups regularly.

### Backend service mode

Run the InspoClip server (default: `http://localhost:3001`) and configure its URL in popup settings. Backend mode keeps the extension connected to the server workspace and uses the server's configured AI provider.
