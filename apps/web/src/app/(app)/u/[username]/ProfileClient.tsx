"use client";

/**
 * ProfileClient — interactive layer on top of the server-rendered profile.
 * Handles connect/block/report actions and shows profile data.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileData {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  campusName: string | null;
  // Contact — only present when visibility allows
  email?: string | null;
  phone?: string | null;
}

interface Props {
  profile: ProfileData;
  isOwn: boolean;
  connectionStatus: "NONE" | "PENDING" | "ACCEPTED" | "SENT";
  connectionId: string | null;
  viewerId: string | null;
}

export default function ProfileClient({
  profile,
  isOwn,
  connectionStatus,
  connectionId,
  viewerId,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(connectionStatus);
  const [connId, setConnId] = useState(connectionId);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: profile.id }),
      });
      if (res.ok) {
        const data: { id: string } = await res.json();
        setConnId(data.id);
        setStatus("SENT");
      } else if (res.status === 409) {
        setStatus("SENT");
      } else {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to send request.");
      }
    } finally {
      setWorking(false);
    }
  }

  async function handleAccept() {
    if (!connId) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/connections/${connId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT" }),
      });
      if (res.ok) setStatus("ACCEPTED");
    } finally {
      setWorking(false);
    }
  }

  async function handleBlock() {
    if (
      !window.confirm(
        `Block @${profile.username ?? profile.displayName}? This will also remove any existing connection.`,
      )
    )
      return;
    setWorking(true);
    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: profile.id }),
      });
      if (res.ok) {
        router.push("/");
      } else {
        setError("Failed to block user.");
      }
    } finally {
      setWorking(false);
    }
  }

  async function handleReport() {
    const reason = window.prompt(
      "Report reason (enter one):\nSPAM | HARASSMENT | HATE_SPEECH | MISINFORMATION | INAPPROPRIATE_CONTENT | IMPERSONATION | OTHER",
    );
    if (!reason) return;
    const valid = [
      "SPAM",
      "HARASSMENT",
      "HATE_SPEECH",
      "MISINFORMATION",
      "INAPPROPRIATE_CONTENT",
      "IMPERSONATION",
      "OTHER",
    ];
    if (!valid.includes(reason.trim().toUpperCase())) {
      alert("Invalid reason — please enter one of the listed values.");
      return;
    }
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: "USER_PROFILE",
        reportedUserId: profile.id,
        reason: reason.trim().toUpperCase(),
      }),
    });
    if (res.ok) alert("Report submitted. Thank you.");
    else if (res.status === 429) alert("Too many reports — please wait before submitting another.");
    else alert("Failed to submit report.");
  }

  const initials = (profile.displayName ?? profile.username ?? "?")[0]?.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 flex-shrink-0 overflow-hidden">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {profile.displayName ?? profile.username}
            </h1>
            {profile.username && <p className="text-sm text-gray-500">@{profile.username}</p>}
            {profile.headline && <p className="text-sm text-gray-700 mt-1">{profile.headline}</p>}
            {profile.campusName && (
              <p className="text-xs text-gray-400 mt-0.5">📍 {profile.campusName}</p>
            )}
          </div>

          {/* Actions */}
          {!isOwn && viewerId && (
            <div className="flex flex-col gap-2 items-end flex-shrink-0">
              {status === "NONE" && (
                <button
                  onClick={handleConnect}
                  disabled={working}
                  className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Connect
                </button>
              )}
              {status === "SENT" && (
                <span className="text-xs text-gray-500 italic">Request sent</span>
              )}
              {status === "PENDING" && (
                <button
                  onClick={handleAccept}
                  disabled={working}
                  className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Accept request
                </button>
              )}
              {status === "ACCEPTED" && (
                <span className="text-xs text-green-600 font-medium">✓ Connected</span>
              )}
              <div className="flex gap-3 mt-1">
                <button onClick={handleReport} className="text-xs text-gray-400 hover:text-red-500">
                  Report
                </button>
                <button
                  onClick={handleBlock}
                  disabled={working}
                  className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
                >
                  Block
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
      </div>

      {/* About */}
      {profile.bio && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">About</h2>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{profile.bio}</p>
        </div>
      )}

      {/* Contact — only shown when serializer returned them */}
      {(profile.email || profile.phone) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Contact</h2>
          <ul className="space-y-1 text-sm text-gray-700">
            {profile.email && (
              <li>
                📧{" "}
                <a href={`mailto:${profile.email}`} className="hover:underline">
                  {profile.email}
                </a>
              </li>
            )}
            {profile.phone && <li>📱 {profile.phone}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
