import { type DecorationType } from '@/types';

interface DecorElementProps {
  type: DecorationType;
}

export function DecorElement({ type }: DecorElementProps) {
  if (type === 'tape') {
    return (
      <div
        className="absolute -top-3 left-1/3 w-12 h-3 opacity-50 rounded-sm z-10"
        style={{ transform: 'rotate(-3deg)', background: 'var(--tape)' }}
      />
    );
  }

  if (type === 'washi') {
    return (
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-4 rounded-sm z-10 washi-tape washi-tape--red"
        style={{ transform: 'rotate(2deg)' }}
      />
    );
  }

  if (type === 'pin') {
    return (
      <div className="absolute -top-2 -right-1 z-10">
        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-300 to-red-500 shadow-lg border border-red-400/60"
          style={{ boxShadow: '1px 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)' }}
        />
        <div className="absolute top-0.5 left-1 w-1 h-1 rounded-full bg-white/40" />
      </div>
    );
  }

  if (type === 'clip') {
    return (
      <div className="absolute -top-1 -right-0.5 z-10">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>
          <path d="M6 2 Q12 -2 18 6 Q24 14 18 20 M6 2 V18 Q6 22 12 22 Q18 22 18 18 V6" />
        </svg>
      </div>
    );
  }

  if (type === 'stitch') {
    return (
      <div className="absolute -top-1.5 left-2 right-2 z-10 h-0"
        style={{
          borderTop: '2px dashed var(--ink)',
          opacity: 0.3,
        }}
      />
    );
  }

  if (type === 'staple') {
    return (
      <div className="absolute -top-1 left-1/3 z-10">
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))' }}>
          <rect x="1" y="1" width="14" height="3" rx="0.5" fill="#a0a0a0" stroke="#888" strokeWidth="0.5" />
          <rect x="3" y="4" width="2" height="5" rx="0.5" fill="#b0b0b0" stroke="#999" strokeWidth="0.5" />
          <rect x="11" y="4" width="2" height="5" rx="0.5" fill="#b0b0b0" stroke="#999" strokeWidth="0.5" />
        </svg>
      </div>
    );
  }

  if (type === 'sticker') {
    return (
      <div className="absolute -top-2 -left-2 z-10"
        style={{ transform: 'rotate(-8deg)' }}>
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 shadow-sm border border-amber-300/60"
          style={{ boxShadow: '1px 1px 3px rgba(0,0,0,0.15)' }}
        />
        <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-white/30" />
      </div>
    );
  }

  // corner — photo corner mount
  return (
    <div className="absolute -top-0.5 -right-0.5 z-10">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}>
        <path d="M0 0 L18 0 L22 4 L22 22 L4 22 L0 18 Z" fill="var(--card)" stroke="var(--card-border)" strokeWidth="1" />
        <path d="M3 3 L15 3 L19 7 L19 19" fill="none" stroke="var(--card-border)" strokeWidth="0.5" opacity="0.5" />
      </svg>
    </div>
  );
}
