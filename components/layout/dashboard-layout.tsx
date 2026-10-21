"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

// Matches Tailwind's `lg` breakpoint: at this width and above we show the
// fixed sidebar instead of the drawer.
const DESKTOP_QUERY = "(min-width: 1024px)";

/** The frame shared by every page: sidebar + top bar + page content. */
export function DashboardLayout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // If the window grows to desktop size, the drawer is no longer needed.
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    function handleChange(event: MediaQueryListEvent) {
      if (event.matches) setDrawerOpen(false);
    }
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <div className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-gray-200 bg-white lg:block">
        {/* usePathname() needs a Suspense boundary (Cache Components) */}
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
      </div>

      {/* Mobile / tablet drawer */}
      {drawerOpen && (
        <MobileDrawer onClose={() => setDrawerOpen(false)}>
          <Suspense fallback={null}>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </Suspense>
        </MobileDrawer>
      )}

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar onOpenMenu={() => setDrawerOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
