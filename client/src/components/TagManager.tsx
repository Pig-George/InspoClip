import { useEffect, useMemo, useState } from 'react';
import { WorkspaceTagEditor, type WorkspaceTag } from '@inspoclip/workspace-ui';
import { fetchTags, createTag, addTagToImage, removeTagFromImage } from '@/lib/api';
import { addTagToVideo, removeTagFromVideo } from '@/lib/video-api';
import { toast } from '@/components/Toast';
import { useLanguage } from '@/context/LanguageContext';
import type { Tag } from '@/types';

interface TagManagerProps {
  imageId?: string;
  videoId?: string;
  imageTags: Tag[];
  onTagsChange: () => void;
}

export function TagManager({ imageId, videoId, imageTags, onTagsChange }: TagManagerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const { locale } = useLanguage();

  useEffect(() => {
    fetchTags().then(setAllTags).catch(() => undefined);
  }, []);

  const tags = useMemo(() => imageTags.map(toWorkspaceTag), [imageTags]);
  const availableTags = useMemo(() => allTags.map(toWorkspaceTag), [allTags]);

  const handleAdd = async (tag: WorkspaceTag) => {
    try {
      if (imageId) await addTagToImage(imageId, tag.id);
      else if (videoId) await addTagToVideo(videoId, tag.id);
      onTagsChange();
    } catch {
      toast('error', locale === 'zh' ? '添加标签失败' : 'Failed to add tag');
    }
  };

  const handleRemove = async (tag: WorkspaceTag) => {
    try {
      if (imageId) await removeTagFromImage(imageId, tag.id);
      else if (videoId) await removeTagFromVideo(videoId, tag.id);
      onTagsChange();
    } catch {
      toast('error', locale === 'zh' ? '移除标签失败' : 'Failed to remove tag');
    }
  };

  const handleCreate = async (label: string) => {
    try {
      const tag = await createTag(label);
      setAllTags((current) => [...current, tag]);
      if (imageId) await addTagToImage(imageId, tag.id);
      else if (videoId) await addTagToVideo(videoId, tag.id);
      onTagsChange();
    } catch {
      toast('error', locale === 'zh' ? '创建标签失败' : 'Failed to create tag');
    }
  };

  return <WorkspaceTagEditor
    tags={tags}
    availableTags={availableTags}
    labels={{
      add: locale === 'zh' ? '添加标签' : 'Add tag',
      remove: locale === 'zh' ? '移除' : 'Remove',
      create: locale === 'zh' ? '添加' : 'Add',
      placeholder: locale === 'zh' ? '输入标签' : 'Tag name',
      empty: locale === 'zh' ? '没有更多标签' : 'No more tags'
    }}
    onAdd={handleAdd}
    onRemove={handleRemove}
    onCreate={handleCreate}
  />;
}

function toWorkspaceTag(tag: Tag): WorkspaceTag {
  return { id: tag.id, label: tag.name, color: tag.color };
}
