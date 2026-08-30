import { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import { WorkspacePromptOutput, WorkspacePromptResult } from '@inspoclip/workspace-ui';
import { fetchDesignPrompt, generateDesignPrompt, type DesignPrompt as DesignPromptType } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from '@/components/Toast';

interface DesignPromptProps {
  imageId: string;
}

type LangMode = 'auto' | 'en' | 'zh' | 'both';

export function DesignPrompt({ imageId }: DesignPromptProps) {
  const [prompt, setPrompt] = useState<DesignPromptType | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [langMode, setLangMode] = useState<LangMode>('auto');
  const { locale } = useLanguage();

  useEffect(() => {
    fetchDesignPrompt(imageId).then((existing) => {
      if (existing) setPrompt(existing);
    }).catch(() => {});
  }, [imageId]);

  const handleGenerate = async (force = false) => {
    setLoading(true);
    try {
      const result = await generateDesignPrompt(imageId, force);
      setPrompt(result);
    } catch {
      toast('error', locale === 'zh' ? '生成提示词失败' : 'Failed to generate prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast('error', 'Failed to copy');
    }
  };

  const getDisplayText = (): { en: string; zh: string; showEn: boolean; showZh: boolean } => {
    if (!prompt) return { en: '', zh: '', showEn: false, showZh: false };
    const effective = langMode === 'auto' ? locale : langMode;
    return {
      en: prompt.contentEn,
      zh: prompt.contentZh,
      showEn: effective === 'en' || effective === 'both',
      showZh: effective === 'zh' || effective === 'both',
    };
  };

  const display = getDisplayText();

  return (
    <WorkspacePromptResult
      hasPrompt={Boolean(prompt)}
      generating={loading}
      emptyLabel={locale === 'zh' ? '暂无 Prompt' : 'No prompt yet'}
      generatingLabel={locale === 'zh' ? '正在生成...' : 'Generating...'}
      generateLabel={locale === 'zh' ? '生成 Prompt' : 'Generate Prompt'}
      generateIcon={<Sparkles />}
      onGenerate={() => handleGenerate(false)}
    >
      {prompt ? <WorkspacePromptOutput
        language={langMode}
        onLanguageChange={setLangMode}
        onCopy={() => handleCopy(display.showEn && display.showZh ? `${display.en}\n\n${display.zh}` : display.showEn ? display.en : display.zh)}
        onRegenerate={() => handleGenerate(true)}
        copyState={copied}
        generating={loading}
        labels={{ auto: 'Auto', en: 'EN', zh: '中', both: 'EN/中', copy: locale === 'zh' ? '复制' : 'Copy', copied: locale === 'zh' ? '已复制' : 'Copied', regenerate: locale === 'zh' ? '重新生成' : 'Regenerate' }}
        icons={{ copy: <Copy />, copied: <Check />, regenerate: <RefreshCw /> }}
        contentEn={display.en}
        contentZh={display.zh}
        showEn={display.showEn}
        showZh={display.showZh}
      /> : null}
    </WorkspacePromptResult>
  );
}
