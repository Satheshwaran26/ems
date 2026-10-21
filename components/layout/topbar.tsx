"use client";

import { Menu, UsersRound } from "lucide-react";

interface TopbarProps {
  onOpenMenu: () => void;
}

/** Top bar for small screens only. On desktop the sidebar is always visible. */
export function Topbar({ onOpenMenu }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation menu"
        className="-ml-2 rounded-lg p-2 text-gray-600 hover:bg-gray-100"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      <UsersRound className="size-5 text-gray-900" aria-hidden="true" />
      <span className="text-base font-semibold">EmployeeHub</span>
    </header>
  );
}
