import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const animationStart = vi.hoisted(() => vi.fn());
const reducedMotion = vi.hoisted(() => ({ value: false }));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  const React = await import('react');
  const MotionButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & {
    animate?: unknown;
  }>(({ animate: _animate, ...props }, ref) => React.createElement('button', { ...props, ref }));

  return {
    ...actual,
    motion: new Proxy(actual.motion, {
      get(target, property, receiver) {
        if (property === 'button') return MotionButton;
        return Reflect.get(target, property, receiver);
      },
    }),
    useAnimationControls: () => ({ start: animationStart }),
    useReducedMotion: () => reducedMotion.value,
  };
});

import { WeekHeader } from './WeekHeader';

const baseProps = {
  monday: new Date('2026-07-13T00:00:00'),
  viewMode: 'week' as const,
  onViewModeChange: vi.fn(),
  onNextWeek: vi.fn(),
  canGoNext: false,
  nextWeekBlockedAttempt: 0,
};

describe('WeekHeader next-week feedback', () => {
  beforeEach(() => {
    animationStart.mockClear();
    reducedMotion.value = false;
    baseProps.onNextWeek.mockClear();
  });

  it('keeps a blocked next-week button clickable while exposing disabled semantics', () => {
    render(<WeekHeader {...baseProps} />);

    const button = screen.getByRole('button', { name: 'Next week' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    expect(baseProps.onNextWeek).toHaveBeenCalledTimes(1);
  });

  it('plays a short horizontal shake when a blocked attempt is reported', () => {
    const { rerender } = render(<WeekHeader {...baseProps} />);

    rerender(<WeekHeader {...baseProps} nextWeekBlockedAttempt={1} />);

    expect(animationStart).toHaveBeenCalledWith({
      x: [0, -2.4, 1.2, -0.4, 0],
      scale: [1, 0.985, 1, 0.997, 1],
      transition: {
        duration: 0.38,
        times: [0, 0.26, 0.56, 0.8, 1],
        ease: [0.22, 1, 0.36, 1],
      },
    });
  });

  it('does not move the button when reduced motion is preferred', () => {
    reducedMotion.value = true;
    const { rerender } = render(<WeekHeader {...baseProps} />);

    rerender(<WeekHeader {...baseProps} nextWeekBlockedAttempt={1} />);

    expect(animationStart).not.toHaveBeenCalled();
  });
});
