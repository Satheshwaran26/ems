"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Employee } from "@/types/employee";

interface RowActionsMenuProps {
  employee: Employee;
  onDelete: (employee: Employee) => void;
}

interface MenuPosition {
  right: number;
  top?: number;
  bottom?: number;
}

const MENU_HEIGHT = 140; // approximate; used to decide whether to open upwards

const itemClass =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm focus:outline-none focus-visible:bg-gray-100";

/**
 * Three-dot menu with View / Edit / Delete.
 * The menu uses `position: fixed` so the table's horizontal scroll area
 * cannot clip it.
 */
export function RowActionsMenu({ employee, onDelete }: RowActionsMenuProps) {
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = position !== null;

  function toggle() {
    if (open) return setPosition(null);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const right = window.innerWidth - rect.right;
    const opensUp = rect.bottom + MENU_HEIGHT > window.innerHeight;
    setPosition(
      opensUp ? { right, bottom: window.innerHeight - rect.top + 4 } : { right, top: rect.bottom + 4 },
    );
  }

  useEffect(() => {
    if (!open) return;

    function close() {
      setPosition(null);
    }
    function handleMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    }
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    }

    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    // The menu is fixed to the screen, so close it if the page moves under it.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Up / Down arrows move between the menu items.
  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const current = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(current + step + items.length) % items.length]?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={`Actions for ${employee.fullName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${employee.fullName}`}
          onKeyDown={handleMenuKeyDown}
          style={position}
          className="fixed z-40 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
        >
          <Link
            href={`/employees/${employee.id}`}
            role="menuitem"
            onClick={() => setPosition(null)}
            className={`${itemClass} text-gray-700 hover:bg-gray-100`}
          >
            <Eye className="size-4" aria-hidden="true" />
            View
          </Link>
          <Link
            href={`/employees/${employee.id}/edit`}
            role="menuitem"
            onClick={() => setPosition(null)}
            className={`${itemClass} text-gray-700 hover:bg-gray-100`}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setPosition(null);
              onDelete(employee);
            }}
            className={`${itemClass} text-red-700 hover:bg-red-50`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      )}
    </>
  );
}
