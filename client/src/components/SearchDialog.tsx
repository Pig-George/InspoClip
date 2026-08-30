import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { ImageCard } from './ImageCard';
import { VideoCard } from './video/VideoCard';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useLanguage } from '@/context/LanguageContext';
import { fetchTags } from '@/lib/api';
import type { Image as ImageType, Tag } from '@/types';
import type { WeekVideo } from '@/types/video';
import { WorkspaceSearchDialog } from '@inspoclip/workspace-ui';

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenVideo?: (videoId: string, jobId?: string) => void;
}

export function SearchDialog({ open, onClose, onOpenVideo }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [imageResults, setImageResults] = useState<ImageType[]>([]);
  const [videoResults, setVideoResults] = useState<WeekVideo[]>([]);
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
    if (!q.trim()) { setImageResults([]); setVideoResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        const lq = q.toLowerCase();
        // Reorder terms so matching term is first
        for (const img of data.images ?? []) {
          const matchIdx = img.terms.findIndex((t: any) => t.keyword.toLowerCase().includes(lq));
          if (matchIdx > 0) {
            const [match] = img.terms.splice(matchIdx, 1);
            img.terms.unshift(match);
          }
        }
        setImageResults(data.images ?? []);
        setVideoResults(data.videos ?? []);
      }
    } catch { setImageResults([]); setVideoResults([]); }
    finally { setLoading(false); }
  }, []);

  const filteredImages = imageResults.filter((img) => !selectedTag || img.tags?.some((t) => t.id === selectedTag));
  const filteredVideos = videoResults.filter((v) => !selectedTag || v.tags?.some((t) => t.id === selectedTag));
  const hasResults = filteredImages.length > 0 || filteredVideos.length > 0;

  if (!open) return null;

  return (
    <WorkspaceSearchDialog
      backdropRef={overlayRef}
      inputRef={inputRef}
      value={query}
      onChange={(value) => { setQuery(value); void doSearch(value); }}
      onClose={onClose}
      placeholder={locale === 'zh' ? '搜索术语关键词...' : 'Search term keywords...'}
      label={locale === 'zh' ? '搜索术语关键词' : 'Search term keywords'}
      closeLabel={locale === 'zh' ? '关闭' : 'Close'}
      inputIcon={<Search />}
      closeIcon={<X />}
      filters={allTags.length > 0 ? allTags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
          className={`px-2 py-0.5 rounded-full text-xs font-heading transition-opacity ${selectedTag === tag.id ? 'ring-2 ring-[var(--accent)]' : 'opacity-70 hover:opacity-100'}`}
          style={{ backgroundColor: tag.color + '20', color: tag.color }}
        >
          #{tag.name}
        </button>
      )) : null}
    >
      {loading && <p className="workspace-search-state">{locale === 'zh' ? '搜索中...' : 'Searching...'}</p>}
      {!loading && query && !hasResults && <p className="workspace-search-state">{locale === 'zh' ? '未找到匹配结果' : 'No results found'}</p>}
      {!loading && hasResults && (
        <div className="workspace-search-result-grid">
          {filteredImages.map((img) => <ImageCard key={img.id} image={img} onRefresh={() => void doSearch(query)} />)}
          {filteredVideos.map((video) => <VideoCard key={video.id} video={video} onOpen={(id, jobId) => { onClose(); onOpenVideo?.(id, jobId); }} onRefresh={() => void doSearch(query)} />)}
        </div>
      )}
    </WorkspaceSearchDialog>
  );
}
