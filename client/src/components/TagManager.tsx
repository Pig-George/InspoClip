import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { fetchTags, createTag, addTagToImage, removeTagFromImage } from '@/lib/api';
import { toast } from '@/components/Toast';
import type { Tag } from '@/types';

interface TagManagerProps {
  imageId: string;
  imageTags: Tag[];
  onTagsChange: () => void;
}

export function TagManager({ imageId, imageTags, onTagsChange }: TagManagerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTags().then(setAllTags).catch(console.error);
  }, []);

  useEffect(() => {
    if (showPicker) inputRef.current?.focus();
  }, [showPicker]);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pickerRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  // Position picker below trigger
  useLayoutEffect(() => {
    if (!showPicker || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPickerPos({ top: rect.bottom + 4, left: rect.left });
  }, [showPicker]);

  const imageTagIds = new Set(imageTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !imageTagIds.has(t.id));

  const handleAdd = async (tagId: string) => {
    try {
      await addTagToImage(imageId, tagId);
      onTagsChange();
    } catch {
      toast('error', 'Failed to add tag');
    }
  };

  const handleRemove = async (tagId: string) => {
    try {
      await removeTagFromImage(imageId, tagId);
      onTagsChange();
    } catch {
      toast('error', 'Failed to remove tag');
    }
  };

  const handleCreateAndAdd = async () => {
    const name = newTagName.trim();
    if (!name) return;
    try {
      const tag = await createTag(name);
      setAllTags((prev) => [...prev, tag]);
      await addTagToImage(imageId, tag.id);
      setNewTagName('');
      onTagsChange();
    } catch {
      toast('error', 'Failed to create tag');
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {imageTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-heading"
          style={{ backgroundColor: tag.color + '20', color: tag.color, border: `1px solid ${tag.color}40` }}
        >
          #{tag.name}
          <button onClick={() => handleRemove(tag.id)} className="hover:opacity-60">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        ref={triggerRef}
        onClick={() => setShowPicker((v) => !v)}
        className="p-1 rounded-full hover:bg-[var(--muted)] transition-colors"
      >
        <Plus className="w-4 h-4 text-[var(--text-muted)]" />
      </button>

      {/* Picker — portaled to body */}
      {createPortal(
        <AnimatePresence>
          {showPicker && (
            <motion.div
              ref={pickerRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[90] w-64 p-2.5 rounded-lg bg-[var(--card)] border border-[var(--card-border)] shadow-xl"
              style={{ top: pickerPos.top, left: pickerPos.left }}
            >
              <div className="flex gap-1 mb-2">
                <input
                  ref={inputRef}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAdd()}
                  placeholder="New tag..."
                  className="flex-1 px-2 py-1 text-sm rounded bg-[var(--muted)] border border-[var(--card-border)] text-[var(--text)] outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={handleCreateAndAdd}
                  disabled={!newTagName.trim()}
                  className="px-2 py-1 text-xs rounded bg-[var(--accent)] text-white disabled:opacity-40"
                >
                  +
                </button>
              </div>
              {availableTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleAdd(tag.id)}
                      className="px-2 py-0.5 rounded-full text-xs font-heading hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      #{tag.name}
                    </button>
                  ))}
                </div>
              )}
              {availableTags.length === 0 && !newTagName && (
                <p className="text-xs text-[var(--text-muted)] text-center py-1">
                  No more tags available
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
