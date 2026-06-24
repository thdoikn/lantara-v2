import type { ReactNode } from "react";

/** Keyboard hint chip — used in the command palette and verifier shortcuts. */
export default function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1.5 rounded-md border border-khatulistiwa-200 bg-khatulistiwa-50 text-khatulistiwa-600 text-[11px] font-mono font-medium leading-none">
      {children}
    </kbd>
  );
}
