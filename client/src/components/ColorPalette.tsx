import { useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from '@/components/Toast';
import { WorkspaceColorSwatch } from '@inspoclip/workspace-ui';

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
          <WorkspaceColorSwatch
            key={hex}
            color={hex}
            onSelect={(value, event) => { event.stopPropagation(); handleCopy(value); }}
            className="w-3 h-3 rounded-full border border-[var(--card-border)] hover:scale-150 transition-transform cursor-pointer"
            title={hex.toUpperCase()}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((hex) => (
        <WorkspaceColorSwatch
          key={hex}
          color={hex}
          onSelect={(value) => handleCopy(value)}
          variant="item"
          className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] hover:border-[var(--accent)] transition-colors"
          swatchClassName="w-6 h-6 rounded-md border border-[var(--card-border)]"
          labelClassName="text-xs font-mono text-[var(--text-muted)] group-hover:text-[var(--text)]"
          label={copiedHex === hex ? <Check className="w-3.5 h-3.5 text-green-500" /> : hex.toUpperCase()}
        />
      ))}
    </div>
  );
}
