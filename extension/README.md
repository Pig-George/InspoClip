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
- Configure your InspoClip server URL in the popup settings
- Right-click a webpage video and choose **Save and analyze video with InspoClip**
- Or select a local MP4/MOV/WebM file or paste a public video URL in the popup
- The popup shows analysis progress; use **View full analysis** for the timeline and prompt outputs

Protected, cross-origin, and `blob:` video URLs may not be downloadable by the extension. Save those videos locally and upload the file instead.

## Requirements

- InspoClip server running (default: http://localhost:3001)
