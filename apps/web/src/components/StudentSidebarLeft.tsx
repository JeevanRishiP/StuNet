"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Compass,
  ShoppingBag,
  Building2,
  CheckCircle2,
  ShieldCheck,
  User,
  GraduationCap,
} from "lucide-react";
import { Avatar, Card, CardContent } from "@stunet/ui";

interface SidebarUser {
  id?: string | null;
  name?: string | null;
  username?: string | null;
  image?: string | null;
}

export default function StudentSidebarLeft({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home Feed", icon: Home },
    { href: "/network", label: "My Network", icon: Users },
    { href: "/clubs", label: "Clubs & Chapters", icon: Compass },
    { href: "/marketplace", label: "Campus Market", icon: ShoppingBag },
    { href: "/campus", label: "Academic Hub", icon: Building2 },
    { href: `/u/${user.username ?? user.id}`, label: "My Profile", icon: User },
  ];

  return (
    <aside className="hidden lg:flex flex-col gap-4 w-64 shrink-0 sticky top-20 self-start">
      {/* Student Identity Card */}
      <Card className="overflow-hidden border-slate-200/90 shadow-sm">
        {/* Cover banner */}
        <div className="h-18 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
        </div>

        <CardContent className="pt-0 px-4 pb-4">
          <div className="flex flex-col items-center -mt-9 text-center">
            <div className="ring-4 ring-white rounded-full shadow-md">
              <Avatar
                src={user.image}
                name={user.name ?? user.username ?? "Student"}
                size="lg"
                online={true}
              />
            </div>

            <div className="mt-2.5 flex items-center justify-center gap-1.5 w-full">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {user.name ?? "Student"}
              </h2>
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            </div>

            <p className="text-xs text-slate-500 truncate">@{user.username ?? "user"}</p>

            <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5">
              <GraduationCap className="h-3 w-3" />
              <span>Verified Student · NIAT</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
            <Link href="/network" className="rounded-xl p-1.5 hover:bg-slate-50 transition-colors">
              <p className="text-xs font-bold text-slate-900">Network</p>
              <p className="text-[10px] text-slate-500">Connections</p>
            </Link>
            <Link href="/clubs" className="rounded-xl p-1.5 hover:bg-slate-50 transition-colors">
              <p className="text-xs font-bold text-slate-900">Clubs</p>
              <p className="text-[10px] text-slate-500">Communities</p>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Links */}
      <Card className="border-slate-200/90 shadow-sm p-2">
        <nav className="space-y-1">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 font-semibold"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </Card>

      {/* Trust & Safety Assurance */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs text-emerald-900 shadow-xs">
        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Campus Verified Space</span>
        </div>
        <p className="mt-1 text-[11px] text-emerald-700 leading-relaxed">
          Only verified college emails participate. Zero spam, zero anonymous trolls.
        </p>
      </div>
    </aside>
  );
}
