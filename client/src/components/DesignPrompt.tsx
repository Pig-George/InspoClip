import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Copy, Check, RefreshCw } from 'lucide-react';
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

  const langOptions: { key: LangMode; label: string }[] = [
    { key: 'auto', label: 'Auto' },
    { key: 'en', label: 'EN' },
    { key: 'zh', label: '中' },
    { key: 'both', label: 'EN/中' },
  ];

  const display = getDisplayText();

  return (
    <div>
      {!prompt && !loading && (
        <button
          onClick={() => handleGenerate(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading
            bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {locale === 'zh' ? '生成 Prompt' : 'Generate Prompt'}
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          {locale === 'zh' ? '正在生成...' : 'Generating...'}
        </div>
      )}

      <AnimatePresence>
        {prompt && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              {/* Language toggle */}
              <div className="flex items-center bg-[var(--muted)] rounded-md p-0.5">
                {langOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setLangMode(opt.key)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-heading transition-colors ${
                      langMode === opt.key
                        ? 'bg-[var(--card)] text-[var(--accent)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopy(display.showEn && display.showZh ? `${display.en}\n\n${display.zh}` : display.showEn ? display.en : display.zh)}
                  className="p-1 rounded hover:bg-[var(--muted)] transition-colors"
                  title={locale === 'zh' ? '复制' : 'Copy'}
                >
                  {copied
                    ? <Check className="w-3.5 h-3.5 text-green-500" />
                    : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  }
                </button>
                <button
                  onClick={() => handleGenerate(true)}
                  disabled={loading}
                  className="p-1 rounded hover:bg-[var(--muted)] transition-colors disabled:opacity-40"
                  title={locale === 'zh' ? '重新生成' : 'Regenerate'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[var(--text-muted)] ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20 space-y-2">
              {display.showEn && (
                <p className="text-sm text-[var(--text)] leading-relaxed font-handwriting">
                  {display.en}
                </p>
              )}
              {display.showEn && display.showZh && (
                <div className="border-t border-[var(--accent)]/10" />
              )}
              {display.showZh && (
                <p className="text-sm text-[var(--text)] leading-relaxed font-handwriting">
                  {display.zh}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
