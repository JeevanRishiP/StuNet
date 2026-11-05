"use client";

import { useState } from "react";
import InstagramLeftRail from "./InstagramLeftRail";
import MobileHeader from "./MobileHeader";
import MobileBottomNav from "./MobileBottomNav";
import SearchDrawer from "./SearchDrawer";
import GlobalNotificationsDrawer from "./GlobalNotificationsDrawer";
import GlobalCreatePostModal from "./GlobalCreatePostModal";

interface AppShellProps {
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    role?: string;
    campusId?: string | null;
    campusName?: string | null;
    isGuest?: boolean;
  };
  children: React.ReactNode;
}

export default function AppShell({ user, children }: AppShellProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  // When either drawer is open on desktop, collapse the left sidebar to 72px icon-only mode
  const isRailCollapsed = isSearchOpen || isNotificationsOpen;

  function handleOpenSearch() {
    setIsNotificationsOpen(false);
    setIsSearchOpen(true);
  }

  function handleOpenNotifications() {
    setIsSearchOpen(false);
    setIsNotificationsOpen(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Desktop Left Rail (>= 1024px) */}
      <InstagramLeftRail
        user={user}
        isCollapsed={isRailCollapsed}
        onOpenSearch={handleOpenSearch}
        onOpenNotifications={handleOpenNotifications}
        onOpenCreatePost={() => setIsCreatePostOpen(true)}
      />

      {/* Mobile/Tablet Sticky Header (< 1024px) */}
      <MobileHeader
        user={user}
        onOpenSearch={handleOpenSearch}
        onOpenNotifications={handleOpenNotifications}
      />

      {/* Main Content Workspace */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isRailCollapsed ? "lg:pl-[72px]" : "lg:pl-[244px]"
        }`}
      >
        {user.isGuest && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-orange-500/10 border-b border-amber-300/70 px-4 py-2.5 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider shrink-0">
                Guest Mode
              </span>
              <span>
                Signed in via Google as <strong>{user.email}</strong> (@{user.username}). Your
                account is in public Guest mode because this Google email is not enrolled by any
                Campus Manager.
              </span>
            </div>
            <span className="text-[11px] text-amber-800 font-medium shrink-0">
              Campus clubs and posting restricted.
            </span>
          </div>
        )}
        <main className="w-full pb-20 lg:pb-12 min-h-screen">{children}</main>
      </div>

      {/* Mobile/Tablet Fixed Bottom Navigation (< 1024px) */}
      <MobileBottomNav user={user} />

      {/* Slide-Out Search Drawer */}
      <SearchDrawer isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Slide-Out Notifications Drawer */}
      <GlobalNotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Global New Post Modal */}
      <GlobalCreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={() => {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
      />
    </div>
  );
}
