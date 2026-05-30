import sharp from 'sharp';
import path from 'path';

export async function generateThumbnail(
  imagePath: string,
  outputDir: string,
  size: number = 300
): Promise<string> {
  const filename = path.basename(imagePath, path.extname(imagePath)) + '_thumb.jpg';
  const outputPath = path.join(outputDir, filename);

  try {
    const metadata = await sharp(imagePath).metadata();
    const width = metadata.width || 1;
    const height = metadata.height || 1;

    if (Math.abs(width - height) / Math.max(width, height) > 0.2) {
      await sharp(imagePath)
        .resize(size, size, { fit: 'cover', position: sharp.strategy.entropy })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
    } else {
      await sharp(imagePath)
        .resize(size, size, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
    }

    return filename;
  } catch (err: any) {
    console.error('[Thumbnail] Failed:', err.message);
    await sharp(imagePath)
      .resize(size, size, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    return filename;
  }
}
