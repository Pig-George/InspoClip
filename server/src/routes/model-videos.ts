import { Router } from 'express';
import path from 'node:path';
import { DrizzleVideoRepository, type VideoRepository } from '../video/repository.js';
import { ModelVideoAccessTokens } from '../video/public-access.js';

export interface ModelVideosRouterDependencies {
  repository: VideoRepository;
  tokens: ModelVideoAccessTokens;
  videoRoot: string;
}

export function createModelVideosRouter(overrides: Partial<ModelVideosRouterDependencies> = {}): Router {
  const deps: ModelVideosRouterDependencies = {
    repository: overrides.repository ?? new DrizzleVideoRepository(),
    tokens: overrides.tokens ?? new ModelVideoAccessTokens(),
    videoRoot: overrides.videoRoot ?? process.env.VIDEO_UPLOAD_DIR ?? './videos',
  };
  const router = Router();

  router.get('/:id/content', async (req, res) => {
    const videoId = String(req.params.id);
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!deps.tokens.verify(videoId, token)) {
      res.status(403).json({ error: 'Invalid or expired video access token' });
      return;
    }
    const video = await deps.repository.getVideo(videoId);
    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    res.sendFile(path.basename(video.filePath), { root: path.resolve(deps.videoRoot) });
  });

  return router;
}
