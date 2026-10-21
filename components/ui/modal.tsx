"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  /** Set to false while an action is running so the dialog cannot be dismissed. */
  dismissible?: boolean;
  /** Dialog width: md (default) for confirmations, lg for forms. */
  size?: "md" | "lg";
  children: ReactNode;
}

/**
 * Accessible modal built on the native <dialog> element.
 * The browser handles focus trapping, the Esc key and the backdrop for us.
 * Render it only while it should be visible: `{open && <Modal ... />}`.
 */
export function Modal({ title, description, onClose, dismissible = true, size = "md", children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Esc key
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      // Click on the dark backdrop (the click target is the <dialog> itself)
      onClick={(event) => {
        if (dismissible && event.target === dialogRef.current) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white p-0 text-foreground shadow-xl backdrop:bg-gray-900/50 ${
        size === "lg" ? "max-w-2xl" : "max-w-md"
      }`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-gray-600">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="Close dialog"
            className="-m-1 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
