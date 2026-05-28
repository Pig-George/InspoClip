import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { ImageCard } from './ImageCard';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useLanguage } from '@/context/LanguageContext';
import { fetchTags } from '@/lib/api';
import type { Image as ImageType, Tag } from '@/types';

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ImageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useScrollLock(open);
  const { locale } = useLanguage();

  useEffect(() => {
    if (open) fetchTags().then(setAllTags).catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        // Reorder terms so matching term is first
        const lq = q.toLowerCase();
        for (const img of data) {
          const matchIdx = img.terms.findIndex((t: any) => t.keyword.toLowerCase().includes(lq));
          if (matchIdx > 0) {
            const [match] = img.terms.splice(matchIdx, 1);
            img.terms.unshift(match);
          }
        }
        setResults(data);
      }
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          data-dialog-overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-start justify-center pt-20 bg-black/30"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -10 }}
            className="w-full max-w-lg mx-4 max-h-[70vh] flex flex-col rounded-2xl bg-[var(--card)]
              border border-[var(--card-border)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--card-border)]">
              <Search className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); doSearch(e.target.value); }}
                placeholder={locale === 'zh' ? '搜索术语关键词...' : 'Search term keywords...'}
                className="flex-1 bg-transparent text-[var(--text)] placeholder:text-[var(--text-muted)]
                  focus:outline-none font-handwriting text-lg"
              />
              <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--muted)]">
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-[var(--card-border)]">
                {allTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
                    className={`px-2 py-0.5 rounded-full text-xs font-heading transition-opacity ${
                      selectedTag === tag.id ? 'ring-2 ring-[var(--accent)]' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: tag.color + '20', color: tag.color }}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading && (
                <p className="text-center text-sm text-[var(--text-muted)] py-8">
                  {locale === 'zh' ? '搜索中...' : 'Searching...'}
                </p>
              )}
              {!loading && query && results.length === 0 && (
                <p className="text-center text-sm text-[var(--text-muted)] py-8">
                  {locale === 'zh' ? '未找到匹配结果' : 'No results found'}
                </p>
              )}
              {!loading && results.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {results
                    .filter((img) => !selectedTag || img.tags?.some((t) => t.id === selectedTag))
                    .map((img) => (
                      <ImageCard key={img.id} image={img} onRefresh={() => doSearch(query)} />
                    ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
