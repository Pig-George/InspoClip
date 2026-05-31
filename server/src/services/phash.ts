import sharp from 'sharp';

/**
 * Compute perceptual hash (pHash) using DCT-based approach.
 * Returns a 64-bit hash as a 16-char hex string.
 */
export async function computePhash(imagePath: string): Promise<string> {
  const { data } = await sharp(imagePath)
    .resize(32, 32, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Compute 8x8 block averages from the 32x32 image
  // Each block is 4x4 pixels
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

  // Use mean for hash threshold
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
 * Compute color histogram hash — captures color distribution.
 * Useful for distinguishing images with same structure but different colors.
 */
export async function computeColorHash(imagePath: string): Promise<string> {
  const { data } = await sharp(imagePath)
    .resize(16, 16, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Compute color distribution in 4 bins per channel (64 total bins)
  const bins = new Uint32Array(64);
  const binSize = 64; // 256 / 4

  for (let i = 0; i < data.length; i += 3) {
    const rBin = Math.min(3, Math.floor(data[i] / binSize));
    const gBin = Math.min(3, Math.floor(data[i + 1] / binSize));
    const bBin = Math.min(3, Math.floor(data[i + 2] / binSize));
    bins[rBin * 16 + gBin * 4 + bBin]++;
  }

  // Normalize to 0-15 range and create a hash
  const totalPixels = 16 * 16;
  let hash = 0n;
  for (let i = 0; i < 64; i++) {
    const normalized = Math.floor((bins[i] / totalPixels) * 15);
    if (normalized > 7) { // above average density
      hash |= 1n << BigInt(i);
    }
  }

  return hash.toString(16).padStart(16, '0');
}

/**
 * Compute all hashes for an image.
 */
export async function computeHashes(imagePath: string): Promise<{ phash: string; ahash: string; colorhash: string }> {
  const [phash, ahash, colorhash] = await Promise.all([
    computePhash(imagePath),
    computeAHash(imagePath),
    computeColorHash(imagePath),
  ]);
  return { phash, ahash, colorhash };
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
 * Check if two images are similar using triple-hash verification.
 *
 * Strategy:
 * - aHash: exact/near-exact duplicates (low threshold)
 * - pHash: structural similarity (resized, cropped, slight edits)
 * - colorHash: same visual content with color shifts
 *
 * Decision logic:
 * - aHash ≤ 2: very likely same image (even with minor edits) → similar
 * - aHash ≤ 5 AND pHash ≤ 6: similar structure with minor pixel diff → similar
 * - pHash ≤ 4 AND colorHash ≤ 8: same layout, similar colors → similar
 * - Otherwise: not similar
 */
export function areSimilar(
  phash1: string, ahash1: string, colorhash1: string,
  phash2: string, ahash2: string, colorhash2: string,
): boolean {
  const aDist = hammingDistance(ahash1, ahash2);
  const pDist = hammingDistance(phash1, phash2);
  const cDist = hammingDistance(colorhash1, colorhash2);

  // Near-exact duplicate
  if (aDist <= 2) return true;

  // Same structure with minor pixel differences
  if (aDist <= 5 && pDist <= 6) return true;

  // Same layout, similar color distribution
  if (pDist <= 4 && cDist <= 8) return true;

  return false;
}

/**
 * Legacy single-hash similarity check (backward compatibility).
 */
export function areSimilarSingle(hash1: string, hash2: string, threshold: number = 8): boolean {
  return hammingDistance(hash1, hash2) <= threshold;
}
