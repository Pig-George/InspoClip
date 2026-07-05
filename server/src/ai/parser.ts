import { z } from 'zod';

import type { VideoAnalysis } from './types.js';

const visualStyleSchema = z
  .object({
    colors: z.array(z.string()),
    typography: z.string(),
    layout: z.string(),
    effects: z.array(z.string()),
  })
  .strict();

const actionSchema = z
  .object({
    subject: z.string(),
    action: z.string(),
    from: z.record(z.unknown()),
    to: z.record(z.unknown()),
    durationMs: z.number().nonnegative(),
    delayMs: z.number().nonnegative(),
    easing: z.string(),
  })
  .strict();

const stageSchema = z
  .object({
    startTime: z.number().nonnegative(),
    endTime: z.number().nonnegative(),
    title: z.string(),
    initialState: z.string(),
    trigger: z.string(),
    actions: z.array(actionSchema),
    resultState: z.string(),
  })
  .strict()
  .refine((stage) => stage.endTime >= stage.startTime, {
    message: 'endTime must be greater than or equal to startTime',
    path: ['endTime'],
  });

const videoAnalysisSchema: z.ZodType<VideoAnalysis> = z
  .object({
    summary: z.string(),
    visualStyle: visualStyleSchema,
    stages: z.array(stageSchema),
    assets: z.array(z.string()),
    uncertainties: z.array(z.string()),
  })
  .strict();

export function parseVideoAnalysis(input: unknown): VideoAnalysis {
  return videoAnalysisSchema.parse(input);
}
