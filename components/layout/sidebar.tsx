
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsersRound } from "lucide-react";
import { isActivePath, NAV_ITEMS } from "@/components/layout/nav";

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-5">
        <UsersRound className="size-6 shrink-0 text-gray-900" />

        <span className="text-base font-semibold text-gray-900">
          EmployeeHub
        </span>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 space-y-1 p-3"
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm ${
                active
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
