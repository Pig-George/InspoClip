import { Router } from 'express';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { DrizzleVideoRepository, type VideoRepository } from '../video/repository.js';
import { ModelVideoAccessTokens } from '../video/public-access.js';
import { ensureModelCompatibleVideo } from '../video/media.js';

export interface ModelVideosRouterDependencies {
  repository: VideoRepository;
  tokens: ModelVideoAccessTokens;
  videoRoot: string;
  prepareModelVideo(inputPath: string, outputPath: string): Promise<string>;
}

function modelCompatibleFileName(filePath: string): string {
  const parsed = path.parse(path.basename(filePath));
  return `${parsed.name}.model.mp4`;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function createModelVideosRouter(overrides: Partial<ModelVideosRouterDependencies> = {}): Router {
  const deps: ModelVideosRouterDependencies = {
    repository: overrides.repository ?? new DrizzleVideoRepository(),
    tokens: overrides.tokens ?? new ModelVideoAccessTokens(),
    videoRoot: overrides.videoRoot ?? process.env.VIDEO_UPLOAD_DIR ?? './videos',
    prepareModelVideo: overrides.prepareModelVideo ?? ensureModelCompatibleVideo,
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
    const videoRoot = path.resolve(deps.videoRoot);
    const storedFileName = path.basename(video.filePath);
    let fileName = storedFileName;
    if (video.mimeType === 'video/webm' || path.extname(storedFileName).toLowerCase() === '.webm') {
      const modelFileName = modelCompatibleFileName(storedFileName);
      const modelPath = path.join(videoRoot, modelFileName);
      if (!(await fileExists(modelPath))) {
        await deps.prepareModelVideo(path.join(videoRoot, storedFileName), modelPath);
      }
      fileName = modelFileName;
    }
    res.sendFile(fileName, { root: videoRoot });
  });

  return router;
}
