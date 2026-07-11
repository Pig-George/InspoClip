import { useState } from 'react';

import { useLanguage } from '@/context/LanguageContext';
import { generateVideoOutput } from '@/lib/video-api';
import type { VideoPromptOutput, VideoPurpose } from '@/types/video';

const purposes: Array<[VideoPurpose, string]> = [
  ['general', '通用'],
  ['video-generation', '视频生成'],
  ['frontend', '前端实现'],
  ['motion-design', 'AE / Figma'],
  ['storyboard', '分镜脚本'],
  ['json', '结构化 JSON'],
];

type LangMode = 'auto' | 'en' | 'zh' | 'both';

const languageModes: Array<[LangMode, string]> = [
  ['auto', 'Auto'],
  ['en', 'EN'],
  ['zh', '中'],
  ['both', 'EN/中'],
];

export function VideoPromptPanel({ videoId }: { videoId: string }) {
  const [purpose, setPurpose] = useState<VideoPurpose>('general');
  const [target, setTarget] = useState('');
  const [langMode, setLangMode] = useState<LangMode>('auto');
  const [output, setOutput] = useState<VideoPromptOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { locale } = useLanguage();
  const effectiveLocale = langMode === 'auto' ? locale : langMode;

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      setOutput(await generateVideoOutput(videoId, purpose, target, effectiveLocale));
    } catch (value) {
      setError(value instanceof Error ? value.message : '生成失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-label="复刻输出" className="border-t border-[var(--card-border)] pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-heading uppercase tracking-wide text-[var(--text-muted)]">复刻输出</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">按用途整理成可复制提示词，或导出结构化结果。</p>
        </div>
        <span className="rounded-md border border-[var(--card-border)] px-2 py-1 text-[10px] text-[var(--text-muted)]">
          {effectiveLocale}
        </span>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--card-border)] bg-[var(--muted)]/35 p-3">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-heading text-[var(--text-muted)]">用途</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {purposes.map(([value, label]) => (
              <button
                key={value}
                onClick={() => { setPurpose(value); setOutput(null); }}
                className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                  purpose === value
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-heading text-[var(--text-muted)]">Prompt 语言</span>
          <div className="flex items-center rounded-lg bg-[var(--card)] p-0.5">
            {languageModes.map(([value, label]) => (
              <button
                key={value}
                onClick={() => { setLangMode(value); setOutput(null); }}
                className={`rounded-md px-2 py-1 text-[10px] font-heading transition-colors ${
                  langMode === value
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {purpose !== 'general' && purpose !== 'json' && (
          <input
            aria-label="目标平台"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="可选：Sora、React、After Effects…"
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
          />
        )}

        <button
          onClick={generate}
          disabled={loading}
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {loading ? '生成中…' : '生成输出'}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {output && <PromptOutputCard output={output} />}
    </section>
  );
}

function PromptOutputCard({ output }: { output: VideoPromptOutput }) {
  const isJson = output.purpose === 'json';
  const formatted = isJson ? formatJson(output.content) : output.content.trim();

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] px-3 py-2.5">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-heading text-[var(--text)]">{isJson ? '结构化 JSON' : '可复刻提示词'}</h4>
          <p className="text-xs text-[var(--text-muted)]">{isJson ? '用于调试、导出或二次处理。' : '可直接复制到目标工具中使用。'}</p>
        </div>
        <button
          className="shrink-0 rounded-md px-2 py-1 text-xs text-[var(--accent)] hover:bg-[var(--muted)]"
          onClick={() => navigator.clipboard.writeText(output.content)}
        >
          复制
        </button>
      </div>
      {isJson ? (
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap bg-[var(--muted)]/35 p-3 font-mono text-xs leading-5 text-[var(--text)]">
          {formatted}
        </pre>
      ) : (
        <div className="max-h-80 overflow-auto p-3 text-sm leading-6 text-[var(--text)]">
          {splitReadableBlocks(formatted).map((block, index) => (
            <p key={index} className={index === 0 ? 'whitespace-pre-wrap' : 'mt-3 whitespace-pre-wrap'}>
              {block}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function splitReadableBlocks(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function formatJson(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}
