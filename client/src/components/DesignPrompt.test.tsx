import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LanguageProvider } from '@/context/LanguageContext';
import { fetchDesignPrompt, generateDesignPrompt } from '@/lib/api';

import { DesignPrompt } from './DesignPrompt';

vi.mock('@/lib/api', () => ({
  fetchDesignPrompt: vi.fn(),
  generateDesignPrompt: vi.fn(),
}));

describe('DesignPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('inspoclip-locale', 'en');
    vi.mocked(fetchDesignPrompt).mockResolvedValue({
      id: 'prompt-1',
      imageId: 'image-1',
      contentEn: 'Existing prompt',
      contentZh: 'Existing prompt zh',
    });
  });

  it('uses only the regenerate button spinner when refreshing an existing prompt', async () => {
    vi.mocked(generateDesignPrompt).mockReturnValue(new Promise(() => {}));

    render(
      <LanguageProvider>
        <DesignPrompt imageId="image-1" />
      </LanguageProvider>,
    );

    expect(await screen.findByText('Existing prompt')).toBeInTheDocument();
    const regenerate = screen.getByTitle('Regenerate');
    await userEvent.click(regenerate);

    await waitFor(() => expect(generateDesignPrompt).toHaveBeenCalledWith('image-1', true));
    expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
    expect(regenerate.querySelector('svg')).toHaveClass('workspace-prompt-action-spinner');
  });

  it('uses the shared prompt state shell and shared output layout', async () => {
    render(
      <LanguageProvider>
        <DesignPrompt imageId="image-1" />
      </LanguageProvider>,
    );

    expect(await screen.findByText('Existing prompt')).toBeInTheDocument();
    expect(document.querySelector('.workspace-prompt-result')).toBeInTheDocument();
    expect(document.querySelector('.workspace-prompt-output')).toBeInTheDocument();
  });
});
