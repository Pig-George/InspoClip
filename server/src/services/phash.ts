import sharp from 'sharp';

export async function computePhash(imagePath: string): Promise<string> {
  const { data } = await sharp(imagePath)
    .resize(32, 32, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

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

  const sorted = [...blocks].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  let hash = 0n;
  for (let i = 0; i < 64; i++) {
    if (blocks[i] > median) {
      hash |= 1n << BigInt(63 - i);
    }
  }

  return hash.toString(16).padStart(16, '0');
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

export function areSimilar(hash1: string, hash2: string, threshold: number = 10): boolean {
  return hammingDistance(hash1, hash2) <= threshold;
}
