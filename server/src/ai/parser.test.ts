import { describe, expect, it } from 'vitest';

import { parseVideoAnalysis } from './parser.js';

const validAnalysis = {
  summary: 'A product interface animation',
  visualStyle: {
    colors: ['#ffffff', '#111111'],
    typography: 'Sans serif',
    layout: 'Centered card',
    effects: ['fade', 'slide'],
  },
  stages: [
    {
      startTime: 0,
      endTime: 1.8,
      title: 'Landing page entrance',
      initialState: 'The page is blank',
      trigger: 'Page load',
      actions: [
        {
          subject: 'Headline',
          action: 'Fade in and move upward',
          from: { opacity: 0, translateY: 12 },
          to: { opacity: 1, translateY: 0 },
          durationMs: 600,
          delayMs: 120,
          easing: 'ease-out',
        },
      ],
      resultState: 'The headline is visible',
    },
  ],
  assets: ['logo.svg'],
  uncertainties: ['Exact font weight is unclear'],
};

describe('parseVideoAnalysis', () => {
  it('parses a valid standard analysis structure', () => {
    expect(parseVideoAnalysis(validAnalysis)).toEqual(validAnalysis);
  });

  it('rejects an analysis without stages', () => {
    const { stages: _stages, ...input } = validAnalysis;

    expect(() => parseVideoAnalysis(input)).toThrow();
  });

  it.each(['title', 'initialState', 'trigger', 'actions', 'resultState'] as const)(
    'rejects a stage without %s',
    (field) => {
      const stage = { ...validAnalysis.stages[0] };
      delete stage[field];

      expect(() => parseVideoAnalysis({ ...validAnalysis, stages: [stage] })).toThrow();
    },
  );

  it.each(['subject', 'action', 'from', 'to', 'durationMs', 'delayMs', 'easing'] as const)(
    'rejects an action without %s',
    (field) => {
      const action = { ...validAnalysis.stages[0].actions[0] };
      delete action[field];
      const stage = { ...validAnalysis.stages[0], actions: [action] };

      expect(() => parseVideoAnalysis({ ...validAnalysis, stages: [stage] })).toThrow();
    },
  );

  it('requires uncertainties to be a string array', () => {
    expect(() => parseVideoAnalysis({ ...validAnalysis, uncertainties: [42] })).toThrow();
  });

  it.each(['startTime', 'endTime'] as const)('rejects a negative %s', (field) => {
    const stage = { ...validAnalysis.stages[0], [field]: -1 };

    expect(() => parseVideoAnalysis({ ...validAnalysis, stages: [stage] })).toThrow();
  });

  it('rejects a stage whose endTime precedes startTime', () => {
    const stage = { ...validAnalysis.stages[0], startTime: 2, endTime: 1 };

    expect(() => parseVideoAnalysis({ ...validAnalysis, stages: [stage] })).toThrow();
  });

  it.each(['durationMs', 'delayMs'] as const)('rejects a negative %s', (field) => {
    const action = { ...validAnalysis.stages[0].actions[0], [field]: -1 };
    const stage = { ...validAnalysis.stages[0], actions: [action] };

    expect(() => parseVideoAnalysis({ ...validAnalysis, stages: [stage] })).toThrow();
  });

  it('rejects unknown object properties', () => {
    expect(() => parseVideoAnalysis({ ...validAnalysis, unexpected: true })).toThrow();
  });
});
