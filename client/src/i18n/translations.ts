export type Locale = 'zh' | 'en';

export const translations = {
  // Days
  Monday: { zh: '周一', en: 'Monday' },
  Tuesday: { zh: '周二', en: 'Tuesday' },
  Wednesday: { zh: '周三', en: 'Wednesday' },
  Thursday: { zh: '周四', en: 'Thursday' },
  Friday: { zh: '周五', en: 'Friday' },
  Saturday: { zh: '周六', en: 'Saturday' },
  Sunday: { zh: '周日', en: 'Sunday' },

  // Header
  Week: { zh: '第 {n} 周', en: 'Week {n}' },
  Month: { zh: '1月', en: 'January' },
  Feb: { zh: '2月', en: 'February' },
  Mar: { zh: '3月', en: 'March' },
  Apr: { zh: '4月', en: 'April' },
  May: { zh: '5月', en: 'May' },
  Jun: { zh: '6月', en: 'June' },
  Jul: { zh: '7月', en: 'July' },
  Aug: { zh: '8月', en: 'August' },
  Sep: { zh: '9月', en: 'September' },
  Oct: { zh: '10月', en: 'October' },
  Nov: { zh: '11月', en: 'November' },
  Dec: { zh: '12月', en: 'December' },

  // Views
  DayView: { zh: '日视图', en: 'Day' },
  WeekView: { zh: '周视图', en: 'Week' },

  // Uploader
  PasteOrDrop: { zh: '粘贴 / 拖放 / 点击上传', en: 'Paste / Drop / Click' },
  EmptyPage: { zh: '今日灵感为空~', en: 'No inspiration today~' },
  Analyzing: { zh: '分析中...', en: 'Analyzing...' },

  // Notes
  Notes: { zh: '笔记', en: 'Notes' },
  NotesPlaceholder: { zh: '在这里写周笔记...', en: 'Write your weekly notes here...' },

  // Settings
  Settings: { zh: 'AI 模型设置', en: 'AI Model Settings' },
  Provider: { zh: '服务商', en: 'Provider' },
  ApiKey: { zh: 'API 密钥', en: 'API Key' },
  ApiEndpoint: { zh: 'API 地址', en: 'API Endpoint' },
  ModelName: { zh: '模型名称', en: 'Model Name' },
  Save: { zh: '保存', en: 'Save' },
  Saving: { zh: '保存中...', en: 'Saving...' },
  Saved: { zh: '已保存!', en: 'Saved!' },
  SaveFailed: { zh: '保存失败', en: 'Save failed' },
  LoadFailed: { zh: '加载失败', en: 'Failed to load' },

  // Actions
  DeleteImage: { zh: '删除图片', en: 'Delete Image' },
  ConfirmDelete: { zh: '确认删除此图片？', en: 'Delete this image?' },
  ConfirmDeleteDesc: { zh: '图片及其所有术语标签将被永久删除。', en: 'The image and all its term tags will be permanently deleted.' },
  Cancel: { zh: '取消', en: 'Cancel' },
  Confirm: { zh: '确认删除', en: 'Delete' },
  ImageDetail: { zh: '图片详情', en: 'Image Detail' },
  Close: { zh: '关闭', en: 'Close' },

  // General
  Loading: { zh: '加载中...', en: 'Loading...' },
  Language: { zh: 'EN', en: '中' },
  CopySuccess: { zh: '已复制!', en: 'Copied!' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale, params?: Record<string, string | number>): string {
  let text: string = translations[key]?.[locale] ?? translations[key]?.en ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
