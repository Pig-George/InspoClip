import multer from 'multer';
import path from 'node:path';
import { v4 as uuid } from 'uuid';

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const extensionByMime: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
};

export function createVideoUpload(uploadDir = process.env.VIDEO_UPLOAD_DIR || './videos') {
  return multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) => cb(null, `${uuid()}${extensionByMime[file.mimetype] ?? path.extname(file.originalname).toLowerCase()}`),
    }),
    fileFilter: (_req, file, cb) => {
      if (extensionByMime[file.mimetype]) cb(null, true);
      else cb(new Error('Unsupported video format'));
    },
    limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
  });
}

export const videoUpload = createVideoUpload();
