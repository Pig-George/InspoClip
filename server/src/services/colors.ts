import sharp from 'sharp';

export async function extractColors(imagePath: string, count: number = 6): Promise<string[]> {
  try {
    const buffer = await sharp(imagePath)
      .resize(100, 100, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data } = buffer;
    const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();

    const quantize = (v: number) => Math.min(255, Math.round(v / 32) * 32);

    for (let i = 0; i < data.length; i += 3) {
      const r = quantize(data[i]);
      const g = quantize(data[i + 1]);
      const b = quantize(data[i + 2]);
      const key = `${r},${g},${b}`;

      const existing = colorMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        colorMap.set(key, { r, g, b, count: 1 });
      }
    }

    const sorted = Array.from(colorMap.values())
      .sort((a, b) => b.count - a.count);

    // Filter out near-black and near-white, but keep enough candidates
    const filtered = sorted.filter((c) => {
      const brightness = (c.r + c.g + c.b) / 3;
      return brightness > 10 && brightness < 250;
    });

    // Ensure we return at least some colors even if filter is strict
    const result = filtered.length >= count ? filtered.slice(0, count) : sorted.slice(0, count);

    return result.map((c) =>
      `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
    );
  } catch (err: any) {
    console.error('[Colors] Extraction failed:', err.message);
    return [];
  }
}
