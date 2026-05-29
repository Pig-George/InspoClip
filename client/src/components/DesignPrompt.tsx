import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { generateDesignPrompt, type DesignPrompt } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from '@/components/Toast';

interface DesignPromptProps {
  imageId: string;
}

export function DesignPrompt({ imageId }: DesignPromptProps) {
  const [prompt, setPrompt] = useState<DesignPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { locale } = useLanguage();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateDesignPrompt(imageId);
      setPrompt(result);
    } catch {
      toast('error', locale === 'zh' ? '生成提示词失败' : 'Failed to generate prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!prompt) return;
    const text = locale === 'zh' ? prompt.contentZh : prompt.contentEn;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast('error', 'Failed to copy');
    }
  };

  return (
    <div>
      {!prompt && !loading && (
        <button
          onClick={handleGenerate}
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
            className="relative p-3 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)] mt-0.5 flex-shrink-0" />
              <p className="flex-1 text-sm text-[var(--text)] leading-relaxed font-handwriting">
                {locale === 'zh' ? prompt.contentZh : prompt.contentEn}
              </p>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-1 rounded hover:bg-[var(--muted)] transition-colors"
                title={locale === 'zh' ? '复制' : 'Copy'}
              >
                {copied
                  ? <Check className="w-4 h-4 text-green-500" />
                  : <Copy className="w-4 h-4 text-[var(--text-muted)]" />
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
