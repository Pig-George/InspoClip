import type { Locale } from '@/i18n/translations';
import type { LocalizedString } from '@/types/video';

export function localizedText(value: LocalizedString, locale: Locale): string {
  if (typeof value === 'string') return value;
  return locale === 'zh' ? value.zh || value.en : value.en || value.zh;
}
