import { useTheme } from '@/context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-full hover:bg-[var(--muted)] transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-[var(--accent)]" />
      ) : (
        <Sun className="w-5 h-5 text-[var(--accent)]" />
      )}
    </button>
  );
}
