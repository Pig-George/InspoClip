export const DEFAULT_SERVER_URL = "http://127.0.0.1:3001"

export const CONTEXT_MENUS = [
  { id: "inspoclip-save-image", title: "Save Image to InspoClip", contexts: ["image"] },
  { id: "inspoclip-save-video", title: "Save and analyze video with InspoClip", contexts: ["video"] },
  { id: "inspoclip-save-page", title: "Save Page to InspoClip", contexts: ["page"] },
  { id: "inspoclip-analyze-image", title: "Analyze Image with InspoClip", contexts: ["image"] },
  { id: "inspoclip-analyze-page", title: "Analyze Page with InspoClip", contexts: ["page"] }
] satisfies chrome.contextMenus.CreateProperties[]
