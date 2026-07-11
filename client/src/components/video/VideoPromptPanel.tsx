import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Loader2, Copy, Check, RefreshCw } from 'lucide-react';

import { useLanguage } from '@/context/LanguageContext';
import { generateVideoOutput, fetchVideoOutput } from '@/lib/video-api';
import { getInflight, setInflight } from '@/lib/video-prompt-cache';
import type { VideoPromptOutput, VideoPurpose } from '@/types/video';

type LangMode = 'auto' | 'en' | 'zh' | 'both';

const promptCopy = {
  zh: {
    title: '复刻输出',
    description: '按用途整理成可复制提示词，或导出结构化结果。',
    purpose: '用途',
    targetPlatform: '目标平台',
    targetPlaceholder: '可选：Sora、React、After Effects…',
    generating: '生成中…',
    loading: '加载中…',
    generateFailed: '生成失败',
    generate: '生成输出',
    copy: '复制',
    copied: '已复制',
    regenerate: '重新生成',
    purposes: {
      general: '通用',
      'video-generation': '视频生成',
      frontend: '前端实现',
      'motion-design': 'AE / Figma',
      storyboard: '分镜脚本',
      json: '结构化 JSON',
    },
    languageModes: {
      auto: 'Auto',
      en: 'EN',
      zh: '中',
      both: 'EN/中',
    },
  },
  en: {
    title: 'Replication output',
    description: 'Organize the analysis into reusable prompts by purpose, or export a structured result.',
    purpose: 'Purpose',
    targetPlatform: 'Target platform',
    targetPlaceholder: 'Optional: Sora, React, After Effects…',
    generating: 'Generating…',
    loading: 'Loading…',
    generateFailed: 'Generation failed',
    generate: 'Generate output',
    copy: 'Copy',
    copied: 'Copied',
    regenerate: 'Regenerate',
    purposes: {
      general: 'General',
      'video-generation': 'Video generation',
      frontend: 'Frontend implementation',
      'motion-design': 'AE / Figma',
      storyboard: 'Storyboard',
      json: 'Structured JSON',
    },
    languageModes: {
      auto: 'Auto',
      en: 'EN',
      zh: '中',
      both: 'EN/中',
    },
  },
} as const;

const purposeValues: VideoPurpose[] = ['general', 'video-generation', 'frontend', 'motion-design', 'storyboard', 'json'];
const languageModeValues: LangMode[] = ['auto', 'en', 'zh', 'both'];

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 100; // 5 minutes max

export function VideoPromptPanel({ videoId }: { videoId: string }) {
  const [purpose, setPurpose] = useState<VideoPurpose>('general');
  const [target, setTarget] = useState('');
  const [langMode, setLangMode] = useState<LangMode>('auto');
  const [output, setOutput] = useState<VideoPromptOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const { locale } = useLanguage();
  const copy = promptCopy[locale];
  const cancelledRef = useRef(false);

  const effectiveLocale = langMode === 'auto' ? locale : langMode;

  // Poll GET until the output is ready or absent.
  const pollOutput = useCallback(async (vid: string, pur: VideoPurpose): Promise<VideoPromptOutput | null> => {
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      if (cancelledRef.current) return null;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      if (cancelledRef.current) return null;
      try {
        const result = await fetchVideoOutput(vid, pur);
        if (cancelledRef.current) return null;
        if (result && 'generating' in result) continue;
        return result;
      } catch {
        // Keep polling on transient errors.
      }
    }
    return null;
  }, []);

  // Load existing output or recover generating state.
  const loadExisting = useCallback(async (vid: string, pur: VideoPurpose) => {
    const inflight = getInflight(vid, pur);
    if (inflight) {
      setGenerating(true);
      setError('');
      try {
        const result = await inflight;
        if (!cancelledRef.current) setOutput(result);
      } catch {
        if (!cancelledRef.current) setOutput(null);
      } finally {
        if (!cancelledRef.current) setGenerating(false);
      }
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await fetchVideoOutput(vid, pur);
      if (cancelledRef.current) return;

      if (result && 'generating' in result) {
        setLoading(false);
        setGenerating(true);
        const polled = await pollOutput(vid, pur);
        if (!cancelledRef.current) {
          setOutput(polled);
          setGenerating(false);
        }
        return;
      }

      setOutput(result);
    } catch {
      if (!cancelledRef.current) setOutput(null);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [pollOutput]);

  useEffect(() => {
    cancelledRef.current = false;
    loadExisting(videoId, purpose);
    return () => {
      cancelledRef.current = true;
    };
  }, [videoId, purpose, loadExisting]);

  const handleGenerate = async () => {
    const inflight = getInflight(videoId, purpose);
    if (inflight) {
      setGenerating(true);
      setError('');
      try {
        setOutput(await inflight);
      } catch (value) {
        setError(value instanceof Error ? value.message : copy.generateFailed);
      } finally {
        setGenerating(false);
      }
      return;
    }

    setGenerating(true);
    setError('');
    const promise = generateVideoOutput(videoId, purpose, target);
    setInflight(videoId, purpose, promise);
    try {
      setOutput(await promise);
    } catch (value) {
      setError(value instanceof Error ? value.message : copy.generateFailed);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard permission failures.
    }
  };

  const display = (() => {
    if (!output) return { en: '', zh: '', showEn: false, showZh: false };
    return {
      en: output.contentEn,
      zh: output.contentZh,
      showEn: effectiveLocale === 'en' || effectiveLocale === 'both',
      showZh: effectiveLocale === 'zh' || effectiveLocale === 'both',
    };
  })();

  const isJson = purpose === 'json';
  const copyText = display.showEn && display.showZh
    ? `${display.en}\n\n${display.zh}`
    : display.showEn ? display.en : display.zh;

  return (
    <section aria-label={copy.title} className="border-t border-[var(--card-border)] pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-heading uppercase tracking-wide text-[var(--text-muted)]">{copy.title}</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{copy.description}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--card-border)] bg-[var(--muted)]/35 p-3">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-heading text-[var(--text-muted)]">{copy.purpose}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {purposeValues.map((value) => (
              <button
                key={value}
                onClick={() => {
                  setPurpose(value);
                  setTarget('');
                  setOutput(null);
                }}
                className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                  purpose === value
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'bg-[var(--card)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {copy.purposes[value]}
              </button>
            ))}
          </div>
        </div>

        {purpose !== 'general' && purpose !== 'json' && (
          <input
            aria-label={copy.targetPlatform}
            value={target}
            onChange={(event) => {
              setTarget(event.target.value);
              setOutput(null);
            }}
            placeholder={copy.targetPlaceholder}
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
          />
        )}
      </div>

      {(loading || generating) && (
        <div className="mt-3 flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {generating ? copy.generating : copy.loading}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {!output && !loading && !generating && (
        <button
          onClick={handleGenerate}
          className="mt-3 flex items-center gap-1.5 rounded-full bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-heading text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {copy.generate}
        </button>
      )}

      {output && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center rounded-md bg-[var(--muted)] p-0.5">
              {languageModeValues.map((value) => (
                <button
                  key={value}
                  onClick={() => setLangMode(value)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-heading transition-colors ${
                    langMode === value
                      ? 'bg-[var(--card)] text-[var(--accent)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {copy.languageModes[value]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCopy(copyText)}
                className="rounded p-1 transition-colors hover:bg-[var(--muted)]"
                title={copied ? copy.copied : copy.copy}
                aria-label={copied ? copy.copied : copy.copy}
              >
                {copied
                  ? <Check className="h-3.5 w-3.5 text-green-500" />
                  : <Copy className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                }
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded p-1 transition-colors hover:bg-[var(--muted)] disabled:opacity-40"
                title={copy.regenerate}
                aria-label={copy.regenerate}
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[var(--text-muted)] ${generating ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {isJson ? (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--card-border)] bg-[var(--muted)]/35 p-3 font-mono text-xs leading-5 text-[var(--text)]">
              {formatJson(display.showEn ? display.en : display.zh)}
            </pre>
          ) : (
            <div className="space-y-2 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-3">
              {display.showEn && (
                <div className="prose-video-prompt">
                  <ReactMarkdown>{display.en}</ReactMarkdown>
                </div>
              )}
              {display.showEn && display.showZh && (
                <div className="border-t border-[var(--accent)]/10" />
              )}
              {display.showZh && (
                <div className="prose-video-prompt">
                  <ReactMarkdown>{display.zh}</ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function formatJson(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}
