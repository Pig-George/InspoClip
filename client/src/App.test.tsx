import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  fetchWeek: vi.fn(() => new Promise(() => {})),
  uploadImage: vi.fn(),
  checkSimilarity: vi.fn(),
}));
vi.mock('@/lib/video-api', () => ({ uploadVideo: vi.fn() }));
vi.mock('@/lib/events', () => ({ setLastUploadedImageId: vi.fn() }));

vi.mock('@/components/WeekHeader', () => ({
  WeekHeader: (props: {
    monday: Date;
    onViewModeChange: (mode: 'week') => void;
    onPrevWeek?: () => void;
    onNextWeek?: () => void;
    nextWeekBlockedAttempt?: number;
  }) => {
    const monday = [
      props.monday.getFullYear(),
      String(props.monday.getMonth() + 1).padStart(2, '0'),
      String(props.monday.getDate()).padStart(2, '0'),
    ].join('-');
    return (
    <div>
      <output data-testid="current-monday">{monday}</output>
      <output data-testid="blocked-attempts">{props.nextWeekBlockedAttempt ?? 0}</output>
      <button onClick={() => props.onViewModeChange('week')}>Week mode</button>
      {props.onPrevWeek && <button onClick={props.onPrevWeek}>Previous week</button>}
      {props.onNextWeek && <button onClick={props.onNextWeek}>Next week</button>}
    </div>
    );
  },
}));
vi.mock('@/components/DayView', () => ({ DayView: () => <div /> }));
vi.mock('@/components/WeekView', () => ({ WeekView: () => <div /> }));
vi.mock('@/components/TimelineView', () => ({ TimelineView: () => <div /> }));
vi.mock('@/components/Toast', () => ({ ToastContainer: () => null, toast: vi.fn() }));
vi.mock('@/components/SimilarityConfirmDialog', () => ({ SimilarityConfirmDialog: () => null }));
vi.mock('@/components/video/VideoAnalysisView', () => ({ VideoAnalysisView: () => null }));

import App from './App';

describe('App week navigation guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00'));
    localStorage.setItem('inspoclip-theme', 'light');
    localStorage.setItem('inspoclip-locale', 'en');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('blocks ArrowRight from moving beyond the current week', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Week mode' }));

    fireEvent.keyDown(document, { key: 'ArrowRight' });

    expect(screen.getByTestId('current-monday')).toHaveTextContent('2026-07-13');
    expect(screen.getByTestId('blocked-attempts')).toHaveTextContent('1');
  });

  it('allows ArrowRight to return from a historical week to the current week', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Week mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));

    fireEvent.keyDown(document, { key: 'ArrowRight' });

    expect(screen.getByTestId('current-monday')).toHaveTextContent('2026-07-13');
    expect(screen.getByTestId('blocked-attempts')).toHaveTextContent('0');
  });

  it('blocks the next-week button path at the current week', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Week mode' }));

    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));

    expect(screen.getByTestId('current-monday')).toHaveTextContent('2026-07-13');
    expect(screen.getByTestId('blocked-attempts')).toHaveTextContent('1');
  });
});
