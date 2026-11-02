"use client";

/**
 * Network page — /network
 * Tabs: My Connections | Pending (incoming) | Sent requests
 */
import { useEffect, useState } from "react";
import Link from "next/link";

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
      // For SENT tab: filter to only items the viewer sent
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
      // Refresh list
      await load(tab);
    } finally {
      setActionWorking(null);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "ACCEPTED", label: "Connections" },
    { key: "PENDING", label: "Pending" },
    { key: "SENT", label: "Sent" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">My Network</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 shadow-sm w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && <p className="text-sm text-gray-400 text-center py-8">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          {tab === "ACCEPTED" && "You have no connections yet."}
          {tab === "PENDING" && "No pending connection requests."}
          {tab === "SENT" && "No sent requests."}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3"
          >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600 flex-shrink-0 overflow-hidden">
              {item.person.avatarUrl ? (
                <img src={item.person.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (item.person.displayName ?? item.person.username ?? "?")[0]?.toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/u/${item.person.username ?? item.person.id}`}
                className="font-semibold text-sm text-gray-900 hover:text-blue-600 truncate block"
              >
                {item.person.displayName ?? item.person.username}
              </Link>
              {item.person.headline && (
                <p className="text-xs text-gray-500 truncate">{item.person.headline}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1 items-end flex-shrink-0">
              {tab === "PENDING" && (
                <>
                  <button
                    onClick={() => handleAction(item.id, "ACCEPT")}
                    disabled={actionWorking === item.id}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleAction(item.id, "DECLINE")}
                    disabled={actionWorking === item.id}
                    className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </>
              )}
              {tab === "SENT" && (
                <button
                  onClick={() => handleAction(item.id, "REMOVE")}
                  disabled={actionWorking === item.id}
                  className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
                >
                  Withdraw
                </button>
              )}
              {tab === "ACCEPTED" && (
                <button
                  onClick={() => handleAction(item.id, "REMOVE")}
                  disabled={actionWorking === item.id}
                  className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
