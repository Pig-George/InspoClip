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
    <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg text-[var(--text)]">复刻输出</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">选择用途后生成可直接复制的提示词或结构化数据。</p>
        </div>
        <span className="rounded-full bg-[var(--muted)] px-2 py-1 text-[10px] text-[var(--text-muted)]">
          {effectiveLocale}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {purposes.map(([value, label]) => (
          <button
            key={value}
            onClick={() => { setPurpose(value); setOutput(null); }}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${purpose === value ? 'bg-[var(--accent)] text-white' : 'bg-[var(--muted)] text-[var(--text)] hover:bg-[var(--accent)]/10'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--text-muted)]">Prompt 语言</span>
        <div className="flex items-center rounded-md bg-[var(--muted)] p-0.5">
          {languageModes.map(([value, label]) => (
            <button
              key={value}
              onClick={() => { setLangMode(value); setOutput(null); }}
              className={`rounded px-2 py-0.5 text-[10px] font-heading transition-colors ${
                langMode === value
                  ? 'bg-[var(--card)] text-[var(--accent)] shadow-sm'
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
          className="mt-3 w-full rounded-lg border border-[var(--card-border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      )}

      <button
        onClick={generate}
        disabled={loading}
        className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-white transition-opacity disabled:opacity-50"
      >
        {loading ? '生成中…' : '生成输出'}
      </button>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {output && <PromptOutputCard output={output} />}
    </section>
  );
}

function PromptOutputCard({ output }: { output: VideoPromptOutput }) {
  const isJson = output.purpose === 'json';
  const formatted = isJson ? formatJson(output.content) : output.content.trim();

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--muted)]/70">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
        <div>
          <h3 className="text-sm font-heading text-[var(--text)]">{isJson ? '结构化 JSON' : '可复刻提示词'}</h3>
          <p className="text-xs text-[var(--text-muted)]">{isJson ? '用于调试、导出或二次处理。' : '已整理为更适合阅读和复制的内容。'}</p>
        </div>
        <button
          className="rounded-full bg-[var(--card)] px-3 py-1 text-xs text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
          onClick={() => navigator.clipboard.writeText(output.content)}
        >
          复制全部
        </button>
      </div>
      {isJson ? (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-[var(--text)]">
          {formatted}
        </pre>
      ) : (
        <div className="max-h-96 space-y-3 overflow-auto p-4 text-sm leading-6 text-[var(--text)]">
          {splitReadableBlocks(formatted).map((block, index) => (
            <p key={index} className="whitespace-pre-wrap rounded-xl bg-[var(--card)]/70 p-3">
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
