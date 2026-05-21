import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info';

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;
let addToastFn: ((type: ToastType, message: string) => void) | null = null;

export function toast(type: ToastType, message: string) {
  addToastFn?.(type, message);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons = {
    error: <AlertTriangle className="w-4 h-4 text-red-400" />,
    success: <CheckCircle className="w-4 h-4 text-green-400" />,
    info: <Info className="w-4 h-4 text-blue-400" />,
  };

  const bgColors = {
    error: 'border-red-400/30',
    success: 'border-green-400/30',
    info: 'border-blue-400/30',
  };

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            className={`flex items-start gap-2 px-4 py-3 rounded-lg border bg-[var(--card)] shadow-lg ${bgColors[t.type]}`}
          >
            <span className="flex-shrink-0 mt-0.5">{icons[t.type]}</span>
            <p className="text-sm text-[var(--text)] flex-1">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="flex-shrink-0 p-0.5 hover:opacity-60">
              <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
