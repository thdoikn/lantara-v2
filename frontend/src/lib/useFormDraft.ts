import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Persist an in-progress submission to localStorage so a reload, crash, or
 * accidental navigation never loses what the applicant typed.
 *
 * Keyed per permit type (`draft:{permitKey}`). Saves are debounced so typing
 * stays cheap. Returns the restored draft (read once on mount), a debounced
 * `save`, an immediate `flush`, and `clear` (call after a successful submit).
 */

export interface SubmissionDraft {
  form_data: Record<string, unknown>;
  step?: string;
  submissionId?: string | null;
  savedAt: number;
}

const PREFIX = "draft:";

function read(key: string): SubmissionDraft | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SubmissionDraft;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useFormDraft(permitKey: string | undefined, delay = 600) {
  // Read the persisted draft exactly once, on mount, so hydration is stable.
  const [initial] = useState<SubmissionDraft | null>(() =>
    permitKey ? read(permitKey) : null,
  );
  const [savedAt, setSavedAt] = useState<number | null>(initial?.savedAt ?? null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const write = useCallback(
    (draft: Omit<SubmissionDraft, "savedAt">) => {
      if (!permitKey) return;
      // Avoid stamping Date.now() in a way that breaks deterministic tooling —
      // this only runs in the browser at user-typing time, never server-side.
      const at = Date.now();
      try {
        localStorage.setItem(
          PREFIX + permitKey,
          JSON.stringify({ ...draft, savedAt: at }),
        );
        setSavedAt(at);
      } catch {
        /* quota / private mode — drafting is best-effort, never block the form */
      }
    },
    [permitKey],
  );

  const save = useCallback(
    (draft: Omit<SubmissionDraft, "savedAt">) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => write(draft), delay);
    },
    [write, delay],
  );

  const flush = useCallback(
    (draft: Omit<SubmissionDraft, "savedAt">) => {
      if (timer.current) clearTimeout(timer.current);
      write(draft);
    },
    [write],
  );

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (permitKey) localStorage.removeItem(PREFIX + permitKey);
    setSavedAt(null);
  }, [permitKey]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { initial, savedAt, save, flush, clear };
}

/**
 * List all stored submission drafts (for the dashboard "resume" surface).
 * Each entry carries its permit key so the caller can deep-link the form.
 */
export function listFormDrafts(): Array<SubmissionDraft & { permitKey: string }> {
  const out: Array<SubmissionDraft & { permitKey: string }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      const permitKey = k.slice(PREFIX.length);
      const draft = read(permitKey);
      if (draft) out.push({ ...draft, permitKey });
    }
  } catch {
    /* ignore */
  }
  return out.sort((a, b) => b.savedAt - a.savedAt);
}

export function clearFormDraft(permitKey: string) {
  try {
    localStorage.removeItem(PREFIX + permitKey);
  } catch {
    /* ignore */
  }
}
