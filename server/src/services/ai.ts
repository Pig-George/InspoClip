import OpenAI from 'openai';
import sharp from 'sharp';
import { db } from '../db/index.js';
import { config as configTable } from '../db/schema.js';

async function getConfig(): Promise<{
  provider: string;
  apiKey: string;
  baseURL: string;
  model: string;
}> {
  try {
    const rows = await db.select().from(configTable);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return {
      provider: map.AI_PROVIDER || 'openai',
      apiKey: map.AI_API_KEY || process.env.AI_API_KEY || 'sk-placeholder',
      baseURL: map.AI_API_BASE || process.env.AI_API_BASE || 'https://api.deepseek.com/v1',
      model: map.AI_MODEL || process.env.AI_MODEL || 'deepseek-chat',
    };
  } catch {
    return {
      provider: 'openai',
      apiKey: process.env.AI_API_KEY || 'sk-placeholder',
      baseURL: process.env.AI_API_BASE || 'https://api.deepseek.com/v1',
      model: process.env.AI_MODEL || 'deepseek-chat',
    };
  }
}

const PROMPT_TEXT =
  'Analyze this UI/UX design screenshot. Return exactly 5-10 design terminology keywords describing visual design aspects (colors, typography, layout, spacing, components, patterns, style). Each keyword MUST be bilingual in format "English / 中文". Output ONLY a JSON array of strings, no other text. Example: ["minimalist / 极简风格", "glassmorphism / 毛玻璃效果", "sans-serif / 无衬线字体", "card layout / 卡片布局", "pastel palette / 粉彩色调"]';

async function callOpenAI(
  apiKey: string,
  baseURL: string,
  model: string,
  base64Image: string,
  mimeType: string
): Promise<string[]> {
  const client = new OpenAI({ apiKey, baseURL });

  const stream = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT_TEXT },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
        ],
      },
    ],
    max_tokens: 300,
    temperature: 0.7,
    stream: true,
  });

  let rawText = '';
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) rawText += delta;
  }

  rawText = rawText.trim() || '[]';
  console.log(`[AI Response] model=${model}, text=${rawText.substring(0, 200)}`);
  return parseResponse(rawText);
}

async function callGemini(
  apiKey: string,
  model: string,
  base64Image: string,
  mimeType: string
): Promise<string[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT_TEXT },
          { inline_data: { mime_type: mimeType, data: base64Image } },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const json: any = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]';
  return parseResponse(text);
}

function parseResponse(text: string): string[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 10).map((t) => String(t));
    }
  } catch {
    // fallback: extract from non-JSON text
  }
  const words = text
    .replace(/[\[\]"]/g, '')
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
  return words.length > 0 ? words : [];
}

async function callAnthropic(
  apiKey: string,
  baseURL: string,
  model: string,
  base64Image: string,
  mimeType: string
): Promise<string[]> {
  const base = baseURL || 'https://api.anthropic.com/v1';
  const url = `${base}/messages`;

  const body = {
    model,
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT_TEXT },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }

  const json: any = await res.json();
  const rawText = json?.content?.[0]?.text?.trim() || '[]';
  console.log(`[AI Response] provider=anthropic model=${model}, text=${rawText.substring(0, 200)}`);
  return parseResponse(rawText);
}

export async function generateTerms(imagePath: string): Promise<string[]> {
  const cfg = await getConfig();

  const fs = await import('fs/promises');
  const imageBuffer = await fs.readFile(imagePath);

  // Resize large images to avoid 413 errors from API proxy
  let processedBuffer: Buffer = imageBuffer;
  let mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const maxDim = 1024;
    if ((metadata.width && metadata.width > maxDim) || (metadata.height && metadata.height > maxDim)) {
      processedBuffer = await sharp(imageBuffer)
        .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer() as Buffer;
      mimeType = 'image/jpeg';
      console.log(`[AI] Image resized: ${imageBuffer.length} → ${processedBuffer.length} bytes`);
    }
  } catch (err: any) {
    console.warn('[AI] Image resize failed, using original:', err.message);
  }

  const base64 = processedBuffer.toString('base64');

  if (cfg.provider === 'gemini') {
    return callGemini(cfg.apiKey, cfg.model, base64, mimeType);
  }
  if (cfg.provider === 'anthropic') {
    return callAnthropic(cfg.apiKey, cfg.baseURL, cfg.model, base64, mimeType);
  }
  return callOpenAI(cfg.apiKey, cfg.baseURL, cfg.model, base64, mimeType);
}

const PROMPT_GEN_PROMPT = `Analyze this UI/UX design screenshot and generate a detailed AI image/design prompt that could recreate a similar design style. The prompt should describe the visual style, color palette, typography, layout patterns, mood, and key design elements. Provide the prompt in BOTH English and Chinese. Format your response as JSON:
{"en": "Your English prompt here", "zh": "你的中文提示词"}`;

export async function generateDesignPrompt(imagePath: string): Promise<{ en: string; zh: string }> {
  const cfg = await getConfig();

  const fs = await import('fs/promises');
  const imageBuffer = await fs.readFile(imagePath);

  let processedBuffer: Buffer = imageBuffer;
  let mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const maxDim = 1024;
    if ((metadata.width && metadata.width > maxDim) || (metadata.height && metadata.height > maxDim)) {
      processedBuffer = await sharp(imageBuffer)
        .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer() as Buffer;
      mimeType = 'image/jpeg';
    }
  } catch { /* use original */ }

  const base64 = processedBuffer.toString('base64');
  let rawText = '';

  if (cfg.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT_GEN_PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}`);
    const json: any = await res.json();
    rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
  } else if (cfg.provider === 'anthropic') {
    const base = cfg.baseURL || 'https://api.anthropic.com/v1';
    const res = await fetch(`${base}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: cfg.model, max_tokens: 300,
        messages: [{ role: 'user', content: [
          { type: 'text', text: PROMPT_GEN_PROMPT },
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
        ] }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
    const json: any = await res.json();
    rawText = json?.content?.[0]?.text?.trim() || '{}';
  } else {
    const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
    const stream = await client.chat.completions.create({
      model: cfg.model,
      messages: [{ role: 'user', content: [
        { type: 'text', text: PROMPT_GEN_PROMPT },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
      ] }],
      max_tokens: 300, temperature: 0.7, stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) rawText += delta;
    }
  }

  try {
    const parsed = JSON.parse(rawText.trim());
    return { en: parsed.en || '', zh: parsed.zh || '' };
  } catch {
    return { en: rawText.trim(), zh: rawText.trim() };
  }
}
