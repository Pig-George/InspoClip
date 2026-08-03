import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cpu, Globe, Image, Key, Link, Video, X } from 'lucide-react';
import { fetchConfig, updateConfig, type AIConfig } from '@/lib/api';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useLanguage } from '@/context/LanguageContext';
import { APP_VERSION } from '@/version';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

type SettingsTab = 'image' | 'video';

type ModelProvider = 'alibaba-bailian' | 'openai' | 'openrouter' | 'google-ai-studio' | 'openai-compatible';

const providerProfiles: Record<ModelProvider, { label: string; baseURL: string; model: string }> = {
  'alibaba-bailian': { label: 'Alibaba Cloud Model Studio', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen3.7-plus' },
  openai: { label: 'OpenAI', baseURL: 'https://api.openai.com/v1', model: 'gpt-4.1-mini' },
  openrouter: { label: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', model: 'google/gemini-2.5-flash' },
  'google-ai-studio': { label: 'Google AI Studio', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-2.5-flash' },
  'openai-compatible': { label: 'Other OpenAI-compatible service', baseURL: 'https://api.openai.com/v1', model: 'gpt-4.1-mini' },
};

function normalizeProvider(value: string | undefined): ModelProvider {
  if (value === 'qwen' || value === 'dashscope') return 'alibaba-bailian';
  if (value === 'gemini') return 'google-ai-studio';
  if (value && value in providerProfiles) return value as ModelProvider;
  return 'alibaba-bailian';
}

function isMaskedKey(value: string | undefined): boolean {
  return !!value && /[*•]/.test(value);
}

const inputClass = `w-full rounded-lg border border-[var(--card-border)] bg-[var(--muted)] px-3 py-2
  text-[var(--text)] placeholder:text-[var(--text-muted)] font-handwriting
  focus:outline-none focus:border-[var(--accent)] transition-colors`;

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [config, setConfig] = useState<AIConfig>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<SettingsTab>('image');
  const overlayRef = useScrollLock(open);
  const { t, locale } = useLanguage();

  useEffect(() => {
    if (!open) return;
    setActiveTab('image');
    fetchConfig()
      .then(setConfig)
      .catch(() => setMessage(t('LoadFailed')));
  }, [open, t]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updates: AIConfig = {};
      if (activeTab === 'image') {
        if (config.AI_PROVIDER) updates.AI_PROVIDER = config.AI_PROVIDER;
        if (config.AI_API_KEY && !isMaskedKey(config.AI_API_KEY)) updates.AI_API_KEY = config.AI_API_KEY;
        if (config.AI_API_BASE) updates.AI_API_BASE = config.AI_API_BASE;
        if (config.AI_MODEL) updates.AI_MODEL = config.AI_MODEL;
      } else {
        if (config.VIDEO_AI_PROVIDER) updates.VIDEO_AI_PROVIDER = config.VIDEO_AI_PROVIDER;
        if (config.VIDEO_AI_API_KEY && !isMaskedKey(config.VIDEO_AI_API_KEY)) updates.VIDEO_AI_API_KEY = config.VIDEO_AI_API_KEY;
        if (config.VIDEO_AI_API_BASE) updates.VIDEO_AI_API_BASE = config.VIDEO_AI_API_BASE;
        if (config.VIDEO_AI_MODEL) updates.VIDEO_AI_MODEL = config.VIDEO_AI_MODEL;
        if (config.VIDEO_AI_FPS && Number(config.VIDEO_AI_FPS) >= 1 && Number(config.VIDEO_AI_FPS) <= 5) updates.VIDEO_AI_FPS = config.VIDEO_AI_FPS;
      }
      await updateConfig(updates);
      setMessage(t('Saved'));
    } catch {
      setMessage(t('SaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const tabLabels = {
    image: locale === 'zh' ? '图片分析' : 'Image analysis',
    video: locale === 'zh' ? '视频理解' : 'Video understanding',
  };
  const imageProvider = normalizeProvider(config.AI_PROVIDER);
  const videoProvider = normalizeProvider(config.VIDEO_AI_PROVIDER);

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
            className="mx-4 flex max-h-[min(720px,calc(100vh-2rem))] w-full max-w-md flex-col overflow-hidden
              rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between px-6 pb-4 pt-6">
              <h2 className="text-xl font-heading font-semibold text-[var(--text)]">
                {t('Settings')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('Close')}
                className="p-1 rounded-full hover:bg-[var(--muted)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            <div
              role="tablist"
              aria-label={locale === 'zh' ? '模型设置类型' : 'Model settings type'}
              className="mx-6 mb-2 grid shrink-0 grid-cols-2 rounded-xl border border-[var(--card-border)] bg-[var(--muted)]/60 p-1"
            >
              {([
                { id: 'image' as const, label: tabLabels.image, icon: Image },
                { id: 'video' as const, label: tabLabels.video, icon: Video },
              ]).map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`${tab.id}-model-tab`}
                    aria-selected={selected}
                    aria-controls={`${tab.id}-model-settings`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-heading transition-all
                      ${selected
                        ? 'bg-[var(--card)] text-[var(--accent)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {activeTab === 'image' ? (
                <div id="image-model-settings" role="tabpanel" aria-labelledby="image-model-tab" className="space-y-4">
                  <div>
                    <label htmlFor="image-ai-provider" className="flex items-center gap-2 text-sm font-heading text-[var(--text)] mb-1.5">
                      <Globe className="w-4 h-4 text-[var(--accent)]" />
                      {t('Provider')}
                    </label>
                    <select
                      id="image-ai-provider"
                      value={imageProvider}
                      onChange={(e) => {
                        const provider = e.target.value as ModelProvider;
                        const profile = providerProfiles[provider];
                        setConfig({ ...config, AI_PROVIDER: provider, AI_API_BASE: profile.baseURL, AI_MODEL: profile.model });
                      }}
                      className={inputClass}
                    >
                      {Object.entries(providerProfiles).map(([value, profile]) => (
                        <option key={value} value={value}>{profile.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Uses OpenAI-compatible JSON object output for stable structured analysis.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="image-ai-key" className="flex items-center gap-2 text-sm font-heading text-[var(--text)] mb-1.5">
                      <Key className="w-4 h-4 text-[var(--accent)]" />
                      {t('ApiKey')}
                    </label>
                    <input
                      id="image-ai-key"
                      name="image-ai-api-key"
                      type="password"
                      autoComplete="off"
                      value={config.AI_API_KEY || ''}
                      onChange={(e) => setConfig({ ...config, AI_API_KEY: e.target.value })}
                      placeholder="sk-..."
                      className={inputClass}
                    />
                    {isMaskedKey(config.AI_API_KEY) && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Current key is masked. Enter a new key to change it.
                      </p>
                    )}
                  </div>

                  <div>
                      <label htmlFor="image-ai-base" className="flex items-center gap-2 text-sm font-heading text-[var(--text)] mb-1.5">
                        <Link className="w-4 h-4 text-[var(--accent)]" />
                        {t('ApiEndpoint')}
                      </label>
                      <input
                        id="image-ai-base"
                        type="text"
                        value={config.AI_API_BASE || ''}
                        onChange={(e) => setConfig({ ...config, AI_API_BASE: e.target.value })}
                        placeholder={providerProfiles[imageProvider].baseURL}
                        className={inputClass}
                      />
                  </div>

                  <div>
                    <label htmlFor="image-ai-model" className="flex items-center gap-2 text-sm font-heading text-[var(--text)] mb-1.5">
                      <Cpu className="w-4 h-4 text-[var(--accent)]" />
                      {t('ModelName')}
                    </label>
                    <input
                      id="image-ai-model"
                      type="text"
                      value={config.AI_MODEL || ''}
                      onChange={(e) => setConfig({ ...config, AI_MODEL: e.target.value })}
                      placeholder={
                        providerProfiles[imageProvider].model
                      }
                      className={inputClass}
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Select a vision-capable model that supports JSON object response format.
                    </p>
                  </div>
                </div>
              ) : (
                <div id="video-model-settings" role="tabpanel" aria-labelledby="video-model-tab" className="space-y-4">
                  <div className="rounded-xl border border-[var(--card-border)] bg-[var(--muted)]/40 px-4 py-3">
                    <h3 className="font-heading text-base text-[var(--text)]">
                      {locale === 'zh' ? '视频理解模型' : 'Video understanding model'}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {locale === 'zh'
                        ? '默认使用 Qwen3.7-Plus，可独立于图片模型调整。'
                        : 'Defaults to Qwen3.7-Plus and can be tuned independently from image analysis.'}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="video-ai-provider" className="text-sm font-heading text-[var(--text)]">
                      {locale === 'zh' ? '模型服务平台' : 'Video provider'}
                    </label>
                    <select
                      id="video-ai-provider"
                      value={videoProvider}
                      onChange={(e) => {
                        const provider = e.target.value as ModelProvider;
                        const profile = providerProfiles[provider];
                        setConfig({ ...config, VIDEO_AI_PROVIDER: provider, VIDEO_AI_API_BASE: profile.baseURL, VIDEO_AI_MODEL: profile.model });
                      }}
                      className={`mt-1.5 ${inputClass}`}
                    >
                      {Object.entries(providerProfiles).map(([value, profile]) => (
                        <option key={value} value={value}>{profile.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="video-ai-model" className="text-sm font-heading text-[var(--text)]">
                      {locale === 'zh' ? '视频模型' : 'Video model'}
                    </label>
                    <input
                      id="video-ai-model"
                      value={config.VIDEO_AI_MODEL || providerProfiles[videoProvider].model}
                      onChange={(e) => setConfig({ ...config, VIDEO_AI_MODEL: e.target.value })}
                      className={`mt-1.5 ${inputClass}`}
                    />
                  </div>

                  <div>
                    <label htmlFor="video-ai-base" className="text-sm font-heading text-[var(--text)]">
                      {locale === 'zh' ? '视频 API 地址' : 'Video API endpoint'}
                    </label>
                    <input
                      id="video-ai-base"
                      value={config.VIDEO_AI_API_BASE || providerProfiles[videoProvider].baseURL}
                      onChange={(e) => setConfig({ ...config, VIDEO_AI_API_BASE: e.target.value })}
                      className={`mt-1.5 ${inputClass}`}
                    />
                  </div>

                  <div>
                    <label htmlFor="video-ai-key" className="text-sm font-heading text-[var(--text)]">
                      {locale === 'zh' ? '视频 API Key' : 'Video API key'}
                    </label>
                    <input
                      id="video-ai-key"
                      name="video-ai-api-key"
                      type="password"
                      autoComplete="off"
                      value={config.VIDEO_AI_API_KEY || ''}
                      onChange={(e) => setConfig({ ...config, VIDEO_AI_API_KEY: e.target.value })}
                      placeholder="sk-..."
                      className={`mt-1.5 ${inputClass}`}
                    />
                    {isMaskedKey(config.VIDEO_AI_API_KEY) && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Current key is masked. Enter a new key to change it.
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="video-ai-fps" className="text-sm font-heading text-[var(--text)]">
                      {locale === 'zh' ? '视频采样 FPS（1–5）' : 'Video sampling FPS (1–5)'}
                    </label>
                    <input
                      id="video-ai-fps"
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      value={config.VIDEO_AI_FPS || '3'}
                      onChange={(e) => setConfig({ ...config, VIDEO_AI_FPS: e.target.value })}
                      className={`mt-1.5 ${inputClass}`}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--card-border)] px-6 py-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className={`min-h-4 text-xs font-handwriting ${message === t('Saved') ? 'text-green-500' : 'text-red-400'}`}>
                  {message}
                </span>
                <span className="text-[11px] font-heading tracking-wide text-[var(--text-muted)]/75">
                  {locale === 'zh' ? '版本' : 'Version'} {APP_VERSION}
                </span>
              </div>
              <button
                type="button"
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
