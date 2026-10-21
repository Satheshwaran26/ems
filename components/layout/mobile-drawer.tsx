"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface MobileDrawerProps {
  onClose: () => void;
  children: ReactNode;
}

/**
 * Slide-in navigation for small screens. Uses the native <dialog> element so
 * focus is trapped and Esc closes it without extra code.
 * Render it only while open: `{open && <MobileDrawer ...>}`.
 */
export function MobileDrawer({ onClose, children }: MobileDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Navigation menu"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[85vw] overflow-visible bg-white p-0 text-foreground shadow-xl backdrop:bg-gray-900/50"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
      {children}
    </dialog>
  );
}
