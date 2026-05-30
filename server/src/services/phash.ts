import sharp from 'sharp';

/**
 * Compute perceptual hash (pHash) using DCT-based approach.
 * Returns a 64-bit hash as a 16-char hex string.
 */
export async function computePhash(imagePath: string): Promise<string> {
  // Resize to 32x32 grayscale for DCT
  const { data } = await sharp(imagePath)
    .resize(32, 32, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Apply simplified DCT: 8x8 block averages from top-left 8x8 of the 32x32 image
  // (better than averaging the whole image — preserves frequency info)
  const blockSize = 4;
  const blocks: number[] = [];

  for (let by = 0; by < 8; by++) {
    for (let bx = 0; bx < 8; bx++) {
      let sum = 0;
      let count = 0;
      for (let y = by * blockSize; y < (by + 1) * blockSize; y++) {
        for (let x = bx * blockSize; x < (bx + 1) * blockSize; x++) {
          sum += data[y * 32 + x];
          count++;
        }
      }
      blocks.push(sum / count);
    }
  }

  // Use mean (not median) for more stable hash
  const mean = blocks.reduce((a, b) => a + b, 0) / blocks.length;

  let hash = 0n;
  for (let i = 0; i < 64; i++) {
    if (blocks[i] > mean) {
      hash |= 1n << BigInt(63 - i);
    }
  }

  return hash.toString(16).padStart(16, '0');
}

/**
 * Compute average hash (aHash) — complementary to pHash.
 * Good at detecting exact duplicates and near-identical crops.
 */
export async function computeAHash(imagePath: string): Promise<string> {
  const { data } = await sharp(imagePath)
    .resize(8, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = data.length;
  let sum = 0;
  for (let i = 0; i < pixelCount; i++) sum += data[i];
  const mean = sum / pixelCount;

  let hash = 0n;
  for (let i = 0; i < 64; i++) {
    if (data[i] > mean) {
      hash |= 1n << BigInt(63 - i);
    }
  }

  return hash.toString(16).padStart(16, '0');
}

/**
 * Compute both hashes for an image.
 */
export async function computeHashes(imagePath: string): Promise<{ phash: string; ahash: string }> {
  const [phash, ahash] = await Promise.all([
    computePhash(imagePath),
    computeAHash(imagePath),
  ]);
  return { phash, ahash };
}

export function hammingDistance(hash1: string, hash2: string): number {
  const big1 = BigInt(`0x${hash1}`);
  const big2 = BigInt(`0x${hash2}`);
  let xor = big1 ^ big2;
  let distance = 0;
  while (xor > 0n) {
    distance += Number(xor & 1n);
    xor >>= 1n;
  }
  return distance;
}

/**
 * Check if two images are similar using dual-hash verification.
 *
 * Strategy:
 * - aHash distance <= 5: very likely same image (even with minor edits)
 * - pHash distance <= 8: similar visual structure
 * - Both must pass their respective thresholds
 *
 * For exact duplicates, aHash will be 0.
 * For resized/cropped versions, pHash catches structural similarity.
 */
export function areSimilar(
  phash1: string, ahash1: string,
  phash2: string, ahash2: string,
  pThreshold: number = 8,
  aThreshold: number = 12
): boolean {
  const pDist = hammingDistance(phash1, phash2);
  const aDist = hammingDistance(ahash1, ahash2);

  // Exact or near-exact duplicate
  if (aDist <= 3) return true;

  // Structural similarity (resized, slightly different crop)
  if (pDist <= pThreshold && aDist <= aThreshold) return true;

  return false;
}

/**
 * Legacy single-hash similarity check (backward compatibility).
 */
export function areSimilarSingle(hash1: string, hash2: string, threshold: number = 8): boolean {
  return hammingDistance(hash1, hash2) <= threshold;
}
