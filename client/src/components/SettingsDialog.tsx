import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Link, Cpu, Globe } from 'lucide-react';
import { fetchConfig, updateConfig, type AIConfig } from '@/lib/api';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useLanguage } from '@/context/LanguageContext';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [config, setConfig] = useState<AIConfig>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const overlayRef = useScrollLock(open);
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      fetchConfig()
        .then(setConfig)
        .catch(() => setMessage(t('LoadFailed')));
    }
  }, [open, t]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updates: AIConfig = {};
      if (config.AI_PROVIDER) updates.AI_PROVIDER = config.AI_PROVIDER;
      if (config.AI_API_KEY && !config.AI_API_KEY.startsWith('•')) {
        updates.AI_API_KEY = config.AI_API_KEY;
      }
      if (config.AI_API_BASE) updates.AI_API_BASE = config.AI_API_BASE;
      if (config.AI_MODEL) updates.AI_MODEL = config.AI_MODEL;
      await updateConfig(updates);
      setMessage(t('Saved'));
    } catch {
      setMessage(t('SaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          data-dialog-overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="w-full max-w-md mx-4 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-semibold text-[var(--text)]">
                {t('Settings')}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-[var(--muted)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Provider */}
              <div>
                <label className="flex items-center gap-2 text-sm font-heading text-[var(--text)] mb-1.5">
                  <Globe className="w-4 h-4 text-[var(--accent)]" />
                  {t('Provider')}
                </label>
                <select
                  value={config.AI_PROVIDER || 'gemini'}
                  onChange={(e) => setConfig({ ...config, AI_PROVIDER: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--card-border)]
                    text-[var(--text)] font-handwriting
                    focus:outline-none focus:border-[var(--accent)] transition-colors"
                >
                  <option value="gemini">Google Gemini (Vision)</option>
                  <option value="openai">OpenAI Compatible (DeepSeek / GPT / Grok)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  All providers support image-to-text vision analysis.
                </p>
              </div>

              {/* API Key */}
              <div>
                <label className="flex items-center gap-2 text-sm font-heading text-[var(--text)] mb-1.5">
                  <Key className="w-4 h-4 text-[var(--accent)]" />
                  {t('ApiKey')}
                </label>
                <input
                  type="password"
                  value={config.AI_API_KEY || ''}
                  onChange={(e) => setConfig({ ...config, AI_API_KEY: e.target.value })}
                  placeholder={config.AI_PROVIDER === 'gemini' ? 'AIza...' : 'sk-...'}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--card-border)]
                    text-[var(--text)] placeholder:text-[var(--text-muted)] font-handwriting
                    focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                {(config.AI_API_KEY || '').startsWith('•') && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Current key is masked. Enter a new key to change it.
                  </p>
                )}
              </div>

              {/* API Base URL (OpenAI only) */}
              {(config.AI_PROVIDER === 'openai' || config.AI_PROVIDER === 'anthropic') && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-heading text-[var(--text)] mb-1.5">
                    <Link className="w-4 h-4 text-[var(--accent)]" />
                    {t('ApiEndpoint')}
                  </label>
                  <input
                    type="text"
                    value={config.AI_API_BASE || ''}
                    onChange={(e) => setConfig({ ...config, AI_API_BASE: e.target.value })}
                    placeholder={
                      config.AI_PROVIDER === 'anthropic'
                        ? 'https://api.anthropic.com/v1'
                        : 'https://api.deepseek.com/v1'
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--card-border)]
                      text-[var(--text)] placeholder:text-[var(--text-muted)] font-handwriting
                      focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>
              )}

              {/* Model */}
              <div>
                <label className="flex items-center gap-2 text-sm font-heading text-[var(--text)] mb-1.5">
                  <Cpu className="w-4 h-4 text-[var(--accent)]" />
                  {t('ModelName')}
                </label>
                <input
                  type="text"
                  value={config.AI_MODEL || ''}
                  onChange={(e) => setConfig({ ...config, AI_MODEL: e.target.value })}
                  placeholder={
                    config.AI_PROVIDER === 'gemini'
                      ? 'gemini-2.0-flash'
                      : config.AI_PROVIDER === 'anthropic'
                        ? 'claude-sonnet-4-6'
                        : 'deepseek-chat'
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--card-border)]
                    text-[var(--text)] placeholder:text-[var(--text-muted)] font-handwriting
                    focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {config.AI_PROVIDER === 'gemini'
                    ? 'gemini-2.0-flash, gemini-2.5-pro, etc.'
                    : config.AI_PROVIDER === 'anthropic'
                      ? 'claude-sonnet-4-6, claude-opus-4-7, etc.'
                      : 'Must be vision-capable: gpt-4o, grok-4.20-auto, etc.'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-6">
              <span className={`text-xs font-handwriting ${message === t('Saved') ? 'text-green-500' : 'text-red-400'}`}>
                {message}
              </span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-heading text-sm
                  hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                {saving ? t('Saving') : t('Save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
