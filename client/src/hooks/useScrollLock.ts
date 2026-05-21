import { useEffect, useRef } from 'react';

function isScrollable(el: HTMLElement, dy: number): boolean {
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  if (overflowY === 'hidden' || overflowY === 'visible') return false;
  if (dy > 0 && el.scrollTop < el.scrollHeight - el.clientHeight - 1) return true;
  if (dy < 0 && el.scrollTop > 0) return true;
  return false;
}

export function useScrollLock(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;

    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      // Walk up to find a scrollable ancestor within the overlay
      let node: HTMLElement | null = target;
      while (node && node !== el) {
        if (isScrollable(node, e.deltaY)) {
          // Let the scrollable child handle it, just stop propagation
          e.stopPropagation();
          return;
        }
        node = node.parentElement;
      }
      // No scrollable ancestor found — block the scroll entirely
      e.preventDefault();
      e.stopPropagation();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [active]);

  return ref;
}
