# InspoClip Browser Extension

Save design inspiration from any webpage directly to your InspoClip collection.

## Development

Install dependencies once:

```bash
npm install
```

Run checks:

```bash
npm test
npm run typecheck
npm run build
```

## Installation

### Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Run `npm run build`
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
