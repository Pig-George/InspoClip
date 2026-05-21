import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { deleteTerm } from '@/lib/api';
import type { Term } from '@/types';

interface TermTagProps {
  terms: Term[];
  onRefresh?: () => void;
}

function splitBilingual(keyword: string): [string, string] {
  const idx = keyword.indexOf(' / ');
  if (idx === -1) return [keyword, keyword];
  return [keyword.slice(0, idx), keyword.slice(idx + 3)];
}

export function TermTag({ terms, onRefresh }: TermTagProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const enterTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const cancelConfirm = () => {
    setConfirmDeleteId(null);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
  };

  useEffect(() => {
    if (confirmDeleteId) {
      confirmTimeoutRef.current = setTimeout(cancelConfirm, 3000);
    }
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, [confirmDeleteId]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  if (!terms || terms.length === 0) return null;

  const firstTerm = terms[0];
  const remaining = terms.length - 1;
  const [firstEn, firstZh] = splitBilingual(firstTerm.keyword);

  const calcTooltipPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setTooltipPos({ x: rect.left, y: rect.top - 8 });
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = undefined;
    }
    // 0.2s delay before showing tooltip
    enterTimeoutRef.current = setTimeout(() => {
      setExpanded(true);
      calcTooltipPos();
    }, 200);
  }, [calcTooltipPos]);

  const handleMouseLeave = useCallback(() => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = undefined;
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setExpanded(false);
      cancelConfirm();
    }, 200);
  }, []);

  const handleCopy = async (partId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(partId);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeleteClick = (e: React.MouseEvent, termId: string) => {
    e.stopPropagation();
    if (confirmDeleteId === termId) {
      deleteTerm(termId).then(() => onRefresh?.()).catch(console.error);
      cancelConfirm();
    } else {
      cancelConfirm();
      setConfirmDeleteId(termId);
    }
  };

  const isSameLang = firstEn === firstZh;

  return (
    <>
      {/* Collapsed tag */}
      <div
        ref={triggerRef}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-term
          bg-[var(--accent)]/15 text-[var(--accent)] cursor-pointer max-w-[220px] overflow-hidden"
      >
        <motion.button
          onClick={(e) => { e.stopPropagation(); handleCopy(firstTerm.id + '-en', firstEn); }}
          className="hover:underline truncate"
          whileTap={{ scale: 0.95 }}
        >
          {copiedId === firstTerm.id + '-en' ? (
            <Check className="w-3 h-3 text-green-500 inline" />
          ) : (
            firstEn
          )}
        </motion.button>
        {!isSameLang && (
          <>
            <span className="opacity-40 flex-shrink-0">/</span>
            <motion.button
              onClick={(e) => { e.stopPropagation(); handleCopy(firstTerm.id + '-zh', firstZh); }}
              className="hover:underline truncate"
              whileTap={{ scale: 0.95 }}
            >
              {copiedId === firstTerm.id + '-zh' ? (
                <Check className="w-3 h-3 text-green-500 inline" />
              ) : (
                firstZh
              )}
            </motion.button>
          </>
        )}
        {remaining > 0 && (
          <span className="text-[10px] opacity-60 flex-shrink-0 ml-0.5">+{remaining}</span>
        )}
      </div>

      {/* Tooltip — portaled to body to escape all stacking contexts */}
      {createPortal(
        <AnimatePresence>
          {expanded && terms.length > 1 && tooltipPos && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              onMouseEnter={() => {
                if (leaveTimeoutRef.current) {
                  clearTimeout(leaveTimeoutRef.current);
                  leaveTimeoutRef.current = undefined;
                }
              }}
              onMouseLeave={handleMouseLeave}
              onClick={(e) => e.stopPropagation()}
              className="fixed z-[999] p-2 rounded-lg bg-[var(--card)] border border-[var(--card-border)]
                shadow-xl w-max max-w-[240px]"
              style={{
                left: tooltipPos.x,
                top: tooltipPos.y,
                transform: 'translateY(-100%)',
              }}
            >
              <div className="flex flex-col gap-1">
                {terms.map((term) => {
                  const [en, zh] = splitBilingual(term.keyword);
                  const same = en === zh;
                  return (
                    <div key={term.id} className="group flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <button
                          onClick={() => handleCopy(term.id + '-en', en)}
                          className="text-xs px-1.5 py-1 rounded hover:bg-[var(--muted)] text-[var(--accent)]
                            cursor-pointer transition-colors font-term flex items-center gap-0.5"
                        >
                          {copiedId === term.id + '-en' && (
                            <Check className="w-3 h-3 text-green-500" />
                          )}
                          {en}
                        </button>
                        {!same && (
                          <>
                            <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">/</span>
                            <button
                              onClick={() => handleCopy(term.id + '-zh', zh)}
                              className="text-xs px-1.5 py-1 rounded hover:bg-[var(--muted)] text-[var(--accent)]
                                cursor-pointer transition-colors font-term flex items-center gap-0.5"
                            >
                              {copiedId === term.id + '-zh' && (
                                <Check className="w-3 h-3 text-green-500" />
                              )}
                              {zh}
                            </button>
                          </>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDeleteClick(e, term.id)}
                        className={`p-0.5 transition-all flex-shrink-0 ${
                          confirmDeleteId === term.id
                            ? 'opacity-100 bg-red-500 text-white rounded'
                            : 'opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500'
                        }`}
                      >
                        {confirmDeleteId === term.id ? (
                          <span className="text-[9px] px-0.5 font-heading whitespace-nowrap">确认</span>
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
