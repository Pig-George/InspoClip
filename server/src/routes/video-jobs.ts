import { Router } from 'express';
import type { VideoRepository } from '../video/repository.js';

export function createVideoJobsRouter(repository: VideoRepository): Router {
  const router = Router();
  router.get('/:id', async (req, res) => {
    try {
      const job = await repository.getJob(String(req.params.id));
      if (!job) { res.status(404).json({ error: 'Video analysis job not found' }); return; }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
  });
  return router;
}
