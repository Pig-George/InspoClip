import { describe, expect, it } from 'vitest';

import { buildExportJson, buildExportMarkdown } from './export.js';

const week = { weekStart: '2026-07-06' };
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const image = {
  id: 'image-a',
  dayOfWeek: 1,
  filePath: 'image-a.png',
};

const video = {
  id: 'video-a',
  dayOfWeek: 1,
  filePath: 'video-a.mp4',
  thumbnailPath: 'video-a.jpg',
  originalName: 'Prototype demo.mp4',
  durationMs: 12_500,
  width: 1280,
  height: 720,
  mimeType: 'video/mp4',
  sizeBytes: 1024,
  source: 'client',
};

const videoAnalysis = {
  summary: { en: 'Card expansion motion', zh: '卡片展开动效' },
  visualStyle: { colors: ['#fff'], typography: 'sans', layout: 'card stack', effects: ['spring'] },
  stages: [
    {
      startTime: 0,
      endTime: 1.2,
      title: { en: 'Open card', zh: '打开卡片' },
      initialState: { en: 'Collapsed', zh: '收起' },
      trigger: { en: 'Tap', zh: '点击' },
      actions: [
        {
          subject: { en: 'Card', zh: '卡片' },
          action: { en: 'Scales up', zh: '放大' },
          from: {},
          to: {},
          durationMs: 300,
          delayMs: 0,
          easing: 'ease-out',
        },
      ],
      resultState: { en: 'Expanded', zh: '展开' },
    },
  ],
  assets: ['card'],
  uncertainties: [],
};

describe('week export video content', () => {
  it('includes video metadata and analysis in JSON export data', () => {
    const json = buildExportJson({
      week,
      mondayStr: '2026-07-06',
      dayNames,
      weekImages: [image],
      termsByImage: { 'image-a': ['Dashboard'] },
      weekVideos: [video],
      videoAnalysisById: new Map([['video-a', { summary: '卡片展开动效', analysis: videoAnalysis }]]),
      videoTagsById: { 'video-a': [{ id: 'tag-a', name: 'Motion', color: '#f00' }] },
      latestJobByVideo: new Map([['video-a', { id: 'job-a', status: 'completed', progress: 100, model: 'qwen3.7-plus', fps: 3 }]]),
    });

    expect(json.videos).toEqual([
      expect.objectContaining({
        day: 'Tuesday',
        fileName: 'video-a.mp4',
        videoPath: 'videos/video-a.mp4',
        thumbnailPath: 'video-thumbnails/video-a.jpg',
        originalName: 'Prototype demo.mp4',
        summary: { en: 'Card expansion motion', zh: '卡片展开动效' },
        tags: [{ id: 'tag-a', name: 'Motion', color: '#f00' }],
      }),
    ]);
    expect(json.videos[0].analysis).not.toBeNull();
    expect(json.videos[0].analysis?.stages[0].title).toEqual({ en: 'Open card', zh: '打开卡片' });
    expect(json.videos[0].job).toEqual(expect.objectContaining({ status: 'completed' }));
  });

  it('includes video summaries and stage analysis in Markdown export', () => {
    const markdown = buildExportMarkdown({
      mondayStr: '2026-07-06',
      exportedAt: '2026-07-11T00:00:00.000Z',
      dayNames,
      weekImages: [image],
      termsByImage: { 'image-a': ['Dashboard'] },
      weekVideos: [video],
      videoAnalysisById: new Map([['video-a', { summary: '卡片展开动效', analysis: videoAnalysis }]]),
      videoTagsById: { 'video-a': [{ id: 'tag-a', name: 'Motion', color: '#f00' }] },
      latestJobByVideo: new Map([['video-a', { id: 'job-a', status: 'completed', progress: 100, model: 'qwen3.7-plus', fps: 3 }]]),
    });

    expect(markdown).toContain('### Videos');
    expect(markdown).toContain('[Prototype demo.mp4](videos/video-a.mp4)');
    expect(markdown).toContain('Card expansion motion / 卡片展开动效');
    expect(markdown).toContain('Open card / 打开卡片');
    expect(markdown).toContain('Card / 卡片: Scales up / 放大');
  });
});
