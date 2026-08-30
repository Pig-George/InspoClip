import type { Locale, TimelineCopy } from "./types"

export const TIMELINE_COPY: Record<Locale, TimelineCopy> = {
  zh: {
    subtitle: "把灵感整理成可复用的素材库",
    day: "日视图", week: "周视图", timeline: "时间轴", today: "今天", ideas: "灵感", all: "全部",
    search: "搜索素材、标题、标签或分析内容", refresh: "刷新", loading: "加载中...", empty: "还没有保存的灵感",
    emptyHint: "从插件捕获图片或录屏，保存后会出现在这里。", image: "图片", video: "视频",
    openDetail: "打开详情", close: "关闭", copy: "复制 Prompt", copied: "已复制", generatePrompt: "生成 Prompt", regeneratePrompt: "重新生成", generatingPrompt: "正在生成...", languageAuto: "Auto", languageEn: "EN", languageZh: "中", languageBoth: "EN/中",
    replicationTitle: "复刻输出", replicationDescription: "按用途整理成可复制的提示词。", purposeLabel: "用途", targetLabel: "目标平台", targetPlaceholder: "可选：Sora、React、After Effects…", generateOutput: "生成输出", generatingOutput: "生成中…",
    uploadAssets: "上传图片或视频", uploadHint: "点击、拖拽或粘贴素材后开始分析", uploading: "正在上传并分析...", uploadFailed: "素材导入失败", pasteOrDrop: "粘贴或拖拽素材", saveAsset: "保存到 InspoClip", saved: "已保存", noPrompt: "暂无 Prompt",
    stages: "阶段分析", colors: "配色方案", terms: "设计术语", tags: "标签", overview: "内容概览", assets: "个灵感", notes: "笔记", notesPlaceholder: "在这里写周笔记...", theme: "切换主题",
    language: "切换语言", export: "导出", previous: "上一个", next: "下一个", noContent: "暂无内容",
    previewUnavailable: "预览不可用", analysisPending: "分析完成", stageEmpty: "分析完成后将在此显示阶段时间线。", analysisFailed: "分析失败", unknown: "未命名灵感"
  },
  en: {
    subtitle: "Turn inspiration into a reusable library",
    day: "Day", week: "Week", timeline: "Timeline", today: "Today", ideas: "Ideas", all: "All",
    search: "Search assets, titles, tags or analysis", refresh: "Refresh", loading: "Loading...", empty: "No saved inspirations yet",
    emptyHint: "Capture an image or recording from the extension and save it here.", image: "Image", video: "Video",
    openDetail: "Open details", close: "Close", copy: "Copy prompt", copied: "Copied", generatePrompt: "Generate prompt", regeneratePrompt: "Regenerate", generatingPrompt: "Generating...", languageAuto: "Auto", languageEn: "EN", languageZh: "中", languageBoth: "EN/中",
    replicationTitle: "Replication output", replicationDescription: "Organize prompts by purpose.", purposeLabel: "Purpose", targetLabel: "Target platform", targetPlaceholder: "Optional: Sora, React, After Effects…", generateOutput: "Generate output", generatingOutput: "Generating...",
    uploadAssets: "Upload image or video", uploadHint: "Click, drop, or paste an asset to start analysis", uploading: "Uploading and analyzing...", uploadFailed: "Could not import asset", pasteOrDrop: "Paste or drop an asset", saveAsset: "Save to InspoClip", saved: "Saved", noPrompt: "No prompt yet",
    stages: "Stages", colors: "Color palette", terms: "Design terms", tags: "Tags", overview: "Overview", assets: "inspirations", notes: "Notes", notesPlaceholder: "Write a note for this week...", theme: "Toggle theme",
    language: "Switch language", export: "Export", previous: "Previous", next: "Next", noContent: "No content",
    previewUnavailable: "Preview unavailable", analysisPending: "Analyzed", stageEmpty: "The stage timeline will appear here after analysis completes.", analysisFailed: "Analysis failed", unknown: "Untitled inspiration"
  }
}
