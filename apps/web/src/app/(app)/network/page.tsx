"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Users, UserCheck, UserPlus, Clock, Check, X, UserMinus, CheckCircle2 } from "lucide-react";
import { Avatar, Button, Card } from "@stunet/ui";

type Tab = "ACCEPTED" | "PENDING" | "SENT";

interface ConnectionPerson {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  headline: string | null;
}

interface ConnectionItem {
  id: string;
  status: string;
  createdAt: string;
  direction: "sent" | "received";
  person: ConnectionPerson;
}

export default function NetworkPage() {
  const [tab, setTab] = useState<Tab>("ACCEPTED");
  const [items, setItems] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionWorking, setActionWorking] = useState<string | null>(null);

  async function load(t: Tab) {
    setLoading(true);
    setItems([]);
    try {
      const statusParam = t === "SENT" ? "PENDING" : t;
      const res = await fetch(`/api/connections?status=${statusParam}`);
      if (!res.ok) return;
      const data: ConnectionItem[] = await res.json();
      if (t === "SENT") {
        setItems(data.filter((c) => c.direction === "sent"));
      } else if (t === "PENDING") {
        setItems(data.filter((c) => c.direction === "received"));
      } else {
        setItems(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleAction(connId: string, action: "ACCEPT" | "DECLINE" | "REMOVE") {
    setActionWorking(connId);
    try {
      if (action === "REMOVE") {
        await fetch(`/api/connections/${connId}`, { method: "DELETE" });
      } else {
        await fetch(`/api/connections/${connId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      }
      await load(tab);
    } finally {
      setActionWorking(null);
    }
  }

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "ACCEPTED", label: "My Connections", icon: UserCheck },
    { key: "PENDING", label: "Pending Invitations", icon: UserPlus },
    { key: "SENT", label: "Sent Requests", icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 p-6 sm:p-8 text-white shadow-md">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm mb-3">
            <Users className="h-3.5 w-3.5" />
            <span>Campus Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Peer Connections & Mentors
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-indigo-100 leading-relaxed">
            Expand your professional campus network. Connected peers can view your contact details,
            direct posts, and collaborative projects.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 border border-slate-200/90 shadow-xs">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-slate-200 shimmer shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-28 rounded bg-slate-200 shimmer" />
                <div className="h-2.5 w-36 rounded bg-slate-100 shimmer" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            {tab === "ACCEPTED" && "No connections made yet"}
            {tab === "PENDING" && "No pending connection requests"}
            {tab === "SENT" && "No sent requests waiting"}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {tab === "ACCEPTED"
              ? "Browse the campus feed or club directories to find classmates and seniors to connect with."
              : "When peers send you connection invitations, they will appear here for you to accept."}
          </p>
        </Card>
      )}

      {/* Grid of Connections */}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Card
            key={item.id}
            className="border-slate-200/90 shadow-sm p-4 flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Link href={`/u/${item.person.username ?? item.person.id}` as Route}>
                <Avatar
                  src={item.person.avatarUrl}
                  name={item.person.displayName ?? item.person.username}
                  size="md"
                />
              </Link>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/u/${item.person.username ?? item.person.id}` as Route}
                    className="font-bold text-xs text-slate-900 hover:text-indigo-600 transition-colors truncate block"
                  >
                    {item.person.displayName ?? item.person.username}
                  </Link>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                </div>

                <p className="text-[11px] text-slate-500 truncate">
                  @{item.person.username ?? "user"}
                </p>

                {item.person.headline && (
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                    {item.person.headline}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {tab === "PENDING" && (
                <>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleAction(item.id, "ACCEPT")}
                    disabled={actionWorking === item.id}
                    className="h-8 px-2.5 text-xs gap-1"
                  >
                    <Check className="h-3 w-3" />
                    <span>Accept</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAction(item.id, "DECLINE")}
                    disabled={actionWorking === item.id}
                    className="h-8 px-2 text-xs text-slate-400 hover:text-rose-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}

              {tab === "SENT" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(item.id, "REMOVE")}
                  disabled={actionWorking === item.id}
                  className="h-8 px-2.5 text-xs text-slate-500 hover:text-rose-600"
                >
                  Withdraw
                </Button>
              )}

              {tab === "ACCEPTED" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAction(item.id, "REMOVE")}
                  disabled={actionWorking === item.id}
                  className="h-8 px-2.5 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  title="Remove connection"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
