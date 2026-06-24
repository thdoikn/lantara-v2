import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ElementType } from "react";
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/cn";
import Kbd from "@/components/ui/Kbd";

export interface Command {
  id: string;
  label: string;
  group?: string;
  icon?: ElementType;
  keywords?: string;
  perform: () => void;
}

/**
 * Global command palette (⌘K / Ctrl-K). The portal shell feeds it navigation
 * targets + quick actions; opening it from anywhere is the single biggest thing
 * that makes the authenticated app stop feeling like a generic dashboard.
 */
export default function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl-K toggles; "/" opens when not typing in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing && !open)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function onOpenEvent() { setOpen(true); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("lantara:open-command", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("lantara:open-command", onOpenEvent);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.keywords?.toLowerCase().includes(q) ?? false),
    );
  }, [query, commands]);

  useEffect(() => setActive(0), [query]);

  function run(cmd?: Command) {
    if (!cmd) return;
    setOpen(false);
    cmd.perform();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); run(results[active]); }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4 bg-khatulistiwa-950/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-pertiwi-muted overflow-hidden"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 border-b border-pertiwi-muted">
              <Search className="w-5 h-5 text-khatulistiwa-400 shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Cari halaman atau tindakan…"
                className="flex-1 py-4 bg-transparent text-khatulistiwa-900 placeholder-khatulistiwa-400/60 text-sm outline-none"
                aria-label="Cari perintah"
              />
            </div>

            <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-khatulistiwa-400">Tidak ada hasil.</li>
              ) : (
                results.map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <li key={cmd.id} role="option" aria-selected={i === active}>
                      <button
                        onClick={() => run(cmd)}
                        onMouseEnter={() => setActive(i)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                          i === active ? "bg-khatulistiwa-50" : "hover:bg-khatulistiwa-50/60",
                        )}
                      >
                        {Icon && (
                          <span className="w-8 h-8 rounded-lg bg-khatulistiwa-100 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-khatulistiwa-600" aria-hidden="true" />
                          </span>
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-khatulistiwa-900 truncate">{cmd.label}</span>
                          {cmd.group && <span className="block text-xs text-khatulistiwa-400">{cmd.group}</span>}
                        </span>
                        {i === active && <CornerDownLeft className="w-4 h-4 text-khatulistiwa-400 shrink-0" aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-pertiwi-muted text-[11px] text-khatulistiwa-400">
              <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" /><ArrowDown className="w-3 h-3" /> navigasi</span>
              <span className="flex items-center gap-1"><Kbd>↵</Kbd> pilih</span>
              <span className="flex items-center gap-1"><Kbd>esc</Kbd> tutup</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
