import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/context/LanguageContext';
import { SettingsDialog } from './SettingsDialog';
import { fetchConfig, updateConfig } from '@/lib/api';
import { APP_VERSION } from '@/version';

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
    vi.clearAllMocks();
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
    expect(screen.getByLabelText('Video provider')).toBeInTheDocument();
  });

  it('shows the client version in the settings footer', async () => {
    render(
      <LanguageProvider>
        <SettingsDialog open onClose={() => undefined} />
      </LanguageProvider>,
    );

    await waitFor(() => expect(fetchConfig).toHaveBeenCalled());
    expect(screen.getByText(`Version ${APP_VERSION}`)).toBeInTheDocument();
  });

  it('only saves image settings from the image tab and preserves the video key', async () => {
    vi.mocked(fetchConfig).mockResolvedValue({
      AI_PROVIDER: 'openai',
      AI_API_KEY: 'img-************************************************-tail',
      AI_API_BASE: 'https://images.example.test/v1',
      AI_MODEL: 'image-model',
      VIDEO_AI_API_KEY: 'vid-****************-tail',
      VIDEO_AI_API_BASE: 'https://videos.example.test/v1',
      VIDEO_AI_MODEL: 'video-model',
      VIDEO_AI_FPS: '4',
    });

    render(
      <LanguageProvider>
        <SettingsDialog open onClose={() => undefined} />
      </LanguageProvider>,
    );

    await waitFor(() => expect(fetchConfig).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'new-image-key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateConfig).toHaveBeenCalledWith({
      AI_PROVIDER: 'openai',
      AI_API_KEY: 'new-image-key',
      AI_API_BASE: 'https://images.example.test/v1',
      AI_MODEL: 'image-model',
    }));
  });

  it('does not submit a masked image key when image settings are unchanged', async () => {
    vi.mocked(fetchConfig).mockResolvedValue({
      AI_PROVIDER: 'openai',
      AI_API_KEY: 'sk-i****************************mage',
      AI_API_BASE: 'https://images.example.test/v1',
      AI_MODEL: 'image-model',
    });

    render(
      <LanguageProvider>
        <SettingsDialog open onClose={() => undefined} />
      </LanguageProvider>,
    );

    await waitFor(() => expect(fetchConfig).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateConfig).toHaveBeenCalledWith({
      AI_PROVIDER: 'openai',
      AI_API_BASE: 'https://images.example.test/v1',
      AI_MODEL: 'image-model',
    }));
  });

  it('only saves video settings from the video tab and preserves the image key', async () => {
    vi.mocked(fetchConfig).mockResolvedValue({
      AI_PROVIDER: 'openai',
      AI_API_KEY: 'img-************************************************-tail',
      AI_API_BASE: 'https://images.example.test/v1',
      AI_MODEL: 'image-model',
      VIDEO_AI_API_KEY: 'vid-****************-tail',
      VIDEO_AI_API_BASE: 'https://videos.example.test/v1',
      VIDEO_AI_MODEL: 'video-model',
      VIDEO_AI_FPS: '4',
    });

    render(
      <LanguageProvider>
        <SettingsDialog open onClose={() => undefined} />
      </LanguageProvider>,
    );

    await waitFor(() => expect(fetchConfig).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('tab', { name: 'Video understanding' }));
    fireEvent.change(screen.getByLabelText('Video API key'), { target: { value: 'new-video-key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateConfig).toHaveBeenCalledWith({
      VIDEO_AI_API_KEY: 'new-video-key',
      VIDEO_AI_API_BASE: 'https://videos.example.test/v1',
      VIDEO_AI_MODEL: 'video-model',
      VIDEO_AI_FPS: '4',
    }));
  });
});
