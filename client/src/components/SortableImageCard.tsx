import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ImageCard } from './ImageCard';
import type { Image as ImageType } from '@/types';

interface SortableImageCardProps {
  image: ImageType;
  onRefresh: () => void;
  animDelay?: number;
}

export function SortableImageCard({ image, onRefresh, animDelay }: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ImageCard image={image} onRefresh={onRefresh} animDelay={animDelay} />
    </div>
  );
}
