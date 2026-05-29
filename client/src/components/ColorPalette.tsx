import { useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from '@/components/Toast';

interface ColorPaletteProps {
  colors: string[];
  compact?: boolean;
}

export function ColorPalette({ colors, compact = false }: ColorPaletteProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  if (colors.length === 0) return null;

  const handleCopy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex.toUpperCase());
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 1500);
    } catch {
      toast('error', 'Failed to copy');
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-0.5 mt-1">
        {colors.map((hex) => (
          <button
            key={hex}
            onClick={(e) => { e.stopPropagation(); handleCopy(hex); }}
            className="w-3 h-3 rounded-full border border-[var(--card-border)] hover:scale-150 transition-transform cursor-pointer"
            style={{ backgroundColor: hex }}
            title={hex.toUpperCase()}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((hex) => (
        <button
          key={hex}
          onClick={() => handleCopy(hex)}
          className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] hover:border-[var(--accent)] transition-colors"
        >
          <div
            className="w-6 h-6 rounded-md border border-[var(--card-border)]"
            style={{ backgroundColor: hex }}
          />
          <span className="text-xs font-mono text-[var(--text-muted)] group-hover:text-[var(--text)]">
            {copiedHex === hex ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              hex.toUpperCase()
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
