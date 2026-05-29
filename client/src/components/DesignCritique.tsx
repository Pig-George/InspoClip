import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateCritique, type Critique } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from '@/components/Toast';

interface DesignCritiqueProps {
  imageId: string;
}

export function DesignCritique({ imageId }: DesignCritiqueProps) {
  const [critique, setCritique] = useState<Critique | null>(null);
  const [loading, setLoading] = useState(false);
  const { locale } = useLanguage();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateCritique(imageId);
      setCritique(result);
    } catch {
      toast('error', locale === 'zh' ? '生成点评失败' : 'Failed to generate critique');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!critique && !loading && (
        <button
          onClick={handleGenerate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading
            bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {locale === 'zh' ? 'AI 点评' : 'AI Critique'}
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          {locale === 'zh' ? '正在分析...' : 'Analyzing...'}
        </div>
      )}

      <AnimatePresence>
        {critique && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--text)] leading-relaxed font-handwriting">
                {locale === 'zh' ? critique.contentZh : critique.contentEn}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
