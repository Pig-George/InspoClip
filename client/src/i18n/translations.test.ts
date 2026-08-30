import { describe, expect, it } from 'vitest';

import { t } from './translations';

describe('upload translations', () => {
  it('provides a localized global paste upload message', () => {
    expect(t('UploadingToToday', 'zh')).toBe('正在上传到今天...');
    expect(t('UploadingToToday', 'en')).toBe('Uploading to today...');
  });
});
