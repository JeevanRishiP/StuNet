"use client";

/**
 * Club detail page — /clubs/[slug]
 * Shows club info, membership status, and active suggestion windows.
 */
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Club {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  institutionalEmail: string | null;
  campus: { name: string };
  _count: { members: number };
}

interface ClubMembership {
  role: string;
}

interface Suggestion {
  id: string;
  title: string;
  body: string;
  voteCount: number;
  isImplemented: boolean;
  authorId: string;
  createdAt: string;
}

interface SuggestionWindow {
  id: string;
  title: string;
  description: string | null;
  opensAt: string;
  closesAt: string;
  suggestions: Suggestion[];
}

export default function ClubPage() {
  const params = useParams<{ slug: string }>();
  const [club, setClub] = useState<Club | null>(null);
  const [membership, setMembership] = useState<ClubMembership | null>(null);
  const [windows, setWindows] = useState<SuggestionWindow[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadClub() {
    // We need to find club by slug — use the list endpoint then filter
    const res = await fetch("/api/clubs");
    if (!res.ok) return;
    const data: { clubs: (Club & { slug: string })[] } = await res.json();
    const found = data.clubs.find((c) => c.slug === params.slug);
    if (!found) return;
    setClub(found);

    // Load detail + membership
    const detail = await fetch(`/api/clubs/${found.id}`);
    if (!detail.ok) return;
    const d: { club: Club; membership: ClubMembership | null } = await detail.json();
    setClub(d.club);
    setMembership(d.membership);

    // Load suggestion windows
    const sw = await fetch(`/api/clubs/${found.id}/suggestions`);
    if (sw.ok) {
      const sData: { windows: SuggestionWindow[] } = await sw.json();
      setWindows(sData.windows);
    }
  }

  useEffect(() => {
    loadClub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJoin() {
    if (!club) return;
    setWorking(true);
    setError(null);
    const res = await fetch(`/api/clubs/${club.id}/members`, { method: "POST" });
    if (res.ok) {
      const data: { role: string } = await res.json();
      setMembership({ role: data.role });
    } else {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Failed to join club.");
    }
    setWorking(false);
  }

  async function handleLeave() {
    if (!club || !window.confirm("Leave this club?")) return;
    setWorking(true);
    const res = await fetch(`/api/clubs/${club.id}/members`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setMembership(null);
    } else {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Failed to leave club.");
    }
    setWorking(false);
  }

  async function handleVote(suggestionId: string) {
    const res = await fetch(`/api/suggestions/${suggestionId}/vote`, { method: "POST" });
    if (res.ok) {
      // Optimistically bump vote count
      setWindows((prev) =>
        prev.map((w) => ({
          ...w,
          suggestions: w.suggestions.map((s) =>
            s.id === suggestionId ? { ...s, voteCount: s.voteCount + 1 } : s,
          ),
        })),
      );
    } else if (res.status === 429) {
      alert("Too many votes — please slow down.");
    }
  }

  async function handleReport() {
    const reason = window.prompt(
      "Report reason:\nSPAM | HARASSMENT | HATE_SPEECH | MISINFORMATION | INAPPROPRIATE_CONTENT | IMPERSONATION | OTHER",
    );
    if (!reason || !club) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "CLUB", reason: reason.toUpperCase() }),
    });
    alert("Report submitted.");
  }

  if (!club) {
    return <p className="text-sm text-gray-400 text-center py-12">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      {club.bannerUrl && (
        <div className="w-full h-32 rounded-xl overflow-hidden bg-gray-200">
          <img src={club.bannerUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Club header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
            {club.logoUrl ? (
              <img src={club.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              "🏛️"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{club.name}</h1>
            <p className="text-sm text-gray-500">
              {club.category} · {club.campus.name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{club._count.members} members</p>
          </div>

          {/* Join/Leave + Report */}
          <div className="flex flex-col gap-2 items-end flex-shrink-0">
            {membership ? (
              <>
                <span className="text-xs text-green-600 font-medium">✓ {membership.role}</span>
                <button
                  onClick={handleLeave}
                  disabled={working}
                  className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
                >
                  Leave
                </button>
              </>
            ) : (
              <button
                onClick={handleJoin}
                disabled={working}
                className="bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Join
              </button>
            )}
            <button
              onClick={() => handleReport()}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              Report
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-700 mt-4">{club.description}</p>
        {club.institutionalEmail && (
          <p className="text-xs text-gray-500 mt-2">
            📧{" "}
            <a href={`mailto:${club.institutionalEmail}`} className="hover:underline">
              {club.institutionalEmail}
            </a>
          </p>
        )}
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>

      {/* Suggestion windows */}
      {membership && windows.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Suggestion Boxes</h2>
          {windows.map((w) => (
            <div
              key={w.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3"
            >
              <div>
                <h3 className="font-semibold text-gray-900">{w.title}</h3>
                {w.description && <p className="text-sm text-gray-500 mt-0.5">{w.description}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Open until {new Date(w.closesAt).toLocaleDateString()}
                </p>
              </div>

              {w.suggestions.map((s) => (
                <div
                  key={s.id}
                  className="border border-gray-100 rounded-lg p-3 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{s.body}</p>
                    {s.isImplemented && (
                      <span className="inline-block mt-1 text-xs text-green-600 font-medium">
                        ✓ Implemented
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-center flex-shrink-0">
                    <button
                      onClick={() => handleVote(s.id)}
                      className="text-lg hover:scale-110 transition-transform"
                      title="Vote"
                    >
                      👍
                    </button>
                    <span className="text-xs font-medium text-gray-700">{s.voteCount}</span>
                  </div>
                </div>
              ))}

              {w.suggestions.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No suggestions yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
