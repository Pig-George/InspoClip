import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/context/LanguageContext';
import { SettingsDialog } from './SettingsDialog';
import { fetchConfig, updateConfig } from '@/lib/api';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    fetchConfig: vi.fn(),
    updateConfig: vi.fn(),
  };
});

describe('SettingsDialog', () => {
  beforeEach(() => {
    localStorage.setItem('inspoclip-locale', 'en');
    vi.mocked(fetchConfig).mockResolvedValue({
      AI_PROVIDER: 'gemini',
      AI_MODEL: 'gemini-2.0-flash',
      VIDEO_AI_MODEL: 'qwen3.7-plus',
      VIDEO_AI_FPS: '3',
    });
    vi.mocked(updateConfig).mockResolvedValue(undefined);
  });

  it('keeps model settings compact by switching image and video fields with tabs', async () => {
    render(
      <LanguageProvider>
        <SettingsDialog open onClose={() => undefined} />
      </LanguageProvider>,
    );

    await waitFor(() => expect(fetchConfig).toHaveBeenCalled());
    expect(screen.getByRole('tab', { name: 'Image analysis' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByLabelText('Video model')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Video understanding' }));

    expect(screen.getByRole('tab', { name: 'Video understanding' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Video model')).toBeInTheDocument();
    expect(screen.queryByLabelText('Provider')).not.toBeInTheDocument();
  });
});
