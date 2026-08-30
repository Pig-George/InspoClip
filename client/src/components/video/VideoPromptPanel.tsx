import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Loader2, Copy, Check, RefreshCw } from 'lucide-react';

import { useLanguage } from '@/context/LanguageContext';
import { generateVideoOutput, fetchVideoOutput } from '@/lib/video-api';
import { getInflight, setInflight } from '@/lib/video-prompt-cache';
import type { VideoPromptOutput, VideoPurpose } from '@/types/video';
import { WorkspacePromptOutput, WorkspaceReplicationPromptPanel } from '@inspoclip/workspace-ui';

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

  const handleGenerate = async (force = false) => {
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
    const promise = generateVideoOutput(videoId, purpose, target, force);
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
    <WorkspaceReplicationPromptPanel
      title={copy.title}
      description={copy.description}
      purposes={purposeValues.map((value) => ({ value, label: copy.purposes[value] }))}
      selectedPurpose={purpose}
      onPurposeChange={(value) => {
        setPurpose(value as VideoPurpose);
        setTarget('');
        setOutput(null);
      }}
      showTarget={purpose !== 'general' && purpose !== 'json'}
      target={target}
      onTargetChange={(value) => {
        setTarget(value);
        setOutput(null);
      }}
      loading={loading || generating}
      hasOutput={Boolean(output)}
      onGenerate={() => handleGenerate(false)}
      error={error || undefined}
      labels={{
        purpose: copy.purpose,
        target: copy.targetPlatform,
        targetPlaceholder: copy.targetPlaceholder,
        generate: copy.generate,
        generating: generating ? copy.generating : copy.loading,
      }}
      loadingIcon={<Loader2 className="workspace-prompt-loading-icon" />}
      generateIcon={<Sparkles />}
    >
      {output ? <WorkspacePromptOutput
            language={langMode}
            onLanguageChange={setLangMode}
            onCopy={() => handleCopy(copyText)}
            onRegenerate={() => handleGenerate(true)}
            copyState={copied}
            generating={generating}
            labels={{ auto: copy.languageModes.auto, en: copy.languageModes.en, zh: copy.languageModes.zh, both: copy.languageModes.both, copy: copy.copy, copied: copy.copied, regenerate: copy.regenerate }}
            icons={{ copy: <Copy />, copied: <Check />, regenerate: <RefreshCw /> }}
            contentEn={display.en}
            contentZh={display.zh}
            showEn={display.showEn}
            showZh={display.showZh}
            isJson={isJson}
            contentClassName="workspace-prompt-markdown"
            renderContent={(content) => <ReactMarkdown>{content}</ReactMarkdown>}
      /> : null}
    </WorkspaceReplicationPromptPanel>
  );

  return null;
}
